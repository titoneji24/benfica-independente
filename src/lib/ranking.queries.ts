import { queryOptions } from "@tanstack/react-query";
import { getRankingOverview, getRankingAverages } from "./ranking.functions";
export const rankingQuery = (season: number, demo: boolean) => queryOptions({
  queryKey: ["season-ranking", season, demo],
  queryFn: () => getRankingOverview({ data: { season, demo } }),
  staleTime: 30_000,
});
export const rankingAveragesQuery = (season: number, demo: boolean, userId: string) => queryOptions({
  queryKey: ["season-ranking-averages", season, demo, userId],
  queryFn: () => getRankingAverages({ data: { season, demo } }),
  staleTime: 0,
});