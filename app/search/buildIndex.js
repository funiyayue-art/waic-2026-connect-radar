import { pinyin } from "pinyin-pro";
import companyAliases from "../data/company-aliases.json" with { type: "json" };
import { normalizeBoothNumber, normalizeCompact } from "./normalize.js";

const LEGAL_SUFFIXES =
  /(集团股份有限公司|集团有限公司|股份有限公司|有限责任公司|科技有限公司|信息技术有限公司|有限公司)$/u;
const REGION_PREFIXES =
  /^(北京市?|上海市?|天津市?|重庆市?|深圳市?|广州市?|杭州市?|南京市?|苏州市?|成都市?|武汉市?|合肥市?|西安市?|宁波市?|青岛市?|常州市?|无锡市?|浙江省?|江苏省?|广东省?|山东省?|安徽省?|陕西省?|香港|澳门)/u;

function splitCompanyName(value = "") {
  const [primary = "", ...rest] = String(value)
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    primary,
    englishName: rest.join(" / "),
  };
}

function stripBracketContent(value = "") {
  return value
    .replace(/[（(][^）)]*[）)]/gu, "")
    .replace(/[【\[].*?[】\]]/gu, "")
    .trim();
}

function basicShortNames(primary) {
  const withoutBrackets = stripBracketContent(primary);
  const withoutLegal = withoutBrackets.replace(LEGAL_SUFFIXES, "").trim();
  const withoutRegion = withoutLegal.replace(REGION_PREFIXES, "").trim();
  return Array.from(
    new Set(
      [withoutBrackets, withoutLegal, withoutRegion]
        .map((name) => name.trim())
        .filter((name) => name && name !== primary),
    ),
  );
}

function aliasesFor(primary) {
  const entry = Object.entries(companyAliases).find(
    ([company]) =>
      normalizeCompact(company) === normalizeCompact(primary) ||
      normalizeCompact(primary).startsWith(normalizeCompact(company)),
  );
  return Array.from(
    new Set([...(entry?.[1] ?? []), ...basicShortNames(primary)]),
  );
}

function pinyinValue(value, pattern = "pinyin") {
  if (!value) return "";
  return normalizeCompact(
    pinyin(String(value), {
      pattern,
      toneType: "none",
      type: "array",
      nonZh: "consecutive",
    }).join(""),
  );
}

function fieldRecord(field, value, pinyinEnabled = true) {
  return {
    field,
    value: String(value ?? ""),
    normalized: normalizeCompact(value),
    pinyin: pinyinEnabled ? pinyinValue(value) : "",
    initials: pinyinEnabled ? pinyinValue(value, "first") : "",
  };
}

export function buildCompanyIndex(companies) {
  return companies.map((company) => {
    const { primary, englishName } = splitCompanyName(company.company);
    const aliases = aliasesFor(primary);
    const fields = [
      fieldRecord("name", primary),
      ...aliases.map((alias) => fieldRecord("aliases", alias)),
      fieldRecord("englishName", englishName),
      fieldRecord("booth", company.booth, false),
      fieldRecord("venue", company.venue),
      fieldRecord("industry", company.industry),
      fieldRecord("segment", company.segment),
      fieldRecord("business", company.business),
    ].filter((field) => field.normalized);

    const fuzzyCandidates = Array.from(
      new Set(
        fields
          .filter((field) =>
            ["name", "aliases", "englishName", "segment", "business"].includes(
              field.field,
            ),
          )
          .flatMap((field) => [
            field.normalized,
            ...field.value
              .split(/[\s,，、/|()[\]（）·:：;；]+/u)
              .map((value) => normalizeCompact(value)),
          ])
          .filter((value) => value.length >= 3 && value.length <= 32),
      ),
    );

    return {
      company,
      primary,
      englishName,
      aliases,
      boothNormalized: normalizeBoothNumber(company.booth),
      fields,
      fuzzyCandidates,
    };
  });
}
