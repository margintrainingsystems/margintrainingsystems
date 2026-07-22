import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { MARGIN_LOGO_WHITE } from "@/lib/margin-brand";
import { Loader2, Mail, Lock, User } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresar — MARGIN Training Systems" },
      { name: "description", content: "Ingresá a MARGIN para acceder a tu capacitación gastronómica." },
      { property: "og:title", content: "Ingresar — MARGIN" },
      { property: "og:description", content: "Acceso a MARGIN Training Systems." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // If already signed in, bounce to dashboard.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") navigate({ to: "/dashboard" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("No se pudo iniciar sesión con Google", { description: result.error.message });
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("¡Cuenta creada!", { description: "Revisá tu email para confirmar." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
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
          <div className="mb-6 flex rounded-lg border border-border p-1">
            <button
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === "signin" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Ingresar
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <button
            onClick={handleGoogle}
            disabled={busy}
            className="mb-4 flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-card-elevated px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">o con email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            {mode === "signup" && (
              <div className="relative">
                <User size={16} className="pointer-events-none absolute top-3 left-3 text-muted-foreground" />
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full rounded-lg border border-border bg-input px-10 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
                />
              </div>
            )}
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute top-3 left-3 text-muted-foreground" />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-lg border border-border bg-input px-10 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute top-3 left-3 text-muted-foreground" />
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña (mín 6)"
                className="w-full rounded-lg border border-border bg-input px-10 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-60"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {mode === "signup" ? "Crear cuenta" : "Ingresar"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Al continuar aceptás los términos de uso de MARGIN.
          </p>
        </div>

        <Link
          to="/"
          className="mt-6 block text-center text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver al inicio
        </Link>
      </div>
    </div>
  );
}
