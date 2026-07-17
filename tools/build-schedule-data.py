import csv
import io
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image


PAGE_DATES = {1: "2026-07-17", 2: "2026-07-18", 3: "2026-07-18", 4: "2026-07-19", 5: "2026-07-19", 6: "2026-07-20"}


def collapse_groups(values):
    groups = []
    for value in values:
        if not groups or value > groups[-1][-1] + 1:
            groups.append([value])
        else:
            groups[-1].append(value)
    return [round(sum(group) / len(group)) for group in groups]


def detect_boundaries(image_path):
    image = np.asarray(Image.open(image_path).convert("L"))
    horizontal_counts = (image[:, 420:1080] < 245).sum(axis=1)
    rows = collapse_groups(np.where(horizontal_counts > 500)[0].tolist())
    vertical_counts = (image < 205).sum(axis=0)
    cols = collapse_groups(np.where(vertical_counts > 1200)[0].tolist())
    return rows, cols


def parse_words(tsv):
    words = []
    for row in csv.reader(io.StringIO(tsv), delimiter="\t"):
        if len(row) < 12 or row[0] != "5" or not row[11].strip():
            continue
        words.append(
            {
                "block": int(row[2]),
                "paragraph": int(row[3]),
                "line": int(row[4]),
                "left": int(row[6]),
                "top": int(row[7]),
                "width": int(row[8]),
                "height": int(row[9]),
                "text": row[11].strip(),
            }
        )
    return words


def clean_line(text):
    text = re.sub(r"(?<=[\u3400-\u9fff])\s+(?=[\u3400-\u9fff])", "", text)
    text = re.sub(r"\s+([，。；：、）》])", r"\1", text)
    text = re.sub(r"([《（])\s+", r"\1", text)
    return re.sub(r"\s+", " ", text).strip(" |")


def cell_lines(words, x1, x2, y1, y2):
    selected = [
        word
        for word in words
        if x1 < word["left"] + word["width"] / 2 < x2
        and y1 < word["top"] + word["height"] / 2 < y2
    ]
    grouped = {}
    for word in selected:
        grouped.setdefault((word["block"], word["paragraph"], word["line"]), []).append(word)
    lines = []
    for line_words in grouped.values():
        line_words.sort(key=lambda word: word["left"])
        lines.append(
            (
                min(word["top"] for word in line_words),
                clean_line(" ".join(word["text"] for word in line_words)),
            )
        )
    return [text for _, text in sorted(lines) if text]


def strip_english_noise(text):
    keep = {"AI", "AGI", "AIGC", "Agent", "Token", "RISC", "WAIC", "WAICA", "TPU", "LLM", "SME"}

    def replace(match):
        token = match.group(0)
        return token if token in keep else ""

    text = re.sub(r"[A-Za-z][A-Za-z0-9+.'\-&]*", replace, text)
    return re.sub(r"\s+", "", text).strip("-·'，。")


def chinese_label(lines):
    chinese = []
    for line in lines:
        if len(re.findall(r"[\u3400-\u9fff]", line)) >= 2:
            chinese.append(strip_english_noise(line))
    return "".join(chinese) if chinese else (lines[0] if lines else "")


def location_label(lines):
    chinese = [
        strip_english_noise(line)
        for line in lines
        if len(re.findall(r"[\u3400-\u9fff]", line)) >= 2
    ]
    venue = "".join(chinese)
    if re.search(r"世博|西岸|张江|上海|中心|展览馆|会议室|酒店|厅", venue):
        return venue
    english = [
        line
        for line in lines
        if re.search(r"Expo|Center|Hall|Room|Hotel|Convention|Exhibition|Thompson|Bund|Zhangjiang", line, re.IGNORECASE)
    ]
    return " ".join(english) if english else venue or (lines[0] if lines else "")


def parse_times(raw):
    normalized = raw.replace("：", ":").replace("。", ".")
    matches = re.findall(r"(?<!\d)([01]?\d|2[0-3])[:.]?([0-5]\d)(?!\d)", normalized)
    times = []
    for hour, minute in matches:
        value = f"{int(hour):02d}:{minute}"
        if value not in times:
            times.append(value)
    return times[:2]


