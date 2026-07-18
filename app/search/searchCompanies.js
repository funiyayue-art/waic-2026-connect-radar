import searchSynonyms from "../data/search-synonyms.json" with { type: "json" };
import {
  damerauLevenshtein,
  fuzzyThreshold,
  normalizeBoothNumber,
  normalizeCompact,
  tokenizeSearchQuery,
} from "./normalize.js";

const QUERY_CORRECTIONS = new Map([
  ["零一万务", "零一万物"],
  ["科计", "科技"],
  ["agnt", "agent"],
  ["robto", "robot"],
]);

const FIELD_SCORES = {
  name: 88,
  aliases: 86,
  englishName: 84,
  booth: 78,
  venue: 58,
  industry: 62,
  segment: 68,
  business: 54,
};

function synonymLookup() {
  const lookup = new Map();
  for (const [label, values] of Object.entries(searchSynonyms)) {
    const family = Array.from(
      new Set([label, ...values].map((value) => normalizeCompact(value))),
    );
    for (const value of family) {
      lookup.set(
        value,
        family.filter((candidate) => candidate !== value),
      );
    }
  }
  return lookup;
}

const SYNONYM_LOOKUP = synonymLookup();

function bestMatch(matches) {
  return matches.sort(
    (left, right) =>
      right.score - left.score ||
      left.field.localeCompare(right.field) ||
      left.value.localeCompare(right.value),
  )[0];
}

function directMatches(entry, term) {
  const matches = [];
  const boothTerm = normalizeBoothNumber(term);

  for (const field of entry.fields) {
    if (field.field === "booth") {
      if (boothTerm && entry.boothNormalized === boothTerm) {
        matches.push({
          score: 96,
          field: "booth",
          type: "booth",
          value: field.value,
        });
      } else if (
        boothTerm.length >= 2 &&
        entry.boothNormalized.includes(boothTerm)
      ) {
        matches.push({
          score: 78,
          field: "booth",
          type: "booth",
          value: field.value,
        });
      }
      continue;
    }

    if (field.field === "name" && field.normalized === term) {
      matches.push({ score: 100, field: "name", type: "exact", value: field.value });
    } else if (field.field === "aliases" && field.normalized === term) {
      matches.push({ score: 98, field: "aliases", type: "alias", value: field.value });
    } else if (field.field === "englishName" && field.normalized === term) {
      matches.push({
        score: 86,
        field: "englishName",
        type: "exact",
        value: field.value,
      });
    } else if (field.field === "name" && field.normalized.startsWith(term)) {
      matches.push({
        score: 92,
        field: "name",
        type: "substring",
        value: field.value,
      });
    } else if (field.normalized.includes(term)) {
      matches.push({
        score: FIELD_SCORES[field.field] ?? 50,
        field: field.field,
        type: "substring",
        value: field.value,
      });
    }

    if (/^[a-z0-9]+$/u.test(term) && term.length >= 2) {
      if (field.pinyin === term || field.pinyin.startsWith(term)) {
        matches.push({
          score:
            field.field === "name" || field.field === "aliases"
              ? 82
              : Math.min(72, FIELD_SCORES[field.field] ?? 54),
          field: field.field,
          type: "pinyin",
          value: field.value,
        });
      }
      if (field.initials === term || field.initials.startsWith(term)) {
        matches.push({
          score:
            field.field === "name" || field.field === "aliases"
              ? 80
              : Math.min(70, FIELD_SCORES[field.field] ?? 52),
          field: field.field,
          type: "initials",
          value: field.value,
        });
      }
    }
  }

  return matches;
}

function synonymMatch(entry, term) {
  const synonyms = SYNONYM_LOOKUP.get(term) ?? [];
  const matches = synonyms.flatMap((synonym) =>
    directMatches(entry, synonym).map((match) => ({
      ...match,
      score: Math.min(45, match.score) - 5,
      type: "synonym",
      synonym,
    })),
  );
  return matches.length ? bestMatch(matches) : null;
}

function correctionMatch(entry, term) {
  const correction = QUERY_CORRECTIONS.get(term);
  if (!correction) return null;
  const matches = directMatches(entry, normalizeCompact(correction)).map((match) => ({
    ...match,
    score: Math.min(35, match.score) - 4,
    type: "fuzzy",
    suggestion: correction,
  }));
  return matches.length ? bestMatch(matches) : null;
}

