import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * =============================================================================
 * MERCADO PAGO WEBHOOK
 * =============================================================================
 * Endpoint público al que MP envía notificaciones de preapproval (suscripciones).
 *
 * Verificación de firma según el esquema real de MP:
 *   header x-signature: "ts=<timestamp>,v1=<hash>"
 *   header x-request-id: "<uuid>"
 *   query param ?data.id=<id>  (viene en la URL, no en el body)
 *   manifest = "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 *   hash esperado = HMAC-SHA256(manifest, MP_WEBHOOK_SECRET) en hex
 *
 * Config necesaria (Netlify env vars):
 *   MP_ACCESS_TOKEN   → para poder consultar el preapproval completo por su id
 *   MP_WEBHOOK_SECRET → clave secreta que te da el dashboard de MP al configurar
 *                        la URL del webhook (Tus integraciones → Webhooks)
 * =============================================================================
 */
export const Route = createFileRoute("/api/public/mp-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const dataId = url.searchParams.get("data.id");
        const type = url.searchParams.get("type");
        const signatureHeader = request.headers.get("x-signature");
        const requestId = request.headers.get("x-request-id");
        const secret = process.env.MP_WEBHOOK_SECRET;

        if (secret) {
          if (!signatureHeader || !requestId || !dataId) {
            return new Response("Missing signature headers", { status: 401 });
          }
          const parts = Object.fromEntries(
            signatureHeader.split(",").map((p) => p.trim().split("=") as [string, string]),
          );
          const ts = parts.ts;
          const v1 = parts.v1;
          if (!ts || !v1) return new Response("Malformed signature", { status: 401 });

          const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
          const expected = createHmac("sha256", secret).update(manifest).digest("hex");
          try {
            const a = Buffer.from(v1);
            const b = Buffer.from(expected);
            if (a.length !== b.length || !timingSafeEqual(a, b)) {
              return new Response("Bad signature", { status: 401 });
            }
          } catch {
            return new Response("Bad signature", { status: 401 });
          }
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Log crudo del evento, pase lo que pase después.
        await supabaseAdmin.from("payment_events").insert({
          provider: "mercadopago",
          event_type: type ?? "unknown",
          external_id: dataId,
          payload: { type, dataId } as never,
        });

        // Solo nos importan las notificaciones de preapproval (suscripciones).
        if (type !== "subscription_preapproval" && type !== "preapproval") {
          return new Response("ok");
        }
        if (!dataId) return new Response("ok");

        const accessToken = process.env.MP_ACCESS_TOKEN;
        if (!accessToken) return new Response("ok"); // sin token no podemos confirmar nada

        // La notificación solo trae el id — hay que pedirle el detalle a MP.
        const detailRes = await fetch(`https://api.mercadopago.com/preapproval/${dataId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!detailRes.ok) return new Response("ok");
        const preapproval = (await detailRes.json()) as {
          status?: string; // pending | authorized | paused | cancelled
          external_reference?: string; // "<establishmentId>::<plan>"
          id?: string;
        };

        const [establishmentId, plan] = (preapproval.external_reference ?? "").split("::");
        if (!establishmentId || !["pro", "business"].includes(plan)) return new Response("ok");

        if (preapproval.status === "authorized") {
          await supabaseAdmin
            .from("establishments")
            .update({
              plan,
              subscription_status: "active",
              mp_preapproval_id: preapproval.id ?? dataId,
              subscription_expires_at: null,
            })
            .eq("id", establishmentId);
        } else if (preapproval.status === "paused") {
          await supabaseAdmin
            .from("establishments")
            .update({ subscription_status: "past_due" })
            .eq("id", establishmentId);
        } else if (preapproval.status === "cancelled") {
          await supabaseAdmin
            .from("establishments")
            .update({ plan: "basic", subscription_status: "cancelled" })
            .eq("id", establishmentId);
        }

        return new Response("ok");
      },
    },
  },
});
