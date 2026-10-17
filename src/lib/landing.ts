import { chromium, type Browser, type Page } from "playwright-core";
import sharp from "sharp";
import { checkHost } from "./ssrf";
import type { LandingInput, PageElement } from "./heckles";

const VIEWPORT = { width: 1280, height: 800 };
// The screenshot stops here: long enough for hero, features and usually
// pricing, short enough that the model can still read it.
const MAX_HEIGHT = 3600;
const PAGE_TIMEOUT_MS = 15_000;
const MAX_REQUESTS = 600;

const DEFAULT_CHROME =
  process.platform === "darwin"
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : "/usr/bin/google-chrome";

// One browser for the whole process, launched on first use and relaunched if
// it dies. Each heckle gets its own context, so nothing leaks between them.
const g = globalThis as unknown as { __heckledBrowser?: Promise<Browser> };

function browser() {
  if (!g.__heckledBrowser) {
    const args = (process.env.CHROME_ARGS || "").split(" ").filter(Boolean);
    g.__heckledBrowser = chromium
      .launch({ executablePath: process.env.CHROME_PATH || DEFAULT_CHROME, args })
      .then((b) => {
        b.on("disconnected", () => {
          g.__heckledBrowser = undefined;
        });
        return b;
      })
      .catch((err) => {
        g.__heckledBrowser = undefined;
        throw err;
      });
  }
  return g.__heckledBrowser;
}

export class IngestError extends Error {}

export async function ingestLanding(url: URL): Promise<{ input: LandingInput; screenshot: Buffer; height: number }> {
  if (!(await checkHost(url.hostname))) throw new IngestError("That address isn't on the public internet.");

  const context = await (await browser()).newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    acceptDownloads: false,
    javaScriptEnabled: true,
    serviceWorkers: "block",
    // Plenty of heroes fade in with JavaScript and would screenshot blank;
    // most sites skip those animations for visitors who ask for less motion.
    reducedMotion: "reduce",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/155.0.0.0 Safari/537.36 Heckled/1.0 (+https://heckled.dev)",
  });
  let requests = 0;
  // Every request the page makes goes through the same public-address check
  // as the URL itself, so a redirect or an <img src> can't reach inside.
  await context.route("**/*", async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (u.protocol === "data:" || u.protocol === "blob:") return route.continue();
    if (u.protocol !== "http:" && u.protocol !== "https:") return route.abort();
    if (++requests > MAX_REQUESTS) return route.abort();
    if (req.resourceType() === "media" || req.resourceType() === "websocket") return route.abort();
    if (!(await checkHost(u.hostname))) return route.abort("addressunreachable");
    return route.continue();
  });

  try {
    const page = await context.newPage();
    const started = Date.now();
    const response = await page
      .goto(url.toString(), { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT_MS })
      .catch((err: Error) => {
        throw new IngestError(`Couldn't load that page (${err.message.split("\n")[0]}).`);
      });
    if (!response) throw new IngestError("That page didn't answer.");
    if (response.status() >= 400) throw new IngestError(`That page answered ${response.status()}.`);
    const type = response.headers()["content-type"] || "";
    if (!type.includes("html")) throw new IngestError("That URL isn't a web page.");
    // Give fonts, images and client-rendered heroes a moment, but never wait
    // forever on a page that keeps a connection open.
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    const loadMs = Date.now() - started;

    // The first screen, exactly as it loaded: some heroes fade out once
    // scrolled past and are slow to come back.
    const first = await page.screenshot({ type: "png" });

    // Lazy images and scroll-triggered sections only render once seen, so
    // pass over the page once before measuring anything.
    await page.evaluate(`(async () => {
      for (let y = 0; y < Math.min(document.body.scrollHeight, ${MAX_HEIGHT}); y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 80));
      }
      window.scrollTo(0, 0);
    })()`);
    await page.waitForTimeout(800);

    const data = (await page.evaluate(`(${EXTRACT_JS})(${MAX_HEIGHT})`)) as Extracted;
    const height = Math.min(Math.max(data.pageHeight, VIEWPORT.height), MAX_HEIGHT);
    const screenshot = await captureByScrolling(page, height, first);
    return {
      input: {
        url: url.toString(),
        finalUrl: page.url(),
        title: data.title,
        description: data.description,
        facts: { ...data.facts, loadMs },
        text: data.text,
        elements: data.elements.filter((e) => e.box.y < height),
      },
      screenshot,
      height,
    };
  } finally {
    await context.close().catch(() => {});
  }
}

// Captures the page the way a visitor sees it: one screen at a time, scrolling
// down, stitched together. A full-page screenshot stretches the viewport to
// the whole page instead, which resets scroll-driven heroes and leaves them
// blank. Fixed and sticky elements (headers, chat bubbles) show in the first
// screen only, so they don't repeat down the image.
async function captureByScrolling(page: Page, height: number, first: Buffer) {
  const tiles: { input: Buffer; top: number; left: number }[] = [{ input: first, top: 0, left: 0 }];
  if (height > VIEWPORT.height) {
    await page.evaluate(`(() => {
      for (const el of document.querySelectorAll("body *")) {
        const p = getComputedStyle(el).position;
        if (p === "fixed" || p === "sticky") el.style.setProperty("opacity", "0", "important");
      }
    })()`);
  }
  for (let y = VIEWPORT.height; y < height; y += VIEWPORT.height) {
    const top = Math.min(y, height - VIEWPORT.height);
    await page.evaluate(`window.scrollTo(0, ${top})`);
    await page.waitForTimeout(450);
    tiles.push({ input: await page.screenshot({ type: "png" }), top, left: 0 });
  }
  await page.evaluate("window.scrollTo(0, 0)");
  return sharp({ create: { width: VIEWPORT.width, height, channels: 3, background: "#ffffff" } })
    .composite(tiles)
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}

