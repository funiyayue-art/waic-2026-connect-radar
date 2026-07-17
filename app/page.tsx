"use client";

import { useEffect, useMemo, useState } from "react";
import exhibitorPayload from "./data/exhibitors.json";
import forumPayload from "./data/forums.json";

type Exhibitor = (typeof exhibitorPayload.exhibitors)[number];
type Forum = (typeof forumPayload)[number];
type Goal = "采购/合作" | "投资/产业" | "媒体/研究" | "人才/求职";
type Format = "小红书笔记" | "小绿书长文" | "飞书跟进卡";
type Tone = "行业判断" | "逛展速记" | "投融资观察" | "采购评估";
type Decision = "跳过" | "观察" | "联系";
type Intent = "找供应商" | "找合作伙伴" | "投资调研" | "媒体选题" | "人才交流";
type TimeBudget = "30分钟" | "2小时" | "半天" | "全天";
type ContactStatus = "想聊" | "已聊" | "待跟进" | "已放弃";
type ContactResult = "有明确机会" | "需要继续确认" | "暂不跟进";
type NextStep = "发资料" | "约二次沟通" | "导入飞书";
type ContactRecord = {
  result: ContactResult;
  impression: string;
  nextStep: NextStep;
  updatedAt: string;
};
type BusinessProfile = {
  name: string;
  offer: string;
  customers: string;
  needs: string;
  growth: string;
};
type RelationshipType =
  | "潜在客户"
  | "上游能力方"
  | "联合方案伙伴"
  | "渠道 / 生态"
  | "竞合参照"
  | "待建立关系";

const GOALS: Goal[] = ["采购/合作", "投资/产业", "媒体/研究", "人才/求职"];
const INTENT_OPTIONS: Array<{ label: Intent; goal: Goal }> = [
  { label: "找供应商", goal: "采购/合作" },
  { label: "找合作伙伴", goal: "采购/合作" },
  { label: "投资调研", goal: "投资/产业" },
  { label: "媒体选题", goal: "媒体/研究" },
  { label: "人才交流", goal: "人才/求职" },
];
const TIME_BUDGETS: TimeBudget[] = ["30分钟", "2小时", "半天", "全天"];
const ROUTE_LIMIT: Record<TimeBudget, number> = {
  "30分钟": 3,
  "2小时": 6,
  "半天": 8,
  "全天": 10,
};
const FORMATS: Format[] = ["小红书笔记", "小绿书长文", "飞书跟进卡"];
const TONES: Tone[] = ["行业判断", "逛展速记", "投融资观察", "采购评估"];
const INTERESTS = [
  "大模型",
  "智能体",
  "机器人",
  "具身智能",
  "芯片",
  "企业服务",
  "工业AI",
  "医疗",
  "自动驾驶",
  "数据基础设施",
];
const EMPTY_PROFILE: BusinessProfile = {
  name: "",
  offer: "",
  customers: "",
  needs: "",
  growth: "",
};
const TRAINING_DEMO_PROFILE: BusinessProfile = {
  name: "示例：AI 企业培训服务商",
  offer: "AI 企业培训、员工 AI 能力提升、智能体业务落地辅导",
  customers: "需要数字化转型、员工 AI 培训和组织提效的中大型企业",
  needs: "大模型与智能体平台、企业客户渠道、联合交付伙伴",
  growth: "制造、金融、教育、人力资源与企业服务场景",
};
const SEMANTIC_THEMES = [
  {
    id: "training",
    label: "培训与人才",
    terms: ["培训", "教育", "人才", "人力资源", "员工", "学习", "高校", "商学院", "课程"],
  },
  {
    id: "model-agent",
    label: "大模型与智能体",
    terms: ["大模型", "智能体", "agent", "llm", "生成式ai", "ai助理", "ai助手"],
  },
  {
    id: "enterprise",
    label: "企业服务",
    terms: ["企业服务", "企业级", "办公", "管理", "运营平台", "数字化转型", "协同", "saas"],
  },
  {
    id: "data-cloud",
    label: "数据与云",
    terms: ["数据", "数据库", "云计算", "云服务", "知识库", "数据治理", "存储"],
  },
  {
    id: "compute-chip",
    label: "算力与芯片",
    terms: ["算力", "芯片", "处理器", "gpu", "推理", "计算基础设施", "risc"],
  },
  {
    id: "robot",
    label: "机器人与具身",
    terms: ["机器人", "具身", "机械臂", "人形", "运动控制", "空间智能"],
  },
  {
    id: "manufacturing",
    label: "制造与工业",
    terms: ["制造", "工业", "工厂", "生产", "供应链", "物流", "能源", "港口"],
  },
  {
    id: "marketing-media",
    label: "营销与内容",
    terms: ["营销", "广告", "品牌", "媒体", "视频", "图像", "数字人", "内容"],
  },
  {
    id: "finance",
    label: "金融",
    terms: ["金融", "银行", "保险", "证券", "财富管理", "风控"],
  },
  {
    id: "healthcare",
    label: "医疗健康",
    terms: ["医疗", "健康", "医院", "药物", "生命科学", "诊断"],
  },
  {
    id: "automotive",
    label: "汽车与出行",
    terms: ["汽车", "自动驾驶", "智驾", "车路", "座舱", "出行"],
  },
  {
    id: "channel",
    label: "产业渠道",
    terms: ["园区", "协会", "商会", "产业平台", "招商", "孵化", "贸易推广", "企业出海"],
  },
] as const;

const TOPIC_KEYWORDS: Record<string, string[]> = {
  大模型: ["大模型", "AGI", "LLM", "基座模型"],
  智能体: ["智能体", "Agent", "一人公司"],
  机器人: ["机器人", "具身", "物理世界", "空间智能"],
  具身智能: ["具身", "机器人", "物理世界", "空间智能"],
  芯片: ["算力", "计算", "芯片", "RISC", "TPU", "基础设施"],
  算力芯片: ["算力", "计算", "芯片", "RISC", "TPU", "基础设施"],
  企业服务: ["企业", "管理", "生产力", "商业落地"],
  工业AI: ["工业", "制造", "物流", "港口", "船海", "能源"],
  医疗: ["医疗", "健康", "生命"],
  医疗健康: ["医疗", "健康", "生命"],
  自动驾驶: ["自动驾驶", "智驾", "汽车", "车路协同"],
  数据基础设施: ["数据", "存储", "数据库", "计算"],
};

function isUnknown(value: string) {
  return !value || /未公开|暂无|未披露|信息不详/.test(value);
}

function companyName(company: string) {
  const parts = company.split("/").map((part) => part.trim());
  return parts.length > 1 && parts[1].length < 32 ? parts[1] : parts[0];
}

