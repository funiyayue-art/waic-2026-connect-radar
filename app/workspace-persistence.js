export const WORKSPACE_SNAPSHOT_KEY = "waic-workspace-snapshot-v4";
export const WORKSPACE_CLEAR_TOMBSTONE_KEY =
  "waic-workspace-cleared-at-v4";
export const WORKSPACE_SNAPSHOT_VERSION = 4;
export const WORKSPACE_RESUME_PREFIX = "waic=";

const LEGACY_KEYS = [
  "waic-decision-profile-v3",
  "waic-saved-companies-v3",
  "waic-contact-records-v3",
  "waic-ignored-companies-v3",
  "waic-decision-profile-v2",
  "waic-contact-list-v2",
  "waic-contact-records-v2",
  "waic-ignored-companies-v2",
  "waic-recent-searches-v1",
  "waic-explore-history-v1",
];

const APP_MODES = new Set(["explore", "planned", "my"]);
const PRIORITY_FILTERS = new Set([
  "全部优先级",
  "A",
  "B",
  "C",
  "D",
  "信息不足",
]);
const TIME_BUDGETS = new Set(["30分钟", "2小时", "半天", "全天"]);
const CONTACT_STATUSES = new Set([
  "准备接洽",
  "已接洽",
  "会后跟进",
  "不再跟进",
]);

const EMPTY_PROFILE = Object.freeze({
  role: "",
  industries: [],
  goals: [],
  interests: [],
  resources: [],
  currentNeed: "",
});

export const DEFAULT_EXPLORE_PROGRESS = Object.freeze({
  input: "",
  query: "",
  categoryId: "all",
  batchSeed: 1,
  historyIds: [],
  recentSearches: [],
  visibleLimit: 30,
  detailId: null,
});

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function safeString(value, fallback = "", maxLength = 500) {
  return typeof value === "string" ? value.slice(0, maxLength) : fallback;
}

function safeStringArray(value, maxItems = 20, maxLength = 80) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((item) => typeof item === "string" && item.trim())
        .map((item) => item.slice(0, maxLength)),
    ),
  ).slice(0, maxItems);
}

function safeNumberArray(value, maxItems = 120) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value.filter(
        (item) => Number.isInteger(item) && item > 0 && item < 1_000_000,
      ),
    ),
  ).slice(-maxItems);
}

function safeProfile(value, includeCurrentNeed = true) {
  const source = isObject(value) ? value : EMPTY_PROFILE;
  return {
    role: safeString(source.role, "", 80),
    industries: safeStringArray(source.industries, 3),
    goals: safeStringArray(source.goals, 3),
    interests: safeStringArray(source.interests, 5),
    resources: safeStringArray(source.resources, 10),
    currentNeed: includeCurrentNeed
      ? safeString(source.currentNeed, "", 160)
      : "",
  };
}

function profileIsReady(profile) {
  return Boolean(
    profile.role &&
      profile.industries.length &&
      profile.goals.length &&
      profile.interests.length,
  );
}

function safeSavedCompanies(value, fallbackTimestamp) {
  if (!Array.isArray(value)) return [];
  const byId = new Map();
  for (const item of value) {
    if (!isObject(item) || !Number.isInteger(item.companyId) || item.companyId <= 0) {
      continue;
    }
    byId.set(item.companyId, {
      companyId: item.companyId,
      source: item.source === "recommendation" ? "recommendation" : "explore",
      savedAt: safeString(item.savedAt, fallbackTimestamp, 64),
    });
  }
  return Array.from(byId.values()).slice(0, 963);
}

function safeRecords(value) {
  if (!isObject(value)) return {};
  const records = {};
  for (const [rawId, rawRecord] of Object.entries(value)) {
    const companyId = Number(rawId);
    if (
      !Number.isInteger(companyId) ||
      companyId <= 0 ||
      !isObject(rawRecord)
    ) {
      continue;
    }
    records[companyId] = {
      status: CONTACT_STATUSES.has(rawRecord.status)
        ? rawRecord.status
        : "准备接洽",
      note: safeString(rawRecord.note, "", 2_000),
      followUp: Boolean(rawRecord.followUp),
      updatedAt: safeString(rawRecord.updatedAt, "", 64),
    };
  }
  return records;
}

