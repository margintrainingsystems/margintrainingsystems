import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listEmployees, updatePlan, PLANS as PLAN_PRICES } from "@/lib/margin-employer.functions";
import { createCheckoutSession } from "@/lib/margin-payments.functions";
import { Check, Loader2, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/employer/billing")({
  head: () => ({
    meta: [
      { title: "Suscripción — MARGIN Empleador" },
      { name: "description", content: "Elegí y pagá tu plan de MARGIN con Mercado Pago." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BillingPage,
});

type PlanKey = "basic" | "pro" | "business";
const PLANS: {
  key: PlanKey;
  label: string;
  price: string;
  seats: string;
  features: string[];
}[] = [
  {
    key: "basic",
    label: "Básico",
    price: "Gratis",
    seats: "Hasta 2 empleados",
    features: ["Módulos base", "Simulador con IA", "Sistema margincoins"],
  },
  {
    key: "pro",
    label: "Pro",
    price: `ARS ${PLAN_PRICES.pro.price.toLocaleString("es-AR")}/mes`,
    seats: "Hasta 10 empleados",
    features: ["Todo lo del Básico", "Analytics del equipo", "Recompensas premium", "Soporte prioritario"],
  },
  {
    key: "business",
    label: "Business",
    price: `ARS ${PLAN_PRICES.business.price.toLocaleString("es-AR")}/mes`,
    seats: "Empleados ilimitados",
    features: ["Todo lo del Pro", "Cursos personalizados", "IA de entrevistas + CV", "SLA dedicado"],
  },
];

function BillingPage() {
  const load = useServerFn(listEmployees);
  const update = useServerFn(updatePlan);
  const checkout = useServerFn(createCheckoutSession);
  const [current, setCurrent] = useState<PlanKey | null>(null);
  const [busy, setBusy] = useState<PlanKey | null>(null);

  useEffect(() => {
    load().then((r) => setCurrent((r.establishment?.plan as PlanKey) ?? null));
  }, [load]);

  async function selectPlan(plan: PlanKey) {
    setBusy(plan);
    try {
      if (plan === "basic") {
        await update({ data: { plan } });
        setCurrent("basic");
        toast.success("Plan actualizado a Básico");
        return;
      }
      // Pro / Business → checkout MP
      const { initPoint, mode } = await checkout({ data: { plan } });
      if (mode === "placeholder") {
        toast.info("Mercado Pago (modo placeholder)", {
          description: "Configurá MP_ACCESS_TOKEN + MP_PLAN_ID para pagos reales.",
        });
      }
      window.open(initPoint, "_blank", "noopener");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Suscripción</h1>
        <p className="text-sm text-muted-foreground">
          Elegí el plan que mejor se adapta a tu equipo. Los pagos se procesan con Mercado Pago.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = current === p.key;
          return (
            <div
              key={p.key}
              className={`flex flex-col rounded-2xl border p-6 ${
                isCurrent ? "border-primary bg-primary-glow" : "border-border bg-card"
              }`}
            >
              <div className="mb-4 flex items-baseline justify-between">
                <h3 className="text-lg font-semibold">{p.label}</h3>
                {isCurrent && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
                    Actual
                  </span>
                )}
              </div>
              <p className="mb-1 text-2xl font-bold">{p.price}</p>
              <p className="mb-4 text-xs text-muted-foreground">{p.seats}</p>
              <ul className="mb-6 space-y-1.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check size={14} className="mt-0.5 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => selectPlan(p.key)}
                disabled={isCurrent || busy === p.key}
                className={`mt-auto inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  isCurrent
                    ? "cursor-default bg-muted text-muted-foreground"
                    : "bg-gradient-primary text-primary-foreground shadow-glow"
                }`}
              >
                {busy === p.key && <Loader2 size={14} className="animate-spin" />}
                {isCurrent ? "Plan activo" : p.key === "basic" ? "Cambiar a Básico" : (
                  <>
                    Pagar con MP <ExternalLink size={12} />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-dashed border-border bg-card/50 p-4 text-xs text-muted-foreground">
        <p className="mb-1 font-semibold text-foreground">Nota para el desarrollador</p>
        <p>
          Los pagos usan un placeholder. Al migrar a Netlify configurá las env vars{" "}
          <code className="rounded bg-muted px-1">MP_ACCESS_TOKEN</code>,{" "}
          <code className="rounded bg-muted px-1">MP_PLAN_ID_PRO</code> y{" "}
          <code className="rounded bg-muted px-1">MP_PLAN_ID_BUSINESS</code>, y activá el webhook público en{" "}
          <code className="rounded bg-muted px-1">/api/public/mp-webhook</code>.
        </p>
      </div>
    </div>
  );
}
