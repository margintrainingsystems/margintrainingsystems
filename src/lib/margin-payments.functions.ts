import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * =============================================================================
 * MERCADO PAGO — SWAP ZONE
 * =============================================================================
 * Placeholders para la migración a Netlify. Reemplazar:
 *   - MP_ACCESS_TOKEN         → tu access token de Mercado Pago
 *   - MP_PLAN_ID_PRO          → id del preapproval_plan Pro
 *   - MP_PLAN_ID_BUSINESS     → id del preapproval_plan Business
 *
 * En producción real:
 *   - Este endpoint crea una preferencia/preapproval en MP y devuelve el init_point.
 *   - Un webhook público en /api/public/mp-webhook actualiza establishments.plan
 *     y establishments.subscription_status según el evento recibido.
 * =============================================================================
 */
const MP_PLAN_IDS: Record<"pro" | "business", string> = {
  pro: process.env.MP_PLAN_ID_PRO ?? "TU_PLAN_ID_PRO",
  business: process.env.MP_PLAN_ID_BUSINESS ?? "TU_PLAN_ID_BUSINESS",
};
const MP_BASE = "https://www.mercadopago.com.ar/subscriptions/checkout";

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ plan: z.enum(["pro", "business"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: est } = await supabase
      .from("establishments")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!est) throw new Error("Sin establecimiento");

    const planId = MP_PLAN_IDS[data.plan];
    const accessToken = process.env.MP_ACCESS_TOKEN;

    // Cuando exista MP_ACCESS_TOKEN real, disparar creación de preapproval acá.
    // Por ahora devolvemos la URL "test" con el plan_id placeholder para poder
    // demostrar el flujo completo en la app.
    if (!accessToken) {
      const initPoint = `${MP_BASE}?preapproval_plan_id=${planId}`;
      return { initPoint, mode: "placeholder" as const };
    }

    // Ejemplo REAL (dejarlo pronto para Netlify):
    // const res = await fetch("https://api.mercadopago.com/preapproval", { ... })
    // const json = await res.json();
    // return { initPoint: json.init_point, mode: "live" as const };

    return { initPoint: `${MP_BASE}?preapproval_plan_id=${planId}`, mode: "placeholder" as const };
  });
