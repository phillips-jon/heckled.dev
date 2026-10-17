import dns from "node:dns/promises";
import net from "node:net";

// The app fetches whatever URL a stranger pastes, so every host is resolved
// first and refused if any address it resolves to is private, loopback,
// link-local, or otherwise not on the public internet. The browser in
// landing.ts runs every request it makes (redirects and subresources too)
// through checkHost, not only the first one.

function ipv4Private(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast and reserved
  );
}

function ipv6Private(ip: string) {
  const v = ip.toLowerCase();
  if (v === "::" || v === "::1") return true;
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return ipv4Private(mapped[1]);
  return (
    v.startsWith("fc") ||
    v.startsWith("fd") || // unique local
    v.startsWith("fe8") ||
    v.startsWith("fe9") ||
    v.startsWith("fea") ||
    v.startsWith("feb") || // link-local
    v.startsWith("ff") || // multicast
    v.startsWith("64:ff9b:") // NAT64, which can reach IPv4 private space
  );
}

export function isPrivateIp(ip: string) {
  if (net.isIPv4(ip)) return ipv4Private(ip);
  if (net.isIPv6(ip)) return ipv6Private(ip);
  return true;
}

const cache = new Map<string, { ok: boolean; at: number }>();

export async function checkHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "");
  const hit = cache.get(host);
  if (hit && Date.now() - hit.at < 60_000) return hit.ok;
  let ok: boolean;
  if (net.isIP(host)) {
    ok = !isPrivateIp(host);
  } else if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || !host.includes(".")) {
    ok = false;
  } else {
    try {
      const addrs = await dns.lookup(host, { all: true, verbatim: true });
      ok = addrs.length > 0 && addrs.every((a) => !isPrivateIp(a.address));
    } catch {
      ok = false;
    }
  }
  cache.set(host, { ok, at: Date.now() });
  return ok;
}

// Normalizes what someone typed into an http(s) URL, or returns null.
// "acme.com" becomes "https://acme.com/"; fragments are dropped.
export function normalizeUrl(raw: string) {
  let text = raw.trim();
  if (!text) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = `https://${text}`;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== "80" && url.port !== "443") return null;
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  return url;
}
