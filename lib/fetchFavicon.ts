const ICON_REL_PRIORITY: Record<string, number> = {
  "apple-touch-icon-precomposed": 5,
  "apple-touch-icon": 4,
  "shortcut icon": 3,
  icon: 2,
  "mask-icon": 1,
};

function relScore(rel: string): number {
  return ICON_REL_PRIORITY[rel.trim().toLowerCase()] ?? 0;
}

function sizeScore(sizes: string | null): number {
  if (!sizes) return 0;
  let max = 0;
  for (const part of sizes.split(/\s+/)) {
    const w = parseInt(part, 10);
    if (!isNaN(w) && w > max) max = w;
  }
  return max;
}

function resolveUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

async function probeUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return false;
    const ct = res.headers.get("content-type") ?? "";
    return ct.startsWith("image/") || ct.includes("icon") || ct.includes("octet-stream");
  } catch {
    return false;
  }
}

export async function fetchFavicon(pageUrl: string): Promise<string | null> {
  let origin: string;
  try {
    origin = new URL(pageUrl).origin;
  } catch {
    return null;
  }

  const candidates: Array<{ url: string; rel: number; size: number }> = [];

  try {
    const res = await fetch(pageUrl, {
      cache: "no-store",
      headers: { Accept: "text/html" },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const html = await res.text();
      const linkRe = /<link\b([^>]*?)>/gi;
      let match: RegExpExecArray | null;

      while ((match = linkRe.exec(html)) !== null) {
        const attrs = match[1] ?? "";

        const relMatch = /\brel=["']([^"']+)["']/i.exec(attrs);
        if (!relMatch) continue;
        const score = relScore(relMatch[1] ?? "");
        if (score === 0) continue;

        const hrefMatch = /\bhref=["']([^"']+)["']/i.exec(attrs);
        const href = hrefMatch?.[1]?.trim();
        if (!href || href.startsWith("data:")) continue;

        const resolved = resolveUrl(href, pageUrl);
        if (!resolved) continue;

        const sizesMatch = /\bsizes=["']([^"']+)["']/i.exec(attrs);
        const size = sizeScore(sizesMatch?.[1] ?? null);

        candidates.push({ url: resolved, rel: score, size });
      }
    }
  } catch {
    // Network error or timeout — fall through to favicon.ico
  }

  candidates.sort((a, b) => b.size - a.size || b.rel - a.rel);

  for (const candidate of candidates) {
    if (await probeUrl(candidate.url)) return candidate.url;
  }

  const fallback = `${origin}/favicon.ico`;
  return (await probeUrl(fallback)) ? fallback : null;
}
