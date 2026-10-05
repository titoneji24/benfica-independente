import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type Player = Database["public"]["Tables"]["players"]["Row"];
export type LineupRole = Database["public"]["Enums"]["lineup_role"];
export type LineupEntry = { role: LineupRole; sort_order: number; player: Player };
export type Result = { player_id: string; avg_score: number | null; rating_count: number; motm_count: number; motm_total: number };

export const SCALE: Record<number, string> = {
  1: "Péssimo", 2: "Muito fraco", 3: "Fraco", 4: "Abaixo da média", 5: "Mediano",
  6: "Razoável", 7: "Bom", 8: "Muito bom", 9: "Excelente", 10: "Excecional",
};

export const POSITION_LABEL: Record<string, string> = {
  GR: "Guarda-redes", DEF: "Defesa", MED: "Médio", AV: "Avançado", TRE: "Treinador",
};

export function scoreLine(m: Match) {
  const b = m.benfica_goals ?? "–";
  const o = m.opponent_goals ?? "–";
  return m.is_home
    ? { home: "Benfica", away: m.opponent, hs: b, as: o }
    : { home: m.opponent, away: "Benfica", hs: o, as: b };
}

export function outcome(m: Match): "V" | "E" | "D" | null {
  if (m.benfica_goals == null || m.opponent_goals == null) return null;
  return m.benfica_goals > m.opponent_goals ? "V" : m.benfica_goals < m.opponent_goals ? "D" : "E";
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });
}
export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" });
}

export const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();

export const matchesQuery = queryOptions({
  queryKey: ["matches"],
  queryFn: async () => {
    const [{ data, error }, { data: counts }] = await Promise.all([
      supabase.from("matches").select("*").order("kickoff", { ascending: false }),
      supabase.rpc("get_match_vote_counts"),
    ]);
    if (error) throw error;
    const map = new Map((counts ?? []).map((c) => [c.match_id, Number(c.voters)]));
    return (data ?? []).map((m) => ({ ...m, voters: map.get(m.id) ?? 0 }));
  },
});

export const matchQuery = (slug: string) =>
  queryOptions({
    queryKey: ["match", slug],
    queryFn: async () => {
      const { data: match, error } = await supabase.from("matches").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      if (!match) return null;
      const { data: lineup } = await supabase
        .from("match_players")
        .select("role, sort_order, player:players(*)")
        .eq("match_id", match.id)
        .order("sort_order");
      return { match, lineup: (lineup ?? []) as unknown as LineupEntry[] };
    },
  });
