import { describe, expect, it } from "vitest";
import { groupLineup, isCoachEntry, lineupError } from "@/lib/lineup";

const eleven = ["GR", "DEF", "DEF", "DEF", "DEF", "MED", "MED", "MED", "AV", "AV", "AV"];

describe("lineup rules", () => {
  it("accepts 11 starters with 1 goalkeeper", () => expect(lineupError(eleven)).toBeNull());
  it("rejects 10 starters", () => expect(lineupError(eleven.slice(1))).not.toBeNull());
  it("rejects 12 starters", () => expect(lineupError([...eleven, "MED"])).not.toBeNull());
  it("rejects 2 goalkeepers", () => expect(lineupError(["GR", ...eleven.slice(0, 10)])).not.toBeNull());
  it("rejects no goalkeeper", () => expect(lineupError(["DEF", ...eleven.slice(1)])).not.toBeNull());
  it("never counts the coach as a starter", () => expect(lineupError([...eleven, "TRE"])).toBeNull());
  it("orders starters, subs, then coach", () => {
    const p = (position: string, number: number | null) => ({ position, number });
    const groups = groupLineup([
      { role: "treinador" as const, player: p("TRE", null) },
      { role: "suplente" as const, player: p("GR", 24) },
      { role: "titular" as const, player: p("AV", 14) },
      { role: "titular" as const, player: p("GR", 1) },
    ]);
    expect(groups.map((g) => g.key)).toEqual(["titular", "suplente", "treinador"]);
    expect(groups[0]!.entries.map((e) => e.player.number)).toEqual([1, 14]);
  });
  it("puts a coach saved as a starter in the last Treinador group", () => {
    const p = (position: string, number: number | null) => ({ position, number });
    const groups = groupLineup([
      { role: "titular" as const, player: p("TRE", null) },
      { role: "titular" as const, player: p("GR", 1) },
      { role: "suplente" as const, player: p("DEF", 24) },
    ]);
    expect(groups.map((g) => g.key)).toEqual(["titular", "suplente", "treinador"]);
    expect(groups[0]!.entries.map((e) => e.player.position)).toEqual(["GR"]);
    expect(groups[2]!.entries.map((e) => e.player.position)).toEqual(["TRE"]);
  });
  it("treats a TRE player as the coach whatever role is stored", () => {
    const p = (position: string, number: number | null) => ({ position, number });
    expect(isCoachEntry({ role: "suplente", player: p("TRE", null) })).toBe(true);
    expect(isCoachEntry({ role: "titular", player: p("AV", 9) })).toBe(false);
  });
});
