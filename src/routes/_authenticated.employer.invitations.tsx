import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  generateInvitationCode,
  listInvitationCodes,
  revokeInvitationCode,
} from "@/lib/margin-employer.functions";
import { Copy, Trash2, Ticket, Loader2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/employer/invitations")({
  head: () => ({
    meta: [
      { title: "Invitaciones — MARGIN Empleador" },
      { name: "description", content: "Generá y gestioná códigos de invitación para tu equipo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvitationsPage,
});

type Code = Awaited<ReturnType<typeof listInvitationCodes>>[number];

function InvitationsPage() {
  const list = useServerFn(listInvitationCodes);
  const create = useServerFn(generateInvitationCode);
  const revoke = useServerFn(revokeInvitationCode);
  const [codes, setCodes] = useState<Code[] | null>(null);
  const [positionHint, setPositionHint] = useState("");
  const [maxUses, setMaxUses] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState<number | "">(30);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const r = await list();
    setCodes(r);
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await create({
        data: {
          positionHint: positionHint || undefined,
          maxUses,
          expiresInDays: expiresInDays === "" ? undefined : expiresInDays,
        },
      });
      toast.success("Código creado");
      setPositionHint("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function onRevoke(id: string) {
    await revoke({ data: { id } });
    await refresh();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Invitaciones</h1>
        <p className="text-sm text-muted-foreground">
          Compartí estos códigos con tus empleados. Los usan al crear su cuenta.
        </p>
      </header>

      <form
        onSubmit={onCreate}
        className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[1fr_120px_120px_auto]"
      >
        <input
          value={positionHint}
          onChange={(e) => setPositionHint(e.target.value)}
          placeholder="Puesto (ej: Mozo, Bartender) — opcional"
          className="rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <input
          type="number"
          min={1}
          max={50}
          value={maxUses}
          onChange={(e) => setMaxUses(Math.max(1, Number(e.target.value)))}
          className="rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
          title="Máx. usos"
        />
        <input
          type="number"
          min={1}
          max={365}
          value={expiresInDays}
          onChange={(e) => setExpiresInDays(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder="Días"
          className="rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
          title="Vence en (días)"
        />
        <button
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Generar
        </button>
      </form>

      {!codes ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : codes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Ticket className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-semibold">Sin códigos activos</p>
          <p className="text-sm text-muted-foreground">Generá uno para invitar a tu primer empleado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {codes.map((c) => (
            <CodeRow key={c.id} code={c} onRevoke={() => onRevoke(c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function CodeRow({ code, onRevoke }: { code: Code; onRevoke: () => void }) {
  const expired = code.expires_at ? new Date(code.expires_at) < new Date() : false;
  const spent = code.uses >= code.max_uses;
  const disabled = expired || spent;

  async function copy() {
    await navigator.clipboard.writeText(code.code);
    toast.success("Código copiado");
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <button
        onClick={copy}
        className={`font-mono text-lg tracking-widest ${disabled ? "text-muted-foreground line-through" : "text-primary"}`}
      >
        {code.code}
      </button>
      <div className="flex-1 text-xs text-muted-foreground">
        {code.position_hint && <span className="mr-3">Puesto: {code.position_hint}</span>}
        <span className="mr-3">
          Usos: {code.uses}/{code.max_uses}
        </span>
        {code.expires_at && (
          <span className="mr-3">
            Vence: {new Date(code.expires_at).toLocaleDateString("es-AR")}
          </span>
        )}
        {expired && <span className="text-destructive">Expirado</span>}
        {spent && !expired && <span className="text-destructive">Agotado</span>}
      </div>
      <button
        onClick={copy}
        className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <Copy size={12} /> Copiar
      </button>
      <button
        onClick={onRevoke}
        className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-destructive hover:text-destructive"
      >
        <Trash2 size={12} /> Revocar
      </button>
    </div>
  );
}
