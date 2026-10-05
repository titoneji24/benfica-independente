import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { Crest } from "@/components/site-chrome";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar ou registar | Benfica Independente" },
      { name: "description", content: "Cria a tua conta benfiquista para avaliar os jogadores depois de cada jogo." },
      { property: "og:title", content: "Entrar | Benfica Independente" },
      { property: "og:description", content: "Junta-te à comunidade e avalia os jogadores do Benfica." },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  username: z.string().trim().min(3, "Mínimo 3 caracteres").max(24, "Máximo 24 caracteres").regex(/^[a-zA-Z0-9_]+$/, "Só letras, números e _"),
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: "As passwords não coincidem", path: ["confirm"] });

type Mode = "login" | "signup" | "forgot";

function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [f, setF] = useState({ username: "", email: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (user) navigate({ to: "/player-ratings" }); }, [user, navigate]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const p = signupSchema.safeParse(f);
        if (!p.success) { toast.error(p.error.issues[0]?.message ?? "Dados inválidos"); return; }
        const { error } = await supabase.auth.signUp({
          email: p.data.email, password: p.data.password,
          options: { emailRedirectTo: window.location.origin, data: { username: p.data.username } },
        });
        if (error) throw error;
        setSent("Enviámos um email de confirmação. Confirma a tua conta para entrar.");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(f.email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setSent("Se existir uma conta com esse email, vais receber um link para redefinir a password.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Algo correu mal");
    } finally { setBusy(false); }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(r.error.message);
  }

  const input = "h-12 w-full rounded-xl border bg-background px-4 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-3xl border bg-card p-8 shadow-soft">
        <div className="flex flex-col items-center text-center">
          <Crest className="h-14 w-14 text-xl" />
          <h1 className="mt-4 font-display text-4xl font-bold uppercase">
            {mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Recuperar password"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">A tua voz nas Notas dos Benfiquistas.</p>
        </div>

        {sent ? (
          <p className="mt-8 rounded-2xl bg-accent p-4 text-center text-sm font-semibold text-accent-foreground">{sent}</p>
        ) : (
          <>
            {mode !== "forgot" && (
              <>
                <button onClick={google} className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-xl border bg-background font-semibold transition hover:bg-muted">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.4-.2-2.1H12v4h6c-.1 1-.8 2.5-2.3 3.5v2.9h3.7c2.1-2 3.2-4.9 3.2-8.3z"/><path fill="#34A853" d="M12 23c3 0 5.6-1 7.4-2.7l-3.7-2.9c-1 .7-2.3 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2v2.9C3.8 20.6 7.6 23 12 23z"/><path fill="#FBBC05" d="M5.8 14c-.2-.7-.4-1.3-.4-2s.1-1.4.4-2V7.1H2C1.3 8.6.9 10.3.9 12s.4 3.4 1.1 4.9L5.8 14z"/><path fill="#EA4335" d="M12 5.4c1.6 0 2.8.7 3.4 1.3l2.6-2.5C16.4 2.8 14.4 1.8 12 1.8 7.6 1.8 3.8 4.3 2 7.9l3.8 2.9C6.7 7.4 9.1 5.4 12 5.4z"/></svg>
                  Continuar com Google
                </button>
                <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground"><span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" /></div>
              </>
            )}
            <form onSubmit={onSubmit} className={`space-y-3 ${mode === "forgot" ? "mt-8" : ""}`}>
              {mode === "signup" && <input className={input} placeholder="Username" value={f.username} onChange={set("username")} autoComplete="username" />}
              <input className={input} type="email" placeholder="Email" value={f.email} onChange={set("email")} autoComplete="email" required />
              {mode !== "forgot" && <input className={input} type="password" placeholder="Password" value={f.password} onChange={set("password")} autoComplete={mode === "login" ? "current-password" : "new-password"} required />}
              {mode === "signup" && <input className={input} type="password" placeholder="Confirmar password" value={f.confirm} onChange={set("confirm")} autoComplete="new-password" required />}
              <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-display text-lg font-bold uppercase tracking-wide text-primary-foreground shadow-red disabled:opacity-60">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "login" ? "Entrar" : mode === "signup" ? "Registar" : "Enviar link"}
              </button>
            </form>
          </>
        )}

        <div className="mt-6 flex flex-col items-center gap-2 text-sm">
          {mode === "login" && <button onClick={() => { setMode("forgot"); setSent(null); }} className="text-muted-foreground hover:text-foreground">Esqueceste a password?</button>}
          {mode !== "signup" ? (
            <button onClick={() => { setMode("signup"); setSent(null); }} className="font-bold text-primary">Ainda não tens conta? Regista-te</button>
          ) : (
            <button onClick={() => { setMode("login"); setSent(null); }} className="font-bold text-primary">Já tens conta? Entra</button>
          )}
          {mode === "forgot" && <button onClick={() => { setMode("login"); setSent(null); }} className="text-muted-foreground">Voltar</button>}
        </div>
      </div>
    </div>
  );
}
