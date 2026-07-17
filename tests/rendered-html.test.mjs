import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html", host: "localhost" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the WAIC decision tool", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /WAIC 接洽雷达/);
  assert.match(html, /别只收藏展商名单/);
  assert.match(html, /先录企业，再说为什么见/);
  assert.match(html, /我的企业画像/);
  assert.match(html, /为什么值得去/);
  assert.match(html, /可能形成什么/);
  assert.match(html, /今天先看这 3 家/);
  assert.match(html, /生成今日清单/);
  assert.match(html, /企业判断/);
  assert.match(html, /内容生成/);
  assert.match(html, /飞书方案/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("ships local data and both deployment targets", async () => {
  const [page, layout, packageJson, exhibitors, forums, pagesIndex] =
    await Promise.all([
      readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
      readFile(new URL("../app/data/exhibitors.json", import.meta.url), "utf8"),
      readFile(new URL("../app/data/forums.json", import.meta.url), "utf8"),
      readFile(new URL("../github-pages/dist/index.html", import.meta.url), "utf8"),
    ]);

  assert.match(page, /小红书笔记/);
  assert.match(page, /小绿书长文/);
  assert.match(page, /飞书跟进卡/);
  assert.match(page, /exportFeishuCsv/);
  assert.match(page, /waic-contact-statuses/);
  assert.match(page, /waic-business-profile/);
  assert.match(page, /TRAINING_DEMO_PROFILE/);
  assert.match(page, /潜在客户/);
  assert.match(page, /上游能力方/);
  assert.match(page, /mobile-action-bar/);
  assert.match(layout, /og\.png/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.equal(JSON.parse(exhibitors).count, 963);
  assert.ok(JSON.parse(forums).length >= 70);
  assert.match(pagesIndex, /WAIC 接洽雷达/);

  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../.github/workflows/pages.yml", import.meta.url));
  await assert.rejects(
    access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)),
  );
});
