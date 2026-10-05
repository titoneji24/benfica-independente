import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova password | Benfica Independente" },
      { name: "description", content: "Define uma nova password para a tua conta." },
      { property: "og:title", content: "Nova password | Benfica Independente" },
      { property: "og:description", content: "Define uma nova password para a tua conta." },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const navigate = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Mínimo 8 caracteres");
    if (pw !== pw2) return toast.error("As passwords não coincidem");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    toast.success("Password atualizada");
    navigate({ to: "/player-ratings" });
  }
  const input = "h-12 w-full rounded-xl border bg-background px-4 outline-none focus:border-primary";
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <form onSubmit={submit} className="space-y-3 rounded-3xl border bg-card p-8 shadow-soft">
        <h1 className="font-display text-4xl font-bold uppercase">Nova password</h1>
        <input className={input} type="password" placeholder="Nova password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <input className={input} type="password" placeholder="Confirmar password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        <button className="h-12 w-full rounded-xl bg-primary font-display text-lg font-bold uppercase text-primary-foreground">Guardar</button>
      </form>
    </div>
  );
}
