import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MARGIN_LOGO_WHITE } from "@/lib/margin-brand";
import { Loader2, Mail, Lock, User, Ticket, Building2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresar — MARGIN Training Systems" },
      { name: "description", content: "Ingresá a MARGIN. Los empleados acceden con el código de invitación de su empleador." },
      { property: "og:title", content: "Ingresar — MARGIN" },
      { property: "og:description", content: "Acceso a MARGIN Training Systems." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup-employer" | "signup-employee";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") navigate({ to: "/dashboard" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return;
      }

      // Signup (empleador o empleado)
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
            signup_intent: mode === "signup-employer" ? "employer" : "employee",
            pending_invite_code: mode === "signup-employee" ? inviteCode.trim().toUpperCase() : null,
          },
        },
      });
      if (error) throw error;

      // Si el usuario ya quedó logueado (auto-confirm ON), guardamos el intent para el onboarding.
      if (signUpData.session) {
        window.sessionStorage.setItem(
          "margin_pending_signup",
          JSON.stringify({
            intent: mode === "signup-employer" ? "employer" : "employee",
            code: mode === "signup-employee" ? inviteCode.trim().toUpperCase() : null,
          }),
        );
        toast.success("¡Cuenta creada!");
      } else {
        toast.success("¡Cuenta creada!", { description: "Revisá tu email para confirmar." });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div
        className="absolute inset-0 -z-10 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 20%, oklch(0.72 0.14 295 / 0.4), transparent 50%), radial-gradient(circle at 70% 80%, oklch(0.65 0.28 325 / 0.3), transparent 60%)",
        }}
      />
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <img src={MARGIN_LOGO_WHITE} alt="MARGIN" className="h-10 w-10 rounded-lg" />
          <span className="text-xl font-bold tracking-tight">MARGIN</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-7 shadow-elevated">
          <div className="mb-6 grid grid-cols-3 gap-1 rounded-lg border border-border p-1 text-xs">
            <ModeTab active={mode === "signin"} onClick={() => setMode("signin")} label="Ingresar" />
            <ModeTab active={mode === "signup-employer"} onClick={() => setMode("signup-employer")} label="Empleador" />
            <ModeTab active={mode === "signup-employee"} onClick={() => setMode("signup-employee")} label="Empleado" />
          </div>

          {mode === "signup-employer" && (
            <p className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-card-elevated px-3 py-2.5 text-xs text-muted-foreground">
              <Building2 size={14} className="mt-0.5 shrink-0 text-primary" />
              Registrás tu establecimiento. Después vas a poder invitar a tu equipo y elegir un plan.
            </p>
          )}
          {mode === "signup-employee" && (
            <p className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-card-elevated px-3 py-2.5 text-xs text-muted-foreground">
              <Ticket size={14} className="mt-0.5 shrink-0 text-primary" />
              Necesitás un código de invitación de tu empleador. Sin código no podés entrar como empleado.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode !== "signin" && (
              <IconField icon={<User size={16} />}>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="w-full bg-transparent px-10 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                />
              </IconField>
            )}
            {mode === "signup-employee" && (
              <IconField icon={<Ticket size={16} />}>
                <input
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Código de invitación"
                  className="w-full bg-transparent px-10 py-2.5 text-sm font-mono uppercase tracking-widest outline-none placeholder:text-muted-foreground"
                />
              </IconField>
            )}
            <IconField icon={<Mail size={16} />}>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full bg-transparent px-10 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
              />
            </IconField>
            <IconField icon={<Lock size={16} />}>
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña (mín 6)"
                className="w-full bg-transparent px-10 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
              />
            </IconField>
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-60"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {mode === "signin" ? "Ingresar" : "Crear cuenta"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Al continuar aceptás los términos de uso de MARGIN.
          </p>
        </div>

        <Link to="/" className="mt-6 block text-center text-sm text-muted-foreground hover:text-foreground">
          ← Volver al inicio
        </Link>
      </div>
    </div>
  );
}

function ModeTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md py-2 font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function IconField({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative rounded-lg border border-border bg-input focus-within:border-primary">
      <span className="pointer-events-none absolute top-3 left-3 text-muted-foreground">{icon}</span>
      {children}
    </div>
  );
}
