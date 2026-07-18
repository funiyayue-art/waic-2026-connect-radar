import assert from "node:assert/strict";
import test from "node:test";
import exhibitorPayload from "../app/data/exhibitors.json" with { type: "json" };
import { buildCompanyIndex } from "../app/search/buildIndex.js";
import {
  explainSearchMatch,
  searchCompanies,
} from "../app/search/searchCompanies.js";
import { normalizeBoothNumber } from "../app/search/normalize.js";

const realIndex = buildCompanyIndex(exhibitorPayload.exhibitors);

function company(id, overrides = {}) {
  return {
    id,
    company: `测试企业${id}`,
    venue: "测试展馆",
    booth: `H1-A00${id}`,
    industry: "AI技术与算法",
    segment: "测试领域",
    business: "测试业务",
    investors: "未公开",
    financing: "未公开",
    location: "上海",
    ...overrides,
  };
}

test("searches real exhibitors by manual alias and brand alias", () => {
  assert.match(
    searchCompanies(realIndex, "零一", { limit: 1 })[0].company.company,
    /零一万物/,
  );
  assert.match(
    searchCompanies(realIndex, "01AI", { limit: 1 })[0].company.company,
    /零一万物/,
  );
  assert.match(
    searchCompanies(realIndex, "Kimi", { limit: 1 })[0].company.company,
    /月之暗面/,
  );
});

test("searches Chinese companies by full pinyin and initials", () => {
  const full = searchCompanies(realIndex, "lingyi", { limit: 1 })[0];
  const initials = searchCompanies(realIndex, "lyww", { limit: 1 })[0];
  assert.match(full.company.company, /零一万物/);
  assert.ok(full.matchTypes.includes("pinyin"));
  assert.match(initials.company.company, /零一万物/);
  assert.ok(initials.matchTypes.includes("initials"));
});

test("offers a high-confidence correction without flooding fuzzy results", () => {
  const result = searchCompanies(realIndex, "零一万务", { limit: 10 });
  assert.match(result[0].company.company, /零一万物/);
  assert.deepEqual(result[0].suggestions, ["零一万物"]);
  assert.match(explainSearchMatch(result[0], "零一万务"), /你可能在找/);
  assert.ok(result.length < 10);
});

test("does not over-fuzz two-character queries", () => {
  const index = buildCompanyIndex([
    company(1, { company: "智航科技有限公司" }),
  ]);
  assert.deepEqual(searchCompanies(index, "智杭"), []);
});

test("expands synonyms after direct hits", () => {
  const index = buildCompanyIndex([
    company(1, { company: "具身未来科技有限公司", business: "具身操作模型" }),
    company(2, { company: "机器人应用有限公司", business: "工业机器人" }),
  ]);
  const results = searchCompanies(index, "具身");
  assert.equal(results[0].companyId, 1);
  assert.ok(results.some((result) => result.companyId === 2));
  assert.ok(results[0].score > results.find((result) => result.companyId === 2).score);
});

test("normalizes booth numbers and supports partial booth search", () => {
  for (const value of [
    "E7-A12",
    "e7-a12",
    "E7 A12",
    "E7A12",
    "E7－A12",
    "Ｅ７－Ａ１２",
    "E7/A12",
    "E7_A12",
  ]) {
    assert.equal(normalizeBoothNumber(value), "E7A12");
  }

  const index = buildCompanyIndex([
    company(1, { booth: "E7-A12" }),
    company(2, { booth: "H1-B02" }),
  ]);
  assert.equal(searchCompanies(index, "Ｅ７－Ａ１２")[0].companyId, 1);
  assert.equal(searchCompanies(index, "E7A")[0].companyId, 1);
});

test("ranks companies matching all keywords across different fields first", () => {
  const index = buildCompanyIndex([
    company(1, {
      booth: "E7-A12",
      business: "工业机器人和具身智能演示",
    }),
    company(2, {
      booth: "E7-B01",
      business: "AI 芯片",
    }),
    company(3, {
      booth: "H1-A01",
      business: "工业机器人",
    }),
  ]);
  const results = searchCompanies(index, "E7 机器人");
  assert.equal(results[0].companyId, 1);
  assert.deepEqual(new Set(results[0].matchedTerms), new Set(["e7", "机器人"]));
  assert.ok(results[0].matchedFields.includes("booth"));
  assert.ok(results[0].matchedFields.includes("business"));
});

test("supports category filtering without changing the search index", () => {
  const index = buildCompanyIndex([
    company(1, { business: "工业 Agent" }),
    company(2, { business: "医疗 Agent" }),
  ]);
  const results = searchCompanies(index, "Agent", {
    allowedIds: new Set([2]),
  });
  assert.deepEqual(results.map((result) => result.companyId), [2]);
});

test("returns no results for empty input", () => {
  assert.deepEqual(searchCompanies(realIndex, "   "), []);
});
