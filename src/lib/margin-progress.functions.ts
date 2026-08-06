import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Marca una lección como completada.
 *
 * Modelo de negocio: XP y nivel se otorgan al instante por cada lección
 * (como antes). Los margincoins de cada lección quedan RETENIDOS hasta que
 * el usuario completa el 100% de las lecciones del curso al que pertenece
 * esa lección — recién ahí se acreditan todos juntos, de una sola vez, al
 * balance real (profiles.margincoins).
 *
 * Antes: esta función calculaba y escribía todo en JS con múltiples
 * llamadas HTTP separadas sin lock (mismo patrón de riesgo de condición de
 * carrera que tenía redeemReward). Ahora delega TODO el cálculo y la
 * escritura a la función atómica `complete_lesson` en Postgres, que bloquea
 * la fila de `profiles` del usuario (`FOR UPDATE`) antes de leer/escribir,
 * serializando completions concurrentes.
 */
export const completeLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        lessonId: z.string().uuid(),
        score: z.number().min(0).max(100).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: result, error } = await supabase.rpc("complete_lesson", {
      p_lesson_id: data.lessonId,
      p_score: data.score ?? null,
    });

    if (error) {
      throw new Error(error.message);
    }

    // La función retorna TABLE(...), supabase-js la devuelve como array de 1 fila.
    const row = Array.isArray(result) ? result[0] : result;

    return {
      alreadyCompleted: row?.already_completed ?? false,
      xpAwarded: row?.xp_awarded ?? 0,
      courseCompleted: row?.course_completed ?? false,
      // coinsAwarded solo es > 0 si esta lección completó el curso entero:
      // ahí es cuando se acredita todo lo retenido de una sola vez.
      coinsAwarded: row?.coins_awarded ?? 0,
      levelUpBonus: row?.level_up_bonus ?? 0,
      newLevel: row?.new_level ?? 1,
    };
  });

/**
 * Coins pendientes (retenidos) del usuario actual en un curso que todavía
 * no completó al 100%. Útil para mostrar un contador de progreso tipo
 * "llevás acumulados 450 de 650 margincoins de este curso" en la UI,
 * sin que esos coins estén todavía en el balance real.
 */
export const getPendingCourseCoins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ courseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: pending, error } = await supabase.rpc("get_my_pending_course_coins", {
      p_course_id: data.courseId,
    });

    if (error) throw new Error(error.message);

    return { pendingCoins: pending ?? 0 };
  });

/**
 * Canjear una recompensa por margincoins.
 *
 * Antes: hacía 3 operaciones separadas (SELECT balance -> validar en JS ->
 * INSERT redemption -> UPDATE profiles con el balance leído al principio).
 * Sin lock entre ellas, dos canjes disparados casi al mismo tiempo (doble
 * click, dos pestañas) podían leer el mismo balance antes de que ninguno
 * terminara de escribir: ambos pasaban la validación y el segundo UPDATE
 * pisaba el resultado del primero en vez de acumularse, permitiendo
 * canjear más de una recompensa pagando el costo de una sola.
 *
 * Ahora: una sola llamada RPC a `redeem_reward`, que corre en un único
 * statement en Postgres con `SELECT ... FOR UPDATE` sobre la fila de
 * `profiles` del usuario. Eso serializa canjes concurrentes del mismo
 * usuario (el segundo espera a que el primero confirme o falle antes de
 * leer el balance), y también valida stock, aislamiento por
 * establecimiento y curso requerido (100% de lecciones) del lado servidor,
 * sin depender de nada que el cliente pueda manipular.
 */
export const redeemReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ rewardId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: redemption, error } = await supabase.rpc("redeem_reward", {
      p_reward_id: data.rewardId,
    });

    if (error) {
      // El mensaje viene directo del RAISE EXCEPTION en la función de Postgres
      // (ej. "Saldo insuficiente de MARGINCOINS", "Sin stock disponible",
      // "Debés completar el curso requerido antes de canjear esta recompensa").
      throw new Error(error.message);
    }

    return { ok: true, redemption };
  });
