import assert from "node:assert/strict";
import test from "node:test";
import {
  WORKSPACE_CLEAR_TOMBSTONE_KEY,
  WORKSPACE_RESUME_PREFIX,
  WORKSPACE_SNAPSHOT_KEY,
  buildWorkspaceResumeHash,
  clearWorkspacePersistence,
  createWorkspaceSnapshot,
  decodeWorkspaceResumeHash,
  hasMeaningfulWorkspaceProgress,
  loadWorkspaceSnapshot,
  migrateLegacyWorkspace,
  normalizeWorkspaceSnapshot,
  persistWorkspaceSnapshot,
} from "../app/workspace-persistence.js";

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

function sampleSnapshot() {
  return createWorkspaceSnapshot(
    {
      activeMode: "my",
      draft: {
        role: "产业服务机构",
        industries: ["制造业"],
        goals: ["找产品或技术供应商"],
        interests: ["工业 AI"],
        resources: ["客户资源"],
        currentNeed: "寻找可以一起服务制造企业的产品",
      },
      profile: {
        role: "产业服务机构",
        industries: ["制造业"],
        goals: ["找产品或技术供应商"],
        interests: ["工业 AI"],
        resources: ["客户资源"],
        currentNeed: "寻找可以一起服务制造企业的产品",
      },
      generated: true,
      recommendation: {
        search: "机器人",
        priorityFilter: "A",
        categoryFilter: "机器人与智能硬件",
        directionFilter: "工业 AI",
      },
      explore: {
        input: "零一",
        query: "零一",
        categoryId: "agent",
        batchSeed: 4,
        historyIds: [1, 2, 3],
        recentSearches: ["零一"],
        visibleLimit: 60,
        detailId: 5,
      },
      savedCompanies: [
        {
          companyId: 4,
          source: "recommendation",
          savedAt: "2026-07-18T12:00:00.000Z",
        },
        {
          companyId: 5,
          source: "explore",
          savedAt: "2026-07-18T12:01:00.000Z",
        },
      ],
      ignoredIds: [9],
      focusCompanyId: 4,
      selectedCompanyId: 4,
      records: {
        4: {
          status: "已接洽",
          note: "已添加微信，约下周演示",
          followUp: true,
          updatedAt: "2026-07-18T12:02:00.000Z",
        },
      },
      recordDraft: {
        recordingId: 5,
        status: "会后跟进",
        note: "刚交换名片，问题还没填写完",
        followUp: true,
      },
      timeBudget: "半天",
      scrollY: 1836,
    },
    "2026-07-18T12:03:00.000Z",
  );
}

test("round-trips the complete workspace through local storage", () => {
  const storage = new MemoryStorage();
  const locationLike = {
    pathname: "/waic-2026-connect-radar/",
    search: "",
    hash: "",
  };
  const historyApi = {
    state: null,
    replaceState(_state, _title, url) {
      this.url = url;
      locationLike.hash = url.includes("#") ? url.slice(url.indexOf("#")) : "";
    },
  };
  const snapshot = sampleSnapshot();

  const persistResult = persistWorkspaceSnapshot(
    storage,
    historyApi,
    locationLike,
    snapshot,
  );
  assert.equal(persistResult.savedLocally, true);
  assert.equal(persistResult.savedInUrl, true);
  assert.ok(storage.getItem(WORKSPACE_SNAPSHOT_KEY));
  assert.match(historyApi.url, new RegExp(`#${WORKSPACE_RESUME_PREFIX}`));

  const loaded = loadWorkspaceSnapshot(storage, locationLike.hash);
  assert.equal(loaded.source, "local");
  assert.deepEqual(loaded.snapshot.savedCompanies, snapshot.savedCompanies);
  assert.equal(loaded.snapshot.recommendation.search, "机器人");
  assert.equal(loaded.snapshot.records[4].note, "已添加微信，约下周演示");
  assert.equal(loaded.snapshot.recordDraft.recordingId, 5);
  assert.equal(loaded.snapshot.recordDraft.note, "刚交换名片，问题还没填写完");
  assert.equal(loaded.snapshot.timeBudget, "半天");
  assert.equal(loaded.snapshot.scrollY, 1836);
});