// Runs inside the page. Collects the things a roast points at, each with a
// key the script can name and a box the player can highlight.
// Kept as a string so no bundler can rewrite it: esbuild and Turbopack wrap
// named functions in helpers that do not exist inside the page.
const EXTRACT_JS = String.raw`function extract(maxHeight) {
  const out = [];
  const seen = new Set();
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  // SVG elements keep their class in className.baseVal.
  const classOf = (el) => String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || "");

  function visible(el) {
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return null;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) return null;
    const y = r.top + window.scrollY;
    if (y > maxHeight) return null;
    return { x: Math.round(r.left + window.scrollX), y: Math.round(y), w: Math.round(r.width), h: Math.round(r.height) };
  }

  function add(kind, el, text, limit) {
    if (seen.has(el) || out.filter((e) => e.kind === kind).length >= limit) return;
    const box = visible(el);
    if (!box) return;
    seen.add(el);
    out.push({ key: kind + "-" + (out.filter((e) => e.kind === kind).length + 1), kind, text: text.slice(0, 200), box });
  }

  document.querySelectorAll("nav, header").forEach((el) => add("nav", el, clean(el.innerText), 1));
  document.querySelectorAll("h1").forEach((el) => add("headline", el, clean(el.innerText), 2));
  document.querySelectorAll("h1 + p, h1 ~ p").forEach((el) => add("subhead", el, clean(el.innerText), 1));

  // Buttons and links styled as buttons: a filled background or a border, short text.
  document.querySelectorAll("a, button, [role=button], input[type=submit]").forEach((el) => {
    const text = clean(el.innerText || el.value);
    if (!text || text.length > 40) return;
    const s = getComputedStyle(el);
    const filled = s.backgroundColor !== "rgba(0, 0, 0, 0)" && s.backgroundColor !== "transparent";
    const bordered = parseFloat(s.borderWidth) > 0 && s.borderStyle !== "none";
    const looks = /btn|button|cta/i.test(classOf(el));
    if (filled || bordered || looks || el.tagName === "BUTTON") add("cta", el, text, 8);
  });

  document.querySelectorAll("h2").forEach((el) => add("section", el, clean(el.innerText), 10));

  const imgs = Array.from(document.querySelectorAll("img, video, svg, picture, canvas"))
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width * r.height > 60_000)
    .sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height);
  imgs.forEach(({ el }) => add("image", el, clean(el.getAttribute("alt") || el.tagName.toLowerCase()), 4));

  // Pricing and social proof, found by what they say.
  document.querySelectorAll("section, [id], [class*=pricing], [class*=testimonial], [class*=logos]").forEach((el) => {
    const text = clean(el.innerText).slice(0, 400);
    const label = el.id + " " + classOf(el);
    if (/pricing|plans/i.test(label) || /\$\s?\d+(\.\d+)?\s*\/\s*(mo|month|user|yr|year)/i.test(text)) add("pricing", el, text, 1);
    else if (/testimonial|review|customers|logos|trusted/i.test(label) || /trusted by|loved by|used by|join \d/i.test(text))
      add("proof", el, text, 2);
  });
  document.querySelectorAll("footer").forEach((el) => add("footer", el, clean(el.innerText), 1));

  const h1 = document.querySelector("h1");
  const fonts = new Set();
  document.querySelectorAll("h1, h2, h3, p, a, button").forEach((el) => {
    fonts.add(getComputedStyle(el).fontFamily.split(",")[0].replace(/["']/g, "").trim());
  });
  const bodyText = clean(document.body?.innerText);
  return {
    title: clean(document.title),
    description: clean(document.querySelector('meta[name="description"]')?.getAttribute("content")),
    pageHeight: Math.ceil(document.documentElement.scrollHeight),
    text: bodyText.slice(0, 6000),
    elements: out,
    facts: {
      wordCount: bodyText.split(" ").length,
      headlineFont: h1 ? getComputedStyle(h1).fontFamily.split(",")[0].replace(/["']/g, "") : "none",
      distinctFonts: fonts.size,
      fontList: Array.from(fonts).slice(0, 8).join(", "),
      buttons: out.filter((e) => e.kind === "cta").length,
      hasOgImage: !!document.querySelector('meta[property="og:image"]'),
      hasFavicon: !!document.querySelector('link[rel~="icon"]'),
      imagesWithoutAlt: Array.from(document.images).filter((i) => !i.alt).length,
      pageHeight: Math.ceil(document.documentElement.scrollHeight),
      lang: document.documentElement.lang || "missing",
    },
  };
}`;

type Extracted = {
  title: string;
  description: string;
  pageHeight: number;
  text: string;
  elements: PageElement[];
  facts: Record<string, string | number | boolean>;
};
