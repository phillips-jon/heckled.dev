import type { Analysis } from "./heckles";

// The analysis as a prompt for whatever coding agent built the page.
export function fixPrompt(url: string, a: Analysis) {
  const fixes = a.priorities
    .map((p, i) => `${i + 1}. ${p.title} (${p.area}, ${p.effort} effort)\n   Why: ${p.why}\n   How: ${p.how}`)
    .join("\n\n");
  return `I'm improving the landing page at ${url}. A review found the issues below, most important first. Work through them in order in this codebase: for each one, find the code that renders it, make the change, and tell me what you changed. Keep the existing design system and voice. If a fix needs information you don't have (a real customer quote, a real price), leave a clear TODO instead of inventing it.

Who the page is for: ${a.audience}

Summary: ${a.summary}

Fixes:

${fixes}

Keep what already works:
${a.strengths.map((s) => `- ${s}`).join("\n")}`;
}
