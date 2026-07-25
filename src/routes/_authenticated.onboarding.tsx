import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Building2, Ticket, Loader2 } from "lucide-react";
import { createEstablishment } from "@/lib/margin-employer.functions";
import { redeemInvitationCode } from "@/lib/margin-invitation.functions";
import { MARGIN_LOGO_WHITE } from "@/lib/margin-brand";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Elegí cómo empezar — MARGIN" },
      { name: "description", content: "Registrá tu establecimiento o entrá con un código de invitación." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const createEst = useServerFn(createEstablishment);
  const redeem = useServerFn(redeemInvitationCode);

  const [intent, setIntent] = useState<"employer" | "employee">("employer");
  const [name, setName] = useState("");
  const [plan, setPlan] = useState<"basic" | "pro" | "business">("basic");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  // Hidratar intent desde el signup si vino de auth.tsx
  useEffect(() => {
    const raw = window.sessionStorage.getItem("margin_pending_signup");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { intent: "employer" | "employee"; code: string | null };
      setIntent(parsed.intent);
      if (parsed.code) setCode(parsed.code);
      window.sessionStorage.removeItem("margin_pending_signup");
    } catch {
      /* noop */
    }
  }, []);

  async function submitEmployer(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createEst({ data: { name, plan } });
      toast.success("¡Establecimiento creado!");
      navigate({ to: "/employer" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function submitEmployee(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await redeem({ data: { code } });
      toast.success("¡Bienvenido al equipo!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Código inválido");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2.5">
        <img src={MARGIN_LOGO_WHITE} alt="MARGIN" className="h-10 w-10 rounded-lg" />
        <span className="text-xl font-bold tracking-tight">MARGIN</span>
      </div>

      <h1 className="mb-2 text-center text-3xl font-bold tracking-tight">Un último paso</h1>
      <p className="mb-8 text-center text-muted-foreground">Elegí cómo vas a usar MARGIN.</p>

      <div className="mb-6 grid w-full grid-cols-2 gap-2 rounded-xl border border-border p-1">
        <IntentTab active={intent === "employer"} onClick={() => setIntent("employer")} icon={<Building2 size={16} />} label="Soy empleador" />
        <IntentTab active={intent === "employee"} onClick={() => setIntent("employee")} icon={<Ticket size={16} />} label="Soy empleado" />
      </div>

      {intent === "employer" ? (
        <form onSubmit={submitEmployer} className="w-full space-y-4 rounded-2xl border border-border bg-card p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Nombre del establecimiento</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Bodegón Central"
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Plan inicial</label>
            <div className="grid gap-2 sm:grid-cols-3">
              <PlanRadio value="basic" current={plan} setPlan={setPlan} label="Básico" price="Gratis" seats="Hasta 2" />
              <PlanRadio value="pro" current={plan} setPlan={setPlan} label="Pro" price="ARS 25.000/mes" seats="Hasta 10" />
              <PlanRadio value="business" current={plan} setPlan={setPlan} label="Business" price="ARS 32.000/mes" seats="Sin límite" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Empezás en Básico gratis. Podés cambiar de plan y pagar con Mercado Pago desde el panel.
            </p>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            Crear mi establecimiento
          </button>
        </form>
      ) : (
        <form onSubmit={submitEmployee} className="w-full space-y-4 rounded-2xl border border-border bg-card p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Código de invitación</label>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD1234"
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-center font-mono text-lg uppercase tracking-widest outline-none focus:border-primary"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Te lo tiene que dar tu empleador. Sin código no podés continuar como empleado.
            </p>
          </div>
          <button
            type="submit"
            disabled={busy || code.length < 4}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            Sumarme al equipo
          </button>
        </form>
      )}
    </div>
  );
}

function IntentTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function PlanRadio({
  value,
  current,
  setPlan,
  label,
  price,
  seats,
}: {
  value: "basic" | "pro" | "business";
  current: string;
  setPlan: (p: "basic" | "pro" | "business") => void;
  label: string;
  price: string;
  seats: string;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => setPlan(value)}
      className={`rounded-lg border p-3 text-left transition-colors ${
        active ? "border-primary bg-primary-glow" : "border-border hover:border-primary/60"
      }`}
    >
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground">{price}</p>
      <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{seats}</p>
    </button>
  );
}
