import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { matchesQuery, scoreLine, type LineupRole, type Player } from "@/lib/ratings";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administração | Benfica Independente" },
      { name: "description", content: "Gestão de jogos, convocados e votações." },
      { property: "og:title", content: "Administração | Benfica Independente" },
      { property: "og:description", content: "Gestão de jogos e votações." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

const input = "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary";
const btn = "rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50";

function Admin() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const matches = useQuery(matchesQuery);
  const players = useQuery({
    queryKey: ["players"],
    queryFn: async () => (await supabase.from("players").select("*").order("position").order("number")).data ?? [],
  });
  const [selected, setSelected] = useState<string | null>(null);

  if (loading) return null;
  if (!isAdmin) return (
    <div className="mx-auto max-w-md px-4 pt-20 text-center">
      <h1 className="font-display text-4xl font-bold uppercase">Acesso reservado</h1>
      <p className="mt-2 text-muted-foreground">Esta área é só para administradores.</p>
      <Link to="/" className="mt-4 inline-block font-bold text-primary">Voltar</Link>
    </div>
  );

  const refresh = () => qc.invalidateQueries();
  const sel = matches.data?.find((m) => m.id === selected);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10">
      <h1 className="font-display text-5xl font-bold uppercase">Administração</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-6">
          <NewMatch onDone={refresh} />
          <div className="rounded-2xl border bg-card p-5 shadow-soft">
            <h2 className="mb-3 font-display text-2xl font-bold uppercase">Jogos</h2>
            <div className="space-y-2">
              {matches.data?.map((m) => {
                const s = scoreLine(m);
                return (
                  <button key={m.id} onClick={() => setSelected(m.id)} className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left text-sm ${selected === m.id ? "border-primary bg-accent" : ""}`}>
                    <span className="min-w-0 truncate font-semibold">{s.home} {s.hs}-{s.as} {s.away}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{m.voters} votantes · {m.voting_open ? "aberta" : "fechada"}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <NewPlayer onDone={refresh} />
        </div>
        <div>
          {sel ? <MatchEditor key={sel.id} matchId={sel.id} players={players.data ?? []} onDone={refresh} /> : (
            <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Escolhe um jogo para editar resultado, convocados e votação.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function NewMatch({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ opponent: "", competition: "Liga Portugal", round: "", kickoff: "", venue: "Estádio da Luz", is_home: true });
  async function save() {
    if (!f.opponent || !f.kickoff) { toast.error("Adversário e data são obrigatórios"); return; }
    const d = f.kickoff.slice(0, 10);
    const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const slug = f.is_home ? `benfica-vs-${slugify(f.opponent)}-${d}` : `${slugify(f.opponent)}-vs-benfica-${d}`;
    const { error } = await supabase.from("matches").insert({ ...f, round: f.round || null, kickoff: new Date(f.kickoff).toISOString(), slug });
    if (error) { toast.error(error.message); return; }
    toast.success("Jogo criado");
    setF({ ...f, opponent: "", round: "", kickoff: "" });
    onDone();
  }
  return (
    <div className="space-y-2 rounded-2xl border bg-card p-5 shadow-soft">
      <h2 className="font-display text-2xl font-bold uppercase">Novo jogo</h2>
      <input className={input} placeholder="Adversário" value={f.opponent} onChange={(e) => setF({ ...f, opponent: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <input className={input} placeholder="Competição" value={f.competition} onChange={(e) => setF({ ...f, competition: e.target.value })} />
        <input className={input} placeholder="Jornada" value={f.round} onChange={(e) => setF({ ...f, round: e.target.value })} />
      </div>
      <input className={input} type="datetime-local" value={f.kickoff} onChange={(e) => setF({ ...f, kickoff: e.target.value })} />
      <input className={input} placeholder="Estádio" value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} />
      <label className="flex items-center gap-2 text-sm"><Switch checked={f.is_home} onCheckedChange={(v) => setF({ ...f, is_home: v })} /> Benfica joga em casa</label>
      <button className={btn} onClick={save}>Criar jogo</button>
    </div>
  );
}

const POS_OPTIONS = (
  <>
    <option value="GR">Guarda-redes</option><option value="DEF">Defesa</option><option value="MED">Médio</option><option value="AV">Avançado</option><option value="TRE">Treinador</option>
  </>
);

function PhotoPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border bg-muted text-xs text-muted-foreground">
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : "Sem foto"}
      </div>
      <label className="cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold hover:border-primary">
        {busy ? "A carregar…" : "Carregar foto"}
        <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          try { onChange(await fileToPhotoDataUrl(file)); } catch (err) { toast.error((err as Error).message); }
          setBusy(false);
        }} />
      </label>
      {value && <button type="button" className="text-xs font-semibold text-destructive" onClick={() => onChange("")}>Remover</button>}
    </div>
  );
}

function NewPlayer({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ name: "", position: "MED" as Player["position"], number: "", photo_url: "" });
  async function save() {
    if (!f.name) { toast.error("Indica o nome"); return; }
    const { error } = await supabase.from("players").insert({ name: f.name, position: f.position, number: f.number ? Number(f.number) : null, photo_url: f.photo_url || null });
    if (error) { toast.error(error.message); return; }
    toast.success("Jogador adicionado");
    setF({ name: "", position: "MED", number: "", photo_url: "" });
    onDone();
  }
  return (
    <div className="space-y-2 rounded-2xl border bg-card p-5 shadow-soft">
      <h2 className="font-display text-2xl font-bold uppercase">Novo jogador</h2>
      <input className={input} placeholder="Nome" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <select className={input} value={f.position} onChange={(e) => setF({ ...f, position: e.target.value as Player["position"] })}>{POS_OPTIONS}</select>
        <input className={input} placeholder="Número" inputMode="numeric" value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} />
      </div>
      <PhotoPicker value={f.photo_url} onChange={(v) => setF({ ...f, photo_url: v })} />
      <button className={btn} onClick={save}>Adicionar</button>
    </div>
  );
}

function Squad({ players, onDone }: { players: Player[]; onDone: () => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <h2 className="mb-3 font-display text-2xl font-bold uppercase">Gerir plantel</h2>
      <div className="space-y-2">
        {players.map((p) => editing === p.id
          ? <PlayerEditor key={p.id} player={p} onClose={() => setEditing(null)} onDone={onDone} />
          : (
            <div key={p.id} className={`flex items-center gap-3 rounded-xl border p-2 text-sm ${p.active ? "" : "opacity-50"}`}>
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-xs font-bold">
                {p.photo_url ? <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" /> : initials(p.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{p.number ?? "–"} · {p.name}</div>
                <div className="text-xs text-muted-foreground">{POSITION_LABEL[p.position]}{p.active ? "" : " · inativo"}</div>
              </div>
              <button className="rounded-lg border px-3 py-1.5 text-xs font-bold" onClick={() => setEditing(p.id)}>Editar</button>
            </div>
          ))}
      </div>
    </div>
  );
}

function PlayerEditor({ player, onClose, onDone }: { player: Player; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name: player.name, position: player.position, number: player.number?.toString() ?? "", photo_url: player.photo_url ?? "", active: player.active });
  async function save() {
    if (!f.name) { toast.error("Indica o nome"); return; }
    const { error } = await supabase.from("players").update({ name: f.name, position: f.position, number: f.number ? Number(f.number) : null, photo_url: f.photo_url || null, active: f.active }).eq("id", player.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Jogador atualizado"); onClose(); onDone();
  }
  async function remove() {
    if (!confirm(`Apagar ${player.name} do plantel?`)) return;
    const { error } = await supabase.from("players").delete().eq("id", player.id);
    if (error) {
      // Player has votes/lineups: keep history, just hide from the squad.
      const { error: e2 } = await supabase.from("players").update({ active: false }).eq("id", player.id);
      if (e2) { toast.error(e2.message); return; }
      toast.success("Jogador tem avaliações guardadas — ficou inativo (sai das convocatórias, histórico mantido)");
    } else toast.success("Jogador apagado");
    onClose(); onDone();
  }
  return (
    <div className="space-y-2 rounded-xl border border-primary bg-accent/40 p-3">
      <input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <select className={input} value={f.position} onChange={(e) => setF({ ...f, position: e.target.value as Player["position"] })}>{POS_OPTIONS}</select>
        <input className={input} placeholder="Número" inputMode="numeric" value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} />
      </div>
      <PhotoPicker value={f.photo_url} onChange={(v) => setF({ ...f, photo_url: v })} />
      <label className="flex items-center gap-2 text-sm"><Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} /> Ativo no plantel</label>
      <div className="flex flex-wrap gap-2">
        <button className={btn} onClick={save}>Guardar</button>
        <button className="rounded-lg border px-4 py-2 text-sm font-bold" onClick={onClose}>Cancelar</button>
        <button className="ml-auto rounded-lg border px-4 py-2 text-sm font-bold text-destructive" onClick={remove}>Apagar</button>
      </div>
    </div>
  );
}

function MatchEditor({ matchId, players, onDone }: { matchId: string; players: Player[]; onDone: () => void }) {
  const [m, setM] = useState<{ benfica_goals: string; opponent_goals: string; voting_open: boolean } | null>(null);
  const [lineup, setLineup] = useState<Record<string, LineupRole | "">>({});
  const [stats, setStats] = useState<{ name: string; avg: number | null; n: number; motm: number }[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: match }, { data: lp }, { data: res }] = await Promise.all([
        supabase.from("matches").select("*").eq("id", matchId).single(),
        supabase.from("match_players").select("player_id, role").eq("match_id", matchId),
        supabase.rpc("get_match_results", { _match_id: matchId }),
      ]);
      if (match) setM({ benfica_goals: String(match.benfica_goals ?? ""), opponent_goals: String(match.opponent_goals ?? ""), voting_open: match.voting_open });
      setLineup(Object.fromEntries((lp ?? []).map((x) => [x.player_id, x.role])));
      setStats((res ?? []).map((r) => ({ name: players.find((p) => p.id === r.player_id)?.name ?? "?", avg: r.avg_score, n: Number(r.rating_count), motm: Number(r.motm_count) })).sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0)));
    })();
  }, [matchId, players]);

  if (!m) return null;

  async function saveMatch() {
    const { error } = await supabase.from("matches").update({
      benfica_goals: m!.benfica_goals === "" ? null : Number(m!.benfica_goals),
      opponent_goals: m!.opponent_goals === "" ? null : Number(m!.opponent_goals),
      voting_open: m!.voting_open,
    }).eq("id", matchId);
    if (error) { toast.error(error.message); return; }
    toast.success("Jogo atualizado"); onDone();
  }

  async function saveLineup() {
    await supabase.from("match_players").delete().eq("match_id", matchId);
    const order: Record<string, number> = { GR: 1, DEF: 2, MED: 3, AV: 4, TRE: 9 };
    const rows = Object.entries(lineup).filter(([, r]) => r).map(([player_id, role]) => ({
      match_id: matchId, player_id, role: role as LineupRole, sort_order: order[players.find((p) => p.id === player_id)?.position ?? "MED"] ?? 3,
    }));
    const { error } = await supabase.from("match_players").insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success("Convocados guardados"); onDone();
  }

  async function deleteMatch() {
    if (!confirm("Apagar este jogo e todas as avaliações?")) return;
    const { error } = await supabase.from("matches").delete().eq("id", matchId);
    if (error) { toast.error(error.message); return; }
    onDone();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="font-display text-2xl font-bold uppercase">Resultado e votação</h2>
        <div className="grid grid-cols-2 gap-2">
          <input className={input} placeholder="Golos Benfica" value={m.benfica_goals} onChange={(e) => setM({ ...m, benfica_goals: e.target.value })} />
          <input className={input} placeholder="Golos adversário" value={m.opponent_goals} onChange={(e) => setM({ ...m, opponent_goals: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm"><Switch checked={m.voting_open} onCheckedChange={(v) => setM({ ...m, voting_open: v })} /> Votação aberta</label>
        <div className="flex gap-2">
          <button className={btn} onClick={saveMatch}>Guardar</button>
          <button className="rounded-lg border px-4 py-2 text-sm font-bold text-destructive" onClick={deleteMatch}>Apagar jogo</button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="mb-3 font-display text-2xl font-bold uppercase">Quem jogou</h2>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {players.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm">
              <span className="min-w-0 truncate">{p.number ?? "–"} · {p.name}</span>
              <select className="rounded-md border bg-background px-1 py-0.5 text-xs" value={lineup[p.id] ?? ""} onChange={(e) => setLineup({ ...lineup, [p.id]: e.target.value as LineupRole | "" })}>
                <option value="">Não jogou</option><option value="titular">Titular</option><option value="suplente">Entrou</option><option value="treinador">Treinador</option>
              </select>
            </div>
          ))}
        </div>
        <button className={`${btn} mt-3`} onClick={saveLineup}>Guardar convocados</button>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="mb-3 font-display text-2xl font-bold uppercase">Médias</h2>
        {stats.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados (ou votação aberta e ainda não votaste).</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground"><th>Jogador</th><th>Média</th><th>Aval.</th><th>MeC</th></tr></thead>
            <tbody>{stats.map((s) => <tr key={s.name} className="border-t"><td className="py-1">{s.name}</td><td className="font-bold text-primary">{s.avg ?? "–"}</td><td>{s.n}</td><td>{s.motm}</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
