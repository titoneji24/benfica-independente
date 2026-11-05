import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { ArrowDown, ArrowUp, LockKeyhole, Trophy } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { rankingQuery, rankingAveragesQuery } from "@/lib/ranking.queries";
import { seasonForDate, sortRanking, type RankingRow } from "@/lib/ranking";
import { initials, POSITION_LABEL } from "@/lib/ratings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const searchSchema = z.object({
  season: z.coerce.number().int().min(1904).max(2200).catch(seasonForDate(new Date())),
  min: z.coerce.number().int().min(0).max(500).catch(1),
  sort: z.enum(["average", "games", "motm", "name"]).catch("average"),
  direction: z.enum(["asc", "desc"]).catch("desc"),
  demo: z.preprocess((v) => v === true || v === "true", z.boolean()),
});
export const Route = createFileRoute("/ranking")({
  validateSearch: (search) => searchSchema.parse(search),
  loaderDeps: ({ search }) => ({ season: search.season, demo: search.demo }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(rankingQuery(deps.season, deps.demo)),
  head: () => ({ meta: [
    { title: "Ranking da época | Benfica Independente" },
    { name: "description", content: "Ranking dos jogadores do Benfica: médias da época, jogos avaliados e prémios de Homem do Jogo." },
    { property: "og:title", content: "Ranking da época | Benfica Independente" },
    { property: "og:description", content: "As avaliações dos benfiquistas ao longo da época e os vencedores de Homem do Jogo." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: RankingPage,
  pendingComponent: () => <div className="mx-auto max-w-6xl px-4 py-16 text-muted-foreground">A carregar ranking…</div>,
  errorComponent: RankingError,
  notFoundComponent: () => <p className="px-4 py-16 text-center">Ranking não encontrado.</p>,
});
function RankingError() {
  const router = useRouter();
  return <div role="alert" className="px-4 py-16 text-center"><p>Não foi possível carregar o ranking.</p><Button className="mt-4" onClick={() => router.invalidate()}>Tentar novamente</Button></div>;
}
function RankingPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data } = useSuspenseQuery(rankingQuery(search.season, search.demo));
  const { user, loading } = useAuth();
  const years = [...new Set([seasonForDate(new Date()), search.season, ...data.dates.map((d) => seasonForDate(new Date(d)))])].sort((a, b) => b - a);
  return <div className="mx-auto max-w-6xl px-4 pt-10 sm:pt-14">
    <div className="flex items-end justify-between gap-4 border-b pb-7">
      <div><p className="text-xs font-bold uppercase tracking-widest text-primary">Notas dos benfiquistas</p><h1 className="mt-2 font-display text-6xl font-extrabold uppercase">Ranking</h1><p className="mt-2 text-muted-foreground">Época {search.season}/{String(search.season + 1).slice(-2)}</p></div>
      <Trophy className="mb-2 h-12 w-12 shrink-0 text-gold" aria-hidden="true" />
    </div>
    <div className="flex flex-wrap items-end gap-4 border-b py-6">
      <div className="w-36"><label className="mb-2 block text-xs font-bold uppercase text-muted-foreground">Época</label><Select value={String(search.season)} onValueChange={(v) => navigate({ search: (s) => ({ ...s, season: Number(v) }) })}><SelectTrigger aria-label="Época"><SelectValue /></SelectTrigger><SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}/{String(y + 1).slice(-2)}</SelectItem>)}</SelectContent></Select></div>
      <div className="w-40"><label htmlFor="minimum-games" className="mb-2 block text-xs font-bold uppercase text-muted-foreground">Jogos mínimos</label><Input id="minimum-games" type="number" min={0} max={500} value={search.min} onChange={(e) => navigate({ search: (s) => ({ ...s, min: Math.max(0, Math.min(500, Math.trunc(Number(e.target.value) || 0))) }), replace: true })} /></div>
      <div className="w-44"><label className="mb-2 block text-xs font-bold uppercase text-muted-foreground">Ordenar por</label><Select value={search.sort} onValueChange={(v) => navigate({ search: (s) => ({ ...s, sort: searchSchema.shape.sort.parse(v) }) })}><SelectTrigger aria-label="Ordenar por"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="average">Média da época</SelectItem><SelectItem value="games">Jogos avaliados</SelectItem><SelectItem value="motm">Homem do Jogo</SelectItem><SelectItem value="name">Nome</SelectItem></SelectContent></Select></div>
      <Button variant="outline" size="icon" title={search.direction === "desc" ? "Ordem decrescente" : "Ordem crescente"} aria-label={search.direction === "desc" ? "Ordem decrescente" : "Ordem crescente"} onClick={() => navigate({ search: (s) => ({ ...s, direction: s.direction === "desc" ? "asc" : "desc" }) })}>{search.direction === "desc" ? <ArrowDown /> : <ArrowUp />}</Button>
      <div className="sm:ml-auto"><Select value={search.demo ? "demo" : "official"} onValueChange={(v) => navigate({ search: (s) => ({ ...s, demo: v === "demo" }) })}><SelectTrigger aria-label="Tipo de jogos" className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="official">Jogos oficiais</SelectItem><SelectItem value="demo">Demonstração</SelectItem></SelectContent></Select></div>
    </div>
    {search.demo && <p className="mt-5 border-l-4 border-gold bg-muted px-4 py-3 text-sm">Demonstração — estes jogos são fictícios e não contam para o ranking oficial.</p>}
    {!loading && !user && <p className="mt-5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><LockKeyhole className="h-4 w-4" /><Link to="/auth" className="font-bold text-primary">Entrar</Link> para consultar as médias dos jogadores que já avaliaste.</p>}
    <Suspense fallback={<p className="py-10 text-muted-foreground">A carregar médias…</p>}>
      {!loading && user ? <PersonalRanking key={user.id} rows={data.rows} userId={user.id} /> : <RankingTable rows={data.rows} />}
    </Suspense>
    <p className="mt-6 text-xs leading-relaxed text-muted-foreground">Média das avaliações por jogo, com igual peso para cada partida. A média fica disponível após avaliares o jogador em todos os jogos contabilizados. O prémio de Homem do Jogo vai para o jogador mais votado, mesmo com a votação ainda aberta; em caso de empate, ambos recebem o prémio.</p>
  </div>;
}
function PersonalRanking({ rows, userId }: { rows: RankingRow[]; userId: string }) {
  const { season, demo } = Route.useSearch();
  const { data } = useSuspenseQuery(rankingAveragesQuery(season, demo, userId));
  const averages = new Map(data.map((r) => [r.player_id, r.avg_score]));
  return <RankingTable rows={rows.map((r) => ({ ...r, avg_score: averages.get(r.player_id) ?? null }))} />;
}
function RankingTable({ rows }: { rows: RankingRow[] }) {
  const { min, sort, direction } = Route.useSearch();
  const filtered = sortRanking(rows, min, sort, direction);
  if (!filtered.length) return <div className="py-16 text-center"><Trophy className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="mt-4 text-xl font-bold">{rows.length ? "Nenhum jogador com este mínimo de jogos" : "Ainda não há avaliações nesta época"}</h2><Button variant="outline" className="mt-5" asChild><Link to="/player-ratings">Ver jogos</Link></Button></div>;
  return <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[540px] text-sm"><caption className="sr-only">Ranking da época: {filtered.length} jogadores</caption><thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="w-10 py-4">#</th><th className="py-4">Jogador</th><th className="px-3 py-4 text-right">Média da época</th><th className="px-3 py-4 text-right">Jogos avaliados</th><th className="py-4 text-right">Homem do Jogo</th></tr></thead><tbody>{filtered.map((r, index) => <tr key={r.player_id} className="border-b transition-colors hover:bg-muted/60"><td className="py-4 font-display text-xl font-bold text-muted-foreground">{index + 1}</td><td className="py-4"><div className="flex items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-red font-display text-lg font-bold text-primary-foreground">{r.photo_url ? <img src={r.photo_url} alt={r.name} className="h-full w-full object-cover" /> : initials(r.name)}</div><div><p className="font-bold">{r.name}</p><p className="mt-1 text-xs text-muted-foreground">{r.number !== null ? `#${r.number} · ` : ""}{POSITION_LABEL[r.player_position]}</p></div></div></td><td className="px-3 py-4 text-right">{r.avg_score === null ? <span title="Avalia este jogador em todos os jogos contabilizados" aria-label="Média protegida" className="inline-flex items-center gap-1 text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5" />—</span> : <span className="font-display text-3xl font-bold text-primary">{r.avg_score.toLocaleString("pt-PT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>}</td><td className="px-3 py-4 text-right font-display text-2xl font-semibold">{r.games_rated}</td><td className="py-4 text-right"><span className="inline-flex items-center gap-2 font-display text-2xl font-semibold"><Trophy className="h-4 w-4 text-gold" />{r.motm_awards}</span></td></tr>)}</tbody></table></div>;
}