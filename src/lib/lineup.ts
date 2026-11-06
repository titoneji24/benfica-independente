export const DEFAULT_COACH_NAME = "Marco Silva";
export const STARTERS_REQUIRED = 11;
export const COACH_POSITION = "TRE";

type Role = "titular" | "suplente" | "treinador";
type Entry = { role: Role; player: { position: string; number: number | null } };

const POSITION_ORDER: Record<string, number> = { GR: 1, DEF: 2, MED: 3, AV: 4, TRE: 9 };

/** The coach is whoever plays the TRE role — even if an older row saved them as a starter. */
export function isCoachEntry(entry: Entry) {
  return entry.player.position === COACH_POSITION || entry.role === "treinador";
}

/** Returns an error message, or null when the starters are valid. The coach never counts as a starter. */
export function lineupError(starterPositions: string[]): string | null {
  const field = starterPositions.filter((p) => p !== COACH_POSITION);
  const n = field.length;
  if (n !== STARTERS_REQUIRED) return `Tens de escolher exatamente ${STARTERS_REQUIRED} titulares (tens ${n}).`;
  const gk = field.filter((p) => p === "GR").length;
  if (gk !== 1) return `Tem de haver exatamente 1 guarda-redes titular (tens ${gk}).`;
  return null;
}

/** Starters (by position, then number), then the substitutes who came on, then the coach last. */
export function groupLineup<T extends Entry>(entries: T[]) {
  const byPos = (a: T, b: T) =>
    (POSITION_ORDER[a.player.position] ?? 5) - (POSITION_ORDER[b.player.position] ?? 5) || (a.player.number ?? 99) - (b.player.number ?? 99);
  const field = entries.filter((e) => !isCoachEntry(e));
  const coach = entries.filter(isCoachEntry);
  return [
    { key: "titular", label: "Titulares", entries: field.filter((e) => e.role === "titular").sort(byPos) },
    { key: "suplente", label: "Entraram", entries: field.filter((e) => e.role === "suplente").sort(byPos) },
    { key: "treinador", label: "Treinador", entries: coach },
  ].filter((g) => g.entries.length);
}
