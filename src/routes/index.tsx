import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  MessageSquare,
  Brain,
  Gamepad2,
  Trophy,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { MARGIN_LOGO_WHITE } from "@/lib/margin-brand";
import { MargincoinIcon } from "@/lib/margin-coin";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MARGIN: Training Systems — Capacitación gastronómica que sí funciona" },
      {
        name: "description",
        content:
          "Plataforma de capacitación para equipos de restaurantes, cafés y bares. Cursos, simuladores con IA, juegos y gamificación con margincoins.",
      },
      { property: "og:title", content: "MARGIN: Training Systems" },
      {
        property: "og:description",
        content:
          "Capacitá a tu equipo gastronómico con módulos interactivos, simuladores de IA y una gamificación que enganchá de verdad.",
      },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    icon: Brain,
    title: "Capacitación estructurada",
    desc: "Cursos, talleres y módulos diseñados para cada puesto de tu local.",
  },
  {
    icon: MessageSquare,
    title: "Simulador de servicio con IA",
    desc: "Tu equipo practica con clientes ficticios (enojado, amable, apurado) en un chat dinámico.",
  },
  {
    icon: Sparkles,
    title: "Asistente de entrevistas",
    desc: "Grabá, transcribí y analizá cada entrevista con IA. Exportable a PDF.",
  },
  {
    icon: Trophy,
    title: "Analizador de perfiles",
    desc: "Compará CVs y perfiles buscados con análisis de compatibilidad automático.",
  },
  {
    icon: Gamepad2,
    title: "Juegos por puesto",
    desc: "Consignas dinámicas generadas por IA, distintas cada vez que jugás.",
  },
  {
    icon: MargincoinIcon,
    title: "Margincoins",
    desc: "Sistema de recompensas que motiva de verdad. Canjeables por beneficios reales.",
  },
];

const benefits = [
  "Empleados capacitados en menos de 15 min al día",
  "Métricas claras de progreso por persona y por puesto",
  "Reduce la curva de onboarding a la mitad",
  "Contenido gastronómico real — no genérico",
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={MARGIN_LOGO_WHITE} alt="MARGIN" className="h-9 w-9 rounded-lg" />
            <span className="text-lg font-bold tracking-tight">MARGIN</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              Ingresar
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03]"
            >
              Empezar gratis <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden px-4 pt-16 pb-24 sm:pt-24">
        <div
          className="absolute inset-0 -z-10 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 10%, oklch(0.72 0.14 295 / 0.4), transparent 50%), radial-gradient(circle at 80% 40%, oklch(0.65 0.28 325 / 0.3), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles size={14} className="text-primary" />
            Capacitación gastronómica con IA
          </div>
          <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            Tu equipo gastronómico,{" "}
            <span className="text-gradient-hero">capacitado en serio.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Cursos, simuladores con IA, juegos y una gamificación que enganchan de verdad.
            MARGIN convierte capacitar a tu personal en algo que quieren hacer, no algo
            obligado.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03]"
            >
              Empezar gratis <ChevronRight size={18} />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-6 py-3 text-base font-medium text-foreground backdrop-blur transition-colors hover:bg-card"
            >
              Ver qué incluye
            </a>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Todo lo que necesitás para que tu equipo brille
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Seis módulos pensados para restaurantes, cafés y bares argentinos.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:border-primary/40 hover:shadow-elevated"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-glow text-primary transition-transform group-hover:scale-110">
                  <f.icon size={22} />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl rounded-3xl border border-border bg-card p-10 shadow-elevated sm:p-14">
          <h2 className="text-3xl font-bold tracking-tight">
            ¿Por qué elegir MARGIN?
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-success" />
                <span className="text-foreground">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-hero p-12 text-center shadow-glow sm:p-16">
          <h2 className="text-3xl font-black text-primary-foreground sm:text-4xl">
            Empezá a capacitar mejor hoy
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
            Creá tu cuenta gratis y explorá los primeros módulos en menos de 2 minutos.
          </p>
          <Link
            to="/auth"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-background px-6 py-3 text-base font-semibold text-foreground shadow-elevated transition-transform hover:scale-[1.03]"
          >
            Crear cuenta <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/50 px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={MARGIN_LOGO_WHITE} alt="MARGIN" className="h-6 w-6 rounded" />
            <span>© {new Date().getFullYear()} MARGIN Training Systems</span>
          </div>
          <div className="flex gap-5">
            <a href="mailto:hola@margints.com" className="hover:text-foreground">
              Contacto
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