test("uses a privacy-limited URL fallback when WebView storage is unavailable", () => {
  const snapshot = sampleSnapshot();
  const hash = buildWorkspaceResumeHash(snapshot);
  const restored = decodeWorkspaceResumeHash(hash);

  assert.match(hash, new RegExp(`^#${WORKSPACE_RESUME_PREFIX}`));
  assert.equal(restored.savedCompanies.length, 2);
  assert.equal(restored.recommendation.priorityFilter, "A");
  assert.equal(restored.explore.query, "零一");
  assert.equal(restored.explore.detailId, 5);
  assert.equal(restored.selectedCompanyId, null);
  assert.equal(restored.scrollY, 1836);
  assert.equal(restored.draft.role, "");
  assert.deepEqual(restored.draft.industries, []);
  assert.equal(restored.profile.role, "");
  assert.deepEqual(restored.profile.resources, []);
  assert.equal(restored.generated, false);
  assert.equal(restored.draft.currentNeed, "");
  assert.deepEqual(restored.records, {});
  assert.equal(restored.recordDraft.recordingId, null);

  const encoded = hash.slice(`#${WORKSPACE_RESUME_PREFIX}`.length);
  const compact = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  assert.deepEqual(
    Object.keys(compact).sort(),
    ["b", "e", "f", "i", "m", "r", "s", "t", "v", "x", "y"].sort(),
  );
  assert.doesNotMatch(
    JSON.stringify(compact),
    /产业服务机构|客户资源|寻找可以一起服务|已添加微信|刚交换名片/,
  );

  const failingStorage = {
    getItem() {
      throw new Error("storage unavailable");
    },
  };
  const loaded = loadWorkspaceSnapshot(failingStorage, hash);
  assert.equal(loaded.source, "url");
  assert.equal(loaded.snapshot.focusCompanyId, 4);
});

test("migrates the previous scattered local keys into one snapshot", () => {
  const storage = new MemoryStorage();
  storage.setItem(
    "waic-decision-profile-v3",
    JSON.stringify({
      role: "投资人",
      industries: ["机器人"],
      goals: ["找投资项目"],
      interests: ["具身智能"],
      resources: ["资金"],
      currentNeed: "",
    }),
  );
  storage.setItem(
    "waic-saved-companies-v3",
    JSON.stringify([
      {
        companyId: 88,
        source: "recommendation",
        savedAt: "2026-07-18T10:00:00.000Z",
      },
    ]),
  );
  storage.setItem("waic-explore-history-v1", JSON.stringify([1, 2, 3]));

  const migrated = migrateLegacyWorkspace(storage);
  assert.equal(migrated.generated, true);
  assert.equal(migrated.activeMode, "my");
  assert.equal(migrated.savedCompanies[0].companyId, 88);
  assert.deepEqual(migrated.explore.historyIds, [1, 2, 3]);

  persistWorkspaceSnapshot(storage, {}, {}, migrated);
  assert.equal(storage.getItem("waic-decision-profile-v3"), null);
  assert.equal(storage.getItem("waic-saved-companies-v3"), null);
  assert.equal(storage.getItem("waic-explore-history-v1"), null);
});

test("uses the newer URL snapshot but keeps equal timestamps local", () => {
  const storage = new MemoryStorage();
  const local = sampleSnapshot();
  storage.setItem(WORKSPACE_SNAPSHOT_KEY, JSON.stringify(local));
  const newer = createWorkspaceSnapshot(
    {
      ...local,
      recommendation: {
        ...local.recommendation,
        search: "更新后的搜索",
      },
    },
    "2026-07-18T12:04:00.000Z",
  );

  const newerResult = loadWorkspaceSnapshot(
    storage,
    buildWorkspaceResumeHash(newer),
  );
  assert.equal(newerResult.source, "url");
  assert.equal(newerResult.snapshot.recommendation.search, "更新后的搜索");
  assert.equal(newerResult.snapshot.profile.role, "产业服务机构");
  assert.equal(
    newerResult.snapshot.records[4].note,
    "已添加微信，约下周演示",
  );
  assert.equal(newerResult.snapshot.recordDraft.recordingId, 5);

  const equalResult = loadWorkspaceSnapshot(
    storage,
    buildWorkspaceResumeHash(local),
  );
  assert.equal(equalResult.source, "local");
  assert.equal(equalResult.snapshot.records[4].note, "已添加微信，约下周演示");
});

