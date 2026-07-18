import assert from "node:assert/strict";
import test from "node:test";
import exhibitorPayload from "../app/data/exhibitors.json" with { type: "json" };
import {
  filterExploreCompanies,
  selectExploreBatch,
} from "../app/explore.js";
import { buildSuggestedRoute } from "../app/route-planner.js";

test("random discovery returns six real, information-rich exhibitors", () => {
  const batch = selectExploreBatch(exhibitorPayload.exhibitors, {
    seed: 7,
  });
  assert.equal(batch.length, 6);
  assert.equal(new Set(batch.map((company) => company.id)).size, 6);
  assert.ok(batch.every((company) => company.company && company.booth));
  const segmentCounts = batch.reduce((counts, company) => {
    counts[company.segment] = (counts[company.segment] ?? 0) + 1;
    return counts;
  }, {});
  assert.ok(Object.values(segmentCounts).every((count) => count <= 2));
});

test("random discovery respects category, ignored IDs and recent history", () => {
  const robots = filterExploreCompanies(exhibitorPayload.exhibitors, "robot");
  assert.ok(robots.length > 6);
  const first = selectExploreBatch(exhibitorPayload.exhibitors, {
    categoryId: "robot",
    ignoredIds: [robots[0].id],
    seed: 3,
  });
  const second = selectExploreBatch(exhibitorPayload.exhibitors, {
    categoryId: "robot",
    historyIds: first.map((company) => company.id),
    ignoredIds: [robots[0].id],
    seed: 4,
  });
  assert.ok(first.every((company) => company.id !== robots[0].id));
  assert.ok(second.every((company) => !first.some((item) => item.id === company.id)));
});

function recommendation(id, venue, booth, priority = "A") {
  return {
    company: { id, company: `企业${id}`, venue, booth },
    priority: { code: priority },
  };
}

test("route uses the contact list before recommendations and preserves manual order", () => {
  const saved = [
    recommendation(2, "H2", "H2-B09"),
    recommendation(1, "H2", "H2-A01"),
    recommendation(3, "H1", "H1-C03"),
  ];
  const groups = buildSuggestedRoute({
    savedRecommendations: saved,
    recommendations: [recommendation(9, "H9", "H9-A01")],
    timeBudget: "2小时",
  });
  assert.deepEqual(groups[0][1].map((item) => item.company.id), [2, 1]);
  assert.equal(groups.flatMap(([, entries]) => entries).length, 3);
});

test("route falls back to A/B recommendations, groups venues and limits time budget", () => {
  const recommendations = [
    recommendation(1, "H2", "H2-B09", "A"),
    recommendation(2, "H1", "H1-C03", "B"),
    recommendation(3, "H1", "H1-A01", "B"),
    recommendation(4, "H3", "H3-A01", "A"),
    recommendation(5, "H4", "H4-A01", "C"),
  ];
  const groups = buildSuggestedRoute({
    savedRecommendations: [],
    recommendations,
    timeBudget: "30分钟",
  });
  const flattened = groups.flatMap(([, entries]) => entries);
  assert.equal(flattened.length, 3);
  assert.ok(flattened.every((item) => ["A", "B"].includes(item.priority.code)));
  const h1 = groups.find(([venue]) => venue === "H1");
  assert.deepEqual(h1[1].map((item) => item.company.booth), ["H1-A01", "H1-C03"]);
});
