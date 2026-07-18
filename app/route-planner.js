export const ROUTE_LIMIT = {
  "30分钟": 3,
  "2小时": 6,
  "半天": 8,
  "全天": 10,
};

export function buildSuggestedRoute({
  savedRecommendations,
  recommendations,
  timeBudget,
}) {
  const hasManualList = savedRecommendations.length > 0;
  const selected = (
    hasManualList
      ? savedRecommendations
      : recommendations.filter(
          (item) => item.priority.code === "A" || item.priority.code === "B",
        )
  ).slice(0, ROUTE_LIMIT[timeBudget] ?? ROUTE_LIMIT["2小时"]);

  const groups = new Map();
  for (const recommendation of selected) {
    const venue = recommendation.company.venue || "展馆待确认";
    groups.set(venue, [...(groups.get(venue) ?? []), recommendation]);
  }

  return Array.from(groups.entries()).map(([venue, entries]) => [
    venue,
    hasManualList
      ? entries
      : [...entries].sort((left, right) =>
          String(left.company.booth).localeCompare(
            String(right.company.booth),
            undefined,
            { numeric: true },
          ),
        ),
  ]);
}