function safeRecordDraft(value) {
  const source = isObject(value) ? value : {};
  const recordingId =
    Number.isInteger(source.recordingId) && source.recordingId > 0
      ? source.recordingId
      : null;
  if (!recordingId) {
    return {
      recordingId: null,
      status: "准备接洽",
      note: "",
      followUp: false,
    };
  }
  return {
    recordingId,
    status: CONTACT_STATUSES.has(source.status)
      ? source.status
      : "准备接洽",
    note: safeString(source.note, "", 2_000),
    followUp: Boolean(source.followUp),
  };
}

function safeExploreProgress(value) {
  const source = isObject(value) ? value : DEFAULT_EXPLORE_PROGRESS;
  const batchSeed =
    Number.isInteger(source.batchSeed) && source.batchSeed > 0
      ? Math.min(source.batchSeed, 1_000_000)
      : 1;
  const visibleLimit =
    Number.isInteger(source.visibleLimit) && source.visibleLimit >= 30
      ? Math.min(source.visibleLimit, 300)
      : 30;
  return {
    input: safeString(source.input, "", 120),
    query: safeString(source.query, "", 120),
    categoryId: safeString(source.categoryId, "all", 80) || "all",
    batchSeed,
    historyIds: safeNumberArray(source.historyIds, 80),
    recentSearches: safeStringArray(source.recentSearches, 6, 120),
    visibleLimit,
    detailId:
      Number.isInteger(source.detailId) && source.detailId > 0
        ? source.detailId
        : null,
  };
}

export function normalizeWorkspaceSnapshot(value) {
  if (!isObject(value)) return null;
  const updatedAt =
    safeString(value.updatedAt, "", 64) || new Date().toISOString();
  const draft = safeProfile(value.draft);
  const profile = safeProfile(value.profile);
  const recommendation = isObject(value.recommendation)
    ? value.recommendation
    : {};

  return {
    version: WORKSPACE_SNAPSHOT_VERSION,
    updatedAt,
    epoch: safeString(value.epoch, "", 64),
    activeMode: APP_MODES.has(value.activeMode) ? value.activeMode : "explore",
    draft,
    profile,
    generated: Boolean(value.generated && profileIsReady(profile)),
    recommendation: {
      search: safeString(recommendation.search, "", 120),
      priorityFilter: PRIORITY_FILTERS.has(recommendation.priorityFilter)
        ? recommendation.priorityFilter
        : "全部优先级",
      categoryFilter:
        safeString(recommendation.categoryFilter, "全部展商类别", 100) ||
        "全部展商类别",
      directionFilter:
        safeString(recommendation.directionFilter, "全部技术方向", 100) ||
        "全部技术方向",
    },
    explore: safeExploreProgress(value.explore),
    savedCompanies: safeSavedCompanies(value.savedCompanies, updatedAt),
    ignoredIds: safeNumberArray(value.ignoredIds, 963),
    focusCompanyId:
      Number.isInteger(value.focusCompanyId) && value.focusCompanyId > 0
        ? value.focusCompanyId
        : null,
    selectedCompanyId:
      Number.isInteger(value.selectedCompanyId) && value.selectedCompanyId > 0
        ? value.selectedCompanyId
        : null,
    records: safeRecords(value.records),
    recordDraft: safeRecordDraft(value.recordDraft),
    timeBudget: TIME_BUDGETS.has(value.timeBudget)
      ? value.timeBudget
      : "2小时",
    scrollY:
      Number.isFinite(value.scrollY) && value.scrollY >= 0
        ? Math.min(Math.round(value.scrollY), 5_000_000)
        : 0,
  };
}

export function createWorkspaceSnapshot(value, updatedAt = new Date().toISOString()) {
  return normalizeWorkspaceSnapshot({
    ...value,
    version: WORKSPACE_SNAPSHOT_VERSION,
    updatedAt,
  });
}

function encodeBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(`${normalized}${padding}`);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function buildWorkspaceResumeHash(value) {
  const snapshot = normalizeWorkspaceSnapshot(value);
  if (!snapshot || !hasMeaningfulWorkspaceProgress(snapshot)) return "";
  const compact = {
    v: 1,
    t: snapshot.updatedAt,
    x: snapshot.epoch,
    m: snapshot.activeMode,
    r: [
      snapshot.recommendation.search,
      snapshot.recommendation.priorityFilter,
      snapshot.recommendation.categoryFilter,
      snapshot.recommendation.directionFilter,
    ],
    e: [
      snapshot.explore.input,
      snapshot.explore.query,
      snapshot.explore.categoryId,
      snapshot.explore.batchSeed,
      snapshot.explore.historyIds,
      snapshot.explore.visibleLimit,
      snapshot.explore.detailId,
    ],
    s: snapshot.savedCompanies
      .slice(0, 200)
      .map((item) => [
        item.companyId,
        item.source === "recommendation" ? 1 : 0,
      ]),
    i: snapshot.ignoredIds.slice(0, 160),
    f: snapshot.focusCompanyId,
    b: snapshot.timeBudget,
    y: snapshot.scrollY,
  };
  return `#${WORKSPACE_RESUME_PREFIX}${encodeBase64Url(JSON.stringify(compact))}`;
}

export function decodeWorkspaceResumeHash(hash) {
  if (typeof hash !== "string") return null;
  const encoded = hash.startsWith(`#${WORKSPACE_RESUME_PREFIX}`)
    ? hash.slice(WORKSPACE_RESUME_PREFIX.length + 1)
    : "";
  if (!encoded || encoded.length > 24_000) return null;

  try {
    const compact = JSON.parse(decodeBase64Url(encoded));
    if (!isObject(compact) || compact.v !== 1) return null;
    const timestamp =
      safeString(compact.t, "", 64) || new Date().toISOString();
    const recommendationParts = Array.isArray(compact.r) ? compact.r : [];
    const exploreParts = Array.isArray(compact.e) ? compact.e : [];
    const savedCompanies = Array.isArray(compact.s)
      ? compact.s.map((item) => ({
          companyId: Array.isArray(item) ? item[0] : null,
          source:
            Array.isArray(item) && item[1] === 1
              ? "recommendation"
              : "explore",
          savedAt: timestamp,
        }))
      : [];

    return normalizeWorkspaceSnapshot({
      updatedAt: timestamp,
      epoch: compact.x,
      activeMode: compact.m,
      draft: EMPTY_PROFILE,
      profile: EMPTY_PROFILE,
      generated: false,
      recommendation: {
        search: recommendationParts[0],
        priorityFilter: recommendationParts[1],
        categoryFilter: recommendationParts[2],
        directionFilter: recommendationParts[3],
      },
      explore: {
        input: exploreParts[0],
        query: exploreParts[1],
        categoryId: exploreParts[2],
        batchSeed: exploreParts[3],
        historyIds: exploreParts[4],
        recentSearches: exploreParts[1] ? [exploreParts[1]] : [],
        visibleLimit: exploreParts[5],
        detailId: exploreParts[6],
      },
      savedCompanies,
      ignoredIds: compact.i,
      focusCompanyId: compact.f,
      selectedCompanyId: null,
      records: {},
      recordDraft: {},
      timeBudget: compact.b,
      scrollY: compact.y,
    });
  } catch {
    return null;
  }
}

