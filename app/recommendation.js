export const ROLES = [
  "创业者",
  "企业负责人",
  "企业业务人员",
  "投资人",
  "产业服务机构",
  "渠道合作方",
  "媒体或研究人员",
  "求职者",
  "其他",
];

export const USER_INDUSTRIES = [
  "制造业",
  "汽车",
  "机器人",
  "医疗",
  "教育",
  "金融",
  "零售",
  "电商",
  "内容与营销",
  "企业服务",
  "出海",
  "人力资源",
  "其他",
];

export const GOAL_OPTIONS = [
  "找客户",
  "找产品或技术供应商",
  "找渠道合作伙伴",
  "找生态合作伙伴",
  "找投资项目",
  "找融资机会",
  "找工作或人才",
  "了解行业趋势",
  "寻找采访对象",
  "其他",
];

export const INTEREST_OPTIONS = [
  "大模型",
  "Agent",
  "AI 编程",
  "AI 搜索",
  "企业知识库",
  "数据服务",
  "算力与基础设施",
  "具身智能",
  "工业 AI",
  "智能汽车",
  "AI 营销",
  "AI 教育",
  "AI 医疗",
  "其他",
];

export const RESOURCE_OPTIONS = [
  "客户资源",
  "行业场景",
  "渠道资源",
  "技术能力",
  "产品能力",
  "资金",
  "人才",
  "内容传播",
  "活动及社群资源",
  "海外资源",
  "其他",
];

export const EMPTY_USER_PROFILE = {
  role: "",
  industries: [],
  goals: [],
  interests: [],
  resources: [],
  currentNeed: "",
};

export const DEMO_USER_PROFILE = {
  role: "产业服务机构",
  industries: ["制造业", "企业服务"],
  goals: ["找产品或技术供应商", "找生态合作伙伴"],
  interests: ["Agent", "工业 AI"],
  resources: ["客户资源", "行业场景", "活动及社群资源"],
  currentNeed: "寻找能够共同服务制造企业、可以先做小范围验证的 Agent 产品公司",
};

const INDUSTRY_KEYWORDS = {
  制造业: ["制造", "工业", "工厂", "生产线", "质检", "供应链", "港口", "矿山"],
  汽车: ["汽车", "车企", "智驾", "自动驾驶", "座舱", "车路", "新能源车"],
  机器人: ["机器人", "具身", "机械臂", "人形", "灵巧手", "运动控制", "机器狗"],
  医疗: ["医疗", "医院", "健康", "药物", "制药", "生命科学", "诊断"],
  教育: ["教育", "学校", "高校", "教学", "培训", "课程"],
  金融: ["金融", "银行", "保险", "证券", "财富", "风控"],
  零售: ["零售", "门店", "消费品", "商超", "导购"],
  电商: ["电商", "跨境电商", "交易平台", "直播带货"],
  内容与营销: ["营销", "广告", "品牌", "媒体", "内容", "视频", "数字人", "aigc"],
  企业服务: ["企业级", "企业服务", "智能办公", "saas", "数字化转型", "协同", "人力资源"],
  出海: ["出海", "海外", "跨境", "国际市场", "全球化"],
  人力资源: ["人力资源", "招聘", "人才", "员工", "组织", "培训"],
  其他: [],
};

