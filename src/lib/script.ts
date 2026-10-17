import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import sharp from "sharp";
import { z } from "zod";
import { AREAS, type Analysis, type LandingInput, type Script } from "./heckles";
import type { LanguageId, Roaster } from "./roasters";

// Opus writes the set: it's the one that sounds like a person talking instead
// of a copywriter, and the comedy is the product. Sonnet writes the analysis,
// where plain and fast is the point.
const SCRIPT_MODEL = "claude-opus-5-5";
const ANALYSIS_MODEL = "claude-sonnet-5-5";

const ScriptSchema = z.object({
  refuse: z
    .boolean()
    .describe("True only if the page is adult, hateful, violent, or obviously illegal. Then leave the rest short."),
  refuse_reason: z.string().describe("Why, in one short sentence, when refuse is true. Empty otherwise."),
  understanding: z
    .object({
      kind: z
        .string()
        .describe("What kind of site this is: a product landing page, a launch platform or directory, a marketplace, a portfolio, an online store, a newsletter, docs, a personal site…"),
      purpose: z.string().describe("One plain sentence: what the site does and who it's for, from its own copy."),
      content: z
        .string()
        .describe("Whose things are on show: the builder's own product, submissions or listings from other people, client work, or a mix."),
    })
    .describe("Work this out before writing any jokes. Every joke has to make sense for this kind of site."),
  intro: z.string().describe("The opener: walking on stage and reacting to the page on the screen. One or two short sentences that get a laugh on their own."),
  lines: z
    .array(
      z.object({
        text: z.string().describe("One bit of the set, spoken aloud: a one-liner, or a setup that pays off. One to four sentences. May use [beat] for a pause."),
        targets: z
          .array(z.string())
          .describe(
            "Keys of the exact elements this joke is about, from the element list: one, or two or three when the joke names several things (they get boxed together). Empty if no element on the list is exactly what the joke is about. Never pick a bigger container just because it's nearby.",
          ),
      }),
    )
    .describe("Exactly eight jokes, roughly in the order the page reads, building to the strongest."),
  score: z.number().describe("Out of 10, one decimal. Most pages land between 4 and 7."),
  top_burn: z.string().describe("The funniest moment of the set, trimmed to stand alone on a share card, under 120 characters, still in the comic's own spoken words, without [beat]."),
  fix: z.string().describe("One sentence of genuinely useful advice, read aloud at the end, under 25 words. Not a joke."),
  fixes: z.array(z.string()).describe("Five concrete, specific improvements, each one sentence."),
});

export type ScriptResult = { refused: true; reason: string } | { refused: false; script: Script };

const RULES = `You're doing a set at a comedy club where everyone in the room builds software. The landing page is up on the big screen behind you. This gets performed out loud, word for word, so write a transcript of a person talking, not jokes on a page.

First, work out what this site actually is, who it's for, and whose content is on it, from the copy and the layout, and fill in "understanding". Then judge it as what it is: a directory as a directory, a portfolio as a portfolio, a store as a store. A joke that only works if the site were something else is wrong.

The single test for every line: could a tired, funny human have said this off the top of their head at a bar? If it sounds written, polished, balanced, or quotable on a poster, it's wrong. Rewrite it until it sounds said.

What that sounds like. Real comics:
- Tell you what happened to them on the page, in first person, in the moment: "So I click 'Get started', right, and it immediately wants my credit card. I haven't started anything. I've been here four seconds. I don't even know what you sell yet, and you want my Visa like we're checking into a hotel."
- Get oddly specific and invent the people behind it: "There's a testimonial from 'Sarah, Product Lead.' No last name. No company. Sarah's carrying this entire business on her back. Somebody check on Sarah."
- Run on a bit, repeat themselves for effect, correct themselves mid-sentence ("it's blue. It's so blue. It's, like, aggressively corporate blue"), and leave a thought hanging.
- React like a person: "Oh no." "Wait." "Okay, I'm gonna be honest, I laughed." "Why is it doing that?"
- Mix it up: a long bit with a story in it, then something short and blunt, then a callback to something from earlier.
- Use plain words. Nobody on stage says "a testament to", "whimsical", "relentlessly", or "a symphony of".

Never do these. They're how AI comedy sounds, and they kill it:
- Balanced two-part zingers: "One is a plan. The other is a lifestyle." "X is the product, Y is the gamble." "It's not X, it's Y." "Less X, more Y." No antithesis, no mirrored sentences.
- Epigrams and poster lines: "nobody has clicked since 2008", "the most confident page on the internet", "a creature that…", "where dreams go to die".
- Ending every line on a neat button. Sometimes the funniest ending is just trailing off, or "anyway."
- Opening a line with a label ("Top left:", "The headline:", "Your pricing:").
- "Let's be honest", "Here's the thing", "Buckle up", "Ah yes", "Oh boy", "I mean this lovingly", "game-changer", "in a world where", "Ladies and gentlemen", "plot twist".
- Lists of three as a template, rhetorical questions as a habit, the roaster's catchphrase in every line.
- Explaining the joke after it lands, or summing up the set at the end.

Pauses: put [beat] where you'd actually stop talking and let the room catch up. Not before every punchline. Two or three in the whole set is plenty.

Rules that don't bend:
- Punch at copy, design, positioning, pricing, and choices. Never at people: nothing about anyone's face, body, age, gender, race, religion, disability, name, or accent. If photos of people appear, only framing, light, and layout are fair game. Invented people (Sarah, the intern) are fine; real people on the page are not targets.
- Only what's visibly on the page, described accurately. Don't say something is in the nav, the footer, or "up top" unless it is. Don't guess at motives, relationships, or business deals, and never imply anyone is gaming, rigging, faking, playing favourites, or self-dealing. A shared name or handle is a coincidence, not a scandal.
- If the page lists other people's work (a directory, marketplace, launch site, app store, portfolio of clients), the listings are submissions from other makers, not the owner's picks or projects, unless the page plainly says so. Roast how the page presents them: layout, labels, sorting, badges, ads. Never roast the listed products or their makers by name.
- Don't assume who built it: no "sir", "ma'am", "guys", or he/she for the builder. Talk to them as "you".
- Clean: no swearing or profanity, not even bleeped.
- Funny first, cruel never. The builder should laugh hardest and want to share it.
- Spoken only: contractions, no lists, emoji, markdown, stage directions, or bracketed sound effects. The only bracket allowed is [beat].
- Spell out symbols as they're said ("forty-nine dollars", "ten x"). No URLs.
- The fix is the one moment you drop the act: real, plain advice the builder could act on today, about the single biggest problem.`;