test("normalizes malformed snapshot fields instead of crashing restore", () => {
  const normalized = normalizeWorkspaceSnapshot({
    activeMode: "invalid",
    generated: true,
    profile: { role: 123, industries: "制造业" },
    recommendation: { priorityFilter: "Z" },
    explore: { batchSeed: -1, visibleLimit: 2 },
    savedCompanies: [
      { companyId: "4", source: "recommendation" },
      { companyId: 5, source: "unknown" },
    ],
    ignoredIds: [1, 1, -2, "3"],
    records: { bad: { status: "已接洽" } },
    recordDraft: {
      recordingId: -3,
      status: "不存在",
      note: "不应保留",
    },
    timeBudget: "三天",
    scrollY: -20,
  });

  assert.equal(normalized.activeMode, "explore");
  assert.equal(normalized.generated, false);
  assert.equal(normalized.recommendation.priorityFilter, "全部优先级");
  assert.equal(normalized.explore.batchSeed, 1);
  assert.equal(normalized.explore.visibleLimit, 30);
  assert.deepEqual(normalized.savedCompanies, [
    {
      companyId: 5,
      source: "explore",
      savedAt: normalized.updatedAt,
    },
  ]);
  assert.deepEqual(normalized.ignoredIds, [1]);
  assert.equal(normalized.recordDraft.recordingId, null);
  assert.equal(normalized.recordDraft.note, "");
  assert.equal(normalized.timeBudget, "2小时");
  assert.equal(normalized.scrollY, 0);
});

test("clears unified, legacy and URL recovery state", () => {
  const storage = new MemoryStorage();
  const staleSnapshot = createWorkspaceSnapshot(
    sampleSnapshot(),
    new Date(Date.now() - 60_000).toISOString(),
  );
  storage.setItem(WORKSPACE_SNAPSHOT_KEY, JSON.stringify(staleSnapshot));
  storage.setItem("waic-saved-companies-v3", "[]");
  const locationLike = {
    pathname: "/waic-2026-connect-radar/",
    search: "?from=wechat",
    hash: buildWorkspaceResumeHash(staleSnapshot),
  };
  const historyApi = {
    state: null,
    replaceState(_state, _title, url) {
      this.url = url;
    },
  };

  const clearResult = clearWorkspacePersistence(
    storage,
    historyApi,
    locationLike,
  );
  assert.equal(clearResult.localProtected, true);
  assert.equal(clearResult.urlCleared, true);
  assert.equal(storage.getItem(WORKSPACE_SNAPSHOT_KEY), null);
  assert.equal(storage.getItem("waic-saved-companies-v3"), null);
  assert.ok(storage.getItem(WORKSPACE_CLEAR_TOMBSTONE_KEY));
  assert.equal(historyApi.url, "/waic-2026-connect-radar/?from=wechat");
  assert.equal(loadWorkspaceSnapshot(storage, locationLike.hash), null);
});

