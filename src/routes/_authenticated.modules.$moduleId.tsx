import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { completeLesson } from "@/lib/margin-progress.functions";
import { ChevronLeft, CheckCircle2, PlayCircle, Loader2 } from "lucide-react";
import { MargincoinIcon } from "@/lib/margin-coin";

export const Route = createFileRoute("/_authenticated/modules/$moduleId")({
  head: () => ({
    meta: [
      { title: "Módulo — MARGIN" },
      { name: "description", content: "Contenido del módulo de capacitación." },
      { property: "og:title", content: "Módulo — MARGIN" },
      { property: "og:description", content: "Aprendé y sumá margincoins." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ModuleDetailPage,
  notFoundComponent: () => <p className="text-muted-foreground">Módulo no encontrado.</p>,
});

type Mod = { id: string; title: string; description: string | null; category: string | null };
type Lesson = {
  id: string;
  title: string;
  content: string | null;
  order_index: number | null;
  xp_reward: number | null;
  coin_reward: number | null;
  estimated_minutes: number | null;
};

function ModuleDetailPage() {
  const { moduleId } = Route.useParams();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [mod, setMod] = useState<Mod | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [busy, setBusy] = useState(false);

  const completeFn = useServerFn(completeLesson);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  useEffect(() => {
    (async () => {
      const { data: mData } = await supabase
        .from("training_modules")
        .select("id, title, description, category")
        .eq("id", moduleId)
        .maybeSingle();
      setMod(mData);
      const { data: lData } = await supabase
        .from("lessons")
        .select("id, title, content, order_index, xp_reward, coin_reward, estimated_minutes")
        .eq("module_id", moduleId)
        .order("order_index", { ascending: true });
      setLessons(lData ?? []);
      if (session) {
        const { data: prog } = await supabase
          .from("user_progress")
          .select("lesson_id")
          .eq("user_id", session.user.id)
          .eq("module_id", moduleId);
        setCompleted(new Set((prog ?? []).map((p) => p.lesson_id)));
      }
    })();
  }, [moduleId, session]);

  async function handleComplete(lesson: Lesson) {
    setBusy(true);
    try {
      const res = await completeFn({ data: { lessonId: lesson.id } });
      if (res.alreadyCompleted) {
        toast.info("Ya habías completado esta lección");
      } else if (res.courseCompleted) {
        // Esta lección completó el curso entero: recién ahora se acreditan
        // TODOS los margincoins que se venían acumulando lección a lección.
        toast.success(`¡Curso completo! +${res.coinsAwarded} margincoins`, {
          description: `+${res.xpAwarded} XP sumados. Ya podés usar tus margincoins en la tienda.`,
        });
        setCompleted((prev) => new Set(prev).add(lesson.id));
        router.invalidate();
      } else {
        // Lección normal: los margincoins de esta lección quedan retenidos
        // hasta terminar el curso, solo se muestra el XP ganado al instante.
        toast.success(`+${res.xpAwarded} XP`, {
          description: "Tus margincoins de este curso se acreditan al completarlo entero.",
        });
        setCompleted((prev) => new Set(prev).add(lesson.id));
        router.invalidate();
      }
      setActiveLesson(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        to="/modules"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft size={16} /> Volver a módulos
      </Link>

      {mod && (
        <header>
          {mod.category && (
            <span className="inline-block rounded-full bg-primary-glow px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              {mod.category}
            </span>
          )}
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{mod.title}</h1>
          {mod.description && (
            <p className="mt-2 max-w-2xl text-muted-foreground">{mod.description}</p>
          )}
        </header>
      )}

      <div className="space-y-3">
        {lessons.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Todavía no hay lecciones cargadas en este módulo.
          </p>
        )}
        {lessons.map((l, i) => {
          const done = completed.has(l.id);
          return (
            <div
              key={l.id}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  done ? "bg-success/20 text-success" : "bg-primary-glow text-primary"
                }`}
              >
                {done ? <CheckCircle2 size={18} /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold">{l.title}</p>
                <p className="text-xs text-muted-foreground">
                  {l.estimated_minutes ?? 5} min · +{l.xp_reward ?? 0} XP · +
                  {l.coin_reward ?? 0} coins
                </p>
              </div>
              <button
                onClick={() => setActiveLesson(l)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03]"
              >
                <PlayCircle size={15} /> {done ? "Repasar" : "Empezar"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Lesson modal */}
      {activeLesson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => !busy && setActiveLesson(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-elevated"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border p-6">
              <h2 className="text-xl font-bold">{activeLesson.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeLesson.estimated_minutes ?? 5} min · Recompensa: +
                {activeLesson.xp_reward ?? 0} XP + {activeLesson.coin_reward ?? 0}{" "}
                margincoins
              </p>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-6">
              <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-foreground">
                {activeLesson.content ?? "Contenido de la lección próximamente."}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border p-4">
              <button
                onClick={() => setActiveLesson(null)}
                disabled={busy}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                Cerrar
              </button>
              <button
                onClick={() => handleComplete(activeLesson)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-coin px-4 py-2 text-sm font-bold text-coin-foreground shadow-glow disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <MargincoinIcon size={15} />
                )}
                Marcar completada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