function fuzzyMatch(entry, term) {
  const threshold = fuzzyThreshold(term.length);
  if (!threshold) return null;

  let candidate = null;
  for (const value of entry.fuzzyCandidates) {
    if (Math.abs(value.length - term.length) > threshold) continue;
    const distance = damerauLevenshtein(term, value);
    if (distance > threshold) continue;
    if (
      !candidate ||
      distance < candidate.distance ||
      (distance === candidate.distance && value.length < candidate.value.length)
    ) {
      candidate = { distance, value };
    }
  }

  if (!candidate) return null;
  return {
    score: 35 - candidate.distance * 4 - 10,
    field: "name",
    type: "fuzzy",
    value: candidate.value,
    suggestion: candidate.value,
  };
}

function scoreEntry(entry, terms, fullQuery) {
  const termMatches = [];

  for (const term of terms) {
    const direct = directMatches(entry, term);
    const match = direct.length
      ? bestMatch(direct)
      : correctionMatch(entry, term) ??
        synonymMatch(entry, term) ??
        fuzzyMatch(entry, term);
    if (match) termMatches.push({ term, ...match });
  }

  if (!termMatches.length) return null;

  const fields = Array.from(new Set(termMatches.map((match) => match.field)));
  const types = Array.from(new Set(termMatches.map((match) => match.type)));
  let score = termMatches.reduce((total, match) => total + match.score, 0);

  if (termMatches.length === terms.length) score += 20;
  if (fields.length >= 2) score += 10;
  if (
    fullQuery.length >= 3 &&
    entry.fields.some((field) => field.normalized.includes(fullQuery))
  ) {
    score += 15;
  }
  if (types.every((type) => type === "synonym")) score -= 5;
  if (types.every((type) => type === "fuzzy")) score -= 10;
  if (fields.length === 1 && fields[0] === "business") score -= 8;

  return {
    companyId: entry.company.id,
    company: entry.company,
    score,
    matchedTerms: termMatches.map((match) => match.term),
    matchedFields: fields,
    matchTypes: types,
    suggestions: Array.from(
      new Set(termMatches.map((match) => match.suggestion).filter(Boolean)),
    ),
    matchValues: Array.from(
      new Set(termMatches.map((match) => match.value).filter(Boolean)),
    ).slice(0, 3),
  };
}

export function searchCompanies(
  index,
  query,
  { allowedIds, limit = 1000 } = {},
) {
  const terms = tokenizeSearchQuery(query);
  if (!terms.length) return [];
  const fullQuery = normalizeCompact(query);

  let results = index
    .filter((entry) => !allowedIds || allowedIds.has(entry.company.id))
    .map((entry) => scoreEntry(entry, terms, fullQuery))
    .filter(Boolean);

  const confidentCount = results.filter(
    (result) => !result.matchTypes.every((type) => type === "fuzzy"),
  ).length;
  if (confidentCount >= 8) {
    results = results.filter(
      (result) => !result.matchTypes.every((type) => type === "fuzzy"),
    );
  }

  return results
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.matchedTerms.length - left.matchedTerms.length ||
        left.companyId - right.companyId,
    )
    .slice(0, limit);
}

const FIELD_LABELS = {
  name: "企业名称",
  aliases: "企业简称",
  englishName: "英文名",
  booth: "展位号",
  venue: "展馆",
  industry: "行业",
  segment: "细分领域",
  business: "产品或业务",
};

export function explainSearchMatch(result, query) {
  if (!result) return "";
  if (result.suggestions.length) {
    return `你可能在找“${result.suggestions[0]}”`;
  }
  if (result.matchTypes.includes("synonym")) {
    return `“${query.trim()}”关联到企业的${FIELD_LABELS[result.matchedFields[0]] ?? "公开资料"}`;
  }
  if (result.matchTypes.includes("initials")) {
    return `拼音首字母命中${FIELD_LABELS[result.matchedFields[0]] ?? "企业资料"}`;
  }
  if (result.matchTypes.includes("pinyin")) {
    return `拼音命中${FIELD_LABELS[result.matchedFields[0]] ?? "企业资料"}`;
  }
  return `${FIELD_LABELS[result.matchedFields[0]] ?? "公开资料"}命中“${result.matchValues[0] ?? query.trim()}”`;
}
