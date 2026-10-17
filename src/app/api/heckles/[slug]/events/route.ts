import type { NextRequest } from "next/server";
import { getHeckleBySlug, IN_PROGRESS } from "@/lib/heckles";

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
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status, error: h?.error ?? null })}\n\n`));
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
