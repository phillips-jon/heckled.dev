import type { NextRequest } from "next/server";
import { getHeckleBySlug, IN_PROGRESS, type PageElement } from "@/lib/heckles";

// The best of what was found, in the order a heckler would notice it: the
// headline first, a few buttons, then pricing and proof.
const ORDER: [string, number][] = [
  ["headline", 1],
  ["subhead", 1],
  ["cta", 3],
  ["pricing", 1],
  ["proof", 1],
  ["section", 2],
  ["image", 1],
];

function highlights(elements: PageElement[]) {
  return ORDER.flatMap(([kind, max]) =>
    elements
      // Skip slivers (dividers, decorative lines): nothing to point at.
      .filter((e) => e.kind === kind && e.text.trim() && e.box.w >= 40 && e.box.h >= 14)
      // Real calls to action, not nav links: buttons below the top bar.
      .filter((e) => kind !== "cta" || e.box.y > 80)
      .slice(0, max),
  ).map((e) => ({ kind: e.kind, text: e.text.slice(0, 90), box: e.box }));
}

// Server-sent events for the waiting page: one message each time the status
// changes, then the stream ends when the heckle is finished one way or another.
// The page falls back to polling GET /api/heckles/[slug] if this drops.
export async function GET(request: NextRequest, ctx: RouteContext<"/api/heckles/[slug]/events">) {
  const { slug } = await ctx.params;
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      let last = "";
      const tick = () => {
        const h = getHeckleBySlug(slug);
        const status = h?.status ?? "missing";
        if (status !== last) {
          last = status;
          // Once the page is read, the waiting room gets the screenshot and
          // what was found on it, to show the heckler going through it.
          const page =
            h?.input && h.imagePath
              ? {
                  image: `/media/${h.imagePath}`,
                  height: h.imageHeight ?? 800,
                  elements: highlights(h.input.elements),
                }
              : null;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status, error: h?.error ?? null, page })}\n\n`));
        }
        if (!h || !IN_PROGRESS.includes(h.status)) {
          clearInterval(timer);
          controller.close();
        }
      };
      tick();
      timer = setInterval(tick, 500);
      request.signal.addEventListener("abort", () => clearInterval(timer));
    },
    cancel() {
      clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
