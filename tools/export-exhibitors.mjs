import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbookPath = process.argv[2];
const outputPath = process.argv[3];
if (!workbookPath || !outputPath) {
  throw new Error("Usage: node export-exhibitors.mjs <workbook.xlsx> <output.json>");
}

const input = await FileBlob.load(workbookPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem("全部汇总");
const matrix = await sheet.getRange("A5:J968").values;
const [headers, ...rows] = matrix;

const exhibitors = rows
  .filter((row) => row[0] != null && row[1])
  .map((row) => ({
    id: Number(row[0]),
    company: String(row[1] ?? ""),
    venue: String(row[2] ?? ""),
    booth: String(row[3] ?? ""),
    industry: String(row[4] ?? ""),
    segment: String(row[5] ?? ""),
    business: String(row[6] ?? ""),
    investors: String(row[7] ?? ""),
    financing: String(row[8] ?? ""),
    location: String(row[9] ?? ""),
  }));

const payload = {
  source: path.basename(workbookPath),
  extractedAt: "2026-07-17",
  count: exhibitors.length,
  fields: headers.map((header) => String(header ?? "")),
  exhibitors,
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(payload), "utf8");
console.log(
  JSON.stringify({
    count: exhibitors.length,
    industries: [...new Set(exhibitors.map((item) => item.industry))].length,
    venues: [...new Set(exhibitors.map((item) => item.venue))].length,
    sample: exhibitors.slice(0, 3),
  }),
);
