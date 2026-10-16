import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { matchQuery, type LineupEntry, type Result } from "@/lib/ratings";
import { confirmedCount, isScoreConfirmed, type MotmResult } from "@/lib/voting";
import { FeaturedMatch, VotingBadge } from "@/components/match-bits";
import { PlayerCard } from "@/components/player-card";
import { MotmResults } from "@/components/motm-results";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/player-ratings/$slug")({
  head: ({ params }) => {
    const title = `Avaliar jogo: ${params.slug.replace(/-/g, " ")} | Benfica Independente`;
    return { meta: [
      { title },
      { name: "description", content: "Confirma a tua nota por jogador e descobre a média da comunidade. Elege o Melhor em Campo do Benfica." },
      { property: "og:title", content: title },
      { property: "og:description", content: "As tuas notas primeiro. Médias da comunidade e resultados de Melhor em Campo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ] };
  },
  component: MatchPage,
});

const GROUPS = [
  { key: "GR", label: "Guarda-redes" }, { key: "DEF", label: "Defesas" },
  { key: "MED", label: "Médios" }, { key: "AV", label: "Avançados" }, { key: "TRE", label: "Treinador" },
];
type Mine = { ratings: Record<string, number>; motm: string | null };

function MatchPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  return <MatchVoting key={`${slug}:${user?.id ?? "guest"}`} slug={slug} />;
}

