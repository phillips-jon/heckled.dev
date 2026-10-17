import voices from "@/config/voices.json";

export type RoasterId = "vc" | "critic" | "bro" | "doc";
export type LanguageId = "en" | "fr";

export type Roaster = {
  id: RoasterId;
  name: string;
  tagline: string;
  // For the roaster list on the home page.
  bio: string;
  // What Voice Design is asked for (scripts/setup-voices.mts). At most 500
  // characters, and it describes a voice, not a person to make fun of.
  voicePrompt: string;
  voiceGender: "male" | "female";
  // For the "Hear her" and "Hear him" buttons.
  pronoun: "her" | "him";
  // How the roaster talks. The comedy lives here; the delivery lives in the voice.
  persona: string;
  // Words for intro plus lines that fill about 45 seconds at this voice's pace.
  words: number;
  // Gradium padding_bonus: negative speaks faster. Designed voices come out
  // slow and breathy, which suits a pause but not a punchline.
  pace: number;
};

export const ROASTERS: Roaster[] = [
  {
    id: "vc",
    words: 90,
    pace: -1.0,
    name: "The Jaded VC",
    tagline: "What's the moat?",
    bio: "Has sat through ten thousand pitches and funded four. Reads your page like a deck: positioning, pricing, and whether there's a company in there at all.",
    voicePrompt:
      "A dry, unimpressed American female voice in her mid-forties, low and smoky, unhurried and flat, " +
      "like a venture capitalist on her ninth pitch of the day. Deadpan delivery with long-suffering sighs, " +
      "measured pacing, quietly devastating.",
    voiceGender: "female",
    pronoun: "her",
    persona:
      "You are the Jaded VC: a partner who has sat through ten thousand pitches and funded four. You are " +
      "bored, dry, and devastatingly specific. You judge everything as if it were a pitch: positioning, " +
      "pricing, moat, market size, ambition. You ask rhetorical questions like \"what's the moat?\" and " +
      "\"is this a feature or a company?\". Understatement is your weapon. You never raise your voice.",
  },
  {
    id: "critic",
    words: 80,
    pace: -0.8,
    name: "The French Critic",
    tagline: "Ah. Non.",
    bio: "A Parisian critic at a gallery opening that has gone very wrong. Your gradient wounds her. Your typography, she cannot discuss.",
    voicePrompt:
      "A refined Parisian female voice in her fifties, speaking English with a strong French accent, cultured " +
      "and theatrical, precise, every word weighed. Elegant disappointment, as if reviewing a failed gallery " +
      "opening. Silky, low, faintly pained.",
    voiceGender: "female",
    pronoun: "her",
    persona:
      "You are the French Critic: a Parisian art critic reviewing this work as if it were a disappointing " +
      "gallery opening. You are refined, theatrical, and wounded by bad taste. You reference composition, " +
      "light, typography and restraint with the vocabulary of fine art. Sprinkle in a rare French word " +
      "(\"non\", \"quelle horreur\", \"bof\") but stay understandable.",
  },
  {
    id: "bro",
    words: 110,
    pace: -1.5,
    name: "The Growth Bro",
    tagline: "Let's 10x this. Or not.",
    bio: "Loves your hero section. Loves it. Then counts the buttons, finds the funnel leaking, and tells you, at volume.",
    voicePrompt:
      "A loud, fast, overconfident young American male voice, late twenties, high energy and punchy, like a " +
      "growth hacker podcast host who just discovered cold plunges. Bright, hyped, rapid-fire delivery with " +
      "big emphasis.",
    voiceGender: "male",
    pronoun: "him",
    persona:
      "You are the Growth Bro: a hyped growth marketer who speaks in conversion rates, funnels, hooks and " +
      "\"engagement\". Every beat starts with hype and ends with demolition: you love it, then you destroy " +
      "it. Fast, punchy sentences. You say things like \"bro\", \"insane\", \"let's 10x this\", but the " +
      "critique underneath is sharp and specific.",
  },
  {
    id: "doc",
    words: 75,
    pace: -1.2,
    name: "The Documentarian",
    tagline: "Observe, in its natural habitat…",
    bio: "Observes your landing page like a rare animal in the wild. Hushed, reverent, and quietly devastating about your call to action.",
    voicePrompt:
      "A hushed, reverent, elderly British male narrator, warm and breathy, speaking softly and slowly like a " +
      "nature documentary filmed in the savanna. Gentle wonder, careful pauses, rich low resonance.",
    voiceGender: "male",
    pronoun: "him",
    persona:
      "You are the Documentarian: a hushed nature-film narrator observing this work like a rare animal in " +
      "the wild. You describe each element as a creature with instincts and habits (\"here, the call to " +
      "action, shy, hides below the fold\"). Wonder and gentle pity, never cruelty. The joke is the " +
      "solemnity.",
  },
];

export const LANGUAGES: { id: LanguageId; name: string }[] = [
  { id: "en", name: "English" },
  { id: "fr", name: "Français" },
];

export function getRoaster(id: string) {
  return ROASTERS.find((r) => r.id === id) ?? null;
}

export function isLanguage(id: string): id is LanguageId {
  return LANGUAGES.some((l) => l.id === id);
}

type VoiceConfig = {
  pronunciations: Partial<Record<LanguageId, string>>;
  voices: Partial<Record<RoasterId, Partial<Record<LanguageId, string>>>>;
};

// Gradium flagship voices, used where a roaster has no designed voice yet. The
// plan allows six custom voices: setup-voices.mts spends them on all four
// roasters in English first, then French, and these cover the rest.
const FLAGSHIP: Record<RoasterId, Record<LanguageId, string>> = {
  vc: { en: "4SZHfMpw-p46Ywgs", fr: "6oIkS98REoVZ1dEw" }, // Harper, Apolline
  critic: { en: "6PWnV0Nq4wu7RVBT", fr: "FXxJ9mANRq6BCTX5" }, // Maeve, Noémie
  bro: { en: "_6Aslh2DxfmnRLmP", fr: "25AzBFyp6svYnJsj" }, // Russell, Damien
  doc: { en: "I7GYfpcKbafFrYUv", fr: "iEu63s1rhn_kegTr" }, // Declan, Gaspard
};

// Voice ids come from scripts/setup-voices.mts, which designs each roaster's
// voice and localizes it to French. They are not secret.
export function voiceFor(roaster: RoasterId, language: LanguageId) {
  const config = voices as VoiceConfig;
  const id = config.voices[roaster]?.[language] ?? FLAGSHIP[roaster][language];
  return { voiceId: id, pronunciationId: config.pronunciations[language] ?? null };
}
