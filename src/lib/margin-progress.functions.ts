import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Marca una lección como completada y otorga XP + margincoins al usuario.
 * Idempotente: si ya está completada, no duplica recompensas.
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
    const { supabase, userId } = context;

    // 1) Buscar la lección para saber recompensas y módulo.
    const { data: lesson, error: lessonErr } = await supabase
      .from("lessons")
      .select("id, module_id, xp_reward, coin_reward")
      .eq("id", data.lessonId)
      .maybeSingle();
    if (lessonErr) throw new Error(lessonErr.message);
    if (!lesson) throw new Error("Lección no encontrada");

    // 2) ¿Ya la había completado? -> no duplicar.
    const { data: existing } = await supabase
      .from("user_progress")
      .select("id")
      .eq("user_id", userId)
      .eq("lesson_id", data.lessonId)
      .maybeSingle();

    if (existing) {
      return { alreadyCompleted: true, xpAwarded: 0, coinsAwarded: 0 };
    }

    // 3) Insertar progreso.
    const { error: progressErr } = await supabase.from("user_progress").insert({
      user_id: userId,
      lesson_id: lesson.id,
      module_id: lesson.module_id,
      score: data.score ?? null,
    });
    if (progressErr) throw new Error(progressErr.message);

    // 4) Actualizar el perfil (leer y sumar bajo RLS del propio usuario).
    const xp = lesson.xp_reward ?? 0;
    const coins = lesson.coin_reward ?? 0;

    const { data: profile } = await supabase
      .from("profiles")
      .select("total_xp, margincoins, level")
      .eq("id", userId)
      .maybeSingle();

    const newXp = (profile?.total_xp ?? 0) + xp;
    const newCoins = (profile?.margincoins ?? 0) + coins;
    const newLevel = Math.max(1, Math.floor(newXp / 500) + 1);

    await supabase
      .from("profiles")
      .update({
        total_xp: newXp,
        margincoins: newCoins,
        level: newLevel,
        last_activity_date: new Date().toISOString().slice(0, 10),
      })
      .eq("id", userId);

    if (coins > 0) {
      await supabase.from("margincoins_transactions").insert({
        user_id: userId,
        amount: coins,
        reason: "lesson_completed",
        description: "Lección completada",
      });
    }

    return { alreadyCompleted: false, xpAwarded: xp, coinsAwarded: coins };
  });

/**
 * Canjear una recompensa por margincoins.
 */
export const redeemReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ rewardId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: reward, error: rewardErr } = await supabase
      .from("rewards")
      .select("id, cost_coins, title, stock, is_active")
      .eq("id", data.rewardId)
      .maybeSingle();
    if (rewardErr) throw new Error(rewardErr.message);
    if (!reward || !reward.is_active) throw new Error("Recompensa no disponible");
    if (reward.stock !== null && reward.stock <= 0) throw new Error("Sin stock");

    const { data: profile } = await supabase
      .from("profiles")
      .select("margincoins")
      .eq("id", userId)
      .maybeSingle();

    const balance = profile?.margincoins ?? 0;
    if (balance < reward.cost_coins) throw new Error("No tenés suficientes margincoins");

    const { error: redeemErr } = await supabase.from("reward_redemptions").insert({
      user_id: userId,
      reward_id: reward.id,
      cost_coins: reward.cost_coins,
    });
    if (redeemErr) throw new Error(redeemErr.message);

    await supabase
      .from("profiles")
      .update({ margincoins: balance - reward.cost_coins })
      .eq("id", userId);

    await supabase.from("margincoins_transactions").insert({
      user_id: userId,
      amount: -reward.cost_coins,
      reason: "reward_redeemed",
      description: `Canjeaste: ${reward.title}`,
    });

    return { ok: true };
  });
