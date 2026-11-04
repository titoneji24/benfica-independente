export type RankingRow = {
  player_id: string; name: string; player_position: string; number: number | null;
  photo_url: string | null; games_rated: number; motm_awards: number; avg_score: number | null;
};
export type RankingSort = "average" | "games" | "motm" | "name";
export function seasonForDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en", { year: "numeric", month: "numeric", timeZone: "Europe/Lisbon" }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  return month >= 7 ? year : year - 1;
}
export function sortRanking(rows: RankingRow[], minimum: number, sort: RankingSort, direction: "asc" | "desc") {
  const sign = direction === "asc" ? 1 : -1;
  return rows.filter((r) => r.games_rated >= minimum).sort((a, b) => {
    if (sort === "average" && (a.avg_score === null || b.avg_score === null)) {
      if (a.avg_score !== b.avg_score) return a.avg_score === null ? 1 : -1;
    }
    const difference = sort === "name" ? a.name.localeCompare(b.name, "pt")
      : sort === "games" ? a.games_rated - b.games_rated
      : sort === "motm" ? a.motm_awards - b.motm_awards
      : (a.avg_score ?? 0) - (b.avg_score ?? 0);
    return difference * sign || a.name.localeCompare(b.name, "pt") || a.player_id.localeCompare(b.player_id);
  });
}