import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import sharp from "sharp";
import { z } from "zod";
import { AREAS, type Analysis, type LandingInput, type Script } from "./heckles";
import type { LanguageId, Roaster } from "./roasters";

const MODEL = "claude-sonnet-5-5";

const ScriptSchema = z.object({
  refuse: z
    .boolean()
    .describe("True only if the page is adult, hateful, violent, or obviously illegal. Then leave the rest short."),
  refuse_reason: z.string().describe("Why, in one short sentence, when refuse is true. Empty otherwise."),
  intro: z.string().describe("The opener: one short line, in character, that gets a laugh on its own."),
  lines: z
    .array(
      z.object({
        text: z.string().describe("One joke: a setup and a punchline about one thing on the page, spoken aloud. One to three short sentences."),
        target: z
          .string()
          .nullable()
          .describe("The key of the element this beat is about, from the element list, or null."),
      }),
    )
    .describe("Exactly eight jokes, roughly in the order the page reads, building to the strongest."),
  score: z.number().describe("Out of 10, one decimal. Most pages land between 4 and 7."),
  top_burn: z.string().describe("The funniest line of the set, tightened to stand alone on a share card, under 120 characters."),
  fix: z.string().describe("One sentence of genuinely useful advice, read aloud at the end, under 25 words. Not a joke."),
  fixes: z.array(z.string()).describe("Five concrete, specific improvements, each one sentence."),
});

export type ScriptResult = { refused: true; reason: string } | { refused: false; script: Script };

const RULES = `This is a stand-up set, not a review with jokes in it. Write it the way a working comic writes a tight five: every line is built to get a laugh.

Comedy craft, every line:
- Setup, then punchline. The surprising word goes last. Never explain the joke after it lands.
- Specific beats general. Quote the page's real words and name its real elements. "Your headline uses 'synergy' and 'leverage' in the same sentence" beats "your copy is full of buzzwords".
- Use comparisons that paint a picture: "a pricing table with the energy of a hostage note", "a hero image that looks like it was licensed from a bank's 2009 annual report".
- Rule of three: two normal things, then a twist.
- Act it out: imagine a visitor's inner monologue, or the meeting where this got approved, and quote it.
- Misdirection: start a compliment, land an insult. Or start an insult, land a reluctant compliment.
- Escalate: the set should get bigger as it goes. Save the strongest beat for last.
- The intro is an opener that gets a laugh by itself, not a description of the page.
- Call back to the opener in the final line if you can.

Weak: "Your call to action is not very clear." Strong: "Your button says 'Learn more'. Learn more about what? It's the website equivalent of a man at a party saying 'I'm kind of a big deal' and walking away."

Rules that don't bend:
- Punch at copy, design, positioning, pricing, and choices. Never at people: no jokes about anyone's face, body, age, gender, race, religion, disability, name, or accent. If photos of people appear, only framing, light, and layout are fair game.
- Don't assume who built it: no "sir", "ma'am", "guys", or he/she for the builder. Talk to them as "you".
- Clean: no swearing or profanity, not even bleeped. Attitude comes from the writing, not the language.
- Funny first, cruel never. Sharp, specific, and affectionate: the builder should laugh hardest and share it.
- Write for the ear: a voice actor performs it. Short sentences, natural rhythm, contractions. No lists, emoji, markdown, stage directions, or bracketed sound effects.
- Spell out symbols as they're said ("forty-nine dollars", "ten x"). No URLs.
- The fix is the one moment you drop the act: real advice the builder could act on today, about the single biggest problem.`;

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

