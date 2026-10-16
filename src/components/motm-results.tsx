import { Trophy } from "lucide-react";
import { initials, type LineupEntry } from "@/lib/ratings";
import { canChooseMotm, motmRanking, type MotmResult } from "@/lib/voting";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export function MotmResults({ results, lineup, loading, error, onRetry, open, demo }: {
  results: MotmResult[];
  lineup: LineupEntry[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  open: boolean;
  demo: boolean;
}) {
  const ranking = motmRanking(results).filter((r) => {
    const entry = lineup.find((e) => e.player.id === r.player_id);
    return entry && canChooseMotm(entry.role, entry.player.position);
  });
  return (
    <section className="mt-14 border-t border-gold/50 pt-8" aria-labelledby="motm-results-heading">
      <h2 id="motm-results-heading" className="flex items-start gap-3 font-display text-3xl font-bold uppercase sm:text-4xl">
        <Trophy className="mt-1 h-7 w-7 shrink-0 text-gold" /> Resultados — Melhor em Campo
      </h2>
      <p className="mt-2 text-muted-foreground">Vê quem a comunidade benfiquista escolheu como o melhor jogador do jogo.</p>
      {demo && <p className="mt-2 text-sm font-semibold text-muted-foreground">Jogo de demonstração · resultados das votações de teste</p>}
      {open && <p className="mt-2 text-xs font-semibold uppercase text-muted-foreground">Resultados provisórios · votação aberta</p>}
      {loading ? <p className="mt-6 text-muted-foreground" role="status">A carregar resultados…</p>
        : error ? <div className="mt-6"><p role="alert" className="text-sm text-destructive">Não foi possível carregar os resultados.</p><Button variant="outline" className="mt-2" onClick={onRetry}>Tentar novamente</Button></div>
        : ranking.length === 0 ? <p className="mt-6 text-muted-foreground">Ainda não existem votos para Melhor em Campo</p>
        : <ol className="mt-6 space-y-3">
          {ranking.map((r) => {
            const player = lineup.find((e) => e.player.id === r.player_id)?.player;
            if (!player) return null;
            return (
              <li key={r.player_id} className={`rounded-2xl border bg-card p-4 sm:p-5 ${r.rank === 1 ? "border-gold shadow-soft" : ""}`}>
                {r.rank === 1 && <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-gold-foreground"><Trophy className="h-4 w-4 text-gold" /> Melhor em Campo da comunidade</p>}
                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="w-6 shrink-0 text-center font-display text-2xl font-bold tabular-nums">{r.rank}.</span>
                  <div className="grid h-14 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-red font-display text-xl font-bold text-primary-foreground">
                    {player.photo_url ? <img src={player.photo_url} alt={player.name} className="h-full w-full object-cover" loading="lazy" /> : initials(player.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-display text-xl font-bold uppercase sm:text-2xl">{player.name}</p>
                    <p className="text-xs text-muted-foreground">{r.motm_count.toLocaleString("pt-PT")} {r.motm_count === 1 ? "voto" : "votos"}</p>
                  </div>
                  <span className="shrink-0 font-display text-3xl font-bold text-primary tabular-nums">{r.percent}%</span>
                </div>
                <Progress value={r.percent} aria-label={`Votos em ${player.name}`} className="mt-3" />
              </li>
            );
          })}
        </ol>}
    </section>
  );
}