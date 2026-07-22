import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * ============================================================================
 * MARGIN AI — Wrapper de IA
 * ============================================================================
 *
 * ⚠️  MIGRACIÓN A CLAUDE (Netlify):
 *
 * Hoy este archivo usa el **Lovable AI Gateway** (sin API key, funciona out of
 * the box). Cuando migres a Netlify + tu propia key de Anthropic, cambiá SOLO
 * las 3 constantes de abajo:
 *
 *   1. AI_ENDPOINT  → "https://api.anthropic.com/v1/messages"
 *   2. AI_API_KEY   → process.env.ANTHROPIC_API_KEY  (tu key sk-ant-...)
 *   3. AI_MODEL     → "claude-sonnet-4-5" (o el que uses)
 *
 * Y ajustá `buildRequestBody()` al formato de Anthropic (ver comentario abajo).
 * El resto del código (server functions, componentes de UI) NO cambia.
 * ============================================================================
 */

// ─── CONFIG SWAP ZONE ──────────────────────────────────────────────────────
const AI_ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3.6-flash"; // cambiar a "claude-sonnet-4-5" con Anthropic
// key: en Lovable Gateway se envía como header Lovable-API-Key (auto-provisto).
//      En Anthropic se envía como header "x-api-key" + "anthropic-version": "2023-06-01".
// ────────────────────────────────────────────────────────────────────────────

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

function buildHeaders(): Record<string, string> {
  // ─── SWAP ZONE (Anthropic) ────────────────────────────────────────────────
  // return {
  //   "Content-Type": "application/json",
  //   "x-api-key": process.env.ANTHROPIC_API_KEY!,
  //   "anthropic-version": "2023-06-01",
  // };
  // ──────────────────────────────────────────────────────────────────────────
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  return {
    "Content-Type": "application/json",
    "Lovable-API-Key": key,
  };
}

function buildRequestBody(messages: ChatMsg[]) {
  // ─── SWAP ZONE (Anthropic format) ─────────────────────────────────────────
  // const system = messages.find((m) => m.role === "system")?.content ?? "";
  // return {
  //   model: AI_MODEL,
  //   max_tokens: 1024,
  //   system,
  //   messages: messages.filter((m) => m.role !== "system"),
  // };
  // ──────────────────────────────────────────────────────────────────────────
  return { model: AI_MODEL, messages };
}

function extractText(payload: unknown): string {
  // OpenAI-compatible (Lovable Gateway)
  const p = payload as {
    choices?: { message?: { content?: string } }[];
    content?: { text?: string }[]; // Anthropic
  };
  if (p.choices?.[0]?.message?.content) return p.choices[0].message.content;
  if (p.content?.[0]?.text) return p.content[0].text; // Anthropic fallback
  return "";
}

async function callAI(messages: ChatMsg[]): Promise<string> {
  const res = await fetch(AI_ENDPOINT, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(buildRequestBody(messages)),
  });
  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 429) throw new Error("Límite de uso alcanzado. Probá de nuevo en un momento.");
    if (res.status === 402) throw new Error("Créditos de IA agotados. Contactá al admin.");
    throw new Error(`IA error ${res.status}: ${txt.slice(0, 200)}`);
  }
  return extractText(await res.json());
}

// =============================================================================
// SIMULADOR DE SERVICIO — chat con cliente ficticio
// =============================================================================

const SIM_TYPES = ["enojado", "amable", "queja", "reclamo", "sugerencia", "apurado", "indeciso"] as const;
type SimType = (typeof SIM_TYPES)[number];

export const startSimulatorScenario = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        clientType: z.enum(SIM_TYPES),
        position: z.string().default("mozo"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const system = `Sos un cliente de un restaurante en Argentina. Tu tipo de personalidad para esta simulación es: "${data.clientType}".
El usuario es un ${data.position} en entrenamiento y va a atenderte por chat.
Reglas:
- Escribí en español rioplatense, natural y breve (máx 2 oraciones por mensaje).
- Mantené el personaje. No rompas el rol ni des instrucciones.
- Generá una situación INICIAL creíble y específica (mesa, pedido, contexto). Cada vez distinta.
- Reaccioná realistamente a las respuestas del usuario según tu personalidad.
- No uses emojis ni asteriscos.
Ahora presentá la situación inicial en un mensaje corto, como si acabaras de sentarte en la mesa o llamado al mozo.`;

    const opening = await callAI([
      { role: "system", content: system },
      { role: "user", content: "[COMENZAR SIMULACIÓN]" },
    ]);
    return { opening, system };
  });

export const continueSimulator = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        system: z.string(),
        history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const reply = await callAI([{ role: "system", content: data.system }, ...data.history]);
    return { reply };
  });

// =============================================================================
// GENERADOR DE JUEGOS DINÁMICOS (consigna por puesto)
// =============================================================================

export const generateGameChallenge = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ position: z.string(), gameType: z.enum(["quiz", "scenario", "trivia"]) }).parse(input),
  )
  .handler(async ({ data }) => {
    const system = `Generás desafíos de capacitación gastronómica en español rioplatense.
Puesto: ${data.position}. Tipo de juego: ${data.gameType}.
Devolvé SOLO un JSON válido con esta forma exacta:
{"title": string, "prompt": string, "options": [string, string, string, string], "correctIndex": number, "explanation": string}
No agregues texto fuera del JSON. Hacé la consigna concreta, cotidiana y realista.`;
    const raw = await callAI([
      { role: "system", content: system },
      { role: "user", content: "Generá un desafío nuevo." },
    ]);
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      return JSON.parse(cleaned) as {
        title: string;
        prompt: string;
        options: string[];
        correctIndex: number;
        explanation: string;
      };
    } catch {
      throw new Error("La IA devolvió un formato inesperado. Probá de nuevo.");
    }
  });
