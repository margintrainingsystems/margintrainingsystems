import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLANS } from "@/lib/margin-employer.functions";

/**
 * =============================================================================
 * MERCADO PAGO — precios fijos en ARS
 * =============================================================================
 * Precios definidos directamente en pesos en PLANS (margin-employer.functions.ts):
 * Pro ARS 25.000/mes, Business ARS 32.000/mes. Si en algún momento hay que
 * actualizarlos por inflación/devaluación, se cambia ahí — Mercado Pago no
 * reajusta solo el monto de una suscripción recurrente ya creada.
 *
 * SWAP ZONE al migrar a Netlify:
 *   - MP_ACCESS_TOKEN → access token real de Mercado Pago
 *   - Configurar el webhook público en /api/public/mp-webhook
 * =============================================================================
 */

const MP_BASE = "https://www.mercadopago.com.ar/subscriptions/checkout";

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ plan: z.enum(["pro", "business"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: est } = await supabase
      .from("establishments")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!est) throw new Error("Sin establecimiento");

    const { data: authUser } = await supabase.auth.getUser();
    const payerEmail = authUser?.user?.email;
    const arsAmount = PLANS[data.plan].price;

    const accessToken = process.env.MP_ACCESS_TOKEN;

    if (!accessToken) {
      return {
        initPoint: `${MP_BASE}?preapproval_plan_id=PLACEHOLDER_${data.plan}`,
        mode: "placeholder" as const,
        arsAmount,
      };
    }

    // Creación real de la suscripción recurrente en Mercado Pago.
    const res = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: `MARGIN — Plan ${PLANS[data.plan].label}`,
        external_reference: est.id,
        payer_email: payerEmail,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: arsAmount,
          currency_id: "ARS",
        },
        back_url: "https://margin-training-systems.netlify.app/employer/billing",
        status: "pending",
      }),
    });
    const json = (await res.json()) as { init_point?: string; message?: string };
    if (!res.ok || !json.init_point) {
      throw new Error(json.message ?? "No se pudo crear la suscripción en Mercado Pago");
    }

    return { initPoint: json.init_point, mode: "live" as const, arsAmount };
  });
