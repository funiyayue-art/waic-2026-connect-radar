import fs from "node:fs/promises";
import path from "node:path";
import { createWorker } from "tesseract.js";

const imageDir = process.argv[2];
const outputPath = process.argv[3];
if (!imageDir || !outputPath) {
  throw new Error("Usage: node ocr-layout.mjs <image-dir> <output.json>");
}

const imageNames = (await fs.readdir(imageDir))
  .filter((name) => /^waic-forums-\d+\.png$/i.test(name))
  .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));

const worker = await createWorker(["chi_sim", "eng"]);
await worker.setParameters({ preserve_interword_spaces: "1" });

const pages = [];
for (const imageName of imageNames) {
  console.log(`Layout OCR ${imageName}`);
  const result = await worker.recognize(
    path.join(imageDir, imageName),
    {},
    { text: true, tsv: true },
  );
  pages.push({
    page: Number(imageName.match(/\d+/)?.[0]),
    image: imageName,
    text: result.data.text,
    tsv: result.data.tsv,
  });
}

await worker.terminate();
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(pages), "utf8");
console.log(`Saved ${pages.length} pages to ${outputPath}`);
