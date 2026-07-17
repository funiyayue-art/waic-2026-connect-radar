"use client";

import { useEffect, useMemo, useState } from "react";
import exhibitorPayload from "./data/exhibitors.json";
import forumPayload from "./data/forums.json";

type Exhibitor = (typeof exhibitorPayload.exhibitors)[number];
type Forum = (typeof forumPayload)[number];
type Goal = "采购/合作" | "投资/产业" | "媒体/研究" | "人才/求职";
type Format = "小红书笔记" | "小绿书长文" | "飞书跟进卡";
type Tone = "行业判断" | "逛展速记" | "投融资观察" | "采购评估";
type Decision = "跳过" | "观察" | "联系";

const GOALS: Goal[] = ["采购/合作", "投资/产业", "媒体/研究", "人才/求职"];
const FORMATS: Format[] = ["小红书笔记", "小绿书长文", "飞书跟进卡"];
const TONES: Tone[] = ["行业判断", "逛展速记", "投融资观察", "采购评估"];
const INTERESTS = [
  "大模型",
  "智能体",
  "具身智能",
  "算力芯片",
  "企业服务",
  "工业AI",
  "医疗健康",
  "数据基础设施",
];

const TOPIC_KEYWORDS: Record<string, string[]> = {
  大模型: ["大模型", "AGI", "LLM", "基座模型"],
  智能体: ["智能体", "Agent", "一人公司"],
  具身智能: ["具身", "机器人", "物理世界", "空间智能"],
  算力芯片: ["算力", "计算", "芯片", "RISC", "TPU", "基础设施"],
  企业服务: ["企业", "管理", "生产力", "商业落地"],
  工业AI: ["工业", "制造", "物流", "港口", "船海", "能源"],
  医疗健康: ["医疗", "健康", "生命"],
  数据基础设施: ["数据", "存储", "数据库", "计算"],
};

function isUnknown(value: string) {
  return !value || /未公开|暂无|未披露|信息不详/.test(value);
}

function companyName(company: string) {
  const parts = company.split("/").map((part) => part.trim());
  return parts.length > 1 && parts[1].length < 32 ? parts[1] : parts[0];
}

function scoreCompany(company: Exhibitor, goal: Goal, interests: string[]) {
  const corpus = [
    company.company,
    company.industry,
    company.segment,
    company.business,
    company.investors,
    company.financing,
  ].join(" ");

  const product = isUnknown(company.business)
    ? 5
    : company.business.length > 42
      ? 20
      : company.business.length > 22
        ? 17
        : 12;

  const maturity = /已上市|IPO|港股|A股|科创板/.test(company.financing)
    ? 20
    : /C轮|D轮|战略融资|B\+?轮|数十亿|数亿美元/.test(company.financing)
      ? 17
      : /A轮|Pre-A|天使轮|种子轮/.test(company.financing)
        ? 12
        : isUnknown(company.financing)
          ? 5
          : 10;

  const capital = isUnknown(company.investors)
    ? 4
    : /国资|阿里|腾讯|红杉|IDG|高瓴|启明|顺为|联想|华为/.test(
          company.investors,
        )
      ? 15
      : 11;

  const completeness = [
    company.business,
    company.investors,
    company.financing,
    company.location,
  ].filter((value) => !isUnknown(value)).length;
  const evidence = 6 + completeness * 2;
  const access = company.booth ? 10 : 4;

  const chosen = interests.length ? interests : [company.industry, company.segment];
  const keywordHits = chosen.reduce((total, interest) => {
    const keywords = TOPIC_KEYWORDS[interest] ?? [interest];
    return total + (keywords.some((keyword) => corpus.includes(keyword)) ? 1 : 0);
  }, 0);

  const goalBonus =
    goal === "投资/产业"
      ? Math.round((maturity + capital) / 6)
      : goal === "采购/合作"
        ? Math.round(product / 3)
        : goal === "媒体/研究"
          ? Math.min(7, Math.round(corpus.length / 90))
          : Math.min(7, maturity > 10 ? 6 : 3);
  const fit = Math.min(20, 7 + keywordHits * 4 + goalBonus);
  const total = Math.min(100, product + maturity + capital + evidence + access + fit);

  const verdict =
    total >= 78
      ? "值得优先接洽"
      : total >= 62
        ? "建议现场验证"
        : "暂列观察名单";
  const action: Decision = total >= 78 ? "联系" : total >= 62 ? "观察" : "跳过";

  const strengths = [
    !isUnknown(company.business)
      ? `产品/业务指向明确：${company.business}`
      : "业务信息仍需现场补证",
    !isUnknown(company.financing)
      ? `资本阶段信号：${company.financing}`
      : "融资阶段未披露，需核验经营成熟度",
    company.booth ? `现场触达成本低：${company.venue} ${company.booth}` : "展位信息待确认",
  ];

  const risks = [
    isUnknown(company.investors) && "缺少股东/投资方验证信号",
    isUnknown(company.financing) && "缺少融资或经营阶段信息",
    /大模型|机器人|智能体/.test(company.industry + company.segment) &&
      "热门赛道同质化高，要追问真实客户与交付边界",
    /已上市/.test(company.financing) &&
      "资本成熟不等于合作匹配，仍需核对预算、接口与决策链",
  ].filter(Boolean) as string[];

  return {
    total,
    verdict,
    action,
    strengths,
    risks: risks.length ? risks : ["现有公开字段完整，但关键经营数据仍需现场核验"],
    breakdown: [
      { label: "产品清晰度", value: product, max: 20 },
      { label: "阶段成熟度", value: maturity, max: 20 },
      { label: "资本验证", value: capital, max: 15 },
      { label: "证据完整度", value: evidence, max: 14 },
      { label: "现场可达性", value: access, max: 10 },
      { label: "目标匹配", value: fit, max: 20 },
    ],
  };
}

