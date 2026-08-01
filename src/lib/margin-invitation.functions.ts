import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Valida un código de invitación SIN consumirlo y SIN requerir sesión.
 * Se usa antes de crear la cuenta en el signup de empleado, para no crear
 * un usuario huérfano cuando el código es inválido. check_invitation_code
 * es SECURITY DEFINER así que no hace falta el service role para llamarla,
 * pero usamos supabaseAdmin igual porque ya está disponible server-side.
 */
export const checkInvitationCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ code: z.string().min(1).max(64) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.trim().toUpperCase();
    const { data: valid, error } = await supabaseAdmin.rpc("check_invitation_code", { _code: code });
    if (error) return { valid: false };
    return { valid: Boolean(valid) };
  });

/**
 * Canjea un código de invitación: asocia al usuario autenticado como empleado
 * del establecimiento. Valida vigencia, usos y cupo del plan (en Postgres).
 */
export const redeemInvitationCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ code: z.string().min(3).max(64) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const code = data.code.trim().toUpperCase();
    const { data: row, error } = await supabase.rpc("redeem_invitation_code", { _code: code });
    if (error) throw new Error(error.message);
    return row?.[0] ?? null;
  });
