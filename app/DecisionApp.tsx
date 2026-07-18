"use client";

import { useEffect, useMemo, useState } from "react";
import BackToTop from "./components/BackToTop";
import BottomNavigation from "./components/BottomNavigation";
import ExploreMode from "./components/explore/ExploreMode";
import Hero from "./components/Hero";
import exhibitorPayload from "./data/exhibitors.json";
import forumPayload from "./data/forums.json";
import {
  DEMO_USER_PROFILE,
  EMPTY_USER_PROFILE,
  GOAL_OPTIONS,
  INTEREST_OPTIONS,
  RESOURCE_OPTIONS,
  ROLES,
  USER_INDUSTRIES,
  companyName,
  compactText,
  rankCompanies,
} from "./recommendation";
import { buildSuggestedRoute } from "./route-planner";

type Exhibitor = (typeof exhibitorPayload.exhibitors)[number];
type Forum = (typeof forumPayload)[number];
type Profile = {
  role: string;
  industries: string[];
  goals: string[];
  interests: string[];
  resources: string[];
  currentNeed: string;
};
type PriorityFilter = "全部优先级" | "A" | "B" | "C" | "D" | "信息不足";
type TimeBudget = "30分钟" | "2小时" | "半天" | "全天";
type ContactStatus = "准备接洽" | "已接洽" | "会后跟进" | "不再跟进";
type ContactRecord = {
  status: ContactStatus;
  note: string;
  followUp: boolean;
  updatedAt: string;
};
type SavedCompanySource = "explore" | "recommendation";
type SavedCompany = {
  companyId: number;
  source: SavedCompanySource;
  savedAt: string;
};
type AppMode = "explore" | "planned" | "my";
type Recommendation = {
  company: Exhibitor;
  priority: {
    code: string;
    label: string;
  };
  total: number;
  summary: string;
  industryMatches: string[];
  interestMatches: string[];
  relationships: string[];
  matchReasons: string[];
  priorityBasis: string[];
  questions: string[];
  openingMessage: string;
};

const TIME_BUDGETS: TimeBudget[] = ["30分钟", "2小时", "半天", "全天"];
const PROFILE_KEY = "waic-decision-profile-v3";
const SAVED_KEY = "waic-saved-companies-v3";
const RECORDS_KEY = "waic-contact-records-v3";
const IGNORED_KEY = "waic-ignored-companies-v3";
const LEGACY_PROFILE_KEY = "waic-decision-profile-v2";
const LEGACY_SAVED_KEY = "waic-contact-list-v2";
const LEGACY_RECORDS_KEY = "waic-contact-records-v2";
const LEGACY_IGNORED_KEY = "waic-ignored-companies-v2";

function cloneProfile(profile: Profile): Profile {
  return {
    ...profile,
    industries: [...profile.industries],
    goals: [...profile.goals],
    interests: [...profile.interests],
    resources: [...profile.resources],
  };
}

function isProfileReady(profile: Profile) {
  return Boolean(
    profile.role &&
      profile.industries.length &&
      profile.goals.length &&
      profile.interests.length,
  );
}

function toggleArrayValue(
  values: string[],
  value: string,
  max = Number.POSITIVE_INFINITY,
) {
  if (values.includes(value)) return values.filter((item) => item !== value);
  return values.length >= max ? [...values.slice(1), value] : [...values, value];
}

