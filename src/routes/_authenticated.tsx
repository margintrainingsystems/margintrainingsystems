import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { MARGIN_LOGO_WHITE } from "@/lib/margin-brand";
import { MargincoinIcon } from "@/lib/margin-coin";
import {
  LayoutDashboard,
  GraduationCap,
  Gift,
  LogOut,
  Menu,
  X,
  Sparkles,
  Building2,
  Users,
  Ticket,
  CreditCard,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

type Role = "owner" | "employee" | null;

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

const EMPLOYEE_NAV: NavItem[] = [
  { to: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { to: "/modules", label: "Capacitación", icon: GraduationCap },
  { to: "/simulator", label: "Simulador", icon: Sparkles },
  { to: "/rewards", label: "Recompensas", icon: Gift },
];

const EMPLOYER_NAV: NavItem[] = [
  { to: "/employer", label: "Panel", icon: Building2 },
  { to: "/employer/employees", label: "Equipo", icon: Users },
  { to: "/employer/invitations", label: "Invitaciones", icon: Ticket },
  { to: "/employer/billing", label: "Suscripción", icon: CreditCard },
  { to: "/modules", label: "Contenido", icon: GraduationCap },
];

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [coins, setCoins] = useState<number>(0);
  const [role, setRole] = useState<Role>(null);
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
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) navigate({ to: "/auth" });
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  // Cargar profile + role y decidir onboarding vs app.
  useEffect(() => {
    if (!session) return;
    (async () => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("margincoins, establishment_id").eq("id", session.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", session.user.id),
      ]);
      setCoins(profile?.margincoins ?? 0);
      const roleSet = new Set((roles ?? []).map((r) => r.role));
      const effective: Role = roleSet.has("owner") ? "owner" : roleSet.has("employee") ? "employee" : null;
      setRole(effective);

      if (!effective && pathname !== "/onboarding") {
        navigate({ to: "/onboarding" });
      } else if (effective && pathname === "/onboarding") {
        navigate({ to: effective === "owner" ? "/employer" : "/dashboard" });
      }
      setChecking(false);
    })();
  }, [session, pathname, navigate]);

  useEffect(() => setMenuOpen(false), [pathname]);

  if (checking || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Onboarding a pantalla completa (sin nav).
  if (pathname === "/onboarding") {
    return (
      <main className="min-h-screen bg-background">
        <Outlet />
      </main>
    );
  }

  const nav = role === "owner" ? EMPLOYER_NAV : EMPLOYEE_NAV;
  const showCoins = role === "employee";

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <SidebarInner
          nav={nav}
          coins={coins}
          showCoins={showCoins}
          role={role}
          currentPath={pathname}
          onSignOut={() => supabase.auth.signOut()}
        />
      </aside>

      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <Link to={role === "owner" ? "/employer" : "/dashboard"} className="flex items-center gap-2">
          <img src={MARGIN_LOGO_WHITE} alt="MARGIN" className="h-7 w-7 rounded" />
          <span className="text-sm font-bold">MARGIN</span>
        </Link>
        <div className="flex items-center gap-3">
          {showCoins && <CoinBadge coins={coins} />}
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
            nav={nav}
            coins={coins}
            showCoins={showCoins}
            role={role}
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
  nav,
  coins,
  showCoins,
  role,
  currentPath,
  onSignOut,
}: {
  nav: NavItem[];
  coins: number;
  showCoins: boolean;
  role: Role;
  currentPath: string;
  onSignOut: () => void;
}) {
  return (
    <div className="flex h-full flex-col p-4">
      <Link
        to={role === "owner" ? "/employer" : "/dashboard"}
        className="mb-6 hidden items-center gap-2.5 px-2 lg:flex"
      >
        <img src={MARGIN_LOGO_WHITE} alt="MARGIN" className="h-9 w-9 rounded-lg" />
        <span className="text-lg font-bold tracking-tight">MARGIN</span>
      </Link>
      {role === "owner" && (
        <div className="mb-4 hidden rounded-lg border border-border bg-card-elevated px-3 py-2 lg:block">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Modo</p>
          <p className="text-sm font-semibold text-primary">Empleador</p>
        </div>
      )}
      {showCoins && (
        <div className="mb-4 hidden lg:block">
          <CoinBadge coins={coins} full />
        </div>
      )}
      <nav className="flex flex-1 flex-col gap-1">
        {nav.map((item) => {
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
      <MargincoinIcon size={16} />
      <span>{coins.toLocaleString("es-AR")}</span>
      {full && <span className="text-xs font-medium opacity-80">margincoins</span>}
    </div>
  );
}
