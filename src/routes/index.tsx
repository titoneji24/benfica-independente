import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mic, PenLine, PlayCircle, Star } from "lucide-react";
import heroAsset from "@/assets/header-estadio.png.asset.json";
import { matchesQuery } from "@/lib/ratings";
import { FeaturedMatch, MatchRow } from "@/components/match-bits";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Benfica Independente — A voz dos benfiquistas" },
      { name: "description", content: "Avalia os jogadores do Benfica depois de cada jogo e descobre a nota da comunidade benfiquista." },
      { property: "og:title", content: "Benfica Independente — A voz dos benfiquistas" },
      { property: "og:description", content: "Notas dos Benfiquistas: avalia cada jogador depois de cada jogo." },
    ],
  }),
  component: Index,
});

function Index() {
  const { data } = useQuery(matchesQuery);
  const latest = data?.[0];
  return (
    <div>
      <section className="relative isolate overflow-hidden bg-ink text-ink-foreground">
        <img src={heroAsset.url} alt="Estádio cheio de adeptos benfiquistas" width={851} height={315} className="absolute inset-0 -z-10 h-full w-full object-cover opacity-55" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/60 to-transparent" />
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:pt-32">
          <p className="animate-rise text-xs font-bold uppercase tracking-[0.3em] text-gold">Comunidade independente · desde sempre</p>
          <h1 className="animate-rise mt-4 max-w-3xl font-display text-5xl font-extrabold uppercase leading-[0.95] sm:text-7xl">
            A nota é tua.<br /><span className="text-primary">A voz é de todos.</span>
          </h1>
          <p className="animate-rise mt-6 max-w-xl text-lg text-ink-foreground/80">
            Depois de cada jogo, os benfiquistas avaliam quem esteve em campo. Dá a tua nota, escolhe o Melhor em Campo e compara com a comunidade.
          </p>
          <Link to="/player-ratings" className="animate-rise mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 font-display text-lg font-bold uppercase tracking-wide text-primary-foreground shadow-red transition-transform hover:-translate-y-0.5">
            <Star className="h-5 w-5" /> Notas dos Benfiquistas
          </Link>
        </div>
      </section>

      <section className="mx-auto -mt-10 max-w-6xl px-4">
        {latest ? <FeaturedMatch m={latest} voters={latest.voters} /> : <div className="h-64 animate-pulse rounded-3xl bg-muted" />}
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="font-display text-3xl font-bold uppercase">Últimos jogos</h2>
          <Link to="/player-ratings" className="text-sm font-bold text-primary">Ver todos</Link>
        </div>
        <div className="grid gap-3">
          {data?.slice(1, 4).map((m) => <MatchRow key={m.id} m={m} voters={m.voters} />)}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4">
        <h2 className="mb-5 font-display text-3xl font-bold uppercase">Também no Benfica Independente</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: PenLine, t: "Opinião", d: "Artigos de quem vive o Benfica todos os dias." },
            { icon: Mic, t: "Podcasts", d: "Antevisões, análises e conversa de bancada." },
            { icon: PlayCircle, t: "Vídeos", d: "O canal no YouTube, reações e debates." },
          ].map(({ icon: I, t, d }) => (
            <div key={t} className="rounded-2xl border bg-card p-6 shadow-soft">
              <I className="h-6 w-6 text-primary" />
              <p className="mt-4 font-display text-2xl font-bold uppercase">{t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-gold-foreground/70">Em breve</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
