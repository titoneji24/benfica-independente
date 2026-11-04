import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({ season: z.number().int().min(1904).max(2200), demo: z.boolean() });
export const getRankingOverview = createServerFn({ method: "GET" }).inputValidator(input).handler(async ({ data }) => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const url = process.env["SUPABASE_URL"];
  if (!key || !url) throw new Error("Ranking indisponível neste momento.");
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (request, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(request, { ...init, headers });
    } },
  });
  const [ranking, seasons] = await Promise.all([
    client.rpc("get_season_ranking_overview", { _season: data.season, _demo: data.demo }),
    client.from("matches").select("kickoff").eq("is_demo", data.demo).order("kickoff", { ascending: false }),
  ]);
  if (ranking.error || seasons.error) throw new Error("Não foi possível carregar o ranking.");
  return { rows: (ranking.data ?? []).map((r) => ({ ...r, games_rated: Number(r.games_rated), motm_awards: Number(r.motm_awards), avg_score: null })), dates: (seasons.data ?? []).map((m) => m.kickoff) };
});
export const getRankingAverages = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).inputValidator(input).handler(async ({ data, context }) => {
  const result = await context.supabase.rpc("get_season_ranking_averages", { _season: data.season, _demo: data.demo });
  if (result.error) throw new Error("Não foi possível carregar as médias.");
  return (result.data ?? []).map((r) => ({ player_id: r.player_id, avg_score: Number(r.avg_score) }));
});