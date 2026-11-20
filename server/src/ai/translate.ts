import { z } from "zod";
import { generateStructured } from "./llm.ts";

const NamesSchema = z.object({
  names: z.array(z.object({
    en: z.string().describe("The input name, copied exactly"),
    zh: z.string().describe("The Simplified Chinese name"),
  })),
});

const SYSTEM = `You translate football club and competition names into Simplified Chinese for a Chinese football app.

Rules:
- Use the name that mainstream Chinese football media and apps use day to day, e.g. 曼联, 曼城, 热刺, 纽卡斯尔联, 皇马, 巴萨, 马竞, 拜仁, 多特蒙德, 国际米兰, AC米兰, 大巴黎, 英超, 西甲, 欧冠, 中超, 日职联.
- Prefer the established form over a literal or full formal one. Do not add 足球俱乐部 or FC.
- Clubs with no established Chinese name: transliterate in the standard Xinhua style.
- Chinese, Japanese and Korean clubs: use their usual Chinese-language names (e.g. 上海海港, 横滨水手, 全北现代).
- Return exactly one entry per input, with "en" copied verbatim.`;

/** Translate names in batches. Returns en → zh for every name the model answered. */
export async function translateNames(items: { name: string; context: string }[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < items.length; i += 120) {
    const batch = items.slice(i, i + 120);
    const { parsed } = await generateStructured(NamesSchema, {
      name: "chinese_names",
      system: SYSTEM,
      user: `Translate these names:\n\n${JSON.stringify(batch.map((b) => ({ en: b.name, context: b.context })), null, 1)}`,
      effort: "low",
    });
    const wanted = new Set(batch.map((b) => b.name));
    for (const r of parsed.names) {
      const zh = r.zh.trim();
      if (wanted.has(r.en) && zh && /\p{Script=Han}/u.test(zh)) out.set(r.en, zh);
    }
  }
  return out;
}