function readJson(storage, key) {
  try {
    const value = storage?.getItem?.(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function readStorageString(storage, key) {
  try {
    return safeString(storage?.getItem?.(key), "", 64);
  } catch {
    return "";
  }
}

function isNewerThan(value, boundary) {
  const timestamp = Date.parse(value);
  const boundaryTimestamp = Date.parse(boundary);
  return (
    !Number.isFinite(boundaryTimestamp) ||
    (Number.isFinite(timestamp) && timestamp > boundaryTimestamp)
  );
}

export function loadWorkspaceSnapshot(storage, hash = "") {
  const clearedAt = getWorkspaceEpoch(storage);
  const rawLocal = normalizeWorkspaceSnapshot(
    readJson(storage, WORKSPACE_SNAPSHOT_KEY),
  );
  const rawResume = decodeWorkspaceResumeHash(hash);
  const resumeEpochMatches =
    !clearedAt || rawResume?.epoch === clearedAt;
  const local =
    rawLocal &&
    rawLocal.epoch === clearedAt &&
    isNewerThan(rawLocal.updatedAt, clearedAt)
      ? rawLocal
      : null;
  const resume =
    rawResume &&
    resumeEpochMatches &&
    isNewerThan(rawResume.updatedAt, clearedAt)
      ? createWorkspaceSnapshot(
          { ...rawResume, epoch: clearedAt },
          rawResume.updatedAt,
        )
      : null;
  if (resume && hasMeaningfulWorkspaceProgress(resume)) {
    const localUpdatedAt = Date.parse(local?.updatedAt ?? "");
    const resumeUpdatedAt = Date.parse(resume.updatedAt);
    const resumeIsNewer =
      Number.isFinite(resumeUpdatedAt) &&
      (!Number.isFinite(localUpdatedAt) || resumeUpdatedAt > localUpdatedAt);
    if (!local || !hasMeaningfulWorkspaceProgress(local) || resumeIsNewer) {
      const snapshot =
        local && resumeIsNewer
          ? createWorkspaceSnapshot(
              {
                ...resume,
                draft: local.draft,
                profile: local.profile,
                generated: local.generated,
                records: local.records,
                recordDraft: local.recordDraft,
              },
              resume.updatedAt,
            )
          : resume;
      return { snapshot, source: "url" };
    }
  }
  if (local) return { snapshot: local, source: "local" };
  return resume ? { snapshot: resume, source: "url" } : null;
}

export function migrateLegacyWorkspace(storage) {
  if (getWorkspaceEpoch(storage)) {
    try {
      for (const key of LEGACY_KEYS) storage?.removeItem?.(key);
    } catch {
      // A tombstone still prevents legacy data from being promoted to v4.
    }
    return null;
  }
  const rawProfile =
    readJson(storage, "waic-decision-profile-v3") ??
    readJson(storage, "waic-decision-profile-v2");
  const rawSaved = readJson(storage, "waic-saved-companies-v3");
  const rawLegacySaved = readJson(storage, "waic-contact-list-v2");
  const records =
    readJson(storage, "waic-contact-records-v3") ??
    readJson(storage, "waic-contact-records-v2");
  const ignoredIds =
    readJson(storage, "waic-ignored-companies-v3") ??
    readJson(storage, "waic-ignored-companies-v2");
  const recentSearches = readJson(storage, "waic-recent-searches-v1");
  const historyIds = readJson(storage, "waic-explore-history-v1");
  const hasLegacyData = Boolean(
    rawProfile ||
      rawSaved ||
      rawLegacySaved ||
      records ||
      ignoredIds ||
      recentSearches ||
      historyIds,
  );
  if (!hasLegacyData) return null;

  const timestamp = new Date().toISOString();
  const savedCompanies = Array.isArray(rawSaved)
    ? rawSaved
    : Array.isArray(rawLegacySaved)
      ? rawLegacySaved.map((companyId) => ({
          companyId,
          source: "recommendation",
          savedAt: timestamp,
        }))
      : [];
  const profile = safeProfile(rawProfile);

  return createWorkspaceSnapshot(
    {
      activeMode: savedCompanies.length ? "my" : "explore",
      epoch: "",
      draft: profile,
      profile,
      generated: profileIsReady(profile),
      recommendation: {},
      explore: {
        ...DEFAULT_EXPLORE_PROGRESS,
        historyIds,
        recentSearches,
      },
      savedCompanies,
      ignoredIds,
      focusCompanyId: null,
      selectedCompanyId: null,
      records,
      recordDraft: {},
      timeBudget: "2小时",
      scrollY: 0,
    },
    timestamp,
  );
}

export function persistWorkspaceSnapshot(
  storage,
  historyApi,
  locationLike,
  value,
) {
  const snapshot = normalizeWorkspaceSnapshot(value);
  if (!snapshot) {
    return { blocked: false, savedInUrl: false, savedLocally: false };
  }
  const clearedAt = getWorkspaceEpoch(storage);
  if (snapshot.epoch !== clearedAt) {
    return { blocked: true, savedInUrl: false, savedLocally: false };
  }

  let savedLocally = false;
  try {
    storage?.setItem?.(WORKSPACE_SNAPSHOT_KEY, JSON.stringify(snapshot));
    savedLocally = true;
    for (const key of LEGACY_KEYS) storage?.removeItem?.(key);
  } catch {
    // The URL fragment remains a non-sensitive fallback when WebView storage fails.
  }

  let savedInUrl = false;
  try {
    const nextHash = buildWorkspaceResumeHash(snapshot);
    const currentHash = safeString(locationLike?.hash, "", 24_000);
    if (nextHash && currentHash === nextHash) savedInUrl = true;
    if (nextHash || currentHash.startsWith(`#${WORKSPACE_RESUME_PREFIX}`)) {
      const nextUrl = `${locationLike?.pathname ?? ""}${locationLike?.search ?? ""}${nextHash}`;
      if (typeof historyApi?.replaceState === "function") {
        historyApi.replaceState(historyApi.state ?? null, "", nextUrl);
        savedInUrl = Boolean(nextHash);
      }
    }
  } catch {
    // Some embedded browsers block history updates while a page is being hidden.
  }

  return { blocked: false, savedInUrl, savedLocally };
}

export function clearWorkspacePersistence(storage, historyApi, locationLike) {
  const clearedAt = new Date().toISOString();
  let localProtected = false;
  try {
    storage?.removeItem?.(WORKSPACE_SNAPSHOT_KEY);
    for (const key of LEGACY_KEYS) storage?.removeItem?.(key);
    storage?.setItem?.(WORKSPACE_CLEAR_TOMBSTONE_KEY, clearedAt);
    localProtected =
      readStorageString(storage, WORKSPACE_CLEAR_TOMBSTONE_KEY) === clearedAt;
  } catch {
    // Continue clearing the URL fallback even if storage is unavailable.
  }

  let urlCleared = false;
  const nextUrl = `${locationLike?.pathname ?? ""}${locationLike?.search ?? ""}`;
  try {
    if (
      safeString(locationLike?.hash, "", 24_000).startsWith(
        `#${WORKSPACE_RESUME_PREFIX}`,
      )
    ) {
      if (typeof historyApi?.replaceState === "function") {
        historyApi.replaceState(historyApi.state ?? null, "", nextUrl);
        urlCleared = true;
      }
    } else {
      urlCleared = true;
    }
  } catch {
    // Fall through to a location replacement for restrictive embedded browsers.
  }
  if (!urlCleared) {
    try {
      if (typeof locationLike?.replace === "function") {
        locationLike.replace(nextUrl);
        urlCleared = true;
      }
    } catch {
      // The tombstone still prevents an older URL snapshot from reappearing.
    }
  }
  return {
    epoch: localProtected ? clearedAt : "",
    localProtected,
    urlCleared,
  };
}

export function getWorkspaceEpoch(storage) {
  return readStorageString(storage, WORKSPACE_CLEAR_TOMBSTONE_KEY);
}

export function hasMeaningfulWorkspaceProgress(value) {
  const snapshot = normalizeWorkspaceSnapshot(value);
  if (!snapshot) return false;
  const draftStarted = Boolean(
    snapshot.draft.role ||
      snapshot.draft.industries.length ||
      snapshot.draft.goals.length ||
      snapshot.draft.interests.length ||
      snapshot.draft.resources.length ||
      snapshot.draft.currentNeed,
  );
  const recommendationChanged = Boolean(
    snapshot.recommendation.search ||
      snapshot.recommendation.priorityFilter !== "全部优先级" ||
      snapshot.recommendation.categoryFilter !== "全部展商类别" ||
      snapshot.recommendation.directionFilter !== "全部技术方向",
  );
  const exploreChanged = Boolean(
    snapshot.explore.query ||
      snapshot.explore.categoryId !== "all" ||
      snapshot.explore.batchSeed !== 1 ||
      snapshot.explore.historyIds.length ||
      snapshot.explore.detailId,
  );
  const recordDraftStarted = Boolean(snapshot.recordDraft.recordingId);
  return Boolean(
    draftStarted ||
      snapshot.generated ||
      recommendationChanged ||
      exploreChanged ||
      snapshot.savedCompanies.length ||
      snapshot.ignoredIds.length ||
      snapshot.focusCompanyId ||
      snapshot.selectedCompanyId ||
      Object.keys(snapshot.records).length ||
      recordDraftStarted,
  );
}
