import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Home, Star, Users, User, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SOON = ["Notícias", "Podcasts", "Vídeos", "Benfica"];

export function Crest({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span className={`relative grid shrink-0 place-items-center rounded-full bg-gradient-red ring-2 ring-gold ${className}`}>
      <span className="font-display text-[0.95em] font-bold leading-none text-primary-foreground">BI</span>
    </span>
  );
}

export function SiteHeader() {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const linkCls = "text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground";
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 md:grid-cols-[auto_1fr_auto]">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <Crest />
          <span className="truncate font-display text-xl font-bold uppercase tracking-wide">
            Benfica <span className="text-primary">Independente</span>
          </span>
        </Link>
        <nav className="hidden items-center justify-center gap-6 md:flex">
          <Link to="/" className={linkCls} activeProps={{ className: "text-foreground" }} activeOptions={{ exact: true }}>Início</Link>
          {SOON.map((s) => (
            <span key={s} className="cursor-default text-sm font-semibold text-muted-foreground/50" title="Em breve">{s}</span>
          ))}
          <Link to="/player-ratings" className={linkCls} activeProps={{ className: "text-primary" }}>Player Ratings</Link>
          <span className="cursor-default text-sm font-semibold text-muted-foreground/50" title="Em breve">Comunidade</span>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3 text-sm font-semibold shadow-soft">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-xs text-ink-foreground">
                  {(profile?.username ?? "?").slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-28 truncate sm:inline">@{profile?.username}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild><Link to="/perfil"><User className="mr-2 h-4 w-4" />Perfil</Link></DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild><Link to="/admin"><Shield className="mr-2 h-4 w-4" />Administração</Link></DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth" className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-red transition-transform hover:-translate-y-0.5">
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function MobileNav() {
  const { user } = useAuth();
  const item = "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-semibold text-muted-foreground";
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <Link to="/" className={item} activeProps={{ className: "text-primary" }} activeOptions={{ exact: true }}><Home className="h-5 w-5" />Início</Link>
      <Link to="/player-ratings" className={item} activeProps={{ className: "text-primary" }}><Star className="h-5 w-5" />Ratings</Link>
      <span className={`${item} opacity-50`}><Users className="h-5 w-5" />Comunidade</span>
      <Link to={user ? "/perfil" : "/auth"} className={item} activeProps={{ className: "text-primary" }}><User className="h-5 w-5" />{user ? "Perfil" : "Entrar"}</Link>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-gradient-ink pb-24 text-ink-foreground md:pb-0">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Crest />
          <div>
            <p className="font-display text-lg font-bold uppercase">Benfica Independente</p>
            <p className="text-sm text-ink-foreground/60">Feito por benfiquistas, para benfiquistas.</p>
          </div>
        </div>
        <p className="text-xs text-ink-foreground/50">Projeto independente, sem ligação oficial ao Sport Lisboa e Benfica.</p>
      </div>
    </footer>
  );
}