function meetingQuestions(company: Exhibitor, goal: Goal) {
  const product = company.segment || company.industry || "核心产品";
  const common = [
    `你们在「${product}」里已经规模化交付的客户场景是什么？`,
    "能否给出一个可验证的效果指标：成本、准确率、时延或转化率？",
    "从试点到正式采购，最常卡在哪个接口、数据或组织环节？",
  ];
  const tailored: Record<Goal, string[]> = {
    "采购/合作": [
      "最小可行合作需要哪些数据、预算和实施周期？",
      "如果两周内做验证，双方各自需要投入什么？",
    ],
    "投资/产业": [
      `本轮或当前阶段最希望补齐的资源是什么？现有资本结构是 ${isUnknown(company.investors) ? "待核验" : "已有产业与财务投资人"}。`,
      "增长来自新增客户、客单价还是续费？未来 12 个月最关键里程碑是什么？",
    ],
    "媒体/研究": [
      "你们最希望行业停止误解的一件事是什么？",
      "有哪些公开案例、数据或负责人可以在会后继续采访？",
    ],
    "人才/求职": [
      "当前最缺的角色对应哪一个真实业务瓶颈？",
      "团队如何评价技术贡献与业务结果，试用期的成功标准是什么？",
    ],
  };
  return [...common, ...tailored[goal]];
}

function matchForums(company: Exhibitor, interests: string[]) {
  const corpus = `${company.industry} ${company.segment} ${company.business}`;
  const tokens = new Set<string>();
  for (const interest of interests) {
    for (const keyword of TOPIC_KEYWORDS[interest] ?? [interest]) tokens.add(keyword);
  }
  for (const [interest, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some((keyword) => corpus.includes(keyword))) {
      tokens.add(interest);
      keywords.forEach((keyword) => tokens.add(keyword));
    }
  }
  if (!tokens.size) {
    company.segment
      .split(/[、，,/\s]+/)
      .filter((token) => token.length >= 2)
      .forEach((token) => tokens.add(token));
  }

  return (forumPayload as Forum[])
    .map((forum) => {
      const text = `${forum.name} ${forum.nameRaw} ${forum.topic}`;
      let score = forum.topic === "前沿综合" ? 0 : 1;
      tokens.forEach((token) => {
        if (text.toLowerCase().includes(token.toLowerCase())) score += 3;
      });
      if (/世博|西岸|张江|Expo|Center|Hall|Room/.test(forum.location)) score += 1;
      return { ...forum, score };
    })
    .filter((forum) => forum.score > 1)
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
    .slice(0, 3);
}

