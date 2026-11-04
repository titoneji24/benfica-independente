import { describe, expect, it } from "vitest";
import { seasonForDate, sortRanking, type RankingRow } from "@/lib/ranking";
const row = (id: string, games: number, average: number | null, awards: number): RankingRow => ({ player_id: id, name: id, player_position: "AV", number: null, photo_url: null, games_rated: games, avg_score: average, motm_awards: awards });
const rows = [row("A", 2, 8.5, 1), row("B", 5, 7, 3), row("C", 1, null, 0)];
describe("Season ranking rules", () => {
  it("includes players meeting the exact minimum of 2 games", () => expect(sortRanking(rows, 2, "games", "desc").map((r) => r.player_id)).toEqual(["B", "A"]));
  it("sorts season averages descending", () => expect(sortRanking(rows, 0, "average", "desc").map((r) => r.player_id)).toEqual(["A", "B", "C"]));
  it("sorts averages ascending without ranking hidden scores as zero", () => expect(sortRanking(rows, 0, "average", "asc").map((r) => r.player_id)).toEqual(["B", "A", "C"]));
  it("sorts by number of Homem do Jogo awards", () => expect(sortRanking(rows, 0, "motm", "desc").map((r) => r.motm_awards)).toEqual([3, 1, 0]));
  it("sorts by evaluated matches", () => expect(sortRanking(rows, 0, "games", "desc").map((r) => r.games_rated)).toEqual([5, 2, 1]));
  it("uses July to June season boundaries in Lisbon", () => {
    expect(seasonForDate(new Date("2026-06-30T12:00:00Z"))).toBe(2025);
    expect(seasonForDate(new Date("2026-07-01T12:00:00Z"))).toBe(2026);
  });
  it("does not mutate cached rows", () => { sortRanking(rows, 0, "games", "desc"); expect(rows.map((r) => r.player_id)).toEqual(["A", "B", "C"]); });
});