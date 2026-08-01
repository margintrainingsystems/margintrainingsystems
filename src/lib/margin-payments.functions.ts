import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLANS } from "@/lib/margin-employer.functions";

/**
 * =============================================================================
 * MERCADO PAGO — precios fijos en ARS
 * =============================================================================
 * Precios definidos directamente en pesos en PLANS (margin-employer.functions.ts):
 * Pro ARS 25.000/mes, Business ARS 32.000/mes.
 *
 * external_reference se arma como "<establishmentId>::<plan>" para que el
 * webhook (api.public.mp-webhook.ts) sepa a qué establecimiento y a qué plan
 * corresponde el pago sin tener que guardar estado intermedio en la base.
 *
 * SWAP ZONE al migrar a Netlify:
 *   - MP_ACCESS_TOKEN → access token real (producción) de Mercado Pago
 *   - MP_WEBHOOK_SECRET → clave secreta del webhook (dashboard de MP)
 *   - Configurar la URL pública del webhook en el dashboard de Mercado Pago
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

    const res = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: `MARGIN — Plan ${PLANS[data.plan].label}`,
        // "<establishmentId>::<plan>" — el webhook lo separa para saber qué activar.
        external_reference: `${est.id}::${data.plan}`,
        payer_email: payerEmail,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: arsAmount,
          currency_id: "ARS",
        },
        back_url: "https://margints.netlify.app/employer/billing",
        status: "pending",
      }),
    });
    const json = (await res.json()) as { id?: string; init_point?: string; message?: string };
    if (!res.ok || !json.init_point) {
      throw new Error(json.message ?? "No se pudo crear la suscripción en Mercado Pago");
    }

    // Guardamos el preapproval_id ya mismo (no esperamos al webhook para esto),
    // así queda trazado incluso si el pago nunca se confirma.
    if (json.id) {
      await supabase.from("establishments").update({ mp_preapproval_id: json.id }).eq("id", est.id);
    }

    return { initPoint: json.init_point, mode: "live" as const, arsAmount };
  });
