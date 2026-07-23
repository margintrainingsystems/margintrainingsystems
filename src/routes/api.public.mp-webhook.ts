import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * =============================================================================
 * MERCADO PAGO WEBHOOK — SWAP ZONE (Netlify)
 * =============================================================================
 * Endpoint público al que MP envía notificaciones (preapproval, payment, etc.).
 * Al migrar a Netlify:
 *   - Setear MP_WEBHOOK_SECRET en env vars
 *   - Configurar la URL pública en el dashboard de Mercado Pago
 *
 * Actualiza:
 *   establishments.subscription_status según el evento
 *   establishments.plan cuando hay un preapproval nuevo
 *   inserta un registro en payment_events
 * =============================================================================
 */
export const Route = createFileRoute("/api/public/mp-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const signature = request.headers.get("x-signature");
        const secret = process.env.MP_WEBHOOK_SECRET;

        // Verificación de firma (opcional hasta que se configure el secret real).
        if (secret) {
          if (!signature) return new Response("Missing signature", { status: 401 });
          const expected = createHmac("sha256", secret).update(body).digest("hex");
          try {
            const sig = Buffer.from(signature);
            const exp = Buffer.from(expected);
            if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
              return new Response("Bad signature", { status: 401 });
            }
          } catch {
            return new Response("Bad signature", { status: 401 });
          }
        }

        let payload: unknown = {};
        try {
          payload = JSON.parse(body);
        } catch {
          /* MP a veces manda vacío */
        }

        // Log del evento (usa service_role para bypassear RLS al insertar).
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const event = payload as {
          type?: string;
          action?: string;
          data?: { id?: string };
          external_reference?: string;
        };
        await supabaseAdmin.from("payment_events").insert({
          provider: "mercadopago",
          event_type: event.type ?? event.action ?? "unknown",
          external_id: event.data?.id ?? null,
          establishment_id: event.external_reference ?? null,
          payload: payload as never,
        });

        // TODO al migrar: mapear event.type → actualizar subscription_status / plan.

        return new Response("ok");
      },
    },
  },
});
