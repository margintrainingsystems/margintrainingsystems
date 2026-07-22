import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { Coins, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/modules/")({
  head: () => ({
    meta: [
      { title: "Módulos de capacitación — MARGIN" },
      { name: "description", content: "Cursos, talleres y módulos para todos los puestos gastronómicos." },
      { property: "og:title", content: "Módulos — MARGIN" },
      { property: "og:description", content: "Elegí un módulo y empezá a capacitarte." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ModulesListPage,
});

type Mod = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: number | null;
  coin_reward: number | null;
  xp_reward: number | null;
};

function ModulesListPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [modules, setModules] = useState<Mod[]>([]);
  const [progressByModule, setProgressByModule] = useState<Record<string, number>>({});
  const [lessonCountByModule, setLessonCountByModule] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  useEffect(() => {
    (async () => {
      const { data: mods } = await supabase
        .from("training_modules")
        .select("id, title, description, category, difficulty, coin_reward, xp_reward")
        .eq("is_published", true)
        .order("order_index", { ascending: true });
      setModules(mods ?? []);

      const { data: lessons } = await supabase.from("lessons").select("id, module_id");
      const counts: Record<string, number> = {};
      (lessons ?? []).forEach((l) => {
        counts[l.module_id] = (counts[l.module_id] ?? 0) + 1;
      });
      setLessonCountByModule(counts);

      if (session) {
        const { data: prog } = await supabase
          .from("user_progress")
          .select("module_id")
          .eq("user_id", session.user.id);
        const pc: Record<string, number> = {};
        (prog ?? []).forEach((p) => {
          pc[p.module_id] = (pc[p.module_id] ?? 0) + 1;
        });
        setProgressByModule(pc);
      }
      setLoading(false);
    })();
  }, [session]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Capacitación</h1>
        <p className="mt-2 text-muted-foreground">
          Elegí un módulo y sumá XP + margincoins al completar cada lección.
        </p>
      </header>

      {loading && <p className="text-sm text-muted-foreground">Cargando módulos…</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => {
          const total = lessonCountByModule[m.id] ?? 0;
          const done = progressByModule[m.id] ?? 0;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const complete = total > 0 && done >= total;
          return (
            <Link
              key={m.id}
              to="/modules/$moduleId"
              params={{ moduleId: m.id }}
              className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/40 hover:shadow-elevated"
            >
              <div className="flex items-start justify-between gap-2">
                {m.category && (
                  <span className="inline-block rounded-full bg-primary-glow px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                    {m.category}
                  </span>
                )}
                {complete && <CheckCircle2 size={18} className="text-success" />}
              </div>
              <h3 className="mt-3 text-lg font-semibold group-hover:text-primary">
                {m.title}
              </h3>
              {m.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {m.description}
                </p>
              )}

              <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} /> {total} {total === 1 ? "lección" : "lecciones"}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-coin">
                  <Coins size={12} /> +{m.coin_reward ?? 0}
                </span>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-gradient-primary"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {done}/{total} completadas
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
