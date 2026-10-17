import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { connection } from "next/server";
import sharp from "sharp";
import { MEDIA_DIR } from "@/lib/db";
import { getHeckleBySlug } from "@/lib/heckles";
import { getRoaster } from "@/lib/roasters";

export const alt = "A roast on Heckled";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ACCENT = "#ff6a3d";

// The share card: the site, the score, the one line people will quote, and
// the top of the page that got roasted.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connection();
  const h = getHeckleBySlug(slug);
  const anton = await readFile(path.join(process.cwd(), "assets/Anton-Regular.ttf"));

  let shot: string | null = null;
  if (h?.imagePath) {
    try {
      const buf = await sharp(path.join(MEDIA_DIR, h.imagePath))
        .extract({ left: 0, top: 0, width: 1280, height: 800 })
        .resize(560)
        .jpeg({ quality: 80 })
        .toBuffer();
      shot = `data:image/jpeg;base64,${buf.toString("base64")}`;
    } catch {}
  }
  const host = h?.sourceUrl ? new URL(h.sourceUrl).hostname.replace(/^www\./, "") : "heckled.dev";
  const burn = h?.script?.top_burn ?? "Paste a URL. Get heckled.";
  const roaster = h ? getRoaster(h.roaster)?.name : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0f0f11",
          backgroundImage: "radial-gradient(70% 70% at 30% -10%, rgba(255,106,61,0.22), transparent 70%)",
          color: "#fafafa",
          padding: 56,
          fontFamily: "Anton",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, letterSpacing: 1 }}>
            <svg width="44" height="44" viewBox="0 0 40 40">
              <path
                d="M20 5c3 0 4 3 6 3s4-2 6 0-1 4 0 6 4 2 4 5-3 3-3 5 2 4 0 6-4 0-6 1-2 4-5 4-3-3-5-3-4 2-6 0-1-4-3-5-5-1-5-4 3-3 3-5-2-4 0-6 4 0 5-2-1-4 1-5 4 0 6 0 2-4 6-4z"
                fill={ACCENT}
              />
              <path d="M13.5 15.5c1-2 3-3.5 5-4" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" fill="none" />
              <path d="M20 13c-1-3 0-5 2-6M20 13c-3-1-5 0-6 1M20 13c3-1 5 0 6 2" stroke="#3f8f3a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            </svg>
            HECKLED!
          </div>
          <div style={{ display: "flex", marginTop: 34, fontSize: 60, lineHeight: 1, textTransform: "uppercase", color: "#a1a1aa" }}>
            {host.length > 22 ? host.slice(0, 21) + "…" : host}
          </div>
          <div style={{ display: "flex", marginTop: 22, fontSize: burn.length > 80 ? 46 : 56, lineHeight: 1.08 }}>“{burn}”</div>
          <div style={{ display: "flex", marginTop: "auto", fontSize: 26, color: "#a1a1aa", letterSpacing: 1, textTransform: "uppercase" }}>
            {roaster ? `Roasted by ${roaster}` : "heckled.dev"}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", width: 400 }}>
          {h?.score != null && (
            <div style={{ display: "flex", alignItems: "flex-end", color: ACCENT }}>
              <span style={{ fontSize: 170, lineHeight: 0.9 }}>{h.score}</span>
              <span style={{ fontSize: 48, color: "#a1a1aa", marginLeft: 8, marginBottom: 6 }}>/10</span>
            </div>
          )}
          {shot && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shot} width={380} height={237} style={{ marginTop: "auto", borderRadius: 14, border: "2px solid #34343a", transform: "rotate(-3deg)" }} />
          )}
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Anton", data: anton, weight: 400, style: "normal" }] },
  );
}
