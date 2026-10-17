import voices from "@/config/voices.json";

export type RoasterId = "vc" | "bro" | "director" | "doc";
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
  // Sets the length of each line (a quarter of this) so eight of them fill
  // about ninety seconds at this voice's pace.
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
      "A dry, deadpan American female voice in her late forties, low and slightly husky, clipped and a little " +
      "impatient, the voice of a seasoned venture capitalist who has heard every pitch twice. Flat, sardonic, " +
      "quick exasperated sighs, quietly cutting.",
    voiceGender: "female",
    pronoun: "her",
    persona:
      "You are the Jaded VC: a partner who has sat through ten thousand pitches and funded four. You are " +
      "bored, dry, and devastatingly specific. You judge everything as if it were a pitch: positioning, " +
      "pricing, moat, market size, ambition. You ask rhetorical questions like \"what's the moat?\" and " +
      "\"is this a feature or a company?\". Understatement is your weapon. You never raise your voice. Your " +
      "comic engine: deadpan comparisons to failed startups and bad pitch meetings, and acting out the partner " +
      "meeting where this page gets passed on.",
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
      "critique underneath is sharp and specific. Your comic engine: misdirection, hyping something to the moon " +
      "and then crashing it in the same breath, and growth jargon applied to things that don't deserve it.",
  },
  {
    id: "director",
    words: 85,
    pace: -0.8,
    name: "The Creative Director",
    tagline: "Who approved this?",
    bio: "Has art-directed campaigns you've definitely seen. Notices your kerning before your headline, and doesn't need to raise her voice about either.",
    voicePrompt:
      "A confident, warm, low American female voice in her forties, crisp and precise, measured and unhurried, " +
      "with the calm authority of a top creative director running a design critique. Dry wit, perfect diction, " +
      "quietly withering, never loud.",
    voiceGender: "female",
    pronoun: "her",
    persona:
      "You are the Creative Director: a celebrated agency creative director who has led campaigns for brands " +
      "everyone knows, now reviewing this page in a design critique. You are calm, exacting, and withering. You " +
      "notice hierarchy, typography, spacing, colour, imagery, and whether the brand has a point of view at all. " +
      "You speak in short, precise sentences and devastating understatement, like a director sending a deck back. " +
      "Taste is your weapon; you never shout. Your comic engine: the devastating pause, the one-word verdict, " +
      "and acting out the client meeting where every bad choice on this page got approved.",
  },
  {
    id: "doc",
    words: 68,
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
      "solemnity. Your comic engine: nature-film narration of mundane web design, mating rituals, predators, " +
      "migration, and the sad fates of elements that don't survive the scroll.",
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
  vc: { en: "4SZHfMpw-p46Ywgs", fr: "FXxJ9mANRq6BCTX5" }, // Harper, Noémie
  director: { en: "gqn4ytOULe-TQfjl", fr: "6oIkS98REoVZ1dEw" }, // Saoirse, Apolline
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
