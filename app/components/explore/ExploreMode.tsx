"use client";

import { FormEvent, useMemo, useRef } from "react";
import {
  EXPLORE_CATEGORIES,
  exploreDirections,
  exploreSummary,
  exploreWatchPoint,
  filterExploreCompanies,
  selectExploreBatch,
} from "../../explore";
import { companyName } from "../../recommendation";
import { buildCompanyIndex } from "../../search/buildIndex";
import { searchCompanies } from "../../search/searchCompanies";
import ExploreCompanyDetail from "./ExploreCompanyDetail";

type Company = {
  id: number;
  company: string;
  venue: string;
  booth: string;
  industry: string;
  segment: string;
  business: string;
};
type SearchResult = {
  companyId: number;
  company: Company;
  score: number;
  matchedTerms: string[];
  matchedFields: string[];
  matchTypes: string[];
  suggestions: string[];
  matchValues: string[];
};

export type ExploreProgress = {
  input: string;
  query: string;
  categoryId: string;
  batchSeed: number;
  historyIds: number[];
  recentSearches: string[];
  visibleLimit: number;
  detailId: number | null;
};

const buildIndex = buildCompanyIndex as unknown as (
  companies: Company[],
) => unknown[];
const filterCompanies = filterExploreCompanies as unknown as (
  companies: Company[],
  categoryId: string,
) => Company[];
const selectBatch = selectExploreBatch as unknown as (
  companies: Company[],
  options: {
    categoryId: string;
    ignoredIds: number[];
    historyIds: number[];
    seed: number;
  },
) => Company[];
const runSearch = searchCompanies as unknown as (
  index: unknown[],
  query: string,
  options: { allowedIds?: Set<number>; limit?: number },
) => SearchResult[];

const QUICK_TERMS = ["具身智能", "工业 Agent", "AI 医疗", "芯片", "企业服务"];

