import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Planes soportados. Precios fijos en ARS (Mercado Pago Argentina liquida en ARS,
 *  así que se definen directamente en pesos en vez de convertir desde USD). El
 *  límite de empleados lo aplica un trigger de Postgres. */
export const PLANS = {
  basic: { label: "Básico", price: 0, maxEmployees: 2, currency: "ARS" },
  pro: { label: "Pro", price: 25000, maxEmployees: 10, currency: "ARS" },
  business: { label: "Business", price: 32000, maxEmployees: 999999, currency: "ARS" },
} as const;
export type PlanKey = keyof typeof PLANS;

function randomCode(length = 8): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I/L
  let out = "";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) out += alphabet[arr[i] % alphabet.length];
  return out;
}

/** Crea (o retorna existente) el establecimiento del usuario autenticado. */
export const createEstablishment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().min(2).max(120),
        // Se acepta el campo por compatibilidad con el formulario de onboarding,
        // pero NUNCA se usa para setear el plan directamente: un plan pago recién
        // se activa cuando el webhook de Mercado Pago confirma el pago (ver
        // /api/public/mp-webhook). Si no, cualquiera podría "elegir" Business gratis.
        plan: z.enum(["basic", "pro", "business"]).default("basic").optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const wantedPaidPlan = data.plan && data.plan !== "basic" ? data.plan : null;

    // ¿Ya tiene uno? Si sí, igual nos aseguramos de que el rol 'owner' exista
    // (self-heal para cuentas afectadas por la falta histórica de política RLS de INSERT).
    const { data: existing } = await supabase
      .from("establishments")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("user_roles")
        .upsert(
          { user_id: userId, role: "owner", establishment_id: existing.id },
          { onConflict: "user_id,role,establishment_id", ignoreDuplicates: true },
        );
      return { establishmentId: existing.id, alreadyExisted: true, wantedPaidPlan };
    }

    // Siempre se crea en 'basic', sin importar qué haya elegido el usuario en el
    // formulario. Un plan pago se cobra y confirma después, desde /employer/billing.
    const { data: est, error } = await supabase
      .from("establishments")
      .insert({ name: data.name, owner_id: userId, plan: "basic" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: "owner",
      establishment_id: est.id,
    });
    if (roleError) throw new Error(roleError.message);

    await supabase.from("profiles").update({ establishment_id: est.id }).eq("id", userId);

    // Devolvemos si quería un plan pago para que el front lo mande directo a pagar,
    // en vez de dejarlo pensando que ya lo tiene activado.
    return { establishmentId: est.id, alreadyExisted: false, wantedPaidPlan };
  });

/**
 * Cambia el plan del establecimiento.
 * Solo permite bajar a 'basic' (downgrade gratuito, sin fricción). Subir a un plan
 * pago NUNCA pasa por acá con el cliente del usuario — eso lo hace el webhook de
 * Mercado Pago (con supabaseAdmin, service role) una vez que el pago está confirmado.
 * Si se necesita un plan pago, hay que ir por /employer/billing → createCheckoutSession.
 */
export const updatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ plan: z.enum(["basic", "pro", "business"]) }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.plan !== "basic") {
      throw new Error(
        "Los planes pagos se activan al confirmarse el pago con Mercado Pago, no se pueden asignar directamente. Usá 'Pagar con MP' desde Suscripción.",
      );
    }
    const { supabase, userId } = context;
    const { data: est, error } = await supabase
      .from("establishments")
      .update({ plan: "basic" })
      .eq("owner_id", userId)
      .select("id, plan, max_employees")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!est) throw new Error("No sos dueño de ningún establecimiento");
    return est;
  });

/** Genera un nuevo código de invitación (uso único por defecto). */
export const generateInvitationCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        positionHint: z.string().max(80).optional(),
        maxUses: z.number().int().min(1).max(50).default(1),
        expiresInDays: z.number().int().min(1).max(365).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: est } = await supabase
      .from("establishments")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!est) throw new Error("Primero creá tu establecimiento");

    const expiresAt = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 86400_000).toISOString()
      : null;

    let attempts = 0;
    while (attempts < 5) {
      const code = randomCode(8);
      const { data: row, error } = await supabase
        .from("invitation_codes")
        .insert({
          code,
          establishment_id: est.id,
          created_by: userId,
          position_hint: data.positionHint ?? null,
          max_uses: data.maxUses,
          expires_at: expiresAt,
        })
        .select("id, code")
        .maybeSingle();
      if (!error && row) return row;
      attempts++;
    }
    throw new Error("No pude generar un código único, reintentá");
  });

/** Lista códigos de invitación del establecimiento. */
export const listInvitationCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: est } = await supabase
      .from("establishments")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!est) return [];
    const { data, error } = await supabase
      .from("invitation_codes")
      .select("id, code, position_hint, max_uses, uses, expires_at, created_at")
      .eq("establishment_id", est.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Elimina (revoca) un código. */
export const revokeInvitationCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("invitation_codes")
      .delete()
      .eq("id", data.id)
      .eq("created_by", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Empleados del establecimiento con métricas de progreso. */
export const listEmployees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: est } = await supabase
      .from("establishments")
      .select("id, name, plan, max_employees, subscription_status")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!est) return { establishment: null, employees: [] as Employee[] };

    const { data: employees } = await supabase
      .from("profiles")
      .select("id, full_name, position, total_xp, level, margincoins, streak_days, created_at")
      .eq("establishment_id", est.id);

    return {
      establishment: est,
      employees: (employees ?? []).filter((p) => p.id !== userId) as Employee[],
    };
  });

export type Employee = {
  id: string;
  full_name: string | null;
  position: string | null;
  total_xp: number;
  level: number;
  margincoins: number;
  streak_days: number;
  created_at: string;
};

/** Quita a un empleado del establecimiento. */
export const removeEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: est } = await supabase
      .from("establishments")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!est) throw new Error("Sin establecimiento");
    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("establishment_id", est.id);
    await supabase
      .from("profiles")
      .update({ establishment_id: null })
      .eq("id", data.userId)
      .eq("establishment_id", est.id);
    return { ok: true };
  });
