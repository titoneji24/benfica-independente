import { describe, expect, it } from "vitest";
import { canChooseMotm, confirmedCount, isScoreConfirmed, motmRanking } from "@/lib/voting";

describe("Independent confirmed ratings", () => {
  it("hides Prestianni before rating", () => expect(isScoreConfirmed(undefined, undefined)).toBe(false));
  it("hides a selected 8 before save", () => expect(isScoreConfirmed(8, undefined)).toBe(false));
  it("reveals a successfully saved 8", () => expect(isScoreConfirmed(8, 8)).toBe(true));
  it("does not unlock Pavlidis when Prestianni is saved", () => {
    const saved: Record<string, number> = { prestianni: 8 };
    expect(isScoreConfirmed(8, saved["pavlidis"])).toBe(false);
  });
  it("keeps Prestianni visible while evaluating Pavlidis", () => {
    const saved = { prestianni: 8 };
    expect(isScoreConfirmed(8, saved.prestianni)).toBe(true);
  });
  it("hides an edited score until replacement succeeds", () => expect(isScoreConfirmed(9, 8)).toBe(false));
  it("a failed save does not unlock the selected score", () => expect(isScoreConfirmed(8, undefined)).toBe(false));
  it("counts only persisted ratings in progress", () => expect(confirmedCount(["prestianni", "pavlidis"], { prestianni: 8 })).toBe(1));
  it("keeps a saved rating counted while editing", () => expect(confirmedCount(["prestianni"], { prestianni: 8 })).toBe(1));
  it("excludes coaches from MOTM by role and position", () => {
    expect(canChooseMotm("treinador", "MED")).toBe(false);
    expect(canChooseMotm("titular", "TRE")).toBe(false);
    expect(canChooseMotm("titular", "AV")).toBe(true);
  });
});

describe("Real MOTM ranking", () => {
  const votes = [
    { player_id: "pavlidis", motm_count: 15, motm_total: 100 },
    { player_id: "zero", motm_count: 0, motm_total: 100 },
    { player_id: "prestianni", motm_count: 80, motm_total: 100 },
    { player_id: "sudakov", motm_count: 3, motm_total: 100 },
    { player_id: "bah", motm_count: 2, motm_total: 100 },
  ];
  it("orders real vote totals descending", () => expect(motmRanking(votes).map((r) => r.player_id)).toEqual(["prestianni", "pavlidis", "sudakov", "bah"]));
  it("omits zero votes", () => expect(motmRanking(votes).some((r) => r.player_id === "zero")).toBe(false));
  it("calculates integer percentages from vote counts", () => expect(motmRanking(votes).map((r) => r.percent)).toEqual([80, 15, 3, 2]));
  it("preserves ties and shared ranks", () => {
    const result = motmRanking([{ player_id: "a", motm_count: 1, motm_total: 3 }, { player_id: "b", motm_count: 1, motm_total: 3 }]);
    expect(result.map((r) => [r.percent, r.rank])).toEqual([[33, 1], [33, 1]]);
  });
  it("returns no entries when no votes exist", () => expect(motmRanking([])).toEqual([]));
});