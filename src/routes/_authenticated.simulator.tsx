import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  startSimulatorScenario,
  continueSimulator,
} from "@/lib/margin-ai.functions";
import { Send, Loader2, RotateCcw, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/simulator")({
  head: () => ({
    meta: [
      { title: "Simulador de servicio — MARGIN" },
      {
        name: "description",
        content: "Practicá atención al cliente con clientes ficticios generados por IA.",
      },
      { property: "og:title", content: "Simulador — MARGIN" },
      {
        property: "og:description",
        content: "Chat dinámico con clientes ficticios para entrenar a tu equipo.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SimulatorPage,
});

const CLIENT_TYPES = [
  { id: "amable", label: "Amable", emoji: "🙂" },
  { id: "apurado", label: "Apurado", emoji: "⏱️" },
  { id: "enojado", label: "Enojado", emoji: "😠" },
  { id: "queja", label: "Con queja", emoji: "😤" },
  { id: "reclamo", label: "Con reclamo", emoji: "📣" },
  { id: "indeciso", label: "Indeciso", emoji: "🤔" },
  { id: "sugerencia", label: "Con sugerencia", emoji: "💡" },
] as const;

type ChatMsg = { role: "user" | "assistant"; content: string };

function SimulatorPage() {
  const startFn = useServerFn(startSimulatorScenario);
  const continueFn = useServerFn(continueSimulator);

  const [clientType, setClientType] = useState<(typeof CLIENT_TYPES)[number]["id"] | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function startScenario(type: (typeof CLIENT_TYPES)[number]["id"]) {
    setClientType(type);
    setMessages([]);
    setBusy(true);
    try {
      const res = await startFn({ data: { clientType: type, position: "mozo" } });
      setSystemPrompt(res.system);
      setMessages([{ role: "assistant", content: res.opening }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error iniciando la simulación");
      setClientType(null);
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || busy) return;
    const nextHistory: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(nextHistory);
    setInput("");
    setBusy(true);
    try {
      const res = await continueFn({
        data: { system: systemPrompt, history: nextHistory },
      });
      setMessages([...nextHistory, { role: "assistant", content: res.reply }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setClientType(null);
    setSystemPrompt("");
    setMessages([]);
    setInput("");
  }

  if (!clientType) {
    return (
      <div className="space-y-6">
        <header>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-glow px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles size={12} /> IA
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Simulador de servicio</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Elegí un tipo de cliente y practicá cómo lo atenderías. La IA te va a responder
            realistamente según su personalidad.
          </p>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CLIENT_TYPES.map((c) => (
            <button
              key={c.id}
              onClick={() => startScenario(c.id)}
              disabled={busy}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-5 text-left shadow-card transition-all hover:border-primary/40 hover:shadow-elevated disabled:opacity-50"
            >
              <span className="text-3xl">{c.emoji}</span>
              <div>
                <p className="font-semibold group-hover:text-primary">Cliente {c.label}</p>
                <p className="text-xs text-muted-foreground">Empezar simulación</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const chosen = CLIENT_TYPES.find((c) => c.id === clientType);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{chosen?.emoji}</span>
          <div>
            <h1 className="text-lg font-bold">Cliente {chosen?.label}</h1>
            <p className="text-xs text-muted-foreground">Simulación en curso</p>
          </div>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          <RotateCcw size={13} /> Cambiar cliente
        </button>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-card"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-gradient-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 size={13} className="animate-spin" /> El cliente está escribiendo…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="mt-3 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribí tu respuesta como si fueras el mozo…"
          disabled={busy}
          className="flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
