import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listEmployees, removeEmployee, type Employee } from "@/lib/margin-employer.functions";
import { UserMinus, Loader2 } from "lucide-react";
import { MargincoinIcon } from "@/lib/margin-coin";

export const Route = createFileRoute("/_authenticated/employer/employees")({
  head: () => ({
    meta: [
      { title: "Equipo — MARGIN Empleador" },
      { name: "description", content: "Progreso individual de cada empleado de tu establecimiento." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const load = useServerFn(listEmployees);
  const remove = useServerFn(removeEmployee);
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  async function refresh() {
    const r = await load();
    setEmployees(r.employees);
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onRemove(id: string) {
    if (!confirm("¿Quitar a este empleado del establecimiento?")) return;
    setRemoving(id);
    try {
      await remove({ data: { userId: id } });
      toast.success("Empleado removido");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Equipo</h1>
        <p className="text-sm text-muted-foreground">Progreso y actividad de cada empleado.</p>
      </header>

      {!employees ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : employees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="mb-1 font-semibold">Todavía no invitaste a nadie.</p>
          <p className="text-sm text-muted-foreground">Andá a Invitaciones para generar códigos.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-card-elevated text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Puesto</th>
                <th className="px-4 py-3">Nivel</th>
                <th className="px-4 py-3">XP</th>
                <th className="px-4 py-3">Coins</th>
                <th className="px-4 py-3">Racha</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium">{e.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.position ?? "—"}</td>
                  <td className="px-4 py-3">Lvl {e.level}</td>
                  <td className="px-4 py-3">{e.total_xp.toLocaleString("es-AR")}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1">
                      <MargincoinIcon size={14} />
                      {e.margincoins.toLocaleString("es-AR")}
                    </span>
                  </td>
                  <td className="px-4 py-3">🔥 {e.streak_days}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onRemove(e.id)}
                      disabled={removing === e.id}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-destructive hover:text-destructive disabled:opacity-50"
                    >
                      {removing === e.id ? <Loader2 size={12} className="animate-spin" /> : <UserMinus size={12} />}
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
