import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listEmployees } from "@/lib/margin-employer.functions";
import { Users, Ticket, CreditCard, TrendingUp, Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/employer/")({
  head: () => ({
    meta: [
      { title: "Panel del empleador — MARGIN" },
      { name: "description", content: "Gestioná tu equipo, invitaciones y suscripción de MARGIN." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmployerHome,
});

const PLAN_LABEL: Record<string, string> = { basic: "Básico", pro: "Pro", business: "Business" };

function EmployerHome() {
  const load = useServerFn(listEmployees);
  const [data, setData] = useState<Awaited<ReturnType<typeof load>> | null>(null);

  useEffect(() => {
    load().then(setData);
  }, [load]);

  if (!data || !data.establishment) {
    return <div className="text-muted-foreground">Cargando…</div>;
  }

  const est = data.establishment;
  const seatsUsed = data.employees.length;
  const totalXp = data.employees.reduce((sum, e) => sum + e.total_xp, 0);
  const avgLevel = seatsUsed ? (data.employees.reduce((s, e) => s + e.level, 0) / seatsUsed).toFixed(1) : "0";

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Building2 size={12} /> Establecimiento
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{est.name}</h1>
          <p className="text-sm text-muted-foreground">
            Plan <span className="font-semibold text-foreground">{PLAN_LABEL[est.plan]}</span> ·{" "}
            {seatsUsed} / {est.max_employees === 999999 ? "∞" : est.max_employees} empleados
          </p>
        </div>
        <Link
          to="/employer/billing"
          className="rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          Gestionar plan
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Users size={18} />} label="Empleados" value={seatsUsed.toString()} />
        <StatCard icon={<TrendingUp size={18} />} label="XP total del equipo" value={totalXp.toLocaleString("es-AR")} />
        <StatCard icon={<TrendingUp size={18} />} label="Nivel promedio" value={avgLevel} />
        <StatCard icon={<CreditCard size={18} />} label="Estado suscripción" value={est.subscription_status} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ShortcutCard
          to="/employer/employees"
          icon={<Users size={20} />}
          title="Equipo"
          desc="Ver progreso, quitar empleados."
        />
        <ShortcutCard
          to="/employer/invitations"
          icon={<Ticket size={20} />}
          title="Invitaciones"
          desc="Generá códigos para sumar empleados."
        />
        <ShortcutCard
          to="/employer/billing"
          icon={<CreditCard size={20} />}
          title="Suscripción"
          desc="Pagar con Mercado Pago, cambiar de plan."
        />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-xs uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function ShortcutCard({
  to,
  icon,
  title,
  desc,
}: {
  to: "/employer/employees" | "/employer/invitations" | "/employer/billing";
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/60"
    >
      <div className="mb-3 inline-flex rounded-lg bg-primary-glow p-2 text-primary">{icon}</div>
      <p className="mb-1 font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </Link>
  );
}