function formatDate(date: string) {
  const [, month, day] = date.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

function buildContent(
  company: Exhibitor,
  score: ReturnType<typeof scoreCompany>,
  questions: string[],
  forums: ReturnType<typeof matchForums>,
  format: Format,
  tone: Tone,
  goal: Goal,
) {
  const name = companyName(company.company);
  const reason = score.strengths[0].replace("产品/业务指向明确：", "");
  const risk = score.risks[0];
  const session = forums[0]
    ? `${formatDate(forums[0].date)} ${forums[0].start}「${forums[0].name}」`
    : "暂无高匹配论坛，优先去展位做 15 分钟验证";

  if (format === "飞书跟进卡") {
    return `【WAIC 企业跟进卡】${name}

判断：${score.verdict}｜${score.total}/100
目标：${goal}
位置：${company.venue} ${company.booth}
赛道：${company.industry} / ${company.segment}

已知证据
1. 主营：${company.business}
2. 股东/投资：${company.investors}
3. 阶段：${company.financing}

待验证风险
${score.risks.map((item) => `- ${item}`).join("\n")}

现场必问
${questions.map((item, index) => `${index + 1}. ${item}`).join("\n")}

相关论坛
${session}

下一步：${score.action}｜负责人：____｜最晚跟进：____`;
  }

  if (format === "小绿书长文") {
    return `# WAIC 2026 企业观察：${name}

## 先给结论
${score.verdict}，接洽评分 ${score.total}/100。对「${goal}」读者来说，值得看的不是公司名气，而是它能否把 ${company.segment} 变成可验证的交付。

## 它在做什么
${reason}

## 为什么值得停留
展位在 ${company.venue} ${company.booth}。现有资本/阶段信号为：${company.financing}。这能说明资源与阶段，但不能替代客户、收入和交付证据。

## 还不能下结论的地方
${risk}

## 到现场只问这三件事
${questions.slice(0, 3).map((item, index) => `${index + 1}. ${item}`).join("\n")}

## 顺路可看的论坛
${session}

判断边界：以上基于公开整理资料，现场接洽前请核验最新口径。`;
  }

  const hooks: Record<Tone, string> = {
    行业判断: `逛 WAIC 不要只看热闹，${name} 这家我会不会聊？`,
    逛展速记: `今天在 WAIC 看到 ${name}，先记下这 3 个判断`,
    投融资观察: `${name} 值不值得聊？先拆资本信号，再看业务证据`,
    采购评估: `如果要采购/合作，我会用这 5 个问题筛 ${name}`,
  };

  return `${hooks[tone]}

先给结论：${score.verdict}，${score.total}/100。

📍 ${company.venue} ${company.booth}
🏷 ${company.industry}｜${company.segment}

它在做什么：
${reason}

为什么值得看：
${score.strengths.slice(1).map((item) => `· ${item}`).join("\n")}

但别急着被热词说服：
· ${risk}

到现场建议直接问：
1. ${questions[0]}
2. ${questions[1]}
3. ${questions[3]}

顺路论坛：${session}

你会把它放进「联系 / 观察 / 跳过」哪一档？

#WAIC2026 #世界人工智能大会 #AI行业观察 #上海逛展 #${company.industry.replace(/[与+]/g, "")}`;
}

function csvEscape(value: string | number) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export default function Home() {
  const exhibitors = exhibitorPayload.exhibitors as Exhibitor[];
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("全部行业");
  const [selectedId, setSelectedId] = useState(exhibitors[0].id);
  const [goal, setGoal] = useState<Goal>("采购/合作");
  const [interests, setInterests] = useState<string[]>(["智能体", "企业服务"]);
  const [format, setFormat] = useState<Format>("小红书笔记");
  const [tone, setTone] = useState<Tone>("行业判断");
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [note, setNote] = useState("");
  const [toast, setToast] = useState("");

  const industries = useMemo(
    () => ["全部行业", ...Array.from(new Set(exhibitors.map((item) => item.industry)))],
    [exhibitors],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return exhibitors
      .filter((item) => industry === "全部行业" || item.industry === industry)
      .filter((item) => {
        if (!needle) return true;
        return `${item.company} ${item.segment} ${item.business} ${item.booth}`
          .toLowerCase()
          .includes(needle);
      })
      .slice(0, 60);
  }, [exhibitors, industry, search]);

  const selected =
    exhibitors.find((item) => item.id === selectedId) ?? exhibitors[0];
  const score = useMemo(
    () => scoreCompany(selected, goal, interests),
    [selected, goal, interests],
  );
  const questions = useMemo(
    () => meetingQuestions(selected, goal),
    [selected, goal],
  );
  const matchedForums = useMemo(
    () => matchForums(selected, interests),
    [selected, interests],
  );
  const content = useMemo(
    () => buildContent(selected, score, questions, matchedForums, format, tone, goal),
    [selected, score, questions, matchedForums, format, tone, goal],
  );
  const savedDecision = decisions[selected.id] ?? score.action;

  useEffect(() => {
    const saved = window.localStorage.getItem("waic-decisions");
    if (saved) {
      try {
        setDecisions(JSON.parse(saved));
      } catch {
        // Ignore malformed local data.
      }
    }
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(`waic-note-${selected.id}`);
    setNote(saved ?? "");
  }, [selected.id]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  function toggleInterest(interest: string) {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  }

  function saveDecision(decision: Decision) {
    const next = { ...decisions, [selected.id]: decision };
    setDecisions(next);
    window.localStorage.setItem("waic-decisions", JSON.stringify(next));
    showToast(`已存为「${decision}」`);
  }

  function saveNote(value: string) {
    setNote(value);
    window.localStorage.setItem(`waic-note-${selected.id}`, value);
  }

  async function copyContent() {
    await navigator.clipboard.writeText(content);
    showToast("内容已复制");
  }

  function exportFeishuCsv() {
    const rows = [
      [
        "公司",
        "展位",
        "行业",
        "细分领域",
        "判断",
        "评分",
        "目标",
        "主营业务",
        "融资阶段",
        "风险",
        "现场问题",
        "备注",
      ],
      [
        selected.company,
        `${selected.venue} ${selected.booth}`,
        selected.industry,
        selected.segment,
        savedDecision,
        score.total,
        goal,
        selected.business,
        selected.financing,
        score.risks.join("；"),
        questions.join("；"),
        note,
      ],
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${companyName(selected.company)}-飞书跟进卡.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("已导出飞书 CSV");
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="返回顶部">
          <span className="brand-mark">W</span>
          <span>WAIC 接洽雷达</span>
        </a>
        <nav aria-label="页面导航">
          <a href="#decision">企业判断</a>
          <a href="#generator">内容生成</a>
          <a href="#feishu">飞书方案</a>
        </nav>
        <span className="live-chip">2026 · 上海</span>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">WAIC 2026 FIELD INTELLIGENCE</p>
          <h1>
            别只收藏展商名单。
            <br />
            <span>现场做出接洽判断。</span>
          </h1>
          <p className="hero-lede">
            从公司做什么、资本处在哪一段、还缺什么证据出发，生成一张能被读者真正使用的企业判断卡。
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#decision">
              开始筛企业 <span>→</span>
            </a>
            <a className="secondary-button" href="#method">
              看判断方法
            </a>
          </div>
        </div>
        <div className="hero-board" aria-label="数据概览">
          <div className="board-stamp">OPENING DAY</div>
          <p className="board-kicker">今日扫描范围</p>
          <strong>{exhibitorPayload.count}</strong>
          <span>家展商</span>
          <div className="board-grid">
            <div>
              <b>8</b>
              <span>行业</span>
            </div>
            <div>
              <b>{forumPayload.length}</b>
              <span>论坛摘要</span>
            </div>
            <div>
              <b>0</b>
              <span>API 成本</span>
            </div>
          </div>
          <p className="board-note">数据在浏览器本地计算，不上传企业选择与笔记。</p>
        </div>
      </section>

      <section className="workspace" id="decision">
        <div className="section-heading">
          <div>
            <p className="eyebrow">01 · PICK & DECIDE</p>
            <h2>先选企业，再看证据</h2>
          </div>
          <p>评分只是压缩信息的入口；真正的判断来自可验证事实、风险边界与下一步问题。</p>
        </div>

        <div className="goal-bar">
          <div className="control-group">
            <span>你的目标</span>
            <div className="segmented">
              {GOALS.map((item) => (
                <button
                  className={goal === item ? "active" : ""}
                  key={item}
                  onClick={() => setGoal(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="control-group interest-control">
            <span>关注方向</span>
            <div className="interest-list">
              {INTERESTS.map((item) => (
                <button
                  className={interests.includes(item) ? "active" : ""}
                  key={item}
                  onClick={() => toggleInterest(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="decision-grid">
          <aside className="company-panel">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                aria-label="搜索公司、展位或赛道"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="公司 / 展位 / 赛道"
                value={search}
              />
            </label>
            <select
              aria-label="按行业筛选"
              onChange={(event) => setIndustry(event.target.value)}
              value={industry}
            >
              {industries.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <div className="result-meta">
              <span>显示 {filtered.length} 家</span>
              <span>点击切换</span>
            </div>
            <div className="company-list">
              {filtered.map((company) => (
                <button
                  className={company.id === selected.id ? "company-row active" : "company-row"}
                  key={company.id}
                  onClick={() => setSelectedId(company.id)}
                  type="button"
                >
                  <span className="company-index">{String(company.id).padStart(3, "0")}</span>
                  <span>
                    <b>{companyName(company.company)}</b>
                    <small>
                      {company.segment} · {company.booth}
                    </small>
                  </span>
                  <i aria-hidden="true">›</i>
                </button>
              ))}
              {!filtered.length && (
                <div className="empty-state">没有找到匹配展商，换个关键词试试。</div>
              )}
            </div>
          </aside>

          <article className="evidence-card">
            <div className="evidence-header">
              <div>
                <div className="company-tags">
                  <span>{selected.industry}</span>
                  <span>{selected.location}</span>
                </div>
                <h3>{companyName(selected.company)}</h3>
                <p>{selected.company.split("/")[0].trim()}</p>
              </div>
              <div className={`score-ring score-${score.action}`}>
                <strong>{score.total}</strong>
                <span>/ 100</span>
              </div>
            </div>

            <div className="verdict-strip">
              <div>
                <span>当前判断</span>
                <strong>{score.verdict}</strong>
              </div>
              <p>
                {selected.venue} <b>{selected.booth}</b>
              </p>
            </div>

            <div className="evidence-block">
              <p className="block-label">它在做什么</p>
              <p className="business-copy">{selected.business}</p>
              <div className="fact-grid">
                <div>
                  <span>细分领域</span>
                  <b>{selected.segment}</b>
                </div>
                <div>
                  <span>资本 / 股东</span>
                  <b>{selected.investors}</b>
                </div>
                <div>
                  <span>融资 / 阶段</span>
                  <b>{selected.financing}</b>
                </div>
              </div>
            </div>

            <div className="score-breakdown">
              <p className="block-label">判断拆解</p>
              {score.breakdown.map((item) => (
                <div className="score-line" key={item.label}>
                  <span>{item.label}</span>
                  <div>
                    <i style={{ width: `${(item.value / item.max) * 100}%` }} />
                  </div>
                  <b>{item.value}</b>
                </div>
              ))}
            </div>

            <div className="risk-box">
              <span>先别急着下结论</span>
              <ul>
                {score.risks.map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
            </div>

            <div className="decision-actions">
              <span>你的最终判断</span>
              <div>
                {(["跳过", "观察", "联系"] as Decision[]).map((item) => (
                  <button
                    className={savedDecision === item ? `active ${item}` : item}
                    key={item}
                    onClick={() => saveDecision(item)}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </article>
        </div>

        <div className="next-grid">
          <article className="questions-card">
            <div className="mini-heading">
              <span>现场对话</span>
              <b>五问定去留</b>
            </div>
            <ol>
              {questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ol>
            <label>
              <span>你的现场备注</span>
              <textarea
                onChange={(event) => saveNote(event.target.value)}
                placeholder="例如：创始团队在场、约了明天下午 Demo、需核验客户名单……"
                value={note}
              />
            </label>
          </article>

          <article className="forum-card">
            <div className="mini-heading">
              <span>论坛匹配</span>
              <b>顺路再验证</b>
            </div>
            <div className="forum-list">
              {matchedForums.length ? (
                matchedForums.map((forum) => (
                  <div className="forum-row" key={forum.id}>
                    <time>
                      <b>{formatDate(forum.date)}</b>
                      <span>{forum.start}</span>
                    </time>
                    <div>
                      <strong>{forum.name}</strong>
                      <p>{forum.location || forum.locationRaw}</p>
                      <small>主题：{forum.topic} · 来源 PDF 第 {forum.sourcePage} 页</small>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">暂无高匹配论坛，建议直接去展位做验证。</div>
              )}
            </div>
            <p className="ocr-note">
              论坛日程来自图片版 PDF 的 OCR 摘要，名称与地点请以原日程为准。
            </p>
          </article>
        </div>
      </section>

      <section className="generator-section" id="generator">
        <div className="section-heading inverse">
          <div>
            <p className="eyebrow">02 · TURN SIGNALS INTO CONTENT</p>
            <h2>一键生成，不替读者下结论</h2>
          </div>
          <p>每条内容固定包含：结论、证据、风险、现场问题和来源边界。</p>
        </div>

        <div className="generator-grid">
          <div className="generator-controls">
            <div className="control-card">
              <span>内容载体</span>
              {FORMATS.map((item) => (
                <button
                  className={format === item ? "active" : ""}
                  key={item}
                  onClick={() => setFormat(item)}
                  type="button"
                >
                  <b>{item}</b>
                  <small>
                    {item === "小红书笔记"
                      ? "适合现场速发与收藏"
                      : item === "小绿书长文"
                        ? "适合深度判断与转发"
                        : "适合团队协作与会后跟进"}
                  </small>
                </button>
              ))}
            </div>
            <div className="tone-card">
              <span>表达角度</span>
              <div>
                {TONES.map((item) => (
                  <button
                    className={tone === item ? "active" : ""}
                    key={item}
                    onClick={() => setTone(item)}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="guardrail-card">
              <b>内容护栏</b>
              <p>✓ 不把融资等同于客户验证</p>
              <p>✓ 不补写资料里没有的数字</p>
              <p>✓ 强制保留现场核验问题</p>
            </div>
          </div>

          <article className="content-preview">
            <div className="preview-toolbar">
              <span>
                <i />
                {format}
              </span>
              <button onClick={copyContent} type="button">
                复制全文
              </button>
            </div>
            <pre>{content}</pre>
          </article>
        </div>
      </section>

      <section className="method-section" id="method">
        <div className="section-heading">
          <div>
            <p className="eyebrow">03 · DECISION DESIGN</p>
            <h2>让读者形成判断的内容结构</h2>
          </div>
          <p>最有效的不是“公司介绍”，而是把信息排成一条可行动的证据链。</p>
        </div>
        <div className="method-flow">
          {[
            ["01", "一句话结论", "先告诉读者：联系、观察还是跳过。"],
            ["02", "三条已知证据", "产品、资本阶段、现场位置，全部可追溯。"],
            ["03", "一个关键反证", "提醒融资、热度或技术名词不能证明什么。"],
            ["04", "三个现场问题", "把阅读兴趣转成可执行的验证动作。"],
            ["05", "一条跟进出口", "表单回执、负责人、截止时间，避免收藏即结束。"],
          ].map(([index, title, copy]) => (
            <article key={index}>
              <span>{index}</span>
              <b>{title}</b>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="feishu-section" id="feishu">
        <div className="feishu-copy">
          <p className="eyebrow">04 · FREE HYBRID SETUP</p>
          <h2>公开阅读用网页，团队协作用飞书</h2>
          <p>
            网页负责把信息讲清楚；飞书多维表格负责分配负责人、收集读者回执和推进线索。两边都不需要自建服务器。
          </p>
          <button className="export-button" onClick={exportFeishuCsv} type="button">
            导出当前企业到飞书 CSV <span>↓</span>
          </button>
        </div>
        <div className="feishu-blueprint">
          <div className="blueprint-head">
            <span>推荐表结构</span>
            <b>4 张表 + 1 个自动化</b>
          </div>
          <div className="table-row">
            <b>企业库</b>
            <span>展商资料 · 证据字段 · 来源</span>
            <i>963</i>
          </div>
          <div className="table-row">
            <b>判断记录</b>
            <span>目标 · 评分 · 联系/观察/跳过</span>
            <i>判断</i>
          </div>
          <div className="table-row">
            <b>内容草稿</b>
            <span>平台 · 角度 · 状态 · 发布链接</span>
            <i>生成</i>
          </div>
          <div className="table-row">
            <b>线索回执</b>
            <span>读者意向 · 联系方式 · 跟进人</span>
            <i>表单</i>
          </div>
          <div className="automation-row">
            <span>当「判断 = 联系」</span>
            <span>→</span>
            <b>通知负责人并创建跟进截止日</b>
          </div>
        </div>
      </section>

      <footer>
        <div>
          <b>WAIC 接洽雷达</b>
          <p>依据用户提供的 WAIC 2026 展商扫描表与论坛一览表整理。</p>
        </div>
        <p>
          公开资料仅用于交流与现场决策辅助。企业信息、融资与日程可能变化，正式接洽前请二次核验。
        </p>
      </footer>

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
