import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { MARGIN_LOGO_WHITE } from "@/lib/margin-brand";
import {
  LayoutDashboard,
  GraduationCap,
  Gift,
  LogOut,
  Coins,
  Menu,
  X,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

type NavItem = { to: "/dashboard" | "/modules" | "/rewards" | "/simulator"; label: string; icon: typeof LayoutDashboard };
const NAV: NavItem[] = [
  { to: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { to: "/modules", label: "Capacitación", icon: GraduationCap },
  { to: "/simulator", label: "Simulador", icon: Sparkles },
  { to: "/rewards", label: "Recompensas", icon: Gift },
];

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [coins, setCoins] = useState<number>(0);
  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) navigate({ to: "/auth" });
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("profiles")
      .select("margincoins")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setCoins(data?.margincoins ?? 0));
  }, [session, pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (checking || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <SidebarInner
          coins={coins}
          currentPath={pathname}
          onSignOut={() => supabase.auth.signOut()}
        />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={MARGIN_LOGO_WHITE} alt="MARGIN" className="h-7 w-7 rounded" />
          <span className="text-sm font-bold">MARGIN</span>
        </Link>
        <div className="flex items-center gap-3">
          <CoinBadge coins={coins} />
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-md p-2 text-foreground hover:bg-muted"
            aria-label="Menú"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 top-14 z-30 bg-background/95 backdrop-blur lg:hidden">
          <SidebarInner
            coins={coins}
            currentPath={pathname}
            onSignOut={() => supabase.auth.signOut()}
          />
        </div>
      )}

      <main className="flex-1 pt-14 lg:pt-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function SidebarInner({
  coins,
  currentPath,
  onSignOut,
}: {
  coins: number;
  currentPath: string;
  onSignOut: () => void;
}) {
  return (
    <div className="flex h-full flex-col p-4">
      <Link to="/dashboard" className="mb-6 hidden items-center gap-2.5 px-2 lg:flex">
        <img src={MARGIN_LOGO_WHITE} alt="MARGIN" className="h-9 w-9 rounded-lg" />
        <span className="text-lg font-bold tracking-tight">MARGIN</span>
      </Link>
      <div className="mb-4 hidden lg:block">
        <CoinBadge coins={coins} full />
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active = currentPath === item.to || currentPath.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary-glow text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={onSignOut}
        className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <LogOut size={18} />
        Cerrar sesión
      </button>
    </div>
  );
}

function CoinBadge({ coins, full }: { coins: number; full?: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-coin px-3 py-1 text-sm font-bold text-coin-foreground shadow-glow ${
        full ? "w-full justify-center py-2" : ""
      }`}
    >
      <Coins size={15} />
      <span>{coins.toLocaleString("es-AR")}</span>
      {full && <span className="text-xs font-medium opacity-80">margincoins</span>}
    </div>
  );
}
