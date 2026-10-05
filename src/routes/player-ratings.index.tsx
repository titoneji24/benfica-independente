import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { matchesQuery } from "@/lib/ratings";
import { FeaturedMatch, MatchRow } from "@/components/match-bits";

export const Route = createFileRoute("/player-ratings/")({
  head: () => ({
    meta: [
      { title: "Notas dos Benfiquistas — Player Ratings | Benfica Independente" },
      { name: "description", content: "Avalia os jogadores do Benfica depois de cada jogo, de 1 a 10, e vê a média da comunidade." },
      { property: "og:title", content: "Notas dos Benfiquistas — Player Ratings" },
      { property: "og:description", content: "Avalia os jogadores do Benfica depois de cada jogo." },
    ],
  }),
  component: RatingsIndex,
});

function RatingsIndex() {
  const { data, isLoading } = useQuery(matchesQuery);
  const [latest, ...rest] = data ?? [];
  return (
    <div className="mx-auto max-w-4xl px-4 pt-12">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Player Ratings</p>
      <h1 className="mt-2 font-display text-5xl font-extrabold uppercase sm:text-6xl">Notas dos Benfiquistas</h1>
      <p className="mt-3 text-lg text-muted-foreground">Avalia os jogadores do Benfica depois de cada jogo.</p>

      <div className="mt-8">
        {isLoading ? <div className="h-72 animate-pulse rounded-3xl bg-muted" /> : latest && <FeaturedMatch m={latest} voters={latest.voters} />}
      </div>

      <h2 className="mb-4 mt-14 font-display text-3xl font-bold uppercase">Histórico</h2>
      <div className="grid gap-3">
        {rest.map((m) => <MatchRow key={m.id} m={m} voters={m.voters} />)}
      </div>
    </div>
  );
}
