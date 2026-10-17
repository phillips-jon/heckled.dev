import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import type { NextRequest } from "next/server";
import { MEDIA_DIR } from "@/lib/db";

const TYPES: Record<string, string> = { ".mp3": "audio/mpeg", ".jpg": "image/jpeg", ".png": "image/png" };

// Screenshots and audio, straight off disk. nginx serves /media/ itself in
// production; this covers development and anything nginx doesn't.
export async function GET(request: NextRequest, ctx: RouteContext<"/media/[...path]">) {
  const parts = (await ctx.params).path;
  const file = path.resolve(MEDIA_DIR, ...parts);
  const type = TYPES[path.extname(file)];
  if (!file.startsWith(MEDIA_DIR + path.sep) || !type || !fs.existsSync(file)) {
    return new Response("Not found", { status: 404 });
  }
  const size = fs.statSync(file).size;
  const headers = {
    "Content-Type": type,
    "Cache-Control": "public, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
  };

  // Safari won't play audio without range support.
  const range = request.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    const body = Readable.toWeb(fs.createReadStream(file, { start, end })) as ReadableStream;
    return new Response(body, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  const body = Readable.toWeb(fs.createReadStream(file)) as ReadableStream;
  return new Response(body, { headers: { ...headers, "Content-Length": String(size) } });
}
