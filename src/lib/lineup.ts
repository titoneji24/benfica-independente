export const DEFAULT_COACH_NAME = "Marco Silva";
export const STARTERS_REQUIRED = 11;

type Role = "titular" | "suplente" | "treinador";
type Entry = { role: Role; player: { position: string; number: number | null } };

const POSITION_ORDER: Record<string, number> = { GR: 1, DEF: 2, MED: 3, AV: 4, TRE: 9 };

/** Returns an error message, or null when the starters are valid. */
export function lineupError(starterPositions: string[]): string | null {
  const n = starterPositions.length;
  if (n !== STARTERS_REQUIRED) return `Tens de escolher exatamente ${STARTERS_REQUIRED} titulares (tens ${n}).`;
  const gk = starterPositions.filter((p) => p === "GR").length;
  if (gk !== 1) return `Tem de haver exatamente 1 guarda-redes titular (tens ${gk}).`;
  return null;
}

/** Starters (by position, then number), then used substitutes, then the coach. */
export function groupLineup<T extends Entry>(entries: T[]) {
  const byPos = (a: T, b: T) =>
    (POSITION_ORDER[a.player.position] ?? 5) - (POSITION_ORDER[b.player.position] ?? 5) || (a.player.number ?? 99) - (b.player.number ?? 99);
  return [
    { key: "titular", label: "Titulares", entries: entries.filter((e) => e.role === "titular").sort(byPos) },
    { key: "suplente", label: "Entraram", entries: entries.filter((e) => e.role === "suplente").sort(byPos) },
    { key: "treinador", label: "Treinador", entries: entries.filter((e) => e.role === "treinador") },
  ].filter((g) => g.entries.length);
}