// Two views of the page: the first screen at full resolution, where the hero
// and its copy are legible, and the whole page scaled down for layout.
async function views(screenshot: Buffer) {
  const meta = await sharp(screenshot).metadata();
  const hero = await sharp(screenshot)
    .extract({ left: 0, top: 0, width: meta.width!, height: Math.min(800, meta.height!) })
    .jpeg({ quality: 80 })
    .toBuffer();
  const whole = await sharp(screenshot).resize({ height: 1560, withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer();
  return { hero, whole };
}

function images(hero: Buffer, whole: Buffer) {
  return [
    { type: "text" as const, text: "The first screen of the page, at full size:" },
    { type: "image" as const, source: { type: "base64" as const, media_type: "image/jpeg" as const, data: hero.toString("base64") } },
    { type: "text" as const, text: "The whole page, scaled down:" },
    { type: "image" as const, source: { type: "base64" as const, media_type: "image/jpeg" as const, data: whole.toString("base64") } },
  ];
}

export async function writeLandingScript(
  input: LandingInput,
  screenshot: Buffer,
  roaster: Roaster,
  language: LanguageId,
): Promise<ScriptResult> {
  const { hero, whole } = await views(screenshot);

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    // Comedy needs drafts: high effort lets it try lines and keep the best.
    output_config: { effort: "high", format: zodOutputFormat(ScriptSchema) },
    system: `${roaster.persona}

You are performing on Heckled, where builders paste their landing page and get a short voiced roast that ends with one real fix.

${RULES}
- Length matters, because this is a ninety-second set: the intro is at most 15 words, there are exactly eight lines, and each line is at most ${Math.round(roaster.words / 4)} words. Count them. One sharp joke per line beats three. Eight lines means room for a running bit: set something up early and pay it off later.

${languageRule(language)}`,
    messages: [
      {
        role: "user",
        content: [
          ...images(hero, whole),
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
        .slice(0, 9)
        .map((l) => ({ text: l.text.trim(), target: l.target && keys.has(l.target) ? l.target : null })),
      score: Math.round(Math.min(10, Math.max(1, out.score)) * 10) / 10,
      top_burn: out.top_burn.trim().slice(0, 140),
      fix: out.fix.trim(),
      fixes: out.fixes.slice(0, 5),
    },
  };
}

const AnalysisSchema = z.object({
  summary: z.string().describe("Two or three sentences: what the page is, who it's for, and the single biggest problem."),
  audience: z.string().describe("Who this page appears to be for, in one short phrase."),
  scores: z
    .array(
      z.object({
        area: z.enum(AREAS),
        score: z.number().describe("Out of 10, whole numbers."),
        verdict: z.string().describe("One sentence on why, naming what's on the page."),
      }),
    )
    .describe("One entry for each area, in the order given."),
  strengths: z.array(z.string()).describe("Two to four things the page genuinely does well, each one sentence."),
  priorities: z
    .array(
      z.object({
        title: z.string().describe("The change, as an imperative, under 12 words."),
        area: z.enum(AREAS),
        effort: z.enum(["quick", "medium", "big"]),
        why: z.string().describe("What's wrong now and what it costs, citing the page. One or two sentences."),
        how: z.string().describe("Exactly what to do, concrete enough to implement: suggested copy, which element, where it moves."),
      }),
    )
    .describe("Six to eight fixes, most impactful first."),
});

// The serious half of a heckle: a review a builder can act on, written as an
// experienced conversion and design consultant would, with no jokes.
export async function writeLandingAnalysis(input: LandingInput, screenshot: Buffer): Promise<Analysis | null> {
  const { hero, whole } = await views(screenshot);
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium", format: zodOutputFormat(AnalysisSchema) },
    system: `You are a senior landing page consultant: conversion, copywriting, and visual design. You review a page for its builder and give them a plain, specific, prioritized plan.

Rules:
- Be specific to this page. Quote its real copy and name its real elements. Nothing generic that would fit any site.
- Areas: Message (headline, value proposition, clarity), Calls to action, Design (hierarchy, typography, spacing, imagery), Trust (social proof, credibility), Offer (pricing, plans, risk reversal), Basics (speed, accessibility, metadata, mobile hints you can infer).
- Score honestly. A 5 is average. Most pages land between 4 and 7 in most areas.
- Fixes must be concrete enough to implement today: suggest actual replacement copy where copy is the problem.
- Never comment on people's appearance, even if photos of people appear.
- Plain, warm, direct language. No jokes, no hype, no emoji, no markdown.`,
    messages: [{ role: "user", content: [...images(hero, whole), { type: "text", text: `${describeLanding(input)}\n\nReview this landing page.` }] }],
  });
  const out = response.parsed_output;
  if (response.stop_reason === "refusal" || !out) return null;
  return {
    summary: out.summary.trim(),
    audience: out.audience.trim(),
    scores: AREAS.map((area) => {
      const s = out.scores.find((x) => x.area === area);
      return { area, score: Math.round(Math.min(10, Math.max(1, s?.score ?? 5))), verdict: s?.verdict.trim() ?? "" };
    }),
    strengths: out.strengths.slice(0, 4),
    priorities: out.priorities.slice(0, 8),
  };
}
