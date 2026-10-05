import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { scoreLine, type Match } from "@/lib/ratings";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "O meu perfil | Benfica Independente" },
      { name: "description", content: "As tuas avaliações e escolhas de Melhor em Campo." },
      { property: "og:title", content: "O meu perfil | Benfica Independente" },
      { property: "og:description", content: "Histórico de avaliações na comunidade benfiquista." },
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const { user, profile, loading } = useAuth();
  const { data } = useQuery({
    queryKey: ["profile-history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: r }, { data: m }] = await Promise.all([
        supabase.from("ratings").select("score, match:matches(*), player:players(name)").order("created_at", { ascending: false }),
        supabase.from("motm_votes").select("match_id, player:players(name)"),
      ]);
      const motm = new Map((m ?? []).map((x) => [x.match_id, (x.player as { name: string } | null)?.name]));
      const byMatch = new Map<string, { match: Match; items: { name: string; score: number }[] }>();
      for (const row of (r ?? []) as unknown as { score: number; match: Match; player: { name: string } }[]) {
        const e = byMatch.get(row.match.id) ?? { match: row.match, items: [] };
        e.items.push({ name: row.player.name, score: row.score });
        byMatch.set(row.match.id, e);
      }
      return { groups: [...byMatch.values()].sort((a, b) => b.match.kickoff.localeCompare(a.match.kickoff)), motm, total: r?.length ?? 0 };
    },
  });

  if (loading) return <div className="mx-auto max-w-3xl px-4 pt-12"><div className="h-40 animate-pulse rounded-3xl bg-muted" /></div>;
  if (!user) return (
    <div className="mx-auto max-w-md px-4 pt-20 text-center">
      <h1 className="font-display text-4xl font-bold uppercase">Entra para ver o teu perfil</h1>
      <Link to="/auth" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground">Entrar</Link>
    </div>
  );

  const since = profile ? new Date(profile.created_at).toLocaleDateString("pt-PT", { month: "long", year: "numeric" }) : "";
  const stats = [
    { l: "Jogos avaliados", v: data?.groups.length ?? 0 },
    { l: "Jogadores avaliados", v: data?.total ?? 0 },
    { l: "Melhores em Campo", v: data?.motm.size ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pt-12">
      <div className="flex items-center gap-5">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-gradient-red font-display text-4xl font-bold text-primary-foreground ring-4 ring-gold/60">
          {(profile?.username ?? "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-display text-4xl font-bold">@{profile?.username}</h1>
          <p className="text-sm capitalize text-muted-foreground">Membro desde {since}</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.l} className="rounded-2xl border bg-card p-4 text-center shadow-soft">
            <p className="font-display text-4xl font-extrabold text-primary">{s.v}</p>
            <p className="text-xs font-semibold text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-4 mt-12 font-display text-3xl font-bold uppercase">Histórico</h2>
      {data?.groups.length === 0 && <p className="text-muted-foreground">Ainda não avaliaste nenhum jogo. <Link to="/player-ratings" className="font-bold text-primary">Começa agora</Link>.</p>}
      <div className="space-y-4">
        {data?.groups.map(({ match, items }) => {
          const s = scoreLine(match);
          return (
            <Link key={match.id} to="/player-ratings/$slug" params={{ slug: match.slug }} className="block rounded-2xl border bg-card p-5 shadow-soft transition hover:border-primary/40">
              <p className="font-display text-2xl font-bold uppercase">{s.home} <span className="text-primary">{s.hs}-{s.as}</span> {s.away}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {items.map((i) => (
                  <span key={i.name} className="rounded-full bg-muted px-3 py-1 text-sm">{i.name} — <b>{i.score}</b></span>
                ))}
              </div>
              {data.motm.get(match.id) && (
                <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold"><Star className="h-4 w-4 fill-gold text-gold" /> {data.motm.get(match.id)}</p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