def topic_for(name):
    rules = [
        ("具身智能", r"具身|机器人|物理世界|空间智能|Embodied|Robot"),
        ("大模型与智能体", r"大模型|智能体|Agent|AGI|基座模型|LLM"),
        ("算力芯片", r"算力|计算|芯片|RISC|TPU|基础设施|服务器|Compute"),
        ("产业应用", r"工业|制造|交通|物流|港口|船海|能源|消防|材料|Industry|Manufact"),
        ("投融资", r"投资|融资|创投|资本|Investment|Financ"),
        ("治理安全", r"治理|安全|法治|标准|合规|Governance|Security|Rule of Law"),
        ("内容与消费", r"影视|内容|广告|消费|媒体|Filmmaking|Media"),
        ("教育与人才", r"教育|大学|青年|人才|Education|Youth|University"),
        ("医疗健康", r"医疗|健康|生命|Health|Medical"),
        ("金融", r"金融|银行|证券|Finance|Bank"),
    ]
    for topic, pattern in rules:
        if re.search(pattern, name, re.IGNORECASE):
            return topic
    return "前沿综合"


layout_path = Path(sys.argv[1])
image_dir = Path(sys.argv[2])
output_path = Path(sys.argv[3])
pages = json.loads(layout_path.read_text(encoding="utf-8"))
events = []

for page in pages:
    page_number = page["page"]
    image_path = image_dir / page["image"]
    rows, cols = detect_boundaries(image_path)
    if len(cols) != 4:
        raise RuntimeError(f"Expected four table boundaries on page {page_number}, got {cols}")
    words = parse_words(page["tsv"])
    for row_index, (top, bottom) in enumerate(zip(rows, rows[1:]), 1):
        if bottom - top < 35:
            continue
        name_lines = cell_lines(words, cols[0], cols[1], top, bottom)
        time_lines = cell_lines(words, cols[1], cols[2], top, bottom)
        location_lines = cell_lines(words, cols[2], cols[3], top, bottom)
        if not name_lines or not time_lines or not location_lines:
            continue
        name_raw = " / ".join(name_lines)
        time_raw = " / ".join(time_lines)
        location_raw = " / ".join(location_lines)
        times = parse_times(time_raw)
        if not times:
            continue
        name = chinese_label(name_lines)
        location = location_label(location_lines)
        if "论坛名称" in name or "Forum Name" in name:
            continue
        if len(re.findall(r"[\u3400-\u9fff]", name)) < 4 and "WAIC" not in name:
            continue
        if times and int(times[0].split(":")[0]) < 9:
            continue
        events.append(
            {
                "id": f"p{page_number}-r{row_index}",
                "date": PAGE_DATES[page_number],
                "start": times[0],
                "end": times[1] if len(times) > 1 else "",
                "name": name,
                "location": location,
                "topic": topic_for(name_raw),
                "nameRaw": name_raw,
                "timeRaw": time_raw,
                "locationRaw": location_raw,
                "sourcePage": page_number,
            }
        )

events.insert(
    0,
    {
        "id": "major-opening",
        "date": "2026-07-17",
        "start": "14:00",
        "end": "17:00",
        "name": "2026世界人工智能大会暨人工智能全球治理高级别会议主论坛",
        "location": "世博中心金厅A+B",
        "topic": "治理安全",
        "nameRaw": "2026 WORLD AI CONFERENCE & HIGH-LEVEL MEETING ON GLOBAL AI GOVERNANCE MAIN FORUM",
        "timeRaw": "7月17日 14:00-17:00",
        "locationRaw": "世博中心金厅A+B",
        "sourcePage": 1,
    },
)

output_path.parent.mkdir(parents=True, exist_ok=True)
output_path.write_text(json.dumps(events, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"events": len(events), "by_date": {date: sum(1 for event in events if event["date"] == date) for date in sorted(set(event["date"] for event in events))}}, ensure_ascii=False))
for event in events[:12]:
    print(event["date"], event["start"], event["name"], "@", event["location"])