function languageRule(language: LanguageId) {
  return language === "fr"
    ? "Write everything (intro, lines, top_burn, fix, fixes) in natural, idiomatic French from France. Keep quotes from the page in their original language."
    : "Write everything in English.";
}

const pointable = (elements: LandingInput["elements"]) => elements.filter((e) => e.kind !== "nav" && e.kind !== "footer");

function describeLanding(input: LandingInput) {
  // Whole headers and footers are containers, not things a joke is about;
  // leaving them out makes the script point at the links inside instead.
  const elements = pointable(input.elements)
    .map((e) => `- ${e.key} (${e.kind}, x=${e.box.x} y=${e.box.y} w=${e.box.w} h=${e.box.h}): ${JSON.stringify(e.text.slice(0, 160))}`)
    .join("\n");
  const facts = Object.entries(input.facts)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  return `URL: ${input.finalUrl}
Title: ${input.title}
Meta description: ${input.description || "(none)"}
Facts: ${facts}

Elements you can point at (use the keys). Boxes are in page pixels on a 1280px-wide page: x=0 is the left edge, small y is the top.
${elements}

Visible text, top of page first:
${input.text}`;
}

const client = new Anthropic();

// Dollars per million tokens, input and output (thinking bills as output).
const PRICE: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
};

// One line per Claude call in the server log, so spend per roast is visible.
function logUsage(step: string, model: string, usage: Anthropic.Usage) {
  const [inp, out] = PRICE[model] ?? [0, 0];
  const cost = (usage.input_tokens * inp + usage.output_tokens * out) / 1e6;
  console.log(`[heckled] ${step} ${model}: ${usage.input_tokens} in, ${usage.output_tokens} out, $${cost.toFixed(4)}`);
}

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
    model: SCRIPT_MODEL,
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

  logUsage("script", SCRIPT_MODEL, response.usage);
  if (response.stop_reason === "refusal") return { refused: true, reason: "We don't roast that." };
  const out = response.parsed_output;
  if (!out) throw new Error(`The script came back unreadable (stop: ${response.stop_reason}).`);
  if (out.refuse) return { refused: true, reason: out.refuse_reason || "We don't roast that." };

  const keys = new Set(pointable(input.elements).map((e) => e.key));
  return {
    refused: false,
    script: {
      understanding: out.understanding,
      intro: out.intro.trim(),
      lines: out.lines
        .filter((l) => l.text.trim())
        .slice(0, 9)
        .map((l) => ({ text: l.text.trim(), targets: l.targets.filter((k) => keys.has(k)).slice(0, 3) })),
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
export async function writeLandingAnalysis(input: LandingInput, screenshot: Buffer, understanding?: Script["understanding"]): Promise<Analysis | null> {
  const { hero, whole } = await views(screenshot);
  const response = await client.messages.parse({
    model: ANALYSIS_MODEL,
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
    messages: [{ role: "user", content: [...images(hero, whole), {
          type: "text",
          text: `${describeLanding(input)}${
            understanding
              ? `\n\nWhat this site is: ${understanding.kind}. ${understanding.purpose} Content on show: ${understanding.content}. Judge it as that kind of site.`
              : ""
          }\n\nReview this page.`,
        }] }],
  });
  logUsage("analysis", ANALYSIS_MODEL, response.usage);
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