export default function ExploreMode({
  companies,
  ignoredIds,
  interestedIds,
  onPlanFor,
  onProgressChange,
  onToggleInterest,
  progress,
}: {
  companies: Company[];
  ignoredIds: number[];
  interestedIds: number[];
  onPlanFor: (id: number) => void;
  onProgressChange: (patch: Partial<ExploreProgress>) => void;
  onToggleInterest: (id: number) => void;
  progress: ExploreProgress;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    input,
    query,
    categoryId,
    batchSeed,
    historyIds,
    recentSearches,
    visibleLimit,
    detailId,
  } = progress;

  const searchIndex = useMemo(() => buildIndex(companies), [companies]);
  const categoryCompanies = useMemo(
    () => filterCompanies(companies, categoryId),
    [categoryId, companies],
  );
  const allowedIds = useMemo(
    () => new Set(categoryCompanies.map((company) => company.id)),
    [categoryCompanies],
  );
  const randomCompanies = useMemo(
    () =>
      selectBatch(companies, {
        categoryId,
        historyIds,
        ignoredIds,
        seed: batchSeed,
      }),
    [batchSeed, categoryId, companies, historyIds, ignoredIds],
  );
  const searchResults = useMemo(
    () =>
      query
        ? runSearch(searchIndex, query, { allowedIds }).filter(
            (result) => !ignoredIds.includes(result.companyId),
          )
        : [],
    [allowedIds, ignoredIds, query, searchIndex],
  );
  const detailCompany =
    detailId === null ? null : companies.find((company) => company.id === detailId) ?? null;

  function saveRecentSearch(value: string) {
    const normalized = value.trim();
    if (!normalized) return;
    const next = [normalized, ...recentSearches.filter((item) => item !== normalized)].slice(
      0,
      6,
    );
    onProgressChange({ recentSearches: next });
  }

  function submitSearch(event?: FormEvent) {
    event?.preventDefault();
    const next = input.trim();
    onProgressChange({ query: next, visibleLimit: 30 });
    if (next) saveRecentSearch(next);
  }

  function runQuickTerm(term: string) {
    onProgressChange({ input: term, query: term, visibleLimit: 30 });
    saveRecentSearch(term);
  }

  function clearSearch() {
    onProgressChange({ input: "", query: "", visibleLimit: 30 });
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function changeBatch() {
    const nextHistory = Array.from(
      new Set([...historyIds, ...randomCompanies.map((company) => company.id)]),
    ).slice(-80);
    onProgressChange({
      historyIds: nextHistory,
      batchSeed: batchSeed + 1,
    });
  }

  function openDetail(id: number) {
    onProgressChange({ detailId: id });
  }

  function closeDetail() {
    onProgressChange({ detailId: null });
  }

  const visibleResults = searchResults.slice(0, visibleLimit);

  return (
    <section className="explore-section" id="explore">
      <div className="decision-section-heading">
        <div>
          <p className="decision-eyebrow">01 · EXPLORE WITHOUT A PROFILE</p>
          <h2>不填资料，先看看现场有什么</h2>
        </div>
        <p>搜索覆盖全部真实展商；没有搜索词时，按当前分类展示一批更值得看的企业。</p>
      </div>

      <div className="explore-panel">
        <div className="explore-discovery">
          <form className="explore-search" onSubmit={submitSearch}>
            <label>
              <span aria-hidden="true">⌕</span>
              <input
                aria-label="搜索全部展商"
                onChange={(event) => {
                  const nextValue = event.target.value;
                  onProgressChange({ input: nextValue });
                  if (!nextValue) {
                    onProgressChange({ query: "", visibleLimit: 30 });
                  }
                }}
                placeholder="例如：工业 AI、零一、H1-C120"
                ref={inputRef}
                value={input}
              />
              {input && (
                <button aria-label="清空搜索词" onClick={clearSearch} type="button">
                  ×
                </button>
              )}
            </label>
            <button type="submit">搜一下</button>
          </form>

          <div className="explore-quick-terms">
            <span>快速搜索</span>
            {[...QUICK_TERMS, ...recentSearches.slice(0, 2)]
              .filter((term, index, values) => values.indexOf(term) === index)
              .map((term) => (
                <button key={term} onClick={() => runQuickTerm(term)} type="button">
                  {term}
                </button>
              ))}
          </div>

          <div className="explore-categories" aria-label="展商分类">
            {EXPLORE_CATEGORIES.map((category) => (
              <button
                aria-pressed={categoryId === category.id}
                className={categoryId === category.id ? "active" : ""}
                key={category.id}
                onClick={() => {
                  onProgressChange({
                    categoryId: category.id,
                    visibleLimit: 30,
                    batchSeed: batchSeed + 1,
                  });
                }}
                type="button"
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        <div className="explore-results">
          <div className="explore-result-head">
            <div>
              <span>{query ? "搜索结果" : "随机发现"}</span>
              <h3>
                {query
                  ? `找到 ${searchResults.length} 家相关企业`
                  : `为你展示 ${randomCompanies.length} 家企业`}
              </h3>
            </div>
            {!query && (
              <button onClick={changeBatch} type="button">
                ↻ 换一批
              </button>
            )}
          </div>

          <div className="explore-company-grid">
            {(query ? visibleResults : randomCompanies).map((item) => {
              const company = "companyId" in item ? item.company : item;
              const interested = interestedIds.includes(company.id);
              const directions = exploreDirections(company) as string[];
              return (
                <article className="explore-company-card" key={company.id}>
                  <div className="explore-company-head">
                    <div>
                      <span>{company.industry} · {company.segment}</span>
                      <h3>{companyName(company.company)}</h3>
                    </div>
                    <b>{company.venue} · {company.booth}</b>
                  </div>
                  <p>{exploreSummary(company)}</p>
                  <div className="explore-direction-tags">
                    {(directions.length ? directions : [company.segment])
                      .slice(0, 3)
                      .map((direction) => (
                        <span key={direction}>{direction}</span>
                      ))}
                  </div>
                  <div className="explore-watch">
                    <b>可以重点看什么</b>
                    <p>{exploreWatchPoint(company)}</p>
                  </div>
                  <div className="explore-card-actions">
                    <button onClick={() => openDetail(company.id)} type="button">
                      查看详情
                    </button>
                    <button
                      className={interested ? "saved" : ""}
                      onClick={() => onToggleInterest(company.id)}
                      type="button"
                    >
                      {interested ? "✓ 已感兴趣" : "☆ 感兴趣"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {query && !searchResults.length && (
            <div className="empty-result">
              <b>暂时没有找到可靠结果</b>
              <p>可以尝试企业简称、产品词、拼音或展位号；短词不会进行过度模糊匹配。</p>
            </div>
          )}
          {query && visibleLimit < searchResults.length && (
            <button
              className="explore-load-more"
              onClick={() =>
                onProgressChange({
                  visibleLimit: Math.min(visibleLimit + 30, 300),
                })
              }
              type="button"
            >
              再看 30 家
            </button>
          )}
        </div>
      </div>

      {detailCompany && (
        <ExploreCompanyDetail
          companies={companies}
          company={detailCompany}
          interested={interestedIds.includes(detailCompany.id)}
          onClose={closeDetail}
          onOpenSimilar={openDetail}
          onPlanFor={(id) => {
            closeDetail();
            onPlanFor(id);
          }}
          onToggleInterest={onToggleInterest}
        />
      )}
    </section>
  );
}
