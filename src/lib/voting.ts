export function isScoreConfirmed(selected: number | undefined, saved: number | undefined) {
  return saved != null && selected === saved;
}

export function confirmedCount(playerIds: string[], saved: Record<string, number>) {
  return playerIds.filter((id) => saved[id] != null).length;
}

export function canChooseMotm(role: string, position: string) {
  return role !== "treinador" && position !== "TRE";
}

export type MotmResult = { player_id: string; motm_count: number; motm_total: number };

export function motmRanking(results: MotmResult[]) {
  const sorted = results.filter((r) => r.motm_count > 0 && r.motm_total > 0)
    .sort((a, b) => b.motm_count - a.motm_count || a.player_id.localeCompare(b.player_id));
  let rank = 0;
  return sorted.map((r, i) => {
    if (i === 0 || r.motm_count !== sorted[i - 1]?.motm_count) rank = i + 1;
    return { ...r, rank, percent: Math.round(r.motm_count / r.motm_total * 100) };
  });
}