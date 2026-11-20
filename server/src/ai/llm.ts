import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export type Provider = "anthropic" | "openai";

/**
 * Which AI is used. ANALYSIS_PROVIDER forces one; otherwise the first provider with
 * a key wins (Anthropic, then OpenAI). null = no AI (statistical fallbacks only).
 */
export function aiProvider(): Provider | null {
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const forced = process.env.ANALYSIS_PROVIDER?.toLowerCase();
  if (forced === "openai") return hasOpenAI ? "openai" : null;
  if (forced === "anthropic") return hasAnthropic ? "anthropic" : null;
  return hasAnthropic ? "anthropic" : hasOpenAI ? "openai" : null;
}
export const aiEnabled = () => aiProvider() !== null;

const ANTHROPIC_MODEL = "claude-opus-5-5";
const openaiModel = () => process.env.OPENAI_MODEL || "gpt-5.5";
let anthropic: Anthropic | null = null;
let openai: OpenAI | null = null;

/** One request returning JSON that matches `schema`, from whichever provider is configured. */
export async function generateStructured<S extends z.ZodType>(schema: S, req: {
  name: string; system: string; user: string; effort?: "low" | "medium";
}): Promise<{ parsed: z.infer<S>; model: string; provider: Provider }> {
  const provider = aiProvider();
  if (!provider) throw new Error("no AI provider configured");

  if (provider === "openai") {
    openai ??= new OpenAI();
    const response = await openai.responses.parse({
      model: openaiModel(),
      instructions: req.system,
      input: req.user,
      text: { format: zodTextFormat(schema, req.name) },
    });
    if (response.status === "incomplete") throw new Error(`incomplete response (${response.incomplete_details?.reason ?? "unknown"})`);
    const refused = response.output.some((o) => o.type === "message" && o.content.some((c) => c.type === "refusal"));
    if (refused) throw new Error("model declined the request");
    if (!response.output_parsed) throw new Error("no structured output returned");
    return { parsed: response.output_parsed as z.infer<S>, model: response.model, provider };
  }

  anthropic ??= new Anthropic();
  const response = await anthropic.beta.messages.parse({
    model: ANTHROPIC_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default", // a safety-classifier decline is retried server-side on Anthropic's recommended model
    output_config: { effort: req.effort ?? "medium", format: betaZodOutputFormat(schema) },
    system: req.system, // kept byte-stable for prompt caching; anything variable goes in the user turn
    messages: [{ role: "user", content: req.user }],
  });
  if (response.stop_reason === "refusal") throw new Error("model declined the request");
  if (response.stop_reason === "max_tokens") throw new Error("response truncated");
  if (!response.parsed_output) throw new Error("no structured output returned");
  return { parsed: response.parsed_output as z.infer<S>, model: response.model, provider };
}
