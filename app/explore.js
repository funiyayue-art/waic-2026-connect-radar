import { normalizeCompact } from "./search/normalize.js";

export const EXPLORE_CATEGORIES = [
  { id: "all", label: "全部", keywords: [] },
  { id: "robot", label: "机器人", keywords: ["机器人", "具身", "机械臂", "灵巧手", "amr"] },
  { id: "agent", label: "Agent", keywords: ["agent", "智能体", "数字员工"] },
  { id: "industrial-ai", label: "工业 AI", keywords: ["工业ai", "工业智能", "智能制造", "视觉质检"] },
  { id: "medical-ai", label: "AI 医疗", keywords: ["医疗ai", "智慧医疗", "医学影像", "药物", "健康"] },
  { id: "chip", label: "芯片", keywords: ["芯片", "半导体", "gpu", "npu", "处理器"] },
  { id: "hardware", label: "智能硬件", keywords: ["智能硬件", "智能终端", "传感器", "可穿戴"] },
  { id: "enterprise", label: "企业服务", keywords: ["企业服务", "saas", "企业软件", "数字化转型"] },
  { id: "overseas", label: "出海", keywords: ["出海", "海外", "国际化", "跨境", "全球"] },
];

export function companyExploreCorpus(company) {
  return normalizeCompact(
    [
      company.company,
      company.venue,
      company.booth,
      company.industry,
      company.segment,
      company.business,
    ].join(" "),
  );
}

export function companyMatchesExploreCategory(company, categoryId) {
  const category = EXPLORE_CATEGORIES.find((item) => item.id === categoryId);
  if (!category || !category.keywords.length) return true;
  const corpus = companyExploreCorpus(company);
  return category.keywords.some((keyword) =>
    corpus.includes(normalizeCompact(keyword)),
  );
}

export function filterExploreCompanies(companies, categoryId) {
  return companies.filter((company) =>
    companyMatchesExploreCategory(company, categoryId),
  );
}

function informationScore(company) {
  const fields = [
    company.company,
    company.venue,
    company.booth,
    company.industry,
    company.segment,
    company.business,
  ];
  const complete = fields.filter(
    (value) =>
      value &&
      !/未公开|待补充|不详|未知|无明确/u.test(String(value)),
  ).length;
  return complete * 10 + Math.min(String(company.business ?? "").length, 80) / 8;
}

function seededValue(id, seed) {
  let value = Number(id) * 1103515245 + Number(seed) * 12345;
  value ^= value >>> 16;
  return Math.abs(value % 100000) / 100000;
}

export function selectExploreBatch(
  companies,
  {
    categoryId = "all",
    ignoredIds = [],
    historyIds = [],
    seed = 1,
    limit = 6,
  } = {},
) {
  const ignored = new Set(ignoredIds);
  const history = new Set(historyIds);
  const categoryCompanies = filterExploreCompanies(companies, categoryId).filter(
    (company) => !ignored.has(company.id),
  );
  const withoutRecent = categoryCompanies.filter((company) => !history.has(company.id));
  const candidates =
    withoutRecent.length >= limit ? withoutRecent : categoryCompanies;
  const ranked = [...candidates].sort(
    (left, right) =>
      informationScore(right) -
        informationScore(left) +
        (seededValue(left.id, seed) - seededValue(right.id, seed)) * 24 ||
      left.id - right.id,
  );

  const selected = [];
  const venues = new Set();
  const industries = new Set();
  const segmentCounts = new Map();

  for (const company of ranked) {
    const segmentCount = segmentCounts.get(company.segment) ?? 0;
    if (segmentCount >= 2) continue;
    const needsDiversity =
      selected.length < Math.min(4, limit) &&
      venues.has(company.venue) &&
      industries.has(company.industry);
    if (needsDiversity) continue;
    selected.push(company);
    venues.add(company.venue);
    industries.add(company.industry);
    segmentCounts.set(company.segment, segmentCount + 1);
    if (selected.length === limit) break;
  }

  if (selected.length < limit) {
    for (const company of ranked) {
      if (selected.some((item) => item.id === company.id)) continue;
      selected.push(company);
      if (selected.length === limit) break;
    }
  }

  return selected;
}

export function exploreSummary(company, length = 110) {
  const business = String(company.business ?? "").trim();
  if (!business || /未公开|待补充|不详/u.test(business)) {
    return `公开资料显示其属于“${company.industry} · ${company.segment}”，具体产品和演示内容需要到展位确认。`;
  }
  const summary = `主要公开业务包括：${business.replace(/[,，]/g, "、")}。`;
  return summary.length > length ? `${summary.slice(0, length - 1)}…` : summary;
}

export function exploreDirections(company) {
  const corpus = companyExploreCorpus(company);
  return EXPLORE_CATEGORIES.filter(
    (category) =>
      category.id !== "all" &&
      category.keywords.some((keyword) =>
        corpus.includes(normalizeCompact(keyword)),
      ),
  )
    .map((category) => category.label)
    .slice(0, 4);
}

export function exploreWatchPoint(company) {
  const corpus = companyExploreCorpus(company);
  if (/具身|机器人|机械臂|灵巧手/u.test(corpus)) {
    return "重点观察真实动作演示、稳定性，以及是否已经进入具体行业场景。";
  }
  if (/大模型|agent|智能体|知识库/u.test(corpus)) {
    return "重点观察产品边界、现场可操作演示，以及是否有真实客户案例。";
  }
  if (/芯片|半导体|gpu|npu|处理器/u.test(corpus)) {
    return "重点观察性能指标、量产与交付状态，以及适配的软件生态。";
  }
  if (/医疗|健康|药物/u.test(corpus)) {
    return "重点观察合规与临床验证情况，以及产品实际使用方。";
  }
  return "重点观察产品是否可以现场演示、已经服务哪些客户，以及交付方式。";
}

export function exploreQuestions(company) {
  const shortBusiness = String(company.business ?? "")
    .split(/[,，]/u)
    .filter(Boolean)[0];
  const subject = shortBusiness || company.segment || "这项产品";
  return [
    `你们展示的“${subject}”是标准化产品，还是项目制方案？`,
    "目前最有代表性的落地客户或使用场景是什么？",
    "如果想进一步了解，现场应该对接产品、销售还是生态负责人？",
  ];
}

export function similarExploreCompanies(companies, company, limit = 3) {
  return companies
    .filter(
      (candidate) =>
        candidate.id !== company.id &&
        (candidate.segment === company.segment ||
          candidate.industry === company.industry),
    )
    .sort(
      (left, right) =>
        Number(right.segment === company.segment) -
          Number(left.segment === company.segment) ||
        left.id - right.id,
    )
    .slice(0, limit);
}