function formatDate(date: string) {
  const [, month, day] = date.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

function cleanOcrText(value: string) {
  return value
    .replace(/(厅|会议室)人+$/u, "$1")
    .replace(/人{2,}$/u, "")
    .trim();
}

function relatedForums(recommendation: Recommendation) {
  const forumKeywords: Record<string, string[]> = {
    Agent: ["智能体", "agent"],
    "工业 AI": ["工业", "制造"],
    具身智能: ["具身", "人形机器人", "机器人"],
    大模型: ["大模型", "多模态"],
    "AI 医疗": ["医疗", "健康", "药物"],
    "AI 教育": ["教育", "教学"],
    智能汽车: ["汽车", "自动驾驶", "智驾"],
    算力与基础设施: ["算力", "芯片", "基础设施"],
    制造业: ["工业", "制造"],
    医疗: ["医疗", "健康"],
    教育: ["教育", "教学"],
    汽车: ["汽车", "自动驾驶"],
    机器人: ["机器人", "具身"],
    金融: ["金融", "银行", "保险"],
  };
  const tokens = Array.from(
    new Set(
      [...recommendation.interestMatches, ...recommendation.industryMatches]
        .flatMap((label) => forumKeywords[label] ?? [])
        .map((token) => token.toLowerCase()),
    ),
  );
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (forumPayload as Forum[])
    .map((forum) => {
      const corpus = forum.name.toLowerCase();
      const score = tokens.reduce(
        (total, token) => total + (corpus.includes(token) ? 2 : 0),
        0,
      );
      return { ...forum, relevance: score };
    })
    .filter((forum) => {
      const readableLocation =
        /中心|会议室|会展|展馆|厅|馆/.test(forum.location) ||
        /(?:Center|Hall|Room)\s/i.test(forum.location);
      return forum.relevance >= 2 && forum.date >= today && readableLocation;
    })
    .sort(
      (left, right) =>
        right.relevance - left.relevance ||
        left.date.localeCompare(right.date) ||
        left.start.localeCompare(right.start),
    )
    .slice(0, 3);
}

function priorityLabel(code: string) {
  if (code === "A") return "重点接洽";
  if (code === "B") return "有时间可聊";
  if (code === "C") return "先看资料";
  if (code === "D") return "暂不优先";
  return "需现场问清";
}

function FieldChips({
  label,
  note,
  options,
  required,
  selected,
  onToggle,
}: {
  label: string;
  note?: string;
  options: readonly string[];
  required?: boolean;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset className="profile-fieldset">
      <legend>
        {label}
        {required && <em>必填</em>}
        {note && <small>{note}</small>}
      </legend>
      <div className="decision-chips">
        {options.map((option) => (
          <button
            aria-pressed={selected.includes(option)}
            className={selected.includes(option) ? "active" : ""}
            key={option}
            onClick={() => onToggle(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function DecisionApp() {
  const companies = exhibitorPayload.exhibitors as Exhibitor[];
  const [activeMode, setActiveMode] = useState<AppMode>("explore");
  const [exploreModalOpen, setExploreModalOpen] = useState(false);
  const [draft, setDraft] = useState<Profile>(
    cloneProfile(EMPTY_USER_PROFILE as Profile),
  );
  const [profile, setProfile] = useState<Profile>(
    cloneProfile(EMPTY_USER_PROFILE as Profile),
  );
  const [generated, setGenerated] = useState(false);
  const [formError, setFormError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] =
    useState<PriorityFilter>("全部优先级");
  const [categoryFilter, setCategoryFilter] = useState("全部展商类别");
  const [directionFilter, setDirectionFilter] = useState("全部技术方向");
  const [savedCompanies, setSavedCompanies] = useState<SavedCompany[]>([]);
  const [ignoredIds, setIgnoredIds] = useState<number[]>([]);
  const [focusCompanyId, setFocusCompanyId] = useState<number | null>(null);
  const [records, setRecords] = useState<Record<number, ContactRecord>>({});
  const [recordingId, setRecordingId] = useState<number | null>(null);
  const [recordStatus, setRecordStatus] =
    useState<ContactStatus>("准备接洽");
  const [recordNote, setRecordNote] = useState("");
  const [recordFollowUp, setRecordFollowUp] = useState(false);
  const [timeBudget, setTimeBudget] = useState<TimeBudget>("2小时");
  const [toast, setToast] = useState("");

  const interestedIds = savedCompanies
    .filter((item) => item.source === "explore")
    .map((item) => item.companyId);
  const savedIds = savedCompanies
    .filter((item) => item.source === "recommendation")
    .map((item) => item.companyId);

  const recommendations = useMemo(
    () => rankCompanies(companies, profile) as Recommendation[],
    [companies, profile],
  );

  const recommendationById = useMemo(
    () =>
      new Map(
        recommendations.map((recommendation) => [
          recommendation.company.id,
          recommendation,
        ]),
      ),
    [recommendations],
  );

  const selectedRecommendation =
    selectedId === null ? null : recommendationById.get(selectedId) ?? null;

  const categories = useMemo(
    () => [
      "全部展商类别",
      ...Array.from(new Set(companies.map((company) => company.industry))),
    ],
    [companies],
  );

  const visibleRecommendations = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return recommendations
      .filter((recommendation) => {
        const company = recommendation.company;
        if (ignoredIds.includes(company.id)) return false;
        if (
          priorityFilter !== "全部优先级" &&
          recommendation.priority.code !== priorityFilter
        ) {
          return false;
        }
        if (
          categoryFilter !== "全部展商类别" &&
          company.industry !== categoryFilter
        ) {
          return false;
        }
        if (
          directionFilter !== "全部技术方向" &&
          !recommendation.interestMatches.includes(directionFilter)
        ) {
          return false;
        }
        if (
          needle &&
          !`${company.company} ${company.business} ${company.segment} ${company.booth}`
            .toLowerCase()
            .includes(needle)
        ) {
          return false;
        }
        return true;
      })
      .sort(
        (left, right) =>
          Number(right.company.id === focusCompanyId) -
          Number(left.company.id === focusCompanyId),
      );
  }, [
    recommendations,
    ignoredIds,
    priorityFilter,
    categoryFilter,
    directionFilter,
    search,
    focusCompanyId,
  ]);

  const priorityCounts = useMemo(
    () =>
      recommendations.reduce<Record<string, number>>((counts, recommendation) => {
        counts[recommendation.priority.code] =
          (counts[recommendation.priority.code] ?? 0) + 1;
        return counts;
      }, {}),
    [recommendations],
  );

  const savedRecommendations = savedIds
    .map((id) => recommendationById.get(id))
    .filter(Boolean) as Recommendation[];
  const interestedCompanies = interestedIds
    .map((id) => companies.find((company) => company.id === id))
    .filter(Boolean) as Exhibitor[];

  const routeGroups = buildSuggestedRoute({
    savedRecommendations,
    recommendations,
    timeBudget,
  }) as Array<[string, Recommendation[]]>;

  /* eslint-disable react-hooks/set-state-in-effect -- local-only data is restored after hydration */
  useEffect(() => {
    try {
      const savedProfile =
        window.localStorage.getItem(PROFILE_KEY) ??
        window.localStorage.getItem(LEGACY_PROFILE_KEY);
      const savedList = window.localStorage.getItem(SAVED_KEY);
      const legacyList = window.localStorage.getItem(LEGACY_SAVED_KEY);
      const savedRecords =
        window.localStorage.getItem(RECORDS_KEY) ??
        window.localStorage.getItem(LEGACY_RECORDS_KEY);
      const savedIgnored =
        window.localStorage.getItem(IGNORED_KEY) ??
        window.localStorage.getItem(LEGACY_IGNORED_KEY);
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile) as Profile;
        setDraft(cloneProfile(parsed));
        setProfile(cloneProfile(parsed));
        setGenerated(isProfileReady(parsed));
        window.localStorage.setItem(PROFILE_KEY, JSON.stringify(parsed));
      }
      if (savedList) {
        const parsed = JSON.parse(savedList) as SavedCompany[];
        setSavedCompanies(
          parsed.filter(
            (item) =>
              Number.isFinite(item?.companyId) &&
              (item.source === "explore" || item.source === "recommendation"),
          ),
        );
      } else if (legacyList) {
        const migrated = (JSON.parse(legacyList) as number[]).map((companyId) => ({
          companyId,
          source: "recommendation" as const,
          savedAt: new Date().toISOString(),
        }));
        setSavedCompanies(migrated);
        window.localStorage.setItem(SAVED_KEY, JSON.stringify(migrated));
      }
      if (savedRecords) {
        const parsed = JSON.parse(savedRecords);
        setRecords(parsed);
        window.localStorage.setItem(RECORDS_KEY, JSON.stringify(parsed));
      }
      if (savedIgnored) {
        const parsed = JSON.parse(savedIgnored);
        setIgnoredIds(parsed);
        window.localStorage.setItem(IGNORED_KEY, JSON.stringify(parsed));
      }
    } catch {
      // Ignore malformed browser data and start with a clean profile.
    }
  }, []);

  useEffect(() => {
    if (!recordingId) return;
    const record = records[recordingId];
    setRecordStatus(record?.status ?? "准备接洽");
    setRecordNote(record?.note ?? "");
    setRecordFollowUp(record?.followUp ?? false);
  }, [recordingId, records]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  function toggleProfileList(field: keyof Profile, value: string) {
    setDraft((current) => {
      const currentValues = current[field];
      if (!Array.isArray(currentValues)) return current;
      return {
        ...current,
        [field]: toggleArrayValue(
          currentValues,
          value,
          field === "industries" || field === "goals" ? 3 : 5,
        ),
      };
    });
  }

  function useDemo() {
    const demo = cloneProfile(DEMO_USER_PROFILE as Profile);
    setDraft(demo);
    setFormError("");
    showToast("示例画像已填入，可直接生成");
  }

  function navigateTo(mode: AppMode) {
    setActiveMode(mode);
    const targetId =
      mode === "explore" ? "explore" : mode === "planned" ? "profile" : "my-list";
    window.setTimeout(
      () =>
        document
          .getElementById(targetId)
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      20,
    );
  }

  function planForCompany(id: number) {
    const target = companies.find((company) => company.id === id);
    const matchingRecommendation = recommendations.find(
      (recommendation) =>
        target &&
        companyName(recommendation.company.company) === companyName(target.company),
    );
    const nextFocusId = matchingRecommendation?.company.id ?? id;
    setFocusCompanyId(nextFocusId);
    setActiveMode("planned");
    if (generated) {
      setSelectedId(nextFocusId);
      window.setTimeout(
        () =>
          document
            .getElementById("recommendations")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        20,
      );
      return;
    }
    window.setTimeout(
      () =>
        document
          .getElementById("profile")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      20,
    );
    showToast("填写画像后，将优先展示这家企业的个性化判断");
  }

  function generateRecommendations() {
    if (!isProfileReady(draft)) {
      const missing = [
        !draft.role && "身份",
        !draft.industries.length && "所属行业",
        !draft.goals.length && "参会目标",
        !draft.interests.length && "关注方向",
      ].filter(Boolean);
      setFormError(`请先完成：${missing.join("、")}`);
      return;
    }
    const nextProfile = cloneProfile(draft);
    setProfile(nextProfile);
    setGenerated(true);
    setFormError("");
    setPriorityFilter("全部优先级");
    setCategoryFilter("全部展商类别");
    setDirectionFilter("全部技术方向");
    setSearch("");
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
    if (focusCompanyId !== null) setSelectedId(focusCompanyId);
    window.setTimeout(
      () =>
        document
          .getElementById("recommendations")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      80,
    );
    showToast("已按你的需求重新计算 963 家展商");
  }

  function addToList(id: number) {
    if (savedIds.includes(id)) {
      showToast("这家企业已在接洽清单中");
      return;
    }
    const existing = savedCompanies.find((item) => item.companyId === id);
    const next = existing
      ? savedCompanies.map((item) =>
          item.companyId === id ? { ...item, source: "recommendation" as const } : item,
        )
      : [
          ...savedCompanies,
          {
            companyId: id,
            source: "recommendation" as const,
            savedAt: new Date().toISOString(),
          },
        ];
    setSavedCompanies(next);
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    showToast("已加入我的接洽清单");
  }

  function removeFromList(id: number) {
    const next = savedCompanies.filter((item) => item.companyId !== id);
    setSavedCompanies(next);
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    showToast("已从接洽清单移除");
  }

  function toggleInterest(id: number) {
    const existing = savedCompanies.find((item) => item.companyId === id);
    if (existing?.source === "recommendation") {
      showToast("这家企业已在接洽清单中");
      return;
    }
    const next = existing
      ? savedCompanies.filter((item) => item.companyId !== id)
      : [
          ...savedCompanies,
          {
            companyId: id,
            source: "explore" as const,
            savedAt: new Date().toISOString(),
          },
        ];
    setSavedCompanies(next);
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    showToast(existing ? "已取消感兴趣" : "已加入感兴趣企业");
  }

  function ignoreCompany(id: number) {
    const next = ignoredIds.includes(id) ? ignoredIds : [...ignoredIds, id];
    setIgnoredIds(next);
    window.localStorage.setItem(IGNORED_KEY, JSON.stringify(next));
    setSelectedId(null);
    showToast("已标记为不感兴趣");
  }

  function followUpCompany(id: number) {
    if (!savedIds.includes(id)) {
      const existing = savedCompanies.find((item) => item.companyId === id);
      const nextSaved = existing
        ? savedCompanies.map((item) =>
            item.companyId === id
              ? { ...item, source: "recommendation" as const }
              : item,
          )
        : [
            ...savedCompanies,
            {
              companyId: id,
              source: "recommendation" as const,
              savedAt: new Date().toISOString(),
            },
          ];
      setSavedCompanies(nextSaved);
      window.localStorage.setItem(SAVED_KEY, JSON.stringify(nextSaved));
    }
    const nextRecords = {
      ...records,
      [id]: {
        status: "会后跟进" as ContactStatus,
        note: records[id]?.note ?? "",
        followUp: true,
        updatedAt: new Date().toISOString(),
      },
    };
    setRecords(nextRecords);
    window.localStorage.setItem(RECORDS_KEY, JSON.stringify(nextRecords));
    showToast("已标记为会后跟进");
  }

  function moveSaved(id: number, direction: -1 | 1) {
    const contactIndex = savedIds.indexOf(id);
    const targetContactIndex = contactIndex + direction;
    if (
      contactIndex < 0 ||
      targetContactIndex < 0 ||
      targetContactIndex >= savedIds.length
    ) {
      return;
    }
    const firstIndex = savedCompanies.findIndex((item) => item.companyId === id);
    const targetId = savedIds[targetContactIndex];
    const secondIndex = savedCompanies.findIndex(
      (item) => item.companyId === targetId,
    );
    if (firstIndex < 0 || secondIndex < 0) return;
    const next = [...savedCompanies];
    [next[firstIndex], next[secondIndex]] = [next[secondIndex], next[firstIndex]];
    setSavedCompanies(next);
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  }

  function openRecord(id: number) {
    if (!savedIds.includes(id)) addToList(id);
    setRecordingId(id);
  }

  function saveRecord() {
    if (!recordingId) return;
    const nextRecords = {
      ...records,
      [recordingId]: {
        status: recordStatus,
        note: recordNote.trim(),
        followUp: recordFollowUp || recordStatus === "会后跟进",
        updatedAt: new Date().toISOString(),
      },
    };
    setRecords(nextRecords);
    window.localStorage.setItem(RECORDS_KEY, JSON.stringify(nextRecords));
    setRecordingId(null);
    showToast("现场沟通结果已保存");
  }

  async function copyOpening(message: string) {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = message;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    showToast("开场话术已复制");
  }

  return (
    <main className="decision-app">
      <header className="decision-topbar">
        <a className="decision-brand" href="#top">
          <span>W</span>
          <b>WAIC 接洽雷达</b>
        </a>
        <nav aria-label="页面导航">
          <button onClick={() => navigateTo("explore")} type="button">随便逛</button>
          <button onClick={() => navigateTo("planned")} type="button">找目标</button>
          <button onClick={() => navigateTo("my")} type="button">我的</button>
        </nav>
        <i>无需登录 · 本地保存</i>
      </header>

      <Hero count={exhibitorPayload.count} onChoose={navigateTo} />

      <ExploreMode
        companies={companies}
        ignoredIds={ignoredIds}
        interestedIds={interestedIds}
        onModalChange={setExploreModalOpen}
        onPlanFor={planForCompany}
        onToggleInterest={toggleInterest}
      />

      <section className="profile-section" id="profile">
        <div className="decision-section-heading">
          <div>
            <p className="decision-eyebrow">02 · PLAN WITH A REAL PROFILE</p>
            <h2>先说你是谁，再判断谁值得见</h2>
          </div>
          <p>
            {focusCompanyId
              ? "已保留你刚才查看的企业；完成画像后会优先展示它的个性化判断。"
              : "必填项只需点选；可提供资源和当前问题会显著提高推荐理由的可用性。"}
          </p>
        </div>

        <div className="profile-card-v2">
          <div className="profile-card-intro">
            <div>
              <span>你的参会画像</span>
              <b>最多选择 3 个行业和目标</b>
            </div>
            <button onClick={useDemo} type="button">填入产业服务示例</button>
          </div>

          <fieldset className="profile-fieldset">
            <legend>
              用户身份
              <em>必填</em>
            </legend>
            <div className="decision-chips">
              {ROLES.map((role) => (
                <button
                  aria-pressed={draft.role === role}
                  className={draft.role === role ? "active" : ""}
                  key={role}
                  onClick={() => setDraft((current) => ({ ...current, role }))}
                  type="button"
                >
                  {role}
                </button>
              ))}
            </div>
          </fieldset>

          <FieldChips
            label="所属行业"
            note="最多 3 个"
            onToggle={(value) => toggleProfileList("industries", value)}
            options={USER_INDUSTRIES}
            required
            selected={draft.industries}
          />
          <FieldChips
            label="本次参会目标"
            note="最多 3 个"
            onToggle={(value) => toggleProfileList("goals", value)}
            options={GOAL_OPTIONS}
            required
            selected={draft.goals}
          />
          <FieldChips
            label="关注方向"
            note="最多 5 个"
            onToggle={(value) => toggleProfileList("interests", value)}
            options={INTEREST_OPTIONS}
            required
            selected={draft.interests}
          />
          <FieldChips
            label="你可以提供的资源"
            note="选填，但会影响双方价值判断"
            onToggle={(value) => toggleProfileList("resources", value)}
            options={RESOURCE_OPTIONS}
            selected={draft.resources}
          />

          <label className="need-field">
            <span>你当前最想解决的问题 <small>选填</small></span>
            <textarea
              maxLength={160}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  currentNeed: event.target.value,
                }))
              }
              placeholder="例如：寻找能够共同服务制造企业、可以先做小范围验证的 Agent 产品公司"
              value={draft.currentNeed}
            />
            <i>{draft.currentNeed.length}/160</i>
          </label>

          <div className="generate-row">
            <div>
              <b>所有计算在当前浏览器完成</b>
              <span>不注册、不上传你的选择与现场笔记</span>
            </div>
            <button onClick={generateRecommendations} type="button">
              生成企业推荐 <span>→</span>
            </button>
          </div>
          {formError && <p className="form-error" role="alert">{formError}</p>}
        </div>
      </section>

      <section
        className={generated ? "recommendation-section ready" : "recommendation-section"}
        id="recommendations"
      >
        <div className="decision-section-heading">
          <div>
            <p className="decision-eyebrow">03 · PRIORITIZE & VERIFY</p>
            <h2>{generated ? "你的企业推荐" : "推荐结果将在这里出现"}</h2>
          </div>
          <p>
            {generated
              ? `基于「${profile.role} · ${profile.industries.join("、")} · ${profile.goals.join("、")}」计算。`
              : "完成上方四项必填信息后，系统才会开始排序。"}
          </p>
        </div>

        {!generated ? (
          <div className="waiting-state">
            <span>01</span>
            <i />
            <span>963</span>
            <i />
            <b>该见谁？</b>
            <p>我们不会在你没有提供目标时，假装知道什么最适合你。</p>
          </div>
        ) : (
          <>
            <div className="result-summary">
              {(["A", "B", "C", "D", "信息不足"] as const).map((code) => (
                <button
                  className={priorityFilter === code ? `active priority-${code}` : `priority-${code}`}
                  key={code}
                  onClick={() =>
                    setPriorityFilter(
                      priorityFilter === code ? "全部优先级" : code,
                    )
                  }
                  type="button"
                >
                  <span>{code === "信息不足" ? "?" : code}</span>
                  <b>{priorityCounts[code] ?? 0}</b>
                  <small>{priorityLabel(code)}</small>
                </button>
              ))}
            </div>

            <div className="recommendation-toolbar">
              <label>
                <span aria-hidden="true">⌕</span>
                <input
                  aria-label="搜索企业、展位或产品"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="搜索企业 / 展位 / 产品"
                  value={search}
                />
              </label>
              <select
                aria-label="按优先级筛选"
                onChange={(event) =>
                  setPriorityFilter(event.target.value as PriorityFilter)
                }
                value={priorityFilter}
              >
                {["全部优先级", "A", "B", "C", "D", "信息不足"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <select
                aria-label="按展商类别筛选"
                onChange={(event) => setCategoryFilter(event.target.value)}
                value={categoryFilter}
              >
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
              <select
                aria-label="按技术方向筛选"
                onChange={(event) => setDirectionFilter(event.target.value)}
                value={directionFilter}
              >
                <option>全部技术方向</option>
                {profile.interests.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>

            <div className="result-meta-v2">
              <span>显示 {Math.min(visibleRecommendations.length, 60)} / {visibleRecommendations.length} 家</span>
              <b>按优先级与匹配分排序</b>
            </div>

            <div className="recommendation-list">
              {visibleRecommendations.slice(0, 60).map((recommendation) => {
                const { company, priority } = recommendation;
                const saved = savedIds.includes(company.id);
                return (
                  <article className="recommendation-card" key={company.id}>
                    <div className={`priority-flag priority-${priority.code}`}>
                      <strong>{priority.code === "信息不足" ? "?" : priority.code}</strong>
                      <span>{priority.label}</span>
                      <small>{recommendation.total}/100</small>
                    </div>
                    <div className="recommendation-main">
                      <div className="company-card-head">
                        <div>
                          <span>{company.industry} · {company.segment}</span>
                          <h3>{companyName(company.company)}</h3>
                        </div>
                        <b>{company.venue} · {company.booth}</b>
                      </div>
                      <p className="plain-summary">{recommendation.summary}</p>
                      <div className="relationship-tags">
                        {recommendation.relationships.map((relationship) => (
                          <span key={relationship}>{relationship}</span>
                        ))}
                      </div>
                      <div className="reason-preview">
                        <b>为什么与你相关</b>
                        <ul>
                          {recommendation.matchReasons.slice(0, 2).map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="card-actions-v2">
                        <button
                          className="detail-button"
                          onClick={() => setSelectedId(company.id)}
                          type="button"
                        >
                          查看完整判断
                        </button>
                        <button
                          className={saved ? "saved" : ""}
                          onClick={() =>
                            saved ? removeFromList(company.id) : addToList(company.id)
                          }
                          type="button"
                        >
                          {saved ? "✓ 已加入清单" : "＋ 加入接洽清单"}
                        </button>
                        <button onClick={() => ignoreCompany(company.id)} type="button">
                          不感兴趣
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
              {!visibleRecommendations.length && (
                <div className="empty-result">
                  <b>当前筛选没有企业</b>
                  <p>清除筛选或回到上方修改行业和关注方向。</p>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      <section className="contact-list-section" id="my-list">
        <div className="decision-section-heading">
          <div>
            <p className="decision-eyebrow">04 · MY COMPANIES</p>
            <h2>我的企业</h2>
          </div>
          <p>区分“感兴趣”和“准备接洽”，再把现场结果转成可继续跟进的行动。</p>
        </div>

        <div className="my-status-summary">
          <article>
            <strong>{interestedIds.length}</strong>
            <span>感兴趣</span>
          </article>
          <article>
            <strong>{savedIds.length}</strong>
            <span>准备接洽</span>
          </article>
          <article>
            <strong>
              {Object.values(records).filter((record) => record.status === "已接洽").length}
            </strong>
            <span>已接洽</span>
          </article>
          <article>
            <strong>
              {Object.values(records).filter(
                (record) => record.followUp || record.status === "会后跟进",
              ).length}
            </strong>
            <span>会后跟进</span>
          </article>
        </div>

        <div className="interest-list">
          <div className="interest-list-head">
            <div>
              <span>随便逛收藏</span>
              <b>{interestedCompanies.length} 家感兴趣企业</b>
            </div>
            <small>感兴趣不等于已经计划接洽，可以在这里升级状态。</small>
          </div>
          {interestedCompanies.length ? (
            <div>
              {interestedCompanies.map((company) => (
                <article key={company.id}>
                  <div>
                    <span>{company.venue} · {company.booth}</span>
                    <h3>{companyName(company.company)}</h3>
                    <p>{company.industry} · {company.segment}</p>
                  </div>
                  <div>
                    <button onClick={() => planForCompany(company.id)} type="button">
                      判断是否适合我
                    </button>
                    <button onClick={() => addToList(company.id)} type="button">
                      升级为准备接洽
                    </button>
                    <button onClick={() => toggleInterest(company.id)} type="button">
                      移除
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="interest-empty">在“随便逛”中点击“感兴趣”，企业会先保存在这里。</p>
          )}
        </div>

        <div className="contact-list-layout">
          <div className="saved-list">
            <div className="saved-list-head">
              <b>{savedIds.length} 家准备接洽企业</b>
              <span>用 ↑↓ 调整拜访顺序</span>
            </div>
            {savedRecommendations.length ? (
              savedRecommendations.map((recommendation, index) => {
                const record = records[recommendation.company.id];
                return (
                  <article key={recommendation.company.id}>
                    <strong>{String(index + 1).padStart(2, "0")}</strong>
                    <div>
                      <span>{recommendation.company.venue} · {recommendation.company.booth}</span>
                      <h3>{companyName(recommendation.company.company)}</h3>
                      <p>{recommendation.relationships.join(" / ")}</p>
                      {record?.note && <small>记录：{compactText(record.note, 70)}</small>}
                    </div>
                    <div className="saved-status">
                      <em>{record?.status ?? "准备接洽"}</em>
                      {record?.followUp && <i>需会后跟进</i>}
                    </div>
                    <div className="saved-actions">
                      <button
                        aria-label="上移"
                        disabled={index === 0}
                        onClick={() => moveSaved(recommendation.company.id, -1)}
                        type="button"
                      >
                        ↑
                      </button>
                      <button
                        aria-label="下移"
                        disabled={index === savedRecommendations.length - 1}
                        onClick={() => moveSaved(recommendation.company.id, 1)}
                        type="button"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => openRecord(recommendation.company.id)}
                        type="button"
                      >
                        记录
                      </button>
                      <button
                        onClick={() => removeFromList(recommendation.company.id)}
                        type="button"
                      >
                        删除
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="empty-saved">
                <b>还没有准备接洽的企业</b>
                <p>从推荐结果加入，或把上方“感兴趣”企业升级后，这里会形成现场路线。</p>
              </div>
            )}
          </div>

          <aside className="route-planner">
            <div className="route-head">
              <div>
                <span>现场路线</span>
                <b>{savedRecommendations.length ? "按我的清单排馆" : "按推荐结果预览"}</b>
              </div>
              <div>
                {TIME_BUDGETS.map((item) => (
                  <button
                    className={timeBudget === item ? "active" : ""}
                    key={item}
                    onClick={() => setTimeBudget(item)}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="route-groups-v2">
              {routeGroups.map(([venue, entries], index) => (
                <section key={venue}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <b>{venue}</b>
                    {entries.map((entry) => (
                      <p key={entry.company.id}>
                        <i>{entry.company.booth}</i>
                        {companyName(entry.company.company)}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <small>路线只按展馆与展位号整理，不假设现场步行距离；请以场馆导览为准。</small>
          </aside>
        </div>
      </section>

      <section className="decision-method">
        <p className="decision-eyebrow">HOW THE SCORE WORKS</p>
        <h2>分数只负责排序，理由负责让你做决定</h2>
        <div>
          {[
            ["30", "行业匹配", "你的行业是否与企业服务场景相交"],
            ["25", "方向匹配", "关注技术是否出现在公开业务中"],
            ["25", "目标匹配", "企业是否适合你本次参会目标"],
            ["15", "资源互补", "你能否给对方带来具体价值"],
            ["05", "资料完整", "是否有足够字段支持初步判断"],
          ].map(([score, title, copy]) => (
            <article key={title}>
              <strong>{score}</strong>
              <b>{title}</b>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="decision-footer">
        <div>
          <b>WAIC 接洽雷达</b>
          <span>随便逛：搜索与发现 · 找目标：画像、推荐、路线与跟进</span>
        </div>
        <p>
          依据用户提供的 WAIC 2026 展商扫描表与论坛一览表整理。资料不足时不强行评分；公开资料可能变化，正式接洽前请二次核验。
        </p>
      </footer>

      {selectedRecommendation && (
        <div
          className="detail-backdrop"
          onClick={() => setSelectedId(null)}
          role="presentation"
        >
          <article
            aria-labelledby="company-detail-title"
            aria-modal="true"
            className="company-detail"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button
              aria-label="关闭企业详情"
              className="detail-close"
              onClick={() => setSelectedId(null)}
              type="button"
            >
              ×
            </button>
            <div className="detail-hero">
              <div className={`detail-priority priority-${selectedRecommendation.priority.code}`}>
                <strong>
                  {selectedRecommendation.priority.code === "信息不足"
                    ? "?"
                    : selectedRecommendation.priority.code}
                </strong>
                <span>{selectedRecommendation.priority.label}</span>
                <small>{selectedRecommendation.total}/100</small>
              </div>
              <div>
                <span>{selectedRecommendation.company.industry} · {selectedRecommendation.company.segment}</span>
                <h2 id="company-detail-title">
                  {companyName(selectedRecommendation.company.company)}
                </h2>
                <p>{selectedRecommendation.company.company.split("/")[0].trim()}</p>
                <b>{selectedRecommendation.company.venue} · {selectedRecommendation.company.booth}</b>
              </div>
            </div>

            <section className="detail-section detail-summary">
              <span>一句话说明</span>
              <p>{selectedRecommendation.summary}</p>
              <small>原始资料未提供企业官网或 Logo 时，本页不会补写。</small>
            </section>

            <section className="detail-section">
              <span>为什么与你相关</span>
              <ul className="detail-reasons">
                {selectedRecommendation.matchReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </section>

            <section className="detail-section">
              <span>可能的双方关系</span>
              <div className="detail-relationships">
                {selectedRecommendation.relationships.map((relationship) => (
                  <b key={relationship}>{relationship}</b>
                ))}
              </div>
            </section>

            <section className="detail-section opening-box">
              <div>
                <span>建议开场话术</span>
                <button
                  onClick={() =>
                    copyOpening(selectedRecommendation.openingMessage)
                  }
                  type="button"
                >
                  复制
                </button>
              </div>
              <p>“{selectedRecommendation.openingMessage}”</p>
            </section>

            <section className="detail-section">
              <span>现场验证问题</span>
              <ol className="detail-questions">
                {selectedRecommendation.questions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ol>
            </section>

            <section className="detail-section">
              <span>优先级判断依据</span>
              <div className="score-basis">
                {selectedRecommendation.priorityBasis.map((basis, index) => (
                  <div key={basis}>
                    <b>{["行业", "方向", "目标", "互补", "资料"][index]}</b>
                    <p>{basis}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="detail-section source-facts">
              <span>公开资料与活动</span>
              <div>
                <b>原始业务</b>
                <p>{selectedRecommendation.company.business}</p>
              </div>
              <div>
                <b>融资 / 阶段</b>
                <p>{selectedRecommendation.company.financing}</p>
              </div>
              <div>
                <b>相关论坛</b>
                {relatedForums(selectedRecommendation).length ? (
                  relatedForums(selectedRecommendation).map((forum) => (
                    <p key={forum.id}>
                      {formatDate(forum.date)} {forum.start} · {cleanOcrText(forum.name)} · {cleanOcrText(forum.location)}
                    </p>
                  ))
                ) : (
                  <p>原始日程中暂未匹配到明确相关论坛。</p>
                )}
                <small>论坛日程来自 OCR 摘要，名称、地点与开放情况请以大会官方日程为准。</small>
              </div>
            </section>

            <div className="detail-actions">
              <button
                className="primary"
                onClick={() => addToList(selectedRecommendation.company.id)}
                type="button"
              >
                ＋ 加入我的接洽清单
              </button>
              <button
                onClick={() => openRecord(selectedRecommendation.company.id)}
                type="button"
              >
                记录现场沟通
              </button>
              <button
                onClick={() => followUpCompany(selectedRecommendation.company.id)}
                type="button"
              >
                标记会后跟进
              </button>
              <button
                onClick={() => ignoreCompany(selectedRecommendation.company.id)}
                type="button"
              >
                不感兴趣
              </button>
            </div>
          </article>
        </div>
      )}

      {recordingId && (
        <div
          className="record-backdrop"
          onClick={() => setRecordingId(null)}
          role="presentation"
        >
          <section
            aria-labelledby="record-title"
            aria-modal="true"
            className="record-sheet"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div>
              <span>现场沟通结果</span>
              <h2 id="record-title">
                {companyName(recommendationById.get(recordingId)?.company.company ?? "")}
              </h2>
              <button
                aria-label="关闭现场记录"
                onClick={() => setRecordingId(null)}
                type="button"
              >
                ×
              </button>
            </div>
            <fieldset>
              <legend>当前状态</legend>
              <div>
                {(
                  ["准备接洽", "已接洽", "会后跟进", "不再跟进"] as ContactStatus[]
                ).map((status) => (
                  <button
                    className={recordStatus === status ? "active" : ""}
                    key={status}
                    onClick={() => setRecordStatus(status)}
                    type="button"
                  >
                    {status}
                  </button>
                ))}
              </div>
            </fieldset>
            <label>
              <span>沟通内容与关键判断</span>
              <textarea
                onChange={(event) => setRecordNote(event.target.value)}
                placeholder="例如：产品支持私有化，已约下周 Demo；需核验制造客户案例与实施周期。"
                value={recordNote}
              />
            </label>
            <label className="follow-checkbox">
              <input
                checked={recordFollowUp}
                onChange={(event) => setRecordFollowUp(event.target.checked)}
                type="checkbox"
              />
              <span>需要会后继续跟进</span>
            </label>
            <button className="save-record" onClick={saveRecord} type="button">
              保存记录
            </button>
          </section>
        </div>
      )}

      <BackToTop
        hidden={Boolean(selectedRecommendation || recordingId || exploreModalOpen)}
      />
      <BottomNavigation active={activeMode} onNavigate={navigateTo} />
      {toast && <div className="decision-toast" role="status">{toast}</div>}
    </main>
  );
}
