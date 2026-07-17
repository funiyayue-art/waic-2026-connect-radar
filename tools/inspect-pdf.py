import json
import sys

import pdfplumber


def clean(value):
    if value is None:
        return None
    return "\n".join(part.strip() for part in value.splitlines() if part.strip())


pdf_path = sys.argv[1]
summary = []
with pdfplumber.open(pdf_path) as pdf:
    for page_number, page in enumerate(pdf.pages, 1):
        tables = page.extract_tables()
        cleaned = [
            [[clean(cell) for cell in row] for row in table]
            for table in tables
        ]
        summary.append(
            {
                "page": page_number,
                "table_count": len(cleaned),
                "row_counts": [len(table) for table in cleaned],
                "preview": cleaned[0][:8] if cleaned else [],
                "text_preview": (page.extract_text() or "")[:3000],
            }
        )

print(json.dumps(summary, ensure_ascii=False, indent=2))