const INTEREST_KEYWORDS = {
  大模型: ["大模型", "llm", "基座模型", "多模态", "生成式ai"],
  Agent: ["智能体", "agent", "ai助理", "ai助手", "一人公司"],
  "AI 编程": ["ai编程", "代码生成", "开发者工具", "编程助手", "软件开发"],
  "AI 搜索": ["ai搜索", "智能搜索", "搜索引擎", "检索增强", "rag"],
  企业知识库: ["知识库", "知识管理", "rag", "企业知识", "数据治理"],
  数据服务: ["数据服务", "数据库", "数据治理", "数据标注", "数据平台", "存储"],
  算力与基础设施: ["算力", "芯片", "gpu", "服务器", "云计算", "基础设施", "推理"],
  具身智能: ["具身", "机器人", "人形", "机械臂", "灵巧手", "运动控制", "空间智能"],
  "工业 AI": ["工业ai", "工业智能", "智能制造", "视觉质检", "生产质检", "预测性维护", "工业互联网"],
  智能汽车: ["汽车", "智驾", "自动驾驶", "车路", "座舱"],
  "AI 营销": ["营销", "广告", "品牌", "内容生成", "数字人", "电商"],
  "AI 教育": ["教育", "教学", "学习", "培训", "学校"],
  "AI 医疗": ["医疗", "医院", "健康", "药物", "诊断", "生命科学"],
  其他: [],
};

const CHANNEL_KEYWORDS = [
  "园区",
  "协会",
  "商会",
  "联盟",
  "孵化",
  "招商",
  "产业平台",
  "渠道",
  "代理商",
  "贸易促进",
];

const INVESTMENT_KEYWORDS = [
  "投资",
  "基金",
  "创投",
  "资本",
  "孵化",
  "产业园",
  "招商",
];

function normalize(value) {
  return String(value ?? "").toLowerCase().replace(/\s+/g, "");
}

export function companyName(value) {
  const parts = String(value ?? "")
    .split("/")
    .map((part) => part.trim());
  const alias = parts[1] ?? "";
  const looksLikeFullEnglishEntity =
    /(?:technology|technologies|company|corporation|limited|\bco\.?\b|\bltd\.?\b)/i.test(alias);
  return alias && alias.length < 40 && !looksLikeFullEnglishEntity ? alias : parts[0];
}

export function compactText(value, length = 64) {
  const text = String(value ?? "").trim();
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

export function isUnknown(value) {
  return !value || /未公开|暂无|未披露|信息不详|待确认/i.test(String(value));
}

function firstEvidence(corpus, keywords) {
  return keywords.find((keyword) => corpus.includes(normalize(keyword))) ?? "";
}

function selectedMatches(corpus, selected, map) {
  return selected
    .filter((label) => label !== "其他")
    .map((label) => ({
      label,
      evidence: firstEvidence(corpus, map[label] ?? []),
    }))
    .filter((item) => {
      if (!item.evidence) return false;
      if (
        item.label === "机器人" &&
        /聊天机器人|软件机器人|流程机器人/.test(corpus) &&
        !/具身|人形|机械臂|灵巧手|运动控制|机器人本体|智能硬件/.test(corpus)
      ) {
        return false;
      }
      if (
        item.label === "制造业" &&
        item.evidence === "工厂" &&
        /软件工厂|ai工厂/.test(corpus) &&
        !/制造|工业|生产线|质检|供应链/.test(corpus)
      ) {
        return false;
      }
      return true;
    });
}

function dataCompleteness(company) {
  let score = 0;
  if (!isUnknown(company.business)) score += 2;
  if (!isUnknown(company.segment)) score += 1;
  if (company.booth && company.venue) score += 1;
  if (!isUnknown(company.financing) || !isUnknown(company.investors)) score += 1;
  return score;
}

function productShort(company, length = 42) {
  if (isUnknown(company.business)) return company.segment || "具体产品";
  return compactText(String(company.business).replaceAll(",", "、"), length);
}

export function plainLanguageSummary(company) {
  if (isUnknown(company.business)) {
    return "公开资料尚未说明具体产品和客户，需要到展位确认它解决什么问题。";
  }

  const product = productShort(company, 54);
  const corpus = normalize(
    `${company.industry} ${company.segment} ${company.business}`,
  );

  if (firstEvidence(corpus, INDUSTRY_KEYWORDS.制造业)) {
    return `提供「${product}」，用于工业或制造相关场景；具体客户和交付方式需现场确认。`;
  }
  if (firstEvidence(corpus, INDUSTRY_KEYWORDS.医疗)) {
    return `提供「${product}」，服务医疗健康相关场景；需现场核验应用对象和合规边界。`;
  }
  if (firstEvidence(corpus, INDUSTRY_KEYWORDS.教育)) {
    return `提供「${product}」，面向教育、学习或人才培养场景；需确认付费客户是谁。`;
  }
  if (firstEvidence(corpus, INDUSTRY_KEYWORDS.汽车)) {
    return `提供「${product}」，应用于汽车或智能出行场景；量产和客户情况需现场核验。`;
  }
  if (firstEvidence(corpus, INDUSTRY_KEYWORDS.机器人)) {
    return `提供「${product}」，属于机器人本体、部件或智能控制能力；落地场景需现场确认。`;
  }
  if (firstEvidence(corpus, INDUSTRY_KEYWORDS.企业服务)) {
    return `面向企业提供「${product}」，帮助完成管理、协同或 AI 应用；需确认标准化程度。`;
  }
  if (firstEvidence(corpus, INTEREST_KEYWORDS.算力与基础设施)) {
    return `提供「${product}」，为 AI 开发、训练或部署提供底层能力；需确认接入门槛。`;
  }
  if (firstEvidence(corpus, INTEREST_KEYWORDS.大模型)) {
    return `提供「${product}」，可作为模型或多模态能力底座；需确认企业应用和交付边界。`;
  }
  return `公开资料显示其提供「${product}」；主要客户、使用场景和合作方式需现场确认。`;
}

function goalFit(company, profile, signals) {
  const corpus = signals.corpus;
  const sectorFit = signals.industryMatches.length + signals.interestMatches.length;
  const hasProduct = !isUnknown(company.business);
  const isChannel =
    company.industry === "机构与平台" ||
    CHANNEL_KEYWORDS.some((keyword) => corpus.includes(normalize(keyword)));
  const isInvestment = INVESTMENT_KEYWORDS.some((keyword) =>
    corpus.includes(normalize(keyword)),
  );
  const candidates = [];

  for (const goal of profile.goals) {
    if (goal === "找产品或技术供应商") {
      const needAligned =
        (!signals.needInterestLabels.length || signals.needInterestMatches.length) &&
        (!signals.needIndustryLabels.length || signals.needIndustryMatches.length);
      const emphasizedNeed = [
        ...signals.needIndustryLabels,
        ...signals.needInterestLabels,
      ];
      candidates.push({
        score: hasProduct && sectorFit && needAligned
          ? 25
          : hasProduct && sectorFit
            ? 14
            : hasProduct
              ? 9
              : 0,
        reason: hasProduct && sectorFit && needAligned
          ? `你的目标是找产品或技术供应商；对方公开提供「${productShort(company, 36)}」，且命中当前问题强调的方向。`
          : hasProduct && sectorFit
            ? `对方与部分选择相关，但没有完整命中当前问题强调的「${emphasizedNeed.join("、")}」，只适合顺路验证。`
          : "对方有产品信息，但与所选行业或方向尚未形成明确供应关系。",
      });
    } else if (goal === "找客户") {
      candidates.push({
        score: signals.industryMatches.length && !isChannel ? 22 : 7,
        reason: signals.industryMatches.length && !isChannel
          ? `你的目标是找客户；对方处在「${signals.industryMatches[0].label}」相关业务中，可核验是否有你的产品需求。`
          : "仅凭现有资料还不能确认对方是否是你的目标客户。",
      });
    } else if (goal === "找渠道合作伙伴") {
      candidates.push({
        score: isChannel ? 25 : sectorFit ? 10 : 4,
        reason: isChannel
          ? "你的目标是找渠道；对方资料出现园区、协会、产业平台或渠道信号，可核验其实际触达能力。"
          : "对方业务相关，但公开资料没有明确渠道网络证据。",
      });
    } else if (goal === "找生态合作伙伴") {
      const needAligned =
        (!signals.needInterestLabels.length || signals.needInterestMatches.length) &&
        (!signals.needIndustryLabels.length || signals.needIndustryMatches.length);
      const emphasizedNeed = [
        ...signals.needIndustryLabels,
        ...signals.needInterestLabels,
      ];
      candidates.push({
        score: sectorFit && needAligned ? 22 : sectorFit ? 12 : isChannel ? 18 : 6,
        reason: sectorFit && needAligned
          ? "你的目标是找生态伙伴；双方处在同一行业或技术链条，可核验能力是否互补。"
          : sectorFit
            ? `双方有部分交集，但对方没有完整命中当前问题强调的「${emphasizedNeed.join("、")}」。`
          : "目前只能确认对方具有平台属性，具体生态合作点仍不明确。",
      });
    } else if (goal === "找投资项目") {
      candidates.push({
        score: sectorFit ? 22 + (!isUnknown(company.financing) ? 3 : 0) : 5,
        reason: sectorFit
          ? `你的投资方向与对方赛道相交；融资资料只用于判断阶段，不作为知名度加分。`
          : "企业赛道未命中你的行业或技术关注方向。",
      });
    } else if (goal === "找融资机会") {
      candidates.push({
        score: isInvestment ? 25 : isChannel ? 18 : 4,
        reason: isInvestment
          ? "你在寻找融资机会；对方具有投资、基金、孵化或产业资本信号，可现场确认投资范围。"
          : "公开资料未显示对方能够提供融资或资本对接。",
      });
    } else if (goal === "找工作或人才") {
      candidates.push({
        score: sectorFit ? 22 : hasProduct ? 10 : 4,
        reason: sectorFit
          ? "你的行业或技术方向与对方业务一致，可进一步核验岗位或人才合作需求。"
          : "对方业务与所选职业方向的关联较弱。",
      });
    } else if (goal === "了解行业趋势") {
      candidates.push({
        score: signals.interestMatches.length ? 22 : hasProduct ? 9 : 3,
        reason: signals.interestMatches.length
          ? `对方业务命中你关注的「${signals.interestMatches.map((item) => item.label).join("、")}」，适合作为趋势样本。`
          : "对方不是所选技术方向的优先趋势样本。",
      });
    } else if (goal === "寻找采访对象") {
      candidates.push({
        score: sectorFit && hasProduct ? 25 : sectorFit ? 15 : 4,
        reason: sectorFit && hasProduct
          ? "你的采访方向与对方公开业务一致，且有具体产品线可供追问。"
          : "缺少与采访方向直接相关的公开产品证据。",
      });
    }
  }

  return candidates.sort((a, b) => b.score - a.score)[0] ?? {
    score: 0,
    reason: "尚未选择明确的参会目标。",
  };
}

function resourceFit(company, profile, signals) {
  const resources = profile.resources.filter((item) => item !== "其他");
  const sectorFit = signals.industryMatches.length + signals.interestMatches.length;
  const isProductCompany =
    company.industry !== "机构与平台" && !isUnknown(company.business);
  const candidates = [];

  if (
    resources.some((item) => ["客户资源", "渠道资源"].includes(item)) &&
    isProductCompany &&
    sectorFit
  ) {
    candidates.push({
      score: 15,
      reason: `你能提供「${resources.filter((item) => ["客户资源", "渠道资源"].includes(item)).join("、")}」；对方有相关产品，可能交换市场入口，但需确认是否开放合作。`,
    });
  }
  if (
    resources.includes("行业场景") &&
    isProductCompany &&
    signals.interestMatches.length
  ) {
    candidates.push({
      score: 15,
      reason: `你能提供行业场景，对方提供「${productShort(company, 30)}」，可讨论小范围验证或联合交付。`,
    });
  }
  if (
    resources.some((item) => ["技术能力", "产品能力"].includes(item)) &&
    signals.industryMatches.length
  ) {
    candidates.push({
      score: 12,
      reason: "你能提供技术或产品能力，对方处在目标行业，可核验双方是否能组成联合解决方案。",
    });
  }
  if (
    resources.some((item) => ["内容传播", "活动及社群资源"].includes(item)) &&
    sectorFit
  ) {
    candidates.push({
      score: 11,
      reason: `你能提供「${resources.filter((item) => ["内容传播", "活动及社群资源"].includes(item)).join("、")}」，可作为联合活动或客户教育的交换资源。`,
    });
  }
  if (resources.includes("资金") && profile.goals.includes("找投资项目") && sectorFit) {
    candidates.push({
      score: 15,
      reason: "你能提供资金且正在找投资项目，对方赛道命中，可进入项目初筛。",
    });
  }
  if (
    resources.includes("人才") &&
    profile.goals.includes("找工作或人才") &&
    sectorFit
  ) {
    candidates.push({
      score: 13,
      reason: "你能提供人才资源，且业务方向相交，可核验岗位或人才合作需求。",
    });
  }

  const best = candidates.sort((a, b) => b.score - a.score)[0];
  if (
    best &&
    ((signals.needInterestLabels.length && !signals.needInterestMatches.length) ||
      (signals.needIndustryLabels.length && !signals.needIndustryMatches.length))
  ) {
    const emphasizedNeed = [
      ...signals.needIndustryLabels,
      ...signals.needInterestLabels,
    ];
    return {
      score: Math.min(8, best.score),
      reason: `你的资源可能对对方有价值，但它没有完整命中当前问题强调的「${emphasizedNeed.join("、")}」，互补关系暂不充分。`,
    };
  }
  return best ?? {
    score: 0,
    reason: resources.length
      ? "你提供的资源与对方公开业务尚未形成明确互补。"
      : "你尚未填写可提供资源，暂时无法证明对方为什么也值得见你。",
  };
}

function potentialRelationships(company, profile, signals, resource) {
  const relationships = [];
  const sectorFit = signals.industryMatches.length + signals.interestMatches.length;
  const isChannel =
    company.industry === "机构与平台" ||
    CHANNEL_KEYWORDS.some((keyword) => signals.corpus.includes(normalize(keyword)));
  const isInvestment = INVESTMENT_KEYWORDS.some((keyword) =>
    signals.corpus.includes(normalize(keyword)),
  );

  if (profile.goals.includes("找客户") && signals.industryMatches.length && !isChannel) {
    relationships.push("潜在客户");
  }
  if (
    profile.goals.includes("找产品或技术供应商") &&
    sectorFit &&
    !isUnknown(company.business)
  ) {
    relationships.push("产品或技术供应商");
  }
  if (profile.goals.includes("找渠道合作伙伴") && isChannel) {
    relationships.push("渠道合作伙伴");
  }
  if (
    profile.goals.includes("找生态合作伙伴") &&
    sectorFit &&
    resource.score >= 10
  ) {
    relationships.push("联合解决方案伙伴", "生态合作伙伴");
  } else if (profile.goals.includes("找生态合作伙伴") && sectorFit) {
    relationships.push("生态合作伙伴");
  }
  if (profile.goals.includes("找投资项目") && sectorFit) {
    relationships.push("投资对象");
  }
  if (profile.goals.includes("找融资机会") && isInvestment) {
    relationships.push("融资对象");
  }
  if (profile.goals.includes("寻找采访对象") && sectorFit) {
    relationships.push("采访或研究对象");
  }
  if (profile.goals.includes("找工作或人才") && sectorFit) {
    relationships.push(
      profile.role === "求职者" ? "潜在雇主" : "人才合作对象",
    );
  }

  return [...new Set(relationships)].slice(0, 3).length
    ? [...new Set(relationships)].slice(0, 3)
    : ["暂无明确关系"];
}

function priorityFrom(total, insufficient) {
  if (insufficient) {
    return {
      code: "信息不足",
      label: "需要现场进一步验证",
      action: "先问清业务",
    };
  }
  if (total >= 80) return { code: "A", label: "建议重点接洽", action: "加入清单" };
  if (total >= 60) return { code: "B", label: "有时间可以接洽", action: "顺路验证" };
  if (total >= 40) return { code: "C", label: "建议先了解资料", action: "先看资料" };
  return { code: "D", label: "暂不优先", action: "暂时跳过" };
}

function openingMessage(company, profile, relationships) {
  const identity = profile.industries.length
    ? `我是做${profile.industries.slice(0, 2).join("、")}相关业务的${profile.role}`
    : `我是${profile.role}`;
  const resource = profile.resources.length
    ? `，我们可以提供${profile.resources.slice(0, 2).join("和")}`
    : "";
  const goal = profile.goals[0] ?? "了解合作机会";
  const ask =
    relationships[0] === "产品或技术供应商"
      ? "想先了解你们的产品边界、真实案例和最小验证方式"
      : relationships[0] === "潜在客户"
        ? "想确认你们现在是否有对应需求，以及由哪个团队负责"
        : relationships[0] === "渠道合作伙伴"
          ? "想了解你们能触达哪些客户，以及是否开放渠道合作"
          : relationships[0] === "投资对象"
            ? "想了解真实客户、增长来源和下一阶段里程碑"
            : relationships[0] === "采访或研究对象"
              ? "想围绕你们的真实落地案例做进一步研究或采访"
              : "想先确认双方可以交换什么资源，以及下一步由谁推进";
  return `${identity}${resource}。这次主要想${goal}，看到你们公开业务提到「${productShort(company, 28)}」，${ask}。`;
}

function verificationQuestions(company, profile, relationships) {
  const product = productShort(company, 30);
  const primary = relationships[0];
  let questions = [];

  if (primary === "潜在客户") {
    questions = [
      `你们目前在「${product}」相关业务中最想解决的具体问题是什么？`,
      "这件事现在由哪个部门和负责人推进，是否有明确时间表？",
      "目前是在自研、使用现有供应商，还是准备寻找新的外部伙伴？",
      `如果我们的「${profile.resources.slice(0, 2).join("、") || "产品或服务"}」能解决问题，下一步最小验证动作是什么？`,
    ];
  } else if (primary === "产品或技术供应商") {
    questions = [
      `你们的「${product}」是标准化产品、API，还是需要项目制交付？`,
      `与我们「${compactText(profile.currentNeed || "当前需求", 28)}」最接近的已落地客户案例是什么？`,
      "一次最小验证需要哪些数据、预算和实施周期？",
      "如果验证通过，常见采购、授权或联合交付模式是什么？",
      "后续应该对接销售、产品、生态还是交付负责人？",
    ];
  } else if (primary === "渠道合作伙伴") {
    questions = [
      "你们能稳定触达哪类企业，是否有可说明的会员、园区或客户范围？",
      `目前是否开放「${product}」相关的渠道或联合市场合作？`,
      "线索归属、售前支持、交付责任和收益通常如何分配？",
      "过去一年是否有类似合作案例，实际带来了什么结果？",
      "下一次可以共同参与的活动、客户对接或项目是什么？",
    ];
  } else if (primary === "联合解决方案伙伴" || primary === "生态合作伙伴") {
    questions = [
      `你们在「${product}」中负责到哪一层产品与交付？`,
      `若结合我们能提供的「${profile.resources.slice(0, 2).join("、") || "行业资源"}」，最适合先服务哪类客户？`,
      "双方谁负责获客、售前、实施和售后，哪些边界不能重叠？",
      "能否选一个现有客户场景，在两周内验证联合方案？",
      "合作若成立，下一步由双方哪两位负责人推进？",
    ];
  } else if (primary === "投资对象" || primary === "融资对象") {
    questions = [
      `「${product}」目前最稳定的付费客户是谁，复购或续费来自什么？`,
      "过去十二个月增长主要来自客户数量、客单价还是一次性项目？",
      "与同类公司相比，最难被复制的产品、数据或渠道优势是什么？",
      "下一阶段最关键的经营里程碑和资金用途是什么？",
      "有哪些客户、收入或交付数据可以在保密前提下进一步核验？",
    ];
  } else if (primary === "采访或研究对象") {
    questions = [
      `你们在「${product}」上最有代表性的真实落地案例是什么？`,
      "这个案例解决前后的指标变化是什么，有哪些公开数据可引用？",
      "行业对这项技术最常见的误解是什么？",
      "有哪些限制、失败案例或不适用场景值得被说明？",
      "会后可以对接哪位业务或技术负责人继续采访？",
    ];
  } else if (primary === "潜在雇主" || primary === "人才合作对象") {
    questions = [
      `团队在「${product}」方向当前最缺哪类角色？`,
      "这个岗位或人才需求对应的真实业务瓶颈是什么？",
      "入职或合作后三个月的成功标准是什么？",
      "团队如何评价技术贡献与业务结果？",
      "后续应与招聘、业务负责人还是创始团队继续沟通？",
    ];
  } else {
    questions = [
      `你们的「${product}」具体解决谁的什么问题？`,
      "目前最成熟的客户案例和可验证结果是什么？",
      "你们现在最希望寻找哪类客户或合作伙伴？",
      "产品是标准化销售还是项目制交付？",
      "若双方要继续聊，下一步应由谁推进什么动作？",
    ];
  }

  const productCorpus = normalize(company.business);
  const isPhysicalRobot =
    /具身|人形|机械臂|灵巧手|机器人本体|工业机器人|特种机器人|运动控制/.test(
      productCorpus,
    ) && !/聊天机器人|软件机器人|流程机器人|rpa/.test(productCorpus);
  if (isPhysicalRobot) {
    questions[2] = "目前是样机、试点还是批量交付阶段？单次部署对环境和人员有什么要求？";
  } else if (firstEvidence(productCorpus, INTEREST_KEYWORDS.大模型)) {
    questions[2] = "企业部署是否需要客户提供数据，支持私有化、API 还是一体机？";
  } else if (firstEvidence(productCorpus, INDUSTRY_KEYWORDS.医疗)) {
    questions[2] = "当前处于科研、临床验证还是商业落地阶段？需要哪些合规或数据条件？";
  }

  return questions.slice(0, 5);
}

export function recommendCompany(company, profile) {
  const corpus = normalize(
    `${company.industry} ${company.segment} ${company.business}`,
  );
  const industryMatches = selectedMatches(
    corpus,
    profile.industries,
    INDUSTRY_KEYWORDS,
  );
  const interestMatches = selectedMatches(
    corpus,
    profile.interests,
    INTEREST_KEYWORDS,
  );
  const needCorpus = normalize(profile.currentNeed);
  const needIndustryLabels = profile.industries.filter((industry) =>
    (INDUSTRY_KEYWORDS[industry] ?? []).some((keyword) =>
      needCorpus.includes(normalize(keyword)),
    ),
  );
  const needInterestLabels = profile.interests.filter((interest) =>
    (INTEREST_KEYWORDS[interest] ?? []).some((keyword) =>
      needCorpus.includes(normalize(keyword)),
    ),
  );
  const needInterestMatches = interestMatches.filter((match) =>
    needInterestLabels.includes(match.label),
  );
  const needIndustryMatches = industryMatches.filter((match) =>
    needIndustryLabels.includes(match.label),
  );
  const signals = {
    corpus,
    industryMatches,
    interestMatches,
    needIndustryLabels,
    needIndustryMatches,
    needInterestLabels,
    needInterestMatches,
  };

  const classificationCorpus = normalize(`${company.industry} ${company.segment}`);
  const industryIsPrimary = industryMatches.some((match) =>
    (INDUSTRY_KEYWORDS[match.label] ?? []).some((keyword) =>
      classificationCorpus.includes(normalize(keyword)),
    ),
  );
  const interestIsPrimary = interestMatches.some((match) =>
    (INTEREST_KEYWORDS[match.label] ?? []).some((keyword) =>
      classificationCorpus.includes(normalize(keyword)),
    ),
  );
  const selectedIndustryCount = Math.max(
    1,
    profile.industries.filter((item) => item !== "其他").length,
  );
  const selectedInterestCount = Math.max(
    1,
    profile.interests.filter((item) => item !== "其他").length,
  );
  const industryScore = industryMatches.length
    ? Math.min(
        30,
        Math.round(
          12 +
            12 * (industryMatches.length / selectedIndustryCount) +
            (industryIsPrimary ? 6 : 0),
        ),
      )
    : 0;
  const interestScore = interestMatches.length
    ? Math.min(
        25,
        Math.round(
          10 +
            11 * (interestMatches.length / selectedInterestCount) +
            (interestIsPrimary ? 4 : 0),
        ),
      )
    : 0;
  const goal = goalFit(company, profile, signals);
  const resource = resourceFit(company, profile, signals);
  const completeness = dataCompleteness(company);
  const total = Math.min(
    100,
    industryScore + interestScore + goal.score + resource.score + completeness,
  );
  const insufficient = isUnknown(company.business) || isUnknown(company.segment);
  const priority = priorityFrom(total, insufficient);
  const relationships = potentialRelationships(company, profile, signals, resource);

  const matchReasons = [];
  if (industryMatches.length) {
    matchReasons.push(
      `行业匹配：你选择了「${industryMatches.map((item) => item.label).join("、")}」，企业资料中出现「${industryMatches.map((item) => item.evidence).join("、")}」。`,
    );
  }
  if (interestMatches.length) {
    matchReasons.push(
      `方向匹配：你关注「${interestMatches.map((item) => item.label).join("、")}」，企业资料中出现「${interestMatches.map((item) => item.evidence).join("、")}」。`,
    );
  }
  if (goal.score > 0) matchReasons.push(goal.reason);
  if (resource.score > 0) matchReasons.push(resource.reason);
  if (!matchReasons.length) {
    matchReasons.push("尚未找到与你所选行业、方向、目标或资源的具体交集。");
  }

  const priorityBasis = [
    `行业 ${industryScore}/30：${industryMatches.length ? `命中 ${industryMatches.map((item) => item.label).join("、")}` : "未命中所选行业"}`,
    `方向 ${interestScore}/25：${interestMatches.length ? `命中 ${interestMatches.map((item) => item.label).join("、")}` : "未命中所选方向"}`,
    `目标 ${goal.score}/25：${compactText(goal.reason, 64)}`,
    `资源互补 ${resource.score}/15：${compactText(resource.reason, 64)}`,
    `资料完整 ${completeness}/5：${insufficient ? "核心业务字段不足" : "业务与展位字段可用于初筛"}`,
  ];

  return {
    company,
    total,
    priority,
    summary: plainLanguageSummary(company),
    matchReasons: matchReasons.slice(0, 4),
    relationships,
    priorityBasis,
    questions: verificationQuestions(company, profile, relationships),
    openingMessage: openingMessage(company, profile, relationships),
    industryMatches: industryMatches.map((item) => item.label),
    interestMatches: interestMatches.map((item) => item.label),
    dataCompleteness: completeness,
  };
}

export function rankCompanies(companies, profile) {
  const order = { A: 0, B: 1, C: 2, D: 3, 信息不足: 4 };
  const seenCompanies = new Set();
  return companies
    .map((company) => recommendCompany(company, profile))
    .sort(
      (left, right) =>
        order[left.priority.code] - order[right.priority.code] ||
        right.total - left.total ||
        Number(left.company.id) - Number(right.company.id),
    )
    .filter((recommendation) => {
      const key = normalize(companyName(recommendation.company.company));
      if (seenCompanies.has(key)) return false;
      seenCompanies.add(key);
      return true;
    });
}