function compactText(value: string, length = 54) {
  const text = value
    .replace("产品/业务指向明确：", "")
    .replace("资本阶段信号：", "")
    .trim();
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

function hasBusinessProfile(profile: BusinessProfile) {
  return [profile.offer, profile.customers, profile.needs, profile.growth].some(
    (value) => value.trim().length >= 2,
  );
}

function themeMatches(text: string) {
  const normalized = text.toLowerCase();
  return SEMANTIC_THEMES.filter((theme) =>
    theme.terms.some((term) => normalized.includes(term)),
  );
}

function overlapCount(left: Set<string>, right: Set<string>) {
  let count = 0;
  left.forEach((item) => {
    if (right.has(item)) count += 1;
  });
  return count;
}

function joinedThemeLabels(ids: Set<string>) {
  const labels = SEMANTIC_THEMES.filter((theme) => ids.has(theme.id)).map(
    (theme) => theme.label,
  );
  return labels.slice(0, 3).join("、");
}

function relationshipFor(company: Exhibitor, profile: BusinessProfile) {
  const profileReady = hasBusinessProfile(profile);
  const companyCorpus =
    `${company.company} ${company.industry} ${company.segment} ${company.business}`.toLowerCase();
  const companyThemes = new Set(themeMatches(companyCorpus).map((theme) => theme.id));
  const offerThemes = new Set(themeMatches(profile.offer).map((theme) => theme.id));
  const customerThemes = new Set(
    themeMatches(`${profile.customers} ${profile.growth}`).map((theme) => theme.id),
  );
  const needThemes = new Set(themeMatches(profile.needs).map((theme) => theme.id));

  if (!profileReady) {
    return {
      type: "待建立关系" as RelationshipType,
      confidence: "待录入画像",
      rawScore: 0,
      connection: "先录入你提供什么、服务谁和当前需要什么，才能判断这家展商与你的直接关系。",
      opportunity: "当前仅能按赛道、公开业务与展位信息排序。",
      whyVisit: `若你关注「${company.segment}」，可先用 10 分钟核验其真实交付与合作边界。`,
      stopCondition: "如果与你的客户、能力缺口或增长方向均无交集，就不进入优先路线。",
      evidence: `公开业务：${company.business}`,
    };
  }

  const needOverlap = overlapCount(needThemes, companyThemes);
  const customerOverlap = overlapCount(customerThemes, companyThemes);
  const offerOverlap = overlapCount(offerThemes, companyThemes);
  const profileHasTraining = offerThemes.has("training");
  const enterpriseDemandSignal =
    profileHasTraining &&
    /(员工|人力资源|企业运营|智能办公|组织|数字化转型|企业级ai|企业服务)/i.test(
      companyCorpus,
    );
  const institutionalChannel =
    companyThemes.has("channel") ||
    (company.industry === "机构与平台" &&
      /(园区|协会|商会|孵化|招商|贸易|企业服务)/.test(companyCorpus));
  const complementPairs = [
    ["training", "model-agent"],
    ["training", "enterprise"],
    ["model-agent", "data-cloud"],
    ["model-agent", "compute-chip"],
    ["enterprise", "data-cloud"],
    ["manufacturing", "robot"],
    ["marketing-media", "model-agent"],
    ["healthcare", "model-agent"],
    ["automotive", "compute-chip"],
  ];
  const complementHits = complementPairs.filter(
    ([left, right]) =>
      (offerThemes.has(left) && companyThemes.has(right)) ||
      (offerThemes.has(right) && companyThemes.has(left)),
  ).length;

  const candidates: Array<{ type: RelationshipType; score: number }> = [
    {
      type: "上游能力方",
      score:
        needOverlap * 13 +
        (needThemes.has("model-agent") && companyThemes.has("model-agent") ? 8 : 0) +
        (needThemes.has("data-cloud") && companyThemes.has("data-cloud") ? 6 : 0),
    },
    {
      type: "潜在客户",
      score:
        customerOverlap * 8 +
        (enterpriseDemandSignal ? 18 : 0) +
        (profileHasTraining && companyThemes.has("training") ? 5 : 0),
    },
    {
      type: "联合方案伙伴",
      score:
        Math.min(1, complementHits) * 14 +
        Math.min(6, offerOverlap * 2) +
        (companyThemes.has("enterprise") ? 2 : 0),
    },
    {
      type: "渠道 / 生态",
      score: institutionalChannel ? 30 + customerOverlap * 4 : 0,
    },
    {
      type: "竞合参照",
      score:
        offerOverlap * 9 +
        (profileHasTraining && companyThemes.has("training") ? 12 : 0) -
        complementHits * 3,
    },
  ];
  const best = candidates.sort((a, b) => b.score - a.score)[0];
  const type = best.score >= 10 ? best.type : ("待建立关系" as RelationshipType);
  const matchedIds = new Set(
    [...companyThemes].filter(
      (theme) =>
        offerThemes.has(theme) || customerThemes.has(theme) || needThemes.has(theme),
    ),
  );
  const matchedLabel = joinedThemeLabels(matchedIds) || company.segment;
  const profileName = profile.name.trim() || "你的企业";

  const copy: Record<
    RelationshipType,
    { connection: string; opportunity: string; whyVisit: string; stopCondition: string }
  > = {
    潜在客户: {
      connection: `${profileName}提供「${compactText(profile.offer, 34)}」；对方公开业务出现「${matchedLabel}」及企业应用信号，可能存在内部培训或 AI 落地需求。`,
      opportunity: `从对方正在推进的 ${company.segment} 场景切入，验证是否存在培训、组织赋能或专项落地服务采购。`,
      whyVisit: "目标不是介绍你自己，而是确认谁负责 AI 推广、员工采用率和配套培训预算。",
      stopCondition: "若对方没有组织推广任务、明确负责人或近期落地计划，就暂不进入销售跟进。",
    },
    上游能力方: {
      connection: `${profileName}当前需要「${compactText(profile.needs, 34)}」；对方公开能力覆盖「${matchedLabel}」，可能补齐你的产品或交付底座。`,
      opportunity: `评估其 ${company.segment} 能否作为供应能力、接口底座或联合交付资源。`,
      whyVisit: "必须拿到产品边界、接口方式、合作门槛和最小验证周期四个答案。",
      stopCondition: "若不开放接口、不能提供企业案例或最小合作成本超出可承受范围，就停止推进。",
    },
    联合方案伙伴: {
      connection: `${profileName}的「${compactText(profile.offer, 30)}」与对方的「${matchedLabel}」具有互补性，可能组合成面向 ${compactText(profile.customers || profile.growth, 30)} 的方案。`,
      opportunity: `尝试形成“对方产品能力＋你的行业服务/落地能力”的联合方案或联合获客。`,
      whyVisit: "重点确认双方客户是否重叠、谁负责售前与交付，以及收入如何分配。",
      stopCondition: "若客户重叠但能力不互补，或双方都只想让对方带单，就不作为优先伙伴。",
    },
    "渠道 / 生态": {
      connection: `${profileName}希望拓展「${compactText(profile.growth || profile.customers, 34)}」；对方具有园区、协会、孵化或企业服务网络，可能提供批量触达入口。`,
      opportunity: "通过活动、会员企业、园区项目或联合服务包接触目标客户。",
      whyVisit: "要确认它能触达哪类企业、是否有固定活动机制，以及谁能推进下一次联合对接。",
      stopCondition: "若只能提供泛曝光、没有可触达企业名单或后续负责人，就不投入跟进。",
    },
    竞合参照: {
      connection: `${profileName}与对方都覆盖「${matchedLabel}」，既可能存在直接竞争，也可能在客户、内容或交付能力上互补。`,
      opportunity: "用其产品结构、客户定位和交付方式校准自己的差异化，并寻找可合作的空白环节。",
      whyVisit: "不要泛聊趋势，直接比较目标客户、收费方式、交付边界和可替代性。",
      stopCondition: "若双方高度同质且没有区域、渠道或能力互补，就只做竞品记录，不进入合作路线。",
    },
    待建立关系: {
      connection: `现有字段只能确认对方在做「${company.segment}」，暂未找到它与 ${profileName} 的直接上下游连接。`,
      opportunity: "先作为行业观察对象，不占用核心接洽时段。",
      whyVisit: "只有当其现场展示出现与你客户或能力缺口相关的新证据时，再临时加入。",
      stopCondition: "若 3 分钟内仍无法说清双方交换什么价值，就直接跳过。",
    },
  };

  return {
    type,
    confidence: best.score >= 28 ? "高关联" : best.score >= 16 ? "中关联" : "弱关联",
    rawScore: Math.max(0, best.score),
    ...copy[type],
    evidence: `资料依据：${company.business}；关系命中：${matchedLabel}`,
  };
}

function scoreCompany(
  company: Exhibitor,
  goal: Goal,
  interests: string[],
  profile: BusinessProfile,
) {
  const corpus = [
    company.company,
    company.industry,
    company.segment,
    company.business,
    company.investors,
    company.financing,
  ].join(" ");

  const relationship = relationshipFor(company, profile);

  const chosen = interests.length ? interests : [company.industry, company.segment];
  const keywordHits = chosen.reduce((total, interest) => {
    const keywords = TOPIC_KEYWORDS[interest] ?? [interest];
    return total + (keywords.some((keyword) => corpus.includes(keyword)) ? 1 : 0);
  }, 0);

  const relationshipScore = hasBusinessProfile(profile)
    ? Math.min(40, Math.max(4, relationship.rawScore))
    : Math.min(40, 8 + keywordHits * 5);
  const objectiveBonus =
    goal === "投资/产业"
      ? !isUnknown(company.financing)
        ? 7
        : 3
      : goal === "采购/合作"
        ? relationship.type === "上游能力方" ||
          relationship.type === "联合方案伙伴" ||
          relationship.type === "潜在客户"
          ? 8
          : 3
        : goal === "媒体/研究"
          ? 6
          : /人才|教育|培训/.test(corpus)
            ? 7
            : 3;
  const objective = Math.min(25, 7 + keywordHits * 4 + objectiveBonus);
  const evidence =
    (isUnknown(company.business) ? 3 : 10) +
    (isUnknown(company.investors) ? 2 : 5) +
    (isUnknown(company.financing) ? 1 : 5);
  const route = company.booth && company.venue ? 15 : company.venue ? 9 : 3;
  const total = Math.min(100, relationshipScore + objective + evidence + route);

  const verdict =
    total >= 78
      ? "值得优先接洽"
      : total >= 62
        ? "建议现场验证"
        : "暂列观察名单";
  const action: Decision = total >= 78 ? "联系" : total >= 62 ? "观察" : "跳过";

  const strengths = [
    relationship.connection,
    `为什么去：${relationship.whyVisit}`,
    `可能机会：${relationship.opportunity}`,
    company.booth ? `位置明确：${company.venue} ${company.booth}` : "展位信息待确认",
  ];

  const risks = [
    relationship.stopCondition,
    isUnknown(company.business) && "主营业务字段不完整，关系判断可信度较低",
    /大模型|机器人|智能体/.test(company.industry + company.segment) &&
      "热门赛道同质化高，要追问真实客户与交付边界",
  ].filter(Boolean) as string[];

  return {
    total,
    verdict,
    action,
    strengths,
    risks: risks.length ? risks : ["现有公开字段完整，但关键经营数据仍需现场核验"],
    relationship,
    breakdown: [
      { label: "与你的关系", value: relationshipScore, max: 40 },
      { label: "本次目标", value: objective, max: 25 },
      { label: "证据可信度", value: evidence, max: 20 },
      { label: "路线效率", value: route, max: 15 },
    ],
  };
}

function meetingQuestions(
  company: Exhibitor,
  goal: Goal,
  profile: BusinessProfile,
  relationship: ReturnType<typeof relationshipFor>,
) {
  const product = company.segment || company.industry || "核心产品";
  const relationQuestion: Record<RelationshipType, string> = {
    潜在客户: `你们内部谁在负责「${compactText(profile.offer || "AI 落地", 22)}」，今年有明确的推广目标和预算吗？`,
    上游能力方: `针对我们需要的「${compactText(profile.needs || product, 22)}」，你们能提供到哪一层产品、接口和交付支持？`,
    联合方案伙伴: `如果把你们的「${product}」与我们的「${compactText(profile.offer || "行业服务", 20)}」组成联合方案，双方各自负责什么？`,
    "渠道 / 生态": `你们能稳定触达哪些「${compactText(profile.customers || profile.growth || "目标企业", 22)}」，通过什么活动或项目机制对接？`,
    竞合参照: `你们在「${product}」上的目标客户、收费方式和交付边界分别是什么？`,
    待建立关系: `你们在「${product}」里最希望与哪类企业交换什么资源？`,
  };
  const common = [
    relationQuestion[relationship.type],
    `你们已经规模化交付的客户场景是什么，能否提供一个可核验案例？`,
    "能否给出一个可验证的效果指标：成本、准确率、时延或转化率？",
    `如果从 ${company.venue} 的这次交流继续，下一步由谁在什么时间内推进？`,
  ];
  const tailored: Record<Goal, string[]> = {
    "采购/合作": [
      "最小可行合作需要哪些数据、预算和实施周期？",
      "如果两周内做验证，双方各自需要投入什么？",
    ],
    "投资/产业": [
      `本轮或当前阶段最希望补齐的资源是什么？现有资本结构是 ${isUnknown(company.investors) ? "待核验" : "已有产业与财务投资人"}。`,
      "增长来自新增客户、客单价还是续费？未来 12 个月最关键里程碑是什么？",
    ],
    "媒体/研究": [
      "你们最希望行业停止误解的一件事是什么？",
      "有哪些公开案例、数据或负责人可以在会后继续采访？",
    ],
    "人才/求职": [
      "当前最缺的角色对应哪一个真实业务瓶颈？",
      "团队如何评价技术贡献与业务结果，试用期的成功标准是什么？",
    ],
  };
  return [...common, ...tailored[goal]];
}

function matchForums(company: Exhibitor, interests: string[]) {
  const corpus = `${company.industry} ${company.segment} ${company.business}`;
  const tokens = new Set<string>();
  for (const interest of interests) {
    for (const keyword of TOPIC_KEYWORDS[interest] ?? [interest]) tokens.add(keyword);
  }
  for (const [interest, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some((keyword) => corpus.includes(keyword))) {
      tokens.add(interest);
      keywords.forEach((keyword) => tokens.add(keyword));
    }
  }
  if (!tokens.size) {
    company.segment
      .split(/[、，,/\s]+/)
      .filter((token) => token.length >= 2)
      .forEach((token) => tokens.add(token));
  }

  return (forumPayload as Forum[])
    .map((forum) => {
      const text = `${forum.name} ${forum.nameRaw} ${forum.topic}`;
      let score = forum.topic === "前沿综合" ? 0 : 1;
      tokens.forEach((token) => {
        if (text.toLowerCase().includes(token.toLowerCase())) score += 3;
      });
      if (/世博|西岸|张江|Expo|Center|Hall|Room/.test(forum.location)) score += 1;
      return { ...forum, score };
    })
    .filter((forum) => forum.score > 1)
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
    .slice(0, 3);
}

function recommendForums(interests: string[]) {
  const tokens = interests.flatMap(
    (interest) => TOPIC_KEYWORDS[interest] ?? [interest],
  );

  return (forumPayload as Forum[])
    .map((forum) => {
      const text = `${forum.name} ${forum.nameRaw} ${forum.topic}`.toLowerCase();
      const relevance = tokens.reduce(
        (total, token) => total + (text.includes(token.toLowerCase()) ? 3 : 0),
        forum.topic === "前沿综合" ? 1 : 0,
      );
      return { ...forum, relevance };
    })
    .filter((forum) => forum.relevance > 0)
    .sort(
      (a, b) =>
        b.relevance - a.relevance ||
        a.date.localeCompare(b.date) ||
        a.start.localeCompare(b.start),
    )
    .slice(0, 3);
}

function formatDate(date: string) {
  const [, month, day] = date.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

function buildContent(
  company: Exhibitor,
  score: ReturnType<typeof scoreCompany>,
  questions: string[],
  forums: ReturnType<typeof matchForums>,
  format: Format,
  tone: Tone,
  goal: Goal,
) {
  const name = companyName(company.company);
  const reason = score.relationship.connection;
  const risk = score.risks[0];
  const session = forums[0]
    ? `${formatDate(forums[0].date)} ${forums[0].start}「${forums[0].name}」`
    : "暂无高匹配论坛，优先去展位做 15 分钟验证";

  if (format === "飞书跟进卡") {
    return `【WAIC 企业跟进卡】${name}

判断：${score.verdict}｜${score.total}/100
目标：${goal}
关系：${score.relationship.type}｜${score.relationship.confidence}
位置：${company.venue} ${company.booth}
赛道：${company.industry} / ${company.segment}

为什么值得拜访
${score.relationship.whyVisit}

可能形成的机会
${score.relationship.opportunity}

已知证据
1. 主营：${company.business}
2. 股东/投资：${company.investors}
3. 阶段：${company.financing}

待验证风险
${score.risks.map((item) => `- ${item}`).join("\n")}

现场必问
${questions.map((item, index) => `${index + 1}. ${item}`).join("\n")}

相关论坛
${session}

下一步：${score.action}｜负责人：____｜最晚跟进：____`;
  }

  if (format === "小绿书长文") {
    return `# WAIC 2026 企业观察：${name}

## 先给结论
${score.verdict}，接洽评分 ${score.total}/100。当前关系判断为「${score.relationship.type}」。值得看的不是公司名气，而是双方能否交换具体价值。

## 它为什么与你有关
${reason}

## 这次去要拿到什么答案
${score.relationship.whyVisit}

## 可能形成什么
${score.relationship.opportunity}

展位在 ${company.venue} ${company.booth}。融资与上市信息只说明资源和阶段，不代表与你的业务匹配。

## 还不能下结论的地方
${risk}

## 到现场只问这三件事
${questions.slice(0, 3).map((item, index) => `${index + 1}. ${item}`).join("\n")}

## 顺路可看的论坛
${session}

判断边界：以上基于公开整理资料，现场接洽前请核验最新口径。`;
  }

  const hooks: Record<Tone, string> = {
    行业判断: `逛 WAIC 不要只看热闹，${name} 这家我会不会聊？`,
    逛展速记: `今天在 WAIC 看到 ${name}，先记下这 3 个判断`,
    投融资观察: `${name} 值不值得聊？先拆资本信号，再看业务证据`,
    采购评估: `如果要采购/合作，我会用这 5 个问题筛 ${name}`,
  };

  return `${hooks[tone]}

先给结论：${score.verdict}，${score.total}/100。

📍 ${company.venue} ${company.booth}
🏷 ${company.industry}｜${company.segment}
🔗 ${score.relationship.type}｜${score.relationship.confidence}

它为什么与你有关：
${reason}

为什么值得专程去：
· ${score.relationship.whyVisit}

可能形成什么：
· ${score.relationship.opportunity}

但别急着被热词说服：
· ${risk}

到现场建议直接问：
1. ${questions[0]}
2. ${questions[1]}
3. ${questions[3]}

顺路论坛：${session}

你会把它放进「联系 / 观察 / 跳过」哪一档？

#WAIC2026 #世界人工智能大会 #AI行业观察 #上海逛展 #${company.industry.replace(/[与+]/g, "")}`;
}

function csvEscape(value: string | number) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export default function Home() {
  const exhibitors = exhibitorPayload.exhibitors as Exhibitor[];
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("全部行业");
  const [selectedId, setSelectedId] = useState(exhibitors[0].id);
  const [intent, setIntent] = useState<Intent>("找合作伙伴");
  const [goal, setGoal] = useState<Goal>("采购/合作");
  const [businessProfile, setBusinessProfile] =
    useState<BusinessProfile>(EMPTY_PROFILE);
  const [profileDraft, setProfileDraft] =
    useState<BusinessProfile>(EMPTY_PROFILE);
  const [interests, setInterests] = useState<string[]>(["智能体", "企业服务"]);
  const [timeBudget, setTimeBudget] = useState<TimeBudget>("2小时");
  const [planGenerated, setPlanGenerated] = useState(false);
  const [format, setFormat] = useState<Format>("小红书笔记");
  const [tone, setTone] = useState<Tone>("行业判断");
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [savedCompanyIds, setSavedCompanyIds] = useState<number[]>([]);
  const [contactStatuses, setContactStatuses] = useState<
    Record<number, ContactStatus>
  >({});
  const [contactRecords, setContactRecords] = useState<
    Record<number, ContactRecord>
  >({});
  const [contactSheetOpen, setContactSheetOpen] = useState(false);
  const [contactResult, setContactResult] =
    useState<ContactResult>("需要继续确认");
  const [nextStep, setNextStep] = useState<NextStep>("约二次沟通");
  const [quickImpression, setQuickImpression] = useState("");
  const [note, setNote] = useState("");
  const [toast, setToast] = useState("");

  const industries = useMemo(
    () => ["全部行业", ...Array.from(new Set(exhibitors.map((item) => item.industry)))],
    [exhibitors],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return exhibitors
      .filter((item) => industry === "全部行业" || item.industry === industry)
      .filter((item) => {
        if (!needle) return true;
        return `${item.company} ${item.segment} ${item.business} ${item.booth}`
          .toLowerCase()
          .includes(needle);
      })
      .slice(0, 60);
  }, [exhibitors, industry, search]);

  const filteredRanked = useMemo(
    () =>
      filtered
        .map((company) => ({
          company,
          companyScore: scoreCompany(company, goal, interests, businessProfile),
        }))
        .sort(
          (a, b) =>
            b.companyScore.total - a.companyScore.total ||
            a.company.id - b.company.id,
        ),
    [filtered, goal, interests, businessProfile],
  );

  const rankedCompanies = useMemo(
    () =>
      exhibitors
        .map((company) => ({
          company,
          companyScore: scoreCompany(company, goal, interests, businessProfile),
        }))
        .sort(
          (a, b) =>
            b.companyScore.total - a.companyScore.total ||
            a.company.id - b.company.id,
        ),
    [exhibitors, goal, interests, businessProfile],
  );

  const featuredCompanies = useMemo(() => {
    const picked: typeof rankedCompanies = [];
    const usedIndustries = new Set<string>();
    const usedRelationships = new Set<RelationshipType>();
    const profileReady = hasBusinessProfile(businessProfile);
    for (const entry of rankedCompanies) {
      if (usedIndustries.has(entry.company.industry)) continue;
      if (
        profileReady &&
        usedRelationships.has(entry.companyScore.relationship.type)
      ) {
        continue;
      }
      picked.push(entry);
      usedIndustries.add(entry.company.industry);
      usedRelationships.add(entry.companyScore.relationship.type);
      if (picked.length === 3) break;
    }
    return picked;
  }, [rankedCompanies, businessProfile]);

  const topRecommendations = rankedCompanies.slice(0, 10);
  const routeGroups = useMemo(() => {
    const groups = new Map<string, typeof rankedCompanies>();
    for (const entry of rankedCompanies.slice(0, ROUTE_LIMIT[timeBudget])) {
      const venue = entry.company.venue || "展馆待确认";
      groups.set(venue, [...(groups.get(venue) ?? []), entry]);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rankedCompanies, timeBudget]);
  const planForums = useMemo(() => recommendForums(interests), [interests]);

  const selected =
    exhibitors.find((item) => item.id === selectedId) ?? exhibitors[0];
  const score = useMemo(
    () => scoreCompany(selected, goal, interests, businessProfile),
    [selected, goal, interests, businessProfile],
  );
  const questions = useMemo(
    () =>
      meetingQuestions(
        selected,
        goal,
        businessProfile,
        score.relationship,
      ),
    [selected, goal, businessProfile, score.relationship],
  );
  const matchedForums = useMemo(
    () => matchForums(selected, interests),
    [selected, interests],
  );
  const content = useMemo(
    () => buildContent(selected, score, questions, matchedForums, format, tone, goal),
    [selected, score, questions, matchedForums, format, tone, goal],
  );
  const savedDecision = decisions[selected.id] ?? score.action;

  /* eslint-disable react-hooks/set-state-in-effect -- Browser-only local records are restored after hydration. */
  useEffect(() => {
    const saved = window.localStorage.getItem("waic-decisions");
    if (saved) {
      try {
        setDecisions(JSON.parse(saved));
      } catch {
        // Ignore malformed local data.
      }
    }
  }, []);

  useEffect(() => {
    const savedCompanies = window.localStorage.getItem("waic-saved-companies");
    const savedStatuses = window.localStorage.getItem("waic-contact-statuses");
    const savedRecords = window.localStorage.getItem("waic-contact-records");
    const savedProfile = window.localStorage.getItem("waic-business-profile");
    try {
      if (savedCompanies) setSavedCompanyIds(JSON.parse(savedCompanies));
      if (savedStatuses) setContactStatuses(JSON.parse(savedStatuses));
      if (savedRecords) setContactRecords(JSON.parse(savedRecords));
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile) as BusinessProfile;
        setBusinessProfile(parsedProfile);
        setProfileDraft(parsedProfile);
      }
    } catch {
      // Ignore malformed local data.
    }
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(`waic-note-${selected.id}`);
    setNote(saved ?? "");
    const record = contactRecords[selected.id];
    setQuickImpression(record?.impression ?? "");
    setContactResult(record?.result ?? "需要继续确认");
    setNextStep(record?.nextStep ?? "约二次沟通");
  }, [selected.id, contactRecords]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  function toggleInterest(interest: string) {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  }

  function chooseIntent(option: (typeof INTENT_OPTIONS)[number]) {
    setIntent(option.label);
    setGoal(option.goal);
  }

  function updateProfileField(field: keyof BusinessProfile, value: string) {
    setProfileDraft((current) => ({ ...current, [field]: value }));
  }

  function saveBusinessProfile(profile = profileDraft) {
    const normalized = Object.fromEntries(
      Object.entries(profile).map(([key, value]) => [key, value.trim()]),
    ) as BusinessProfile;
    setBusinessProfile(normalized);
    setProfileDraft(normalized);
    setPlanGenerated(false);
    window.localStorage.setItem(
      "waic-business-profile",
      JSON.stringify(normalized),
    );
    showToast(
      hasBusinessProfile(normalized)
        ? "企业画像已保存，推荐理由已重算"
        : "企业画像已清空",
    );
  }

  function loadTrainingDemo() {
    saveBusinessProfile(TRAINING_DEMO_PROFILE);
  }

  function clearBusinessProfile() {
    saveBusinessProfile(EMPTY_PROFILE);
  }

  function generatePlan() {
    setPlanGenerated(true);
    showToast("今日接洽清单已生成");
    window.setTimeout(
      () =>
        document
          .getElementById("personal-plan")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      80,
    );
  }

  function goToCompany(companyId: number) {
    setSelectedId(companyId);
    setIndustry("全部行业");
    window.setTimeout(
      () =>
        document
          .getElementById("decision")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
  }

  function saveDecision(decision: Decision) {
    const next = { ...decisions, [selected.id]: decision };
    setDecisions(next);
    window.localStorage.setItem("waic-decisions", JSON.stringify(next));
    showToast(`已存为「${decision}」`);
  }

  function toggleSavedCompany() {
    const next = savedCompanyIds.includes(selected.id)
      ? savedCompanyIds.filter((id) => id !== selected.id)
      : [...savedCompanyIds, selected.id];
    setSavedCompanyIds(next);
    window.localStorage.setItem("waic-saved-companies", JSON.stringify(next));
    showToast(next.includes(selected.id) ? "已收藏企业" : "已取消收藏");
  }

  function setContactStatus(status: ContactStatus) {
    const next = { ...contactStatuses, [selected.id]: status };
    setContactStatuses(next);
    window.localStorage.setItem("waic-contact-statuses", JSON.stringify(next));
    showToast(`已标记为「${status}」`);
  }

  function saveContactRecord() {
    const status: ContactStatus =
      contactResult === "暂不跟进"
        ? "已放弃"
        : contactResult === "有明确机会"
          ? "待跟进"
          : "已聊";
    const record: ContactRecord = {
      result: contactResult,
      impression: quickImpression.trim(),
      nextStep,
      updatedAt: new Date().toISOString(),
    };
    const nextRecords = { ...contactRecords, [selected.id]: record };
    const nextStatuses = { ...contactStatuses, [selected.id]: status };
    setContactRecords(nextRecords);
    setContactStatuses(nextStatuses);
    window.localStorage.setItem("waic-contact-records", JSON.stringify(nextRecords));
    window.localStorage.setItem("waic-contact-statuses", JSON.stringify(nextStatuses));
    if (quickImpression.trim()) saveNote(quickImpression.trim());
    setContactSheetOpen(false);
    showToast(`接洽记录已保存 · ${status}`);
  }

  function openGenerator() {
    document
      .getElementById("generator")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function saveNote(value: string) {
    setNote(value);
    window.localStorage.setItem(`waic-note-${selected.id}`, value);
  }

  async function copyContent() {
    await navigator.clipboard.writeText(content);
    showToast("内容已复制");
  }

  function exportFeishuCsv() {
    const rows = [
      [
        "我的企业",
        "我方能力",
        "公司",
        "展位",
        "行业",
        "关系类型",
        "为什么拜访",
        "可能机会",
        "细分领域",
        "判断",
        "评分",
        "目标",
        "主营业务",
        "融资阶段",
        "风险",
        "现场问题",
        "备注",
      ],
      [
        businessProfile.name || "未命名企业",
        businessProfile.offer,
        selected.company,
        `${selected.venue} ${selected.booth}`,
        selected.industry,
        score.relationship.type,
        score.relationship.whyVisit,
        score.relationship.opportunity,
        selected.segment,
        savedDecision,
        score.total,
        goal,
        selected.business,
        selected.financing,
        score.risks.join("；"),
        questions.join("；"),
        note,
      ],
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${companyName(selected.company)}-飞书跟进卡.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("已导出飞书 CSV");
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="返回顶部">
          <span className="brand-mark">W</span>
          <span>WAIC 接洽雷达</span>
        </a>
        <nav aria-label="页面导航">
          <a href="#decision">企业判断</a>
          <a href="#generator">内容生成</a>
          <a href="#feishu">飞书方案</a>
        </nav>
        <span className="live-chip">2026 · 上海</span>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">WAIC 2026 FIELD INTELLIGENCE</p>
          <h1>
            别只收藏展商名单。
            <br />
            <span>现场做出接洽判断。</span>
          </h1>
          <p className="hero-lede">
            从你的企业提供什么、需要什么出发，判断谁是客户、上游、伙伴或竞合对象，并生成一张现场可验证的接洽卡。
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#personalize">
              生成今日清单 <span>→</span>
            </a>
            <a className="secondary-button" href="#method">
              看判断方法
            </a>
          </div>
        </div>
        <div className="hero-board" aria-label="数据概览">
          <div className="board-stamp">OPENING DAY</div>
          <p className="board-kicker">今日扫描范围</p>
          <strong>{exhibitorPayload.count}</strong>
          <span>家展商</span>
          <div className="board-grid">
            <div>
              <b>8</b>
              <span>行业</span>
            </div>
            <div>
              <b>{forumPayload.length}</b>
              <span>论坛摘要</span>
            </div>
            <div>
              <b>0</b>
              <span>API 成本</span>
            </div>
          </div>
          <p className="board-note">数据在浏览器本地计算，不上传企业选择与笔记。</p>
        </div>
      </section>

      <section className="quick-start" id="personalize">
        <div className="section-heading">
          <div>
            <p className="eyebrow">00 · BUILD MY DAY</p>
            <h2>先录企业，再说为什么见</h2>
          </div>
          <p>推荐不再从“谁融资最多”出发，而是从你提供什么、需要什么，以及双方能交换什么价值出发。</p>
        </div>

        <article
          className={
            hasBusinessProfile(businessProfile)
              ? "profile-builder profile-ready"
              : "profile-builder"
          }
        >
          <div className="profile-builder-head">
            <div>
              <span>MY COMPANY · 本地保存</span>
              <h3>我的企业画像</h3>
              <p>输入业务关系所需的最少信息；不注册、不上传，内容只保存在当前浏览器。</p>
            </div>
            <div className="profile-status">
              <i aria-hidden="true" />
              {hasBusinessProfile(businessProfile) ? "已参与匹配" : "尚未录入"}
            </div>
          </div>

          <div className="profile-fields">
            <label className="profile-name-field">
              <span>企业名称</span>
              <input
                onChange={(event) => updateProfileField("name", event.target.value)}
                placeholder="例如：某某科技 / 可暂不填写"
                value={profileDraft.name}
              />
            </label>
            <label>
              <span>我们提供什么</span>
              <textarea
                onChange={(event) => updateProfileField("offer", event.target.value)}
                placeholder="产品、服务、核心能力"
                value={profileDraft.offer}
              />
            </label>
            <label>
              <span>我们主要服务谁</span>
              <textarea
                onChange={(event) =>
                  updateProfileField("customers", event.target.value)
                }
                placeholder="客户类型、行业、部门或使用者"
                value={profileDraft.customers}
              />
            </label>
            <label>
              <span>当前需要补什么</span>
              <textarea
                onChange={(event) => updateProfileField("needs", event.target.value)}
                placeholder="供应能力、渠道、技术、客户或伙伴"
                value={profileDraft.needs}
              />
            </label>
            <label>
              <span>想拓展什么场景</span>
              <textarea
                onChange={(event) => updateProfileField("growth", event.target.value)}
                placeholder="市场、行业、区域或新业务"
                value={profileDraft.growth}
              />
            </label>
          </div>

          <div className="profile-actions">
            <div>
              <button className="profile-save-button" onClick={() => saveBusinessProfile()} type="button">
                保存并重新匹配
              </button>
              <button onClick={loadTrainingDemo} type="button">
                试用“AI 企业培训”样例
              </button>
            </div>
            {hasBusinessProfile(businessProfile) && (
              <button className="profile-clear-button" onClick={clearBusinessProfile} type="button">
                清空画像
              </button>
            )}
          </div>
        </article>

        <div className="quick-steps">
          <article className="quick-step">
            <span className="step-number">01</span>
            <div>
              <b>今天主要目标是什么？</b>
              <div className="choice-chips">
                {INTENT_OPTIONS.map((option) => (
                  <button
                    className={intent === option.label ? "active" : ""}
                    key={option.label}
                    onClick={() => chooseIntent(option)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </article>

          <article className="quick-step">
            <span className="step-number">02</span>
            <div>
              <b>关注哪些方向？</b>
              <div className="choice-chips">
                {INTERESTS.map((item) => (
                  <button
                    className={interests.includes(item) ? "active" : ""}
                    key={item}
                    onClick={() => toggleInterest(item)}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </article>

          <article className="quick-step">
            <span className="step-number">03</span>
            <div>
              <b>今天有多少时间？</b>
              <div className="choice-chips">
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
          </article>

          <button className="build-plan-button" onClick={generatePlan} type="button">
            生成我的今日接洽清单 <span>→</span>
          </button>
        </div>

        <div className="featured-zone" id="personal-plan">
          <div className="featured-heading">
            <div>
              <span>企业关系主推</span>
              <h3>今天先看这 3 家</h3>
            </div>
            <p>
              {hasBusinessProfile(businessProfile)
                ? `以下结果已关联「${businessProfile.name || "我的企业"}」，并随目标实时重算。`
                : "尚未录入企业画像，当前结果仅按目标和关注方向计算。"}
            </p>
          </div>
          <div className="featured-grid">
            {featuredCompanies.map(({ company, companyScore }, index) => (
              <button
                className="featured-company"
                key={company.id}
                onClick={() => goToCompany(company.id)}
                type="button"
              >
                <div className="featured-topline">
                  <span>0{index + 1} · {companyScore.relationship.type}</span>
                  <b>{companyScore.total}<small>/100</small></b>
                </div>
                <h4>{companyName(company.company)}</h4>
                <p>{compactText(companyScore.relationship.connection, 90)}</p>
                <div className="featured-reason">
                  <span>为什么去见</span>
                  <b>{compactText(companyScore.relationship.whyVisit, 62)}</b>
                </div>
                <div className="featured-risk">
                  <span>不成立就停止</span>
                  <p>{compactText(companyScore.relationship.stopCondition, 62)}</p>
                </div>
                <i>查看判断 →</i>
              </button>
            ))}
          </div>
        </div>

        {planGenerated && (
          <div className="plan-results" aria-live="polite">
            <article className="top-ten-card">
              <div className="plan-card-heading">
                <span>TOP 10</span>
                <b>最值得接洽的企业</b>
              </div>
              <ol>
                {topRecommendations.map(({ company, companyScore }, index) => (
                  <li key={company.id}>
                    <button onClick={() => goToCompany(company.id)} type="button">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <b>{companyName(company.company)}</b>
                        <small>
                          {companyScore.relationship.type} · {company.venue} {company.booth}
                        </small>
                        <span className="top-ten-why">
                          {compactText(companyScore.relationship.whyVisit, 42)}
                        </span>
                      </div>
                      <strong>{companyScore.total}</strong>
                    </button>
                  </li>
                ))}
              </ol>
            </article>

            <article className="plan-forums-card">
              <div className="plan-card-heading">
                <span>FORUMS</span>
                <b>推荐论坛</b>
              </div>
              <div>
                {planForums.map((forum) => (
                  <section key={forum.id}>
                    <time>{formatDate(forum.date)} · {forum.start}</time>
                    <b>{forum.name}</b>
                    <p>{forum.location || forum.locationRaw}</p>
                  </section>
                ))}
              </div>
            </article>

            <article className="route-card">
              <div className="plan-card-heading">
                <span>ROUTE · {timeBudget}</span>
                <b>按展馆整理的现场路线</b>
              </div>
              <div className="route-groups">
                {routeGroups.map(([venue, entries], index) => (
                  <section key={venue}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <b>{venue}</b>
                      <p>
                        {entries
                          .map(
                            ({ company }) =>
                              `${companyName(company.company)} ${company.booth}`,
                          )
                          .join(" → ")}
                      </p>
                    </div>
                  </section>
                ))}
              </div>
            </article>
          </div>
        )}
      </section>

      <section className="workspace" id="decision">
        <div className="section-heading">
          <div>
            <p className="eyebrow">01 · PICK & DECIDE</p>
            <h2>先选企业，再看证据</h2>
          </div>
          <p>评分只是压缩信息的入口；真正的判断来自可验证事实、风险边界与下一步问题。</p>
        </div>

        <div className="goal-bar">
          <div className="control-group">
            <span>你的目标</span>
            <div className="segmented">
              {GOALS.map((item) => (
                <button
                  className={goal === item ? "active" : ""}
                  key={item}
                  onClick={() => setGoal(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="control-group interest-control">
            <span>关注方向</span>
            <div className="interest-list">
              {INTERESTS.map((item) => (
                <button
                  className={interests.includes(item) ? "active" : ""}
                  key={item}
                  onClick={() => toggleInterest(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="decision-grid">
          <aside className="company-panel">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                aria-label="搜索公司、展位或赛道"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="公司 / 展位 / 赛道"
                value={search}
              />
            </label>
            <select
              aria-label="按行业筛选"
              onChange={(event) => setIndustry(event.target.value)}
              value={industry}
            >
              {industries.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <div className="result-meta">
              <span>显示 {filteredRanked.length} 家</span>
              <span>已按关系价值排序</span>
            </div>
            <div className="company-list">
              {filteredRanked.map(({ company, companyScore }) => (
                <button
                  className={company.id === selected.id ? "company-row active" : "company-row"}
                  key={company.id}
                  onClick={() => setSelectedId(company.id)}
                  type="button"
                >
                  <span className={`company-score-mini score-${companyScore.action}`}>
                    <b>{companyScore.total}</b>
                    <small>{companyScore.action}</small>
                  </span>
                  <span className="company-row-copy">
                    <span className="company-row-name">
                      <b>{companyName(company.company)}</b>
                      {contactStatuses[company.id] && (
                        <em>{contactStatuses[company.id]}</em>
                      )}
                    </span>
                    <small>
                      {company.segment} · {company.booth}
                    </small>
                    <span className="company-row-relation">
                      {companyScore.relationship.type} · {companyScore.relationship.confidence}
                    </span>
                    <span className="company-row-reason">
                      <i aria-hidden="true">＋</i>
                      {compactText(companyScore.relationship.whyVisit, 48)}
                    </span>
                    <span className="company-row-risk">
                      <i aria-hidden="true">△</i>
                      {compactText(companyScore.relationship.stopCondition, 42)}
                    </span>
                  </span>
                </button>
              ))}
              {!filteredRanked.length && (
                <div className="empty-state">没有找到匹配展商，换个关键词试试。</div>
              )}
            </div>
          </aside>

          <article className="evidence-card">
            <div className="evidence-header">
              <div>
                <div className="company-tags">
                  <span>{selected.industry}</span>
                  <span>{selected.location}</span>
                  <span>{score.relationship.type}</span>
                </div>
                <h3>{companyName(selected.company)}</h3>
                <p>{selected.company.split("/")[0].trim()}</p>
              </div>
              <div className={`score-ring score-${score.action}`}>
                <strong>{score.total}</strong>
                <span>/ 100</span>
              </div>
            </div>

            <div className="verdict-strip">
              <div>
                <span>与你的企业关系判断</span>
                <strong>{score.verdict}</strong>
              </div>
              <p>
                {selected.venue} <b>{selected.booth}</b>
              </p>
            </div>

            <div className="relationship-card">
              <div className="relationship-card-head">
                <div>
                  <span>RELATIONSHIP · {score.relationship.confidence}</span>
                  <h4>{score.relationship.type}</h4>
                </div>
                <b>{businessProfile.name || "我的企业"} ↔ {companyName(selected.company)}</b>
              </div>
              <p className="relationship-connection">
                {score.relationship.connection}
              </p>
              <div className="relationship-grid">
                <div>
                  <span>可能形成什么</span>
                  <p>{score.relationship.opportunity}</p>
                </div>
                <div>
                  <span>为什么值得去</span>
                  <p>{score.relationship.whyVisit}</p>
                </div>
                <div>
                  <span>不符合就停止</span>
                  <p>{score.relationship.stopCondition}</p>
                </div>
              </div>
              <small>{score.relationship.evidence}</small>
            </div>

            <div className="evidence-block">
              <p className="block-label">它在做什么 · 公开资料</p>
              <p className="business-copy">{selected.business}</p>
              <div className="fact-grid">
                <div>
                  <span>细分领域</span>
                  <b>{selected.segment}</b>
                </div>
                <div>
                  <span>资本 / 股东</span>
                  <b>{selected.investors}</b>
                </div>
                <div>
                  <span>融资 / 阶段</span>
                  <b>{selected.financing}</b>
                </div>
              </div>
            </div>

            <div className="score-breakdown">
              <p className="block-label">判断拆解</p>
              {score.breakdown.map((item) => (
                <div className="score-line" key={item.label}>
                  <span>{item.label}</span>
                  <div>
                    <i style={{ width: `${(item.value / item.max) * 100}%` }} />
                  </div>
                  <b>{item.value}</b>
                </div>
              ))}
            </div>

            <div className="risk-box">
              <span>关系假设仍需现场验证</span>
              <ul>
                {score.risks.map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
            </div>

            <div className="decision-actions">
              <span>你的最终判断</span>
              <div>
                {(["跳过", "观察", "联系"] as Decision[]).map((item) => (
                  <button
                    className={savedDecision === item ? `active ${item}` : item}
                    key={item}
                    onClick={() => saveDecision(item)}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </article>
        </div>

        <div className="next-grid">
          <article className="questions-card">
            <div className="mini-heading">
              <span>现场对话</span>
              <b>带着关系假设去问</b>
            </div>
            <ol>
              {questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ol>
            <label>
              <span>你的现场备注</span>
              <textarea
                onChange={(event) => saveNote(event.target.value)}
                placeholder="例如：创始团队在场、约了明天下午 Demo、需核验客户名单……"
                value={note}
              />
            </label>
          </article>

          <article className="forum-card">
            <div className="mini-heading">
              <span>论坛匹配</span>
              <b>顺路再验证</b>
            </div>
            <div className="forum-list">
              {matchedForums.length ? (
                matchedForums.map((forum) => (
                  <div className="forum-row" key={forum.id}>
                    <time>
                      <b>{formatDate(forum.date)}</b>
                      <span>{forum.start}</span>
                    </time>
                    <div>
                      <strong>{forum.name}</strong>
                      <p>{forum.location || forum.locationRaw}</p>
                      <small>主题：{forum.topic} · 来源 PDF 第 {forum.sourcePage} 页</small>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">暂无高匹配论坛，建议直接去展位做验证。</div>
              )}
            </div>
            <p className="ocr-note">
              论坛日程来自图片版 PDF 的 OCR 摘要，名称与地点请以原日程为准。
            </p>
          </article>
        </div>
      </section>

      <section className="generator-section" id="generator">
        <div className="section-heading inverse">
          <div>
            <p className="eyebrow">02 · TURN SIGNALS INTO CONTENT</p>
            <h2>一键生成，不替读者下结论</h2>
          </div>
          <p>每条内容固定包含：结论、证据、风险、现场问题和来源边界。</p>
        </div>

        <div className="generator-grid">
          <div className="generator-controls">
            <div className="control-card">
              <span>内容载体</span>
              {FORMATS.map((item) => (
                <button
                  className={format === item ? "active" : ""}
                  key={item}
                  onClick={() => setFormat(item)}
                  type="button"
                >
                  <b>{item}</b>
                  <small>
                    {item === "小红书笔记"
                      ? "适合现场速发与收藏"
                      : item === "小绿书长文"
                        ? "适合深度判断与转发"
                        : "适合团队协作与会后跟进"}
                  </small>
                </button>
              ))}
            </div>
            <div className="tone-card">
              <span>表达角度</span>
              <div>
                {TONES.map((item) => (
                  <button
                    className={tone === item ? "active" : ""}
                    key={item}
                    onClick={() => setTone(item)}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="guardrail-card">
              <b>内容护栏</b>
              <p>✓ 不把融资等同于客户验证</p>
              <p>✓ 不补写资料里没有的数字</p>
              <p>✓ 强制保留现场核验问题</p>
            </div>
          </div>

          <article className="content-preview">
            <div className="preview-toolbar">
              <span>
                <i />
                {format}
              </span>
              <button onClick={copyContent} type="button">
                复制全文
              </button>
            </div>
            <pre>{content}</pre>
          </article>
        </div>
      </section>

      <section className="method-section" id="method">
        <div className="section-heading">
          <div>
            <p className="eyebrow">03 · DECISION DESIGN</p>
            <h2>让读者形成判断的内容结构</h2>
          </div>
          <p>最有效的不是“公司介绍”，而是把信息排成一条可行动的证据链。</p>
        </div>
        <div className="method-flow">
          {[
            ["01", "一句话结论", "先告诉读者：联系、观察还是跳过。"],
            ["02", "三条已知证据", "产品、资本阶段、现场位置，全部可追溯。"],
            ["03", "一个关键反证", "提醒融资、热度或技术名词不能证明什么。"],
            ["04", "三个现场问题", "把阅读兴趣转成可执行的验证动作。"],
            ["05", "一条跟进出口", "表单回执、负责人、截止时间，避免收藏即结束。"],
          ].map(([index, title, copy]) => (
            <article key={index}>
              <span>{index}</span>
              <b>{title}</b>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="feishu-section" id="feishu">
        <div className="feishu-copy">
          <p className="eyebrow">04 · FREE HYBRID SETUP</p>
          <h2>公开阅读用网页，团队协作用飞书</h2>
          <p>
            网页负责把信息讲清楚；飞书多维表格负责分配负责人、收集读者回执和推进线索。两边都不需要自建服务器。
          </p>
          <button className="export-button" onClick={exportFeishuCsv} type="button">
            导出当前企业到飞书 CSV <span>↓</span>
          </button>
        </div>
        <div className="feishu-blueprint">
          <div className="blueprint-head">
            <span>推荐表结构</span>
            <b>4 张表 + 1 个自动化</b>
          </div>
          <div className="table-row">
            <b>企业库</b>
            <span>展商资料 · 证据字段 · 来源</span>
            <i>963</i>
          </div>
          <div className="table-row">
            <b>判断记录</b>
            <span>目标 · 评分 · 联系/观察/跳过</span>
            <i>判断</i>
          </div>
          <div className="table-row">
            <b>内容草稿</b>
            <span>平台 · 角度 · 状态 · 发布链接</span>
            <i>生成</i>
          </div>
          <div className="table-row">
            <b>线索回执</b>
            <span>读者意向 · 联系方式 · 跟进人</span>
            <i>表单</i>
          </div>
          <div className="automation-row">
            <span>当「判断 = 联系」</span>
            <span>→</span>
            <b>通知负责人并创建跟进截止日</b>
          </div>
        </div>
      </section>

      <footer>
        <div>
          <b>WAIC 接洽雷达</b>
          <p>依据用户提供的 WAIC 2026 展商扫描表与论坛一览表整理。</p>
        </div>
        <p>
          公开资料仅用于交流与现场决策辅助。企业信息、融资与日程可能变化，正式接洽前请二次核验。
        </p>
      </footer>

      <div className="mobile-action-bar" aria-label="现场快捷操作">
        <button
          className={savedCompanyIds.includes(selected.id) ? "active" : ""}
          onClick={toggleSavedCompany}
          type="button"
        >
          <span>☆</span>
          {savedCompanyIds.includes(selected.id) ? "已收藏" : "收藏"}
        </button>
        <button
          className={contactStatuses[selected.id] === "想聊" ? "active" : ""}
          onClick={() => setContactStatus("想聊")}
          type="button"
        >
          <span>＋</span>
          加入路线
        </button>
        <button
          className={contactStatuses[selected.id] ? "active" : ""}
          onClick={() => setContactSheetOpen(true)}
          type="button"
        >
          <span>✓</span>
          {contactStatuses[selected.id] ?? "标记已聊"}
        </button>
        <button onClick={openGenerator} type="button">
          <span>✦</span>
          生成内容
        </button>
      </div>

      {contactSheetOpen && (
        <div
          className="contact-sheet-backdrop"
          onClick={() => setContactSheetOpen(false)}
          role="presentation"
        >
          <section
            aria-labelledby="contact-sheet-title"
            aria-modal="true"
            className="contact-sheet"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="contact-sheet-head">
              <div>
                <span>现场快速记录</span>
                <h3 id="contact-sheet-title">{companyName(selected.company)}</h3>
              </div>
              <button
                aria-label="关闭接洽记录"
                onClick={() => setContactSheetOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <fieldset>
              <legend>接洽结果</legend>
              <div className="sheet-options">
                {(
                  ["有明确机会", "需要继续确认", "暂不跟进"] as ContactResult[]
                ).map((item) => (
                  <button
                    className={contactResult === item ? "active" : ""}
                    key={item}
                    onClick={() => setContactResult(item)}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="impression-field">
              <span>补充一句现场印象</span>
              <textarea
                onChange={(event) => setQuickImpression(event.target.value)}
                placeholder="例如：已约 Demo，需核验客户案例……"
                value={quickImpression}
              />
            </label>

            <fieldset>
              <legend>下一步</legend>
              <div className="sheet-options">
                {(["发资料", "约二次沟通", "导入飞书"] as NextStep[]).map(
                  (item) => (
                    <button
                      className={nextStep === item ? "active" : ""}
                      key={item}
                      onClick={() => setNextStep(item)}
                      type="button"
                    >
                      {item}
                    </button>
                  ),
                )}
              </div>
            </fieldset>

            <button className="save-contact-button" onClick={saveContactRecord} type="button">
              保存接洽记录
            </button>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
