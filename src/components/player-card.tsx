import { useState } from "react";
import { Check, Loader2, Star } from "lucide-react";
import { POSITION_LABEL, SCALE, initials, type LineupEntry } from "@/lib/ratings";
import { canChooseMotm } from "@/lib/voting";
import { Button } from "@/components/ui/button";

type Props = {
  entry: LineupEntry;
  value?: number | undefined;
  isMotm: boolean;
  disabled: boolean;
  onRate: (n: number) => void;
  onMotm: () => void;
  onConfirm: () => void;
  saving: boolean;
  confirmed: boolean;
  error?: string | undefined;
  motmDisabled: boolean;
  result?: { avg: number | null; count: number; mine?: number } | undefined;
};

export function PlayerCard({ entry, value, isMotm, disabled, onRate, onMotm, onConfirm, saving, confirmed, error, motmDisabled, result }: Props) {
  const { player, role } = entry;
  const [hover, setHover] = useState<number | null>(null);
  const isCoach = !canChooseMotm(role, player.position);
  const shown = hover ?? value ?? null;

  return (
    <article
      className={`relative overflow-hidden rounded-3xl border ${isCoach ? "bg-gradient-ink" : "bg-gradient-red"} p-4 text-primary-foreground shadow-soft transition-all sm:p-5 ${
        value ? "border-primary-foreground/30 shadow-red" : "border-primary-foreground/15"
      } ${isMotm ? "ring-2 ring-gold" : ""}`}
    >
      <div className={`pointer-events-none absolute inset-y-0 left-0 w-1.5 ${value ? "bg-gold" : "bg-primary-foreground/25"}`} />
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 sm:gap-5">
        <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-ink ring-1 ring-primary-foreground/20">
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
          <span className="absolute inset-x-0 bottom-0 bg-primary-foreground py-0.5 text-center text-[10px] font-bold uppercase tracking-wider text-primary">
            {player.position}
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="break-words font-display text-2xl font-bold uppercase leading-tight">{player.name}</h3>
              <p className="text-sm text-primary-foreground/85">
                {POSITION_LABEL[player.position]}
                {role === "suplente" && <span className="ml-2 rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[11px] font-bold text-primary-foreground">Entrou</span>}
              </p>
            </div>
            {player.number != null && (
              <span className="font-display text-4xl font-extrabold leading-none text-primary-foreground/90 tabular-nums">{player.number}</span>
            )}
          </div>

          <div className="mt-2 min-h-5 text-sm font-semibold">
            {shown ? (
              <span key={shown} className="animate-rise inline-block">
                <span className="text-gold">Nota {shown}</span> · <span className="text-primary-foreground/85">{SCALE[shown]}</span>
              </span>
            ) : (
              <span className="text-primary-foreground/80">Que nota dás?</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2" onMouseLeave={() => setHover(null)}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const active = value === n;
          return (
            <Button
              variant="outline"
              key={n}
              type="button"
              disabled={disabled || saving}
              onMouseEnter={() => setHover(n)}
              onFocus={() => setHover(n)}
              onBlur={() => setHover(null)}
              onClick={() => onRate(n)}
              aria-pressed={active}
              aria-label={`Nota ${n} — ${SCALE[n]}`}
              className={`h-12 rounded-xl border font-display text-xl font-bold tabular-nums transition-all disabled:cursor-not-allowed disabled:opacity-40 sm:h-14 ${
                active
                  ? "animate-pop border-primary-foreground bg-primary-foreground text-primary shadow-soft"
                  : "border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground hover:-translate-y-0.5 hover:border-primary-foreground/50 hover:bg-primary-foreground/20 hover:text-primary-foreground"
              }`}
            >
              {n}
            </Button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3" aria-live="polite">
        <div className="min-w-0">
          {!disabled && (
            <Button
              onClick={onConfirm}
              disabled={saving || value == null || confirmed}
              className={`w-full sm:w-auto ${confirmed ? "bg-primary-foreground text-primary opacity-100 hover:bg-primary-foreground/90 disabled:opacity-100" : "bg-ink text-ink-foreground hover:bg-ink/90"}`}
            >
              {saving ? <Loader2 className="animate-spin" /> : confirmed ? <Check /> : null}
              {saving ? "A guardar…" : confirmed ? "Nota confirmada" : "Confirmar nota"}
            </Button>
          )}
          {error && <p role="alert" className="mt-2 inline-block rounded-lg bg-ink/30 px-2.5 py-1 text-sm font-semibold text-primary-foreground">{error}</p>}
        </div>
        {result && confirmed && (
          <div className="ml-auto text-right">
            {result.avg == null || result.count === 0 ? (
              <p className="text-sm text-primary-foreground/85">Ainda não existem avaliações dos benfiquistas para este jogador</p>
            ) : (
              <>
                <p className="text-sm font-bold uppercase tracking-wide text-primary-foreground/85">Avaliação dos benfiquistas</p>
                <p className="animate-rise font-display text-4xl font-extrabold leading-tight text-gold tabular-nums">
                  {result.avg.toLocaleString("pt-PT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  <span className="text-lg font-bold text-primary-foreground/75">/10</span>
                </p>
                <p className="mt-1 text-sm text-primary-foreground/85">{result.count.toLocaleString("pt-PT")} {result.count === 1 ? "avaliação" : "avaliações"}</p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {!isCoach ? (
          <Button
            variant="outline"
            type="button"
            disabled={disabled || motmDisabled}
            onClick={onMotm}
            aria-pressed={isMotm}
            className={`h-auto max-w-full whitespace-normal gap-2 rounded-full border px-3.5 py-1.5 text-sm font-bold transition-all disabled:opacity-40 ${
              isMotm ? "animate-pop border-gold bg-gold text-gold-foreground" : "border-primary-foreground/40 bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25"
            }`}
          >
            <Star className={`h-4 w-4 ${isMotm ? "fill-current" : "text-gold"}`} />
            {isMotm ? "Melhor em Campo" : "Escolher Melhor em Campo"}
          </Button>
        ) : (
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/85">Treinador</span>
        )}
      </div>
    </article>
  );
}
