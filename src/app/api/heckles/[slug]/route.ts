import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { MEDIA_DIR } from "@/lib/db";
import { deleteHeckle, getHeckleBySlug } from "@/lib/heckles";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/heckles/[slug]">) {
  const { slug } = await ctx.params;
  const h = getHeckleBySlug(slug);
  if (!h) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ status: h.status, error: h.error, hasAnalysis: !!h.analysis });
}

// The submitter's browser keeps the delete token; there are no accounts.
export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/heckles/[slug]">) {
  const { slug } = await ctx.params;
  const h = getHeckleBySlug(slug);
  const token = request.headers.get("x-delete-token") || "";
  if (
    !h ||
    token.length !== h.deleteToken.length ||
    !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(h.deleteToken))
  ) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  deleteHeckle(h.id);
  await fs.rm(path.join(MEDIA_DIR, h.id), { recursive: true, force: true });
  return NextResponse.json({ ok: true });
}
