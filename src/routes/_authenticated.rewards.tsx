import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { redeemReward } from "@/lib/margin-progress.functions";
import { Coins, Gift, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/rewards")({
  head: () => ({
    meta: [
      { title: "Recompensas — MARGIN" },
      { name: "description", content: "Canjeá tus margincoins por beneficios reales." },
      { property: "og:title", content: "Recompensas — MARGIN" },
      { property: "og:description", content: "Canjeá margincoins por beneficios." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RewardsPage,
});

type Reward = {
  id: string;
  title: string;
  description: string | null;
  cost_coins: number;
  category: string;
  stock: number | null;
};

function RewardsPage() {
  const router = useRouter();
  const redeemFn = useServerFn(redeemReward);
  const [session, setSession] = useState<Session | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [coins, setCoins] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  useEffect(() => {
    supabase
      .from("rewards")
      .select("id, title, description, cost_coins, category, stock")
      .eq("is_active", true)
      .order("cost_coins", { ascending: true })
      .then(({ data }) => setRewards(data ?? []));
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("profiles")
      .select("margincoins")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setCoins(data?.margincoins ?? 0));
  }, [session]);

  async function handleRedeem(r: Reward) {
    if (coins < r.cost_coins) {
      toast.error("No tenés suficientes margincoins");
      return;
    }
    setBusyId(r.id);
    try {
      await redeemFn({ data: { rewardId: r.id } });
      toast.success(`¡Canjeaste "${r.title}"!`);
      setCoins((c) => c - r.cost_coins);
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al canjear");
    } finally {
      setBusyId(null);
    }
  }

  const categoryLabel: Record<string, string> = {
    internal: "Interno",
    badge: "Insignia",
    partner_discount: "Descuento partner",
    premium_content: "Contenido premium",
    physical: "Físico",
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recompensas</h1>
          <p className="mt-2 text-muted-foreground">
            Canjeá tus margincoins por beneficios reales.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-gradient-coin px-4 py-2 font-bold text-coin-foreground shadow-glow">
          <Coins size={16} />
          {coins.toLocaleString("es-AR")} disponibles
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rewards.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Todavía no hay recompensas disponibles.
          </p>
        )}
        {rewards.map((r) => {
          const canAfford = coins >= r.cost_coins;
          return (
            <div
              key={r.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-glow text-primary">
                  <Gift size={18} />
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {categoryLabel[r.category] ?? r.category}
                </span>
              </div>
              <h3 className="text-base font-semibold">{r.title}</h3>
              {r.description && (
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{r.description}</p>
              )}
              <div className="mt-4 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 font-bold text-coin">
                  <Coins size={14} /> {r.cost_coins.toLocaleString("es-AR")}
                </span>
                <button
                  onClick={() => handleRedeem(r)}
                  disabled={!canAfford || busyId === r.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.04] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busyId === r.id && <Loader2 size={13} className="animate-spin" />}
                  {canAfford ? "Canjear" : "Faltan coins"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
