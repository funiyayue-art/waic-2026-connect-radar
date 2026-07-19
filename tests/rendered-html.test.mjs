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
  assert.match(html, /告诉你该见谁、为何值得聊、现场问什么/);
  assert.match(html, /我先随便逛逛/);
  assert.match(html, /帮我规划该见谁/);
  assert.match(html, /搜索全部展商/);
  assert.match(html, /换一批/);
  assert.match(html, /先说你是谁，再判断谁值得见/);
  assert.match(html, /用户身份/);
  assert.match(html, /本次参会目标/);
  assert.match(html, /你可以提供的资源/);
  assert.match(html, /生成企业推荐/);
  assert.match(html, /我的企业/);
  assert.match(html, /准备接洽企业/);
  assert.match(html, /资料不足时不强行评分/);
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

  assert.match(page, /DecisionApp/);
  const decisionApp = await readFile(
    new URL("../app/DecisionApp.tsx", import.meta.url),
    "utf8",
  );
  const recommendation = await readFile(
    new URL("../app/recommendation.js", import.meta.url),
    "utf8",
  );
  const persistence = await readFile(
    new URL("../app/workspace-persistence.js", import.meta.url),
    "utf8",
  );
  assert.match(decisionApp, /生成企业推荐/);
  assert.match(decisionApp, /自动保存 · 微信返回保护/);
  assert.match(decisionApp, /已恢复上次筛选进度/);
  assert.match(decisionApp, /复制继续链接/);
  assert.match(decisionApp, /pagehide/);
  assert.match(decisionApp, /visibilitychange/);
  assert.match(decisionApp, /recordDraft/);
  assert.match(decisionApp, /scrollY/);
  assert.match(persistence, /waic-workspace-snapshot-v4/);
  assert.match(persistence, /WORKSPACE_RESUME_PREFIX/);
  assert.match(decisionApp, /ExploreMode/);
  assert.match(decisionApp, /BottomNavigation/);
  assert.match(decisionApp, /BackToTop/);
  assert.match(decisionApp, /现场验证问题/);
  assert.match(decisionApp, /建议开场话术/);
  assert.match(decisionApp, /记录现场沟通/);
  assert.match(recommendation, /行业匹配/);
  assert.match(recommendation, /资源互补/);
  assert.match(recommendation, /信息不足/);
  assert.doesNotMatch(decisionApp, /小红书笔记|小绿书长文|内容生成器/);
  assert.match(layout, /og\.png/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.equal(JSON.parse(exhibitors).count, 963);
  assert.ok(JSON.parse(forums).length >= 70);
  assert.match(pagesIndex, /WAIC 接洽雷达/);
  assert.match(pagesIndex, /企业接洽决策助手/);
  assert.doesNotMatch(pagesIndex, /内容生成器/);

  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../app/data/company-aliases.json", import.meta.url));
  await access(new URL("../app/data/search-synonyms.json", import.meta.url));
  await access(new URL("../app/search/searchCompanies.js", import.meta.url));
  await access(new URL("../app/workspace-persistence.js", import.meta.url));
  await access(new URL("../.github/workflows/pages.yml", import.meta.url));
  await assert.rejects(
    access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)),
  );
});
