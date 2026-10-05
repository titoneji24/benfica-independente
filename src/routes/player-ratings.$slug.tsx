import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { matchQuery, initials, type LineupEntry, type Result } from "@/lib/ratings";
import { FeaturedMatch, VotingBadge } from "@/components/match-bits";
import { PlayerCard } from "@/components/player-card";

export const Route = createFileRoute("/player-ratings/$slug")({
  head: ({ params }) => {
    const t = `Avaliar jogo: ${params.slug.replace(/-/g, " ")} | Benfica Independente`;
    return {
      meta: [
        { title: t },
        { name: "description", content: "Dá a tua nota a cada jogador do Benfica neste jogo e escolhe o Melhor em Campo." },
        { property: "og:title", content: t },
        { property: "og:description", content: "Avalia os jogadores do Benfica e vê a média da comunidade." },
      ],
    };
  },
  component: MatchPage,
});

const GROUPS: { key: string; label: string }[] = [
  { key: "GR", label: "Guarda-redes" },
  { key: "DEF", label: "Defesas" },
  { key: "MED", label: "Médios" },
  { key: "AV", label: "Avançados" },
  { key: "TRE", label: "Treinador" },
];

function MatchPage() {
  const { slug } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(matchQuery(slug));
  const match = data?.match;

  const mine = useQuery({
    queryKey: ["mine", match?.id, user?.id],
    enabled: !!match && !!user,
    queryFn: async () => {
      const [{ data: r }, { data: m }] = await Promise.all([
        supabase.from("ratings").select("player_id, score").eq("match_id", match!.id),
        supabase.from("motm_votes").select("player_id").eq("match_id", match!.id).maybeSingle(),
      ]);
      return { ratings: Object.fromEntries((r ?? []).map((x) => [x.player_id, x.score])) as Record<string, number>, motm: m?.player_id ?? null };
    },
  });

  const results = useQuery({
    queryKey: ["results", match?.id, user?.id],
    enabled: !!match,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_match_results", { _match_id: match!.id });
      return (data ?? []) as Result[];
    },
  });

  const [draft, setDraft] = useState<Record<string, number>>({});
  const [motm, setMotm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mine.data) { setDraft(mine.data.ratings); setMotm(mine.data.motm); }
  }, [mine.data]);

  const lineup = data?.lineup ?? [];
  const grouped = useMemo(() => {
    const g: Record<string, LineupEntry[]> = {};
    for (const e of lineup) (g[e.player.position] ??= []).push(e);
    for (const k in g) g[k].sort((a, b) => (a.role === b.role ? (a.player.number ?? 99) - (b.player.number ?? 99) : a.role === "titular" ? -1 : 1));
    return g;
  }, [lineup]);

  const resultMap = new Map((results.data ?? []).map((r) => [r.player_id, r]));
  const revealed = (results.data?.length ?? 0) > 0;
  const hasSubmitted = !!mine.data && Object.keys(mine.data.ratings).length > 0;
  const canVote = !!user && !!match?.voting_open;
  const ratedCount = lineup.filter((e) => draft[e.player.id]).length;
  const dirty = JSON.stringify(draft) !== JSON.stringify(mine.data?.ratings ?? {}) || motm !== (mine.data?.motm ?? null);

  const motmWinner = useMemo(() => {
    const best = [...(results.data ?? [])].sort((a, b) => Number(b.motm_count) - Number(a.motm_count))[0];
    if (!best || Number(best.motm_count) === 0) return null;
    const p = lineup.find((e) => e.player.id === best.player_id)?.player;
    return p ? { player: p, pct: Math.round((Number(best.motm_count) / Number(best.motm_total)) * 100) } : null;
  }, [results.data, lineup]);

  async function submit() {
    if (!match || !user) return;
    const rows = Object.entries(draft).map(([player_id, score]) => ({ match_id: match.id, player_id, user_id: user.id, score }));
    if (!rows.length) { toast.error("Dá pelo menos uma nota antes de submeter."); return; }
    setSaving(true);
    const { error } = await supabase.from("ratings").upsert(rows, { onConflict: "match_id,player_id,user_id" });
    let err = error;
    if (!err) {
      if (motm) {
        const r = await supabase.from("motm_votes").upsert({ match_id: match.id, user_id: user.id, player_id: motm }, { onConflict: "match_id,user_id" });
        err = r.error;
      } else if (mine.data?.motm) {
        const r = await supabase.from("motm_votes").delete().eq("match_id", match.id).eq("user_id", user.id);
        err = r.error;
      }
    }
    setSaving(false);
    if (err) { toast.error(err.message); return; }
    toast.success(hasSubmitted ? "Avaliações atualizadas" : "Obrigado! As tuas notas foram registadas.");
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["mine", match.id] }),
      qc.invalidateQueries({ queryKey: ["results", match.id] }),
      qc.invalidateQueries({ queryKey: ["matches"] }),
    ]);
  }

  if (isLoading) return <div className="mx-auto max-w-3xl px-4 pt-12"><div className="h-72 animate-pulse rounded-3xl bg-muted" /></div>;
  if (!match) return (
    <div className="mx-auto max-w-3xl px-4 pt-20 text-center">
      <h1 className="font-display text-4xl font-bold uppercase">Jogo não encontrado</h1>
      <Link to="/player-ratings" className="mt-4 inline-block font-bold text-primary">Voltar aos jogos</Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-8">
      <Link to="/player-ratings" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Todos os jogos
      </Link>
      <div className="mt-4">
        <FeaturedMatch m={match} dark />
      </div>

      {motmWinner && revealed && (
        <div className="mt-6 flex items-center gap-4 rounded-3xl border border-gold/50 bg-card p-5 shadow-soft">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-red font-display text-2xl font-bold text-primary-foreground ring-2 ring-gold">
            {initials(motmWinner.player.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gold-foreground"><Trophy className="h-4 w-4 text-gold" /> Melhor em Campo {match.voting_open && "(até agora)"}</p>
            <p className="truncate font-display text-3xl font-bold uppercase">{motmWinner.player.name}</p>
          </div>
          <p className="font-display text-3xl font-extrabold text-primary">{motmWinner.pct}%</p>
        </div>
      )}

      <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-4xl font-bold uppercase">Avaliação dos jogadores</h2>
          <p className="text-muted-foreground">Que nota dás à exibição de cada jogador?</p>
        </div>
        <VotingBadge open={match.voting_open} />
      </div>

      {!authLoading && !user && match.voting_open && (
        <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl bg-accent p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-accent-foreground">Entra na tua conta para avaliar os jogadores.</p>
          <Link to="/auth" className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">Entrar ou registar</Link>
        </div>
      )}
      {user && match.voting_open && !revealed && (
        <p className="mt-4 text-sm text-muted-foreground">A média da comunidade só é revelada depois de submeteres as tuas notas.</p>
      )}

      <div className="mt-8 space-y-10">
        {GROUPS.filter((g) => grouped[g.key]?.length).map((g) => (
          <section key={g.key}>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {g.label} ({grouped[g.key].length})
            </p>
            <div className="space-y-4">
              {grouped[g.key].map((e) => {
                const r = resultMap.get(e.player.id);
                return (
                  <PlayerCard
                    key={e.player.id}
                    entry={e}
                    value={draft[e.player.id]}
                    isMotm={motm === e.player.id}
                    disabled={!canVote}
                    onRate={(n) => setDraft((d) => ({ ...d, [e.player.id]: n }))}
                    onMotm={() => setMotm((m) => (m === e.player.id ? null : e.player.id))}
                    result={revealed && r ? { avg: r.avg_score, count: Number(r.rating_count), mine: mine.data?.ratings[e.player.id] } : undefined}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {canVote && (
        <div className="fixed inset-x-0 bottom-16 z-30 px-4 md:bottom-6">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 rounded-2xl bg-gradient-ink p-3 pl-5 text-ink-foreground shadow-soft">
            <div className="text-sm">
              <p className="font-bold">{ratedCount}/{lineup.length} avaliados</p>
              <p className="text-ink-foreground/60">{motm ? "Melhor em Campo escolhido" : "Falta o Melhor em Campo"}</p>
            </div>
            <button
              onClick={submit}
              disabled={saving || !dirty || ratedCount === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-display text-lg font-bold uppercase tracking-wide text-primary-foreground transition-all disabled:opacity-40"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {hasSubmitted ? (dirty ? "Guardar alterações" : "Guardado") : "Submeter notas"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
