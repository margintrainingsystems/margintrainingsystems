import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { Flame, Trophy, Coins, BookOpen, ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Mi panel — MARGIN" },
      { name: "description", content: "Tu panel de progreso, streak y margincoins." },
      { property: "og:title", content: "Mi panel — MARGIN" },
      { property: "og:description", content: "Progreso de capacitación en MARGIN." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

type Profile = {
  full_name: string | null;
  level: number;
  margincoins: number;
  total_xp: number;
  streak_days: number;
  position: string | null;
};

type NextModule = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  coin_reward: number | null;
};

function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nextModules, setNextModules] = useState<NextModule[]>([]);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("profiles")
      .select("full_name, level, margincoins, total_xp, streak_days, position")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
    supabase
      .from("training_modules")
      .select("id, title, description, category, coin_reward")
      .eq("is_published", true)
      .order("order_index", { ascending: true })
      .limit(3)
      .then(({ data }) => setNextModules(data ?? []));
    supabase
      .from("user_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .then(({ count }) => setCompletedCount(count ?? 0));
  }, [session]);

  const xpToNext = 500 - ((profile?.total_xp ?? 0) % 500);
  const xpProgress = (((profile?.total_xp ?? 0) % 500) / 500) * 100;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted-foreground">Bienvenido de nuevo</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          Hola, {profile?.full_name?.split(" ")[0] ?? "chef"} 👋
        </h1>
        <p className="mt-2 text-muted-foreground">
          {profile?.position ? `Puesto: ${profile.position} · ` : ""}
          Seguí sumando margincoins mientras te capacitás.
        </p>
      </header>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Coins}
          label="Margincoins"
          value={profile?.margincoins.toLocaleString("es-AR") ?? "0"}
          tint="coin"
        />
        <StatCard
          icon={Trophy}
          label="Nivel"
          value={String(profile?.level ?? 1)}
          hint={`${xpToNext} XP para nivel ${(profile?.level ?? 1) + 1}`}
          tint="primary"
        />
        <StatCard
          icon={Flame}
          label="Racha"
          value={`${profile?.streak_days ?? 0} días`}
          tint="warning"
        />
        <StatCard
          icon={BookOpen}
          label="Completadas"
          value={String(completedCount)}
          tint="success"
        />
      </section>

      {/* XP bar */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Progreso al próximo nivel</p>
            <p className="mt-0.5 text-lg font-semibold">
              {profile?.total_xp ?? 0} XP totales
            </p>
          </div>
          <span className="rounded-full bg-primary-glow px-3 py-1 text-xs font-semibold text-primary">
            Nivel {profile?.level ?? 1}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-primary transition-all"
            style={{ width: `${Math.max(4, xpProgress)}%` }}
          />
        </div>
      </section>

      {/* Continue learning */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Continuá aprendiendo</h2>
          <Link
            to="/modules"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Ver todo <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {nextModules.length === 0 && (
            <p className="text-sm text-muted-foreground">Cargando módulos…</p>
          )}
          {nextModules.map((m) => (
            <Link
              key={m.id}
              to="/modules/$moduleId"
              params={{ moduleId: m.id }}
              className="group rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/40 hover:shadow-elevated"
            >
              {m.category && (
                <span className="inline-block rounded-full bg-primary-glow px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                  {m.category}
                </span>
              )}
              <h3 className="mt-3 text-base font-semibold group-hover:text-primary">
                {m.title}
              </h3>
              {m.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {m.description}
                </p>
              )}
              <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-coin">
                <Coins size={14} /> +{m.coin_reward ?? 0}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Simulator CTA */}
      <section className="overflow-hidden rounded-2xl border border-border bg-gradient-hero p-6 text-primary-foreground shadow-glow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-background/20 p-2.5">
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold">Practicá con clientes ficticios</h3>
              <p className="text-sm opacity-90">
                Simulador de servicio con IA. Enfrentá clientes enojados, quejas y más.
              </p>
            </div>
          </div>
          <Link
            to="/simulator"
            className="inline-flex items-center gap-1.5 rounded-lg bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-elevated transition-transform hover:scale-[1.03]"
          >
            Empezar <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tint,
}: {
  icon: typeof Coins;
  label: string;
  value: string;
  hint?: string;
  tint: "coin" | "primary" | "warning" | "success";
}) {
  const tintClass =
    tint === "coin"
      ? "bg-coin/15 text-coin"
      : tint === "primary"
        ? "bg-primary-glow text-primary"
        : tint === "warning"
          ? "bg-warning/15 text-warning"
          : "bg-success/15 text-success";
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${tintClass}`}>
        <Icon size={18} />
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
