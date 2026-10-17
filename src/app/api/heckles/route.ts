import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { countRecentByIp, countSince, createHeckle, findCached, hashIp } from "@/lib/heckles";
import { getRoaster, isLanguage } from "@/lib/roasters";
import { checkHost, normalizeUrl } from "@/lib/ssrf";
import { wakeWorker } from "@/lib/worker";

// Part of the cache key: bump it when the roasts change enough that a cached
// one from before would be a worse show.
const PIPELINE = "v3";
const PER_HOUR = Number(process.env.RATE_LIMIT_PER_HOUR || 3);
// The kill switch on spend: no new heckles past this many in a day.
const PER_DAY = Number(process.env.DAILY_HECKLE_CAP || 400);

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? normalizeUrl(body.url) : null;
  const roaster = getRoaster(String(body?.roaster || ""));
  const language = String(body?.language || "en");
  if (!url || !(await checkHost(url.hostname))) return NextResponse.json({ error: "url" }, { status: 400 });
  if (!roaster || !isLanguage(language)) return NextResponse.json({ error: "generic" }, { status: 400 });

  // Same page, same roaster, same language within a day: hand back that roast.
  const inputHash = crypto.createHash("sha256").update(`${PIPELINE}|${url}`).digest("hex");
  const cached = findCached(inputHash, roaster.id, language);
  if (cached) return NextResponse.json({ slug: cached.slug, path: `/h/${cached.slug}`, cached: true });

  // nginx sets X-Real-IP; anything else in front of the app is ignored.
  const ip = request.headers.get("x-real-ip") || "local";
  const ipHash = hashIp(ip);
  if (countRecentByIp(ipHash, 3600_000) >= PER_HOUR) return NextResponse.json({ error: "rate" }, { status: 429 });
  if (countSince(24 * 3600_000) >= PER_DAY) return NextResponse.json({ error: "busy" }, { status: 503 });

  const heckle = createHeckle({ mode: "landing", sourceUrl: url.toString(), inputHash, roaster: roaster.id, language, ipHash });
  wakeWorker();
  return NextResponse.json(
    { slug: heckle.slug, path: `/h/${heckle.slug}`, deleteToken: heckle.deleteToken },
    { status: 201 },
  );
}
