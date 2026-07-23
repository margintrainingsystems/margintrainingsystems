import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