test("a clear tombstone blocks a stale tab and an uncleared old hash", () => {
  const storage = new MemoryStorage();
  const staleSnapshot = createWorkspaceSnapshot(
    sampleSnapshot(),
    new Date(Date.now() - 60_000).toISOString(),
  );
  const oldHash = buildWorkspaceResumeHash(staleSnapshot);
  const locationLike = {
    pathname: "/waic-2026-connect-radar/",
    search: "",
    hash: oldHash,
  };
  const blockedHistory = {
    replaceState() {
      throw new Error("history blocked");
    },
  };

  const clearResult = clearWorkspacePersistence(
    storage,
    blockedHistory,
    locationLike,
  );
  assert.equal(clearResult.localProtected, true);
  assert.equal(clearResult.urlCleared, false);
  assert.equal(
    persistWorkspaceSnapshot(
      storage,
      blockedHistory,
      locationLike,
      staleSnapshot,
    ).blocked,
    true,
  );
  const staleButRetimestamped = createWorkspaceSnapshot(
    {
      ...staleSnapshot,
      recommendation: {
        ...staleSnapshot.recommendation,
        search: "旧页面在清空后又操作了一次",
      },
    },
    new Date(Date.parse(clearResult.epoch) + 1).toISOString(),
  );
  assert.equal(
    persistWorkspaceSnapshot(
      storage,
      blockedHistory,
      locationLike,
      staleButRetimestamped,
    ).blocked,
    true,
  );
  assert.equal(
    loadWorkspaceSnapshot(
      storage,
      buildWorkspaceResumeHash(staleButRetimestamped),
    ),
    null,
  );
  assert.equal(storage.getItem(WORKSPACE_SNAPSHOT_KEY), null);
  assert.equal(loadWorkspaceSnapshot(storage, oldHash), null);

  const freshSnapshot = createWorkspaceSnapshot(
    {
      ...staleSnapshot,
      epoch: clearResult.epoch,
      recommendation: {
        ...staleSnapshot.recommendation,
        search: "清空后新建的进度",
      },
    },
    new Date(Date.parse(clearResult.epoch) + 2).toISOString(),
  );
  assert.equal(
    persistWorkspaceSnapshot(
      storage,
      blockedHistory,
      locationLike,
      freshSnapshot,
    ).savedLocally,
    true,
  );
  assert.equal(
    loadWorkspaceSnapshot(storage, oldHash).snapshot.recommendation.search,
    "清空后新建的进度",
  );
  storage.removeItem(WORKSPACE_SNAPSHOT_KEY);
  const resumedFresh = loadWorkspaceSnapshot(
    storage,
    buildWorkspaceResumeHash(freshSnapshot),
  );
  assert.equal(resumedFresh.source, "url");
  assert.equal(
    resumedFresh.snapshot.recommendation.search,
    "清空后新建的进度",
  );
});

test("does not migrate legacy keys after the workspace was cleared", () => {
  const storage = new MemoryStorage();
  const result = clearWorkspacePersistence(
    storage,
    { replaceState() {} },
    { pathname: "/", search: "", hash: "" },
  );
  assert.equal(result.localProtected, true);
  storage.setItem(
    "waic-saved-companies-v3",
    JSON.stringify([
      {
        companyId: 88,
        source: "recommendation",
        savedAt: "2026-07-18T10:00:00.000Z",
      },
    ]),
  );

  assert.equal(migrateLegacyWorkspace(storage), null);
  assert.equal(storage.getItem("waic-saved-companies-v3"), null);
});

test("reports URL-only protection and a complete save failure", () => {
  const unavailableStorage = {
    getItem() {
      return null;
    },
    setItem() {
      throw new Error("storage unavailable");
    },
  };
  const locationLike = {
    pathname: "/waic-2026-connect-radar/",
    search: "",
    hash: "",
  };
  const workingHistory = {
    state: null,
    replaceState() {},
  };

  const urlOnly = persistWorkspaceSnapshot(
    unavailableStorage,
    workingHistory,
    locationLike,
    sampleSnapshot(),
  );
  assert.equal(urlOnly.savedLocally, false);
  assert.equal(urlOnly.savedInUrl, true);
  assert.equal(urlOnly.blocked, false);

  const failed = persistWorkspaceSnapshot(
    unavailableStorage,
    {
      replaceState() {
        throw new Error("history unavailable");
      },
    },
    locationLike,
    sampleSnapshot(),
  );
  assert.equal(failed.savedLocally, false);
  assert.equal(failed.savedInUrl, false);
  assert.equal(failed.blocked, false);
});

test("does not add a resume hash before the user has made progress", () => {
  const empty = createWorkspaceSnapshot({});
  assert.equal(hasMeaningfulWorkspaceProgress(empty), false);
  assert.equal(buildWorkspaceResumeHash(empty), "");
  assert.equal(hasMeaningfulWorkspaceProgress(sampleSnapshot()), true);
});
