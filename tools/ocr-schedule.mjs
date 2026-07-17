import fs from "node:fs/promises";
import path from "node:path";
import { createWorker } from "tesseract.js";

const imageDir = process.argv[2];
const outputPath = process.argv[3];
if (!imageDir || !outputPath) {
  throw new Error("Usage: node ocr-schedule.mjs <image-dir> <output.json>");
}

const imageNames = (await fs.readdir(imageDir))
  .filter((name) => /^waic-forums-\d+\.png$/i.test(name))
  .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));

const worker = await createWorker(["chi_sim", "eng"], 1, {
  logger(message) {
    if (message.status === "recognizing text") {
      console.log(`${message.status}: ${Math.round(message.progress * 100)}%`);
    } else {
      console.log(message.status);
    }
  },
});

await worker.setParameters({
  preserve_interword_spaces: "1",
});

const pages = [];
for (const imageName of imageNames) {
  console.log(`OCR ${imageName}`);
  const result = await worker.recognize(path.join(imageDir, imageName));
  pages.push({
    page: Number(imageName.match(/\d+/)?.[0]),
    image: imageName,
    text: result.data.text,
  });
}

await worker.terminate();
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(pages, null, 2), "utf8");
console.log(`Saved ${pages.length} pages to ${outputPath}`);
