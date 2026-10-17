import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import sharp from "sharp";
import { z } from "zod";
import type { LandingInput, Script } from "./heckles";
import type { LanguageId, Roaster } from "./roasters";

const MODEL = "claude-sonnet-5-5";

const ScriptSchema = z.object({
  refuse: z
    .boolean()
    .describe("True only if the page is adult, hateful, violent, or obviously illegal. Then leave the rest short."),
  refuse_reason: z.string().describe("Why, in one short sentence, when refuse is true. Empty otherwise."),
  intro: z.string().describe("One short line that sets the scene, in character."),
  lines: z
    .array(
      z.object({
        text: z.string().describe("One beat of the roast, spoken aloud. One or two short sentences."),
        target: z
          .string()
          .nullable()
          .describe("The key of the element this beat is about, from the element list, or null."),
      }),
    )
    .describe("Exactly five beats, in the order the page reads, top to bottom."),
  score: z.number().describe("Out of 10, one decimal. Most pages land between 4 and 7."),
  top_burn: z.string().describe("The single most quotable line, under 120 characters, for the share card."),
  fix: z.string().describe("One sentence of genuinely useful advice, read aloud at the end, under 25 words. Not a joke."),
  fixes: z.array(z.string()).describe("Five concrete, specific improvements, each one sentence."),
});

export type ScriptResult = { refused: true; reason: string } | { refused: false; script: Script };

const RULES = `Rules for every roast:
- Every joke must reference something actually on this page: real words from the copy, a real button, a real layout choice. No generic jokes that would fit any site.
- Punch at copy, design, positioning, pricing, and choices. Never at people. No jokes about anyone's face, body, age, gender, race, religion, disability, name, or personal tragedy. If photos of people appear, you may only mention framing, light, and layout, never the people.
- Be funny first and mean never. Sharp, specific, and affectionate is the target; the builder should laugh and want to share it.
- Write for the ear: it will be performed by a voice actor. Short sentences, natural rhythm, no lists, no emoji, no markdown, no stage directions, no sound effects in brackets.
- Spell out symbols the way you'd say them ("forty-nine dollars", "ten x"). Avoid URLs.
- The fix is real advice the builder could act on today, about the single biggest problem.`;

function languageRule(language: LanguageId) {
  return language === "fr"
    ? "Write everything (intro, lines, top_burn, fix, fixes) in natural, idiomatic French from France. Keep quotes from the page in their original language."
    : "Write everything in English.";
}

function describeLanding(input: LandingInput) {
  const elements = input.elements
    .map((e) => `- ${e.key} (${e.kind}, at y=${e.box.y}px): ${JSON.stringify(e.text.slice(0, 160))}`)
    .join("\n");
  const facts = Object.entries(input.facts)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  return `URL: ${input.finalUrl}
Title: ${input.title}
Meta description: ${input.description || "(none)"}
Facts: ${facts}

Elements you can target (use the key):
${elements}

Visible text, top of page first:
${input.text}`;
}

const client = new Anthropic();

export async function writeLandingScript(
  input: LandingInput,
  screenshot: Buffer,
  roaster: Roaster,
  language: LanguageId,
): Promise<ScriptResult> {
  // Two views: the first screen at full resolution, where the hero and its
  // copy are legible, and the whole page scaled down for layout.
  const meta = await sharp(screenshot).metadata();
  const hero = await sharp(screenshot)
    .extract({ left: 0, top: 0, width: meta.width!, height: Math.min(800, meta.height!) })
    .jpeg({ quality: 80 })
    .toBuffer();
  const whole = await sharp(screenshot).resize({ height: 1560, withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer();

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium", format: zodOutputFormat(ScriptSchema) },
    system: `${roaster.persona}

You are performing on Heckled, where builders paste their landing page and get a short voiced roast that ends with one real fix.

${RULES}
- Length matters, because this is performed in under a minute: the intro is at most 12 words, there are exactly five lines, and each line is at most ${Math.round(roaster.words / 6)} words. Count them. One sharp joke per line beats three.

${languageRule(language)}`,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "The first screen of the page, at full size:" },
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: hero.toString("base64") } },
          { type: "text", text: "The whole page, scaled down:" },
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: whole.toString("base64") } },
          {
            type: "text",
            text: `${describeLanding(input)}

Roast this landing page as ${roaster.name}.`,
          },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") return { refused: true, reason: "We don't roast that." };
  const out = response.parsed_output;
  if (!out) throw new Error(`The script came back unreadable (stop: ${response.stop_reason}).`);
  if (out.refuse) return { refused: true, reason: out.refuse_reason || "We don't roast that." };

  const keys = new Set(input.elements.map((e) => e.key));
  return {
    refused: false,
    script: {
      intro: out.intro.trim(),
      lines: out.lines
        .filter((l) => l.text.trim())
        .slice(0, 6)
        .map((l) => ({ text: l.text.trim(), target: l.target && keys.has(l.target) ? l.target : null })),
      score: Math.round(Math.min(10, Math.max(1, out.score)) * 10) / 10,
      top_burn: out.top_burn.trim().slice(0, 140),
      fix: out.fix.trim(),
      fixes: out.fixes.slice(0, 5),
    },
  };
}
