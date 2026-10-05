import { Link } from "@tanstack/react-router";
import { ChevronRight, Lock, Radio } from "lucide-react";
import { fmtDate, fmtTime, outcome, scoreLine, type Match } from "@/lib/ratings";

export function OutcomePill({ m }: { m: Match }) {
  const o = outcome(m);
  if (!o) return null;
  const cls = o === "V" ? "bg-primary text-primary-foreground" : o === "E" ? "bg-muted text-foreground" : "bg-ink text-ink-foreground";
  return <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md font-display text-sm font-bold ${cls}`}>{o}</span>;
}

export function VotingBadge({ open }: { open: boolean }) {
  return open ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">
      <Radio className="h-3 w-3 animate-pulse" /> Votação aberta
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
      <Lock className="h-3 w-3" /> Votação fechada
    </span>
  );
}

export function FeaturedMatch({ m, voters, dark = false }: { m: Match; voters?: number; dark?: boolean }) {
  const s = scoreLine(m);
  return (
    <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 ${dark ? "bg-gradient-ink text-ink-foreground" : "bg-gradient-red text-primary-foreground shadow-red"}`}>
      <div className="stripe-overlay pointer-events-none absolute inset-0" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase tracking-widest opacity-80">
          <span>{m.competition}{m.round ? ` · ${m.round}` : ""}</span>
          {m.voting_open && <span className="rounded-full bg-gold px-2.5 py-1 text-gold-foreground">Avalia agora</span>}
        </div>
        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <p className="truncate text-right font-display text-2xl font-bold uppercase sm:text-4xl">{s.home}</p>
          <p className="font-display text-5xl font-extrabold tabular-nums sm:text-7xl">{s.hs}<span className="mx-2 opacity-50">-</span>{s.as}</p>
          <p className="truncate font-display text-2xl font-bold uppercase sm:text-4xl">{s.away}</p>
        </div>
        <p className="mt-4 text-center text-sm opacity-80">
          {fmtDate(m.kickoff)} · {fmtTime(m.kickoff)} · {m.venue}
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Link
            to="/player-ratings/$slug"
            params={{ slug: m.slug }}
            className="inline-flex items-center gap-2 rounded-full bg-card px-6 py-3 font-display text-lg font-bold uppercase tracking-wide text-primary transition-transform hover:-translate-y-0.5"
          >
            {m.voting_open ? "Avaliar jogadores" : "Ver resultados"} <ChevronRight className="h-5 w-5" />
          </Link>
          {voters !== undefined && <p className="text-xs opacity-70">{voters.toLocaleString("pt-PT")} benfiquistas já avaliaram</p>}
        </div>
      </div>
    </div>
  );
}

export function MatchRow({ m, voters }: { m: Match; voters: number }) {
  const s = scoreLine(m);
  return (
    <Link
      to="/player-ratings/$slug"
      params={{ slug: m.slug }}
      className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40"
    >
      <OutcomePill m={m} />
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{m.round ?? m.competition} · {fmtDate(m.kickoff)}</p>
        <p className="truncate font-display text-xl font-bold uppercase">
          {s.home} <span className="tabular-nums text-primary">{s.hs}-{s.as}</span> {s.away}
        </p>
        <p className="text-xs text-muted-foreground">{voters} avaliações · {m.competition}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline"><VotingBadge open={m.voting_open} /></span>
        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
