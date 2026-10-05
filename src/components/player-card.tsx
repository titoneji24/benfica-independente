import { useState } from "react";
import { Star } from "lucide-react";
import { POSITION_LABEL, SCALE, initials, type LineupEntry } from "@/lib/ratings";

type Props = {
  entry: LineupEntry;
  value?: number;
  isMotm: boolean;
  disabled: boolean;
  onRate: (n: number) => void;
  onMotm: () => void;
  result?: { avg: number | null; count: number; mine?: number };
};

export function PlayerCard({ entry, value, isMotm, disabled, onRate, onMotm, result }: Props) {
  const { player, role } = entry;
  const [hover, setHover] = useState<number | null>(null);
  const isCoach = role === "treinador";
  const shown = hover ?? value ?? null;

  return (
    <article
      className={`relative overflow-hidden rounded-3xl border bg-card p-4 shadow-soft transition-all sm:p-5 ${
        value ? "border-primary/40" : ""
      } ${isMotm ? "ring-2 ring-gold" : ""}`}
    >
      <div className={`pointer-events-none absolute inset-y-0 left-0 w-1.5 ${value ? "bg-gradient-red" : "bg-border"}`} />
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 sm:gap-5">
        <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-red sm:h-28 sm:w-24">
          {player.photo_url ? (
            <img src={player.photo_url} alt={player.name} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <>
              <div className="stripe-overlay absolute inset-0" />
              <span className="absolute inset-0 grid place-items-center pb-4 font-display text-3xl font-bold text-primary-foreground/90">
                {initials(player.name)}
              </span>
            </>
          )}
          <span className="absolute inset-x-0 bottom-0 bg-ink/85 py-0.5 text-center text-[10px] font-bold uppercase tracking-wider text-ink-foreground">
            {player.position}
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-display text-2xl font-bold uppercase leading-tight">{player.name}</h3>
              <p className="text-sm text-muted-foreground">
                {POSITION_LABEL[player.position]}
                {role === "suplente" && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold">Entrou</span>}
              </p>
            </div>
            {player.number != null && (
              <span className="font-display text-4xl font-extrabold leading-none text-primary/90 tabular-nums">{player.number}</span>
            )}
          </div>

          <div className="mt-2 h-5 text-sm font-semibold">
            {shown ? (
              <span key={shown} className="animate-rise inline-block">
                <span className="text-primary">Nota {shown}</span> · {SCALE[shown]}
              </span>
            ) : (
              <span className="text-muted-foreground">Que nota dás?</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2" onMouseLeave={() => setHover(null)}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onMouseEnter={() => setHover(n)}
              onFocus={() => setHover(n)}
              onClick={() => onRate(n)}
              aria-pressed={active}
              aria-label={`Nota ${n} — ${SCALE[n]}`}
              className={`h-12 rounded-xl border font-display text-xl font-bold tabular-nums transition-all disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 ${
                active
                  ? "animate-pop border-primary bg-gradient-red text-primary-foreground shadow-red"
                  : "bg-background hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {!isCoach ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onMotm}
            aria-pressed={isMotm}
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-bold transition-all disabled:opacity-50 ${
              isMotm ? "animate-pop border-gold bg-gold text-gold-foreground" : "border-gold/60 text-gold-foreground/80 hover:bg-gold/15"
            }`}
          >
            <Star className={`h-4 w-4 ${isMotm ? "fill-current" : ""}`} />
            {isMotm ? "Melhor em Campo" : "Escolher Melhor em Campo"}
          </button>
        ) : (
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Treinador</span>
        )}

        {result && (
          <div className="flex items-center gap-4 rounded-2xl bg-muted px-4 py-2">
            {result.mine != null && (
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">A tua</p>
                <p className="font-display text-xl font-bold">{result.mine}</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Comunidade</p>
              <p className="font-display text-xl font-bold text-primary">{result.avg?.toFixed(1) ?? "–"}</p>
            </div>
            <p className="text-xs text-muted-foreground">{result.count} aval.</p>
          </div>
        )}
      </div>
    </article>
  );
}