function MatchVoting({ slug }: { slug: string }) {
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const matchData = useQuery(matchQuery(slug));
  const match = matchData.data?.match;
  const mineKey = ["mine", match?.id, user?.id];
  const mine = useQuery({
    queryKey: mineKey,
    enabled: !!match && !!user,
    queryFn: async (): Promise<Mine> => {
      if (!match || !user) return { ratings: {}, motm: null };
      const [r, m] = await Promise.all([
        supabase.from("ratings").select("player_id, score").eq("match_id", match.id).eq("user_id", user.id),
        supabase.from("motm_votes").select("player_id").eq("match_id", match.id).eq("user_id", user.id).maybeSingle(),
      ]);
      if (r.error) throw r.error;
      if (m.error) throw m.error;
      return { ratings: Object.fromEntries((r.data ?? []).map((x) => [x.player_id, x.score])), motm: m.data?.player_id ?? null };
    },
  });
  const results = useQuery({
    queryKey: ["results", match?.id, user?.id], enabled: !!match && !!user,
    refetchInterval: 15000,
    queryFn: async () => {
      if (!match || !user) return [];
      const { data, error } = await supabase.rpc("get_match_results", { _match_id: match.id });
      if (error) throw error;
      return (data ?? []) as Result[];
    },
  });
  const motmResults = useQuery({
    queryKey: ["motm-results", match?.id], enabled: !!match,
    refetchInterval: 15000,
    queryFn: async () => {
      if (!match) return [];
      const { data, error } = await supabase.rpc("get_match_motm_results", { _match_id: match.id });
      if (error) throw error;
      return (data ?? []) as MotmResult[];
    },
  });

  const [draft, setDraft] = useState<Record<string, number>>({});
  const [motmDraft, setMotmDraft] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const pending = useRef(new Set<string>());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savingMotm, setSavingMotm] = useState(false);
  const [motmError, setMotmError] = useState<string | null>(null);
  const lineup = matchData.data?.lineup ?? [];
  const grouped = useMemo(() => {
    const groups: Record<string, LineupEntry[]> = {};
    for (const entry of lineup) (groups[entry.player.position] ??= []).push(entry);
    for (const entries of Object.values(groups)) entries.sort((a, b) => a.role === b.role ? (a.player.number ?? 99) - (b.player.number ?? 99) : a.role === "titular" ? -1 : 1);
    return groups;
  }, [lineup]);
  const saved = mine.data?.ratings ?? {};
  const selected = { ...saved, ...draft };
  const motm = motmDraft === undefined ? mine.data?.motm ?? null : motmDraft;
  const ratedCount = confirmedCount(lineup.map((e) => e.player.id), saved);
  const canVote = !!user && !!match?.voting_open && mine.isSuccess;
  const resultMap = new Map((results.data ?? []).map((r) => [r.player_id, r]));

  async function confirmScore(playerId: string) {
    const score = selected[playerId];
    if (!match || !user || !canVote || score == null || pending.current.has(playerId)) return;
    pending.current.add(playerId);
    setSaving((s) => ({ ...s, [playerId]: true }));
    setErrors((e) => ({ ...e, [playerId]: "" }));
    try {
      const { data, error } = await supabase.from("ratings").upsert({ match_id: match.id, player_id: playerId, user_id: user.id, score }, { onConflict: "match_id,player_id,user_id" }).select("player_id, score").single();
      if (error || !data) throw error ?? new Error("Missing saved rating");
      qc.setQueryData<Mine>(mineKey, (old) => ({ ratings: { ...(old?.ratings ?? {}), [data.player_id]: data.score }, motm: old?.motm ?? null }));
      setDraft((d) => { const next = { ...d }; delete next[playerId]; return next; });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["results", match.id] }),
        qc.invalidateQueries({ queryKey: ["matches"] }),
        qc.invalidateQueries({ queryKey: ["profile-history", user.id] }),
      ]);
    } catch {
      setErrors((e) => ({ ...e, [playerId]: "Não foi possível guardar a nota. Tenta novamente." }));
    } finally {
      pending.current.delete(playerId);
      setSaving((s) => ({ ...s, [playerId]: false }));
    }
  }

  async function submitMotm() {
    if (!match || !user || !canVote || savingMotm) return;
    setSavingMotm(true); setMotmError(null);
    try {
      const response = motm
        ? await supabase.from("motm_votes").upsert({ match_id: match.id, user_id: user.id, player_id: motm }, { onConflict: "match_id,user_id" }).select("player_id").single()
        : await supabase.from("motm_votes").delete().eq("match_id", match.id).eq("user_id", user.id);
      if (response.error) throw response.error;
      qc.setQueryData<Mine>(mineKey, (old) => ({ ratings: old?.ratings ?? {}, motm }));
      setMotmDraft(undefined);
      toast.success("Escolha de Melhor em Campo guardada.");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["motm-results", match.id] }),
        qc.invalidateQueries({ queryKey: ["profile-history", user.id] }),
      ]);
    } catch {
      setMotmError("Não foi possível guardar o Melhor em Campo. Tenta novamente.");
    } finally { setSavingMotm(false); }
  }

  if (matchData.isLoading) return <div className="mx-auto max-w-3xl px-4 pt-12"><div className="h-72 animate-pulse rounded-3xl bg-muted" /></div>;
  if (matchData.isError) return <div className="mx-auto max-w-3xl px-4 pt-12"><p role="alert">Não foi possível carregar o jogo.</p><Button variant="outline" onClick={() => void matchData.refetch()}>Tentar novamente</Button></div>;
  if (!match) return <div className="mx-auto max-w-3xl px-4 pt-20 text-center"><h1 className="font-display text-4xl font-bold uppercase">Jogo não encontrado</h1><Link to="/player-ratings" className="mt-4 inline-block font-bold text-primary">Voltar aos jogos</Link></div>;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8">
      <Link to="/player-ratings" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Todos os jogos</Link>
      <div className="mt-4"><FeaturedMatch m={match} dark /></div>
      {match.is_demo && <p className="mt-3 text-sm font-semibold text-muted-foreground">Jogo de demonstração · calendário e resultado fictícios</p>}
      <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="font-display text-4xl font-bold uppercase">Avaliação dos jogadores</h2><p className="text-muted-foreground">Que nota dás à exibição de cada jogador?</p></div>
        <VotingBadge open={match.voting_open} />
      </div>
      {!authLoading && !user && <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl bg-accent p-5 sm:flex-row sm:items-center sm:justify-between"><p className="font-semibold text-accent-foreground">Entra na tua conta para {match.voting_open ? "avaliar os jogadores" : "ver as tuas notas"}.</p><Button asChild><Link to="/auth">Entrar ou registar</Link></Button></div>}
      {user && mine.isError && <div className="mt-4"><p role="alert" className="text-sm text-destructive">Não foi possível carregar as tuas notas.</p><Button variant="outline" onClick={() => void mine.refetch()}>Tentar novamente</Button></div>}
      {user && <div className="mt-6" aria-live="polite"><p className="mb-2 text-sm font-semibold">{mine.isLoading ? "A carregar as tuas notas…" : `${ratedCount} de ${lineup.length} jogadores avaliados`}</p><Progress value={lineup.length ? ratedCount / lineup.length * 100 : 0} aria-label="Progresso das avaliações confirmadas" /></div>}
      {results.isError && user && <div className="mt-4"><p className="text-sm text-destructive" role="alert">Não foi possível carregar as médias.</p><Button variant="outline" onClick={() => void results.refetch()}>Tentar novamente</Button></div>}
      <div className="mt-8 space-y-10">
        {GROUPS.filter((g) => grouped[g.key]?.length).map((g) => <section key={g.key}>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{g.label} ({grouped[g.key]?.length})</p>
          <div className="space-y-4">{(grouped[g.key] ?? []).map((e) => {
            const confirmed = isScoreConfirmed(selected[e.player.id], saved[e.player.id]);
            const r = resultMap.get(e.player.id);
            return <PlayerCard key={e.player.id} entry={e} value={selected[e.player.id]} isMotm={motm === e.player.id} disabled={!canVote} saving={saving[e.player.id] ?? false} motmDisabled={savingMotm} confirmed={confirmed} error={errors[e.player.id]} onConfirm={() => void confirmScore(e.player.id)} onRate={(n) => { setDraft((d) => ({ ...d, [e.player.id]: n })); setErrors((err) => ({ ...err, [e.player.id]: "" })); }} onMotm={() => setMotmDraft(motm === e.player.id ? null : e.player.id)} result={confirmed && r ? { avg: r.avg_score, count: Number(r.rating_count) } : undefined} />;
          })}</div>
        </section>)}
      </div>
      {canVote && <div className="mt-8 border-t pt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold"><Star className="h-4 w-4 text-gold" />{motm ? lineup.find((e) => e.player.id === motm)?.player.name : "Melhor em Campo por escolher"}</p>
          <Button onClick={() => void submitMotm()} disabled={savingMotm || motm === (mine.data?.motm ?? null)}>{savingMotm && <Loader2 className="animate-spin" />}{savingMotm ? "A guardar…" : motm === (mine.data?.motm ?? null) && motm ? "Melhor em Campo guardado" : "Confirmar Melhor em Campo"}</Button>
        </div>
        {motmError && <p role="alert" className="mt-2 text-sm text-destructive">{motmError}</p>}
      </div>}
      <MotmResults results={motmResults.data ?? []} lineup={lineup} loading={motmResults.isLoading} error={motmResults.isError} onRetry={() => void motmResults.refetch()} open={match.voting_open} demo={match.is_demo} />
    </div>
  );
}
