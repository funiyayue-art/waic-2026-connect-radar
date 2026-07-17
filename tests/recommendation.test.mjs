import assert from "node:assert/strict";
import test from "node:test";
import {
  DEMO_USER_PROFILE,
  rankCompanies,
  recommendCompany,
} from "../app/recommendation.js";

const base = {
  id: 1,
  company: "测试企业",
  venue: "世博展览馆",
  booth: "H1-A001",
  industry: "行业AI应用",
  segment: "工业智能体",
  business: "制造企业智能体平台,生产知识库,设备运维助手",
  investors: "未公开",
  financing: "未公开",
  location: "上海",
};

test("relevant evidence outranks famous but unrelated financing signals", () => {
  const relevant = { ...base, id: 2, company: "相关工业智能体公司" };
  const famousButIrrelevant = {
    ...base,
    id: 1,
    company: "知名消费内容公司",
    industry: "企业服务与营销",
    segment: "消费内容营销",
    business: "消费品牌广告投放,短视频内容制作",
    investors: "多家知名投资机构",
    financing: "已上市",
  };
  const ranked = rankCompanies(
    [famousButIrrelevant, relevant],
    DEMO_USER_PROFILE,
  );
  assert.equal(ranked[0].company.id, 2);
  assert.ok(ranked[0].total > ranked[1].total);
  assert.match(ranked[0].matchReasons.join(" "), /制造业|Agent|工业 AI/);
});

test("recommendation exposes a complete, actionable contact decision", () => {
  const result = recommendCompany(base, DEMO_USER_PROFILE);
  assert.ok(["A", "B"].includes(result.priority.code));
  assert.ok(result.matchReasons.length >= 3);
  assert.ok(result.matchReasons.every((reason) => !/高度匹配$/.test(reason)));
  assert.ok(result.relationships.includes("产品或技术供应商"));
  assert.ok(result.questions.length >= 3 && result.questions.length <= 5);
  assert.ok(result.questions.some((question) => /标准化产品|API|项目制/.test(question)));
  assert.match(result.openingMessage, /产业服务机构/);
  assert.match(result.openingMessage, /客户资源|行业场景/);
  assert.equal(result.priorityBasis.length, 5);
});

test("questions change with the user's relationship goal", () => {
  const supplier = recommendCompany(base, DEMO_USER_PROFILE);
  const media = recommendCompany(base, {
    role: "媒体或研究人员",
    industries: ["制造业"],
    goals: ["寻找采访对象"],
    interests: ["工业 AI"],
    resources: ["内容传播"],
    currentNeed: "寻找有真实制造业案例的采访对象",
  });
  assert.ok(media.relationships.includes("采访或研究对象"));
  assert.notDeepEqual(media.questions, supplier.questions);
  assert.ok(media.questions.some((question) => /公开数据|误解|采访/.test(question)));
});

test("missing core business data is not force-scored", () => {
  const result = recommendCompany(
    {
      ...base,
      business: "未公开",
      segment: "信息不详",
    },
    DEMO_USER_PROFILE,
  );
  assert.equal(result.priority.code, "信息不足");
  assert.equal(result.priority.label, "需要现场进一步验证");
  assert.match(result.summary, /需要到展位确认/);
});

test("duplicate exhibitor rows are collapsed into one company", () => {
  const ranked = rankCompanies(
    [
      base,
      { ...base, id: 2, booth: "H2-B002" },
    ],
    DEMO_USER_PROFILE,
  );
  assert.equal(ranked.length, 1);
});
