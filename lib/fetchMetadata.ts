export interface WebsiteMetadata {
  favicon: string | null;
  ogImage: string | null;
  ogTitle: string | null;
}

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

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function resolveUrl(href: string | null | undefined, base: string): string | null {
  if (!href) return null;
  const decoded = decodeHtmlEntities(href.trim());
  if (!decoded || decoded.startsWith("data:") || decoded.startsWith("javascript:")) {
    return null;
  }
  try {
    const resolved = new URL(decoded, base).href;
    if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
      return resolved;
    }
    return null;
  } catch {
    return null;
  }
}

async function probeUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    const ct = res.headers.get("content-type") ?? "";
    return ct.startsWith("image/") || ct.includes("icon") || ct.includes("octet-stream");
  } catch {
    return false;
  }
}

/**
 * Parses raw HTML string and extracts og:image, title, and favicon candidates.
 * Uses native DOMParser where available (browser/newtab page) with regex fallback (service worker).
 */
function parseHtmlMetadata(html: string, pageUrl: string): WebsiteMetadata {
  let origin: string;
  try {
    origin = new URL(pageUrl).origin;
  } catch {
    origin = "";
  }

  let effectiveBase = pageUrl;
  let ogImage: string | null = null;
  let ogTitle: string | null = null;
  const faviconCandidates: Array<{ url: string; rel: number; size: number }> = [];

  // Check <base href="...">
  const baseTagMatch = /<base\b[^>]*\bhref\s*=\s*(?:["']([^"']*)["']|([^\s>]+))/i.exec(html);
  const rawBase = baseTagMatch ? (baseTagMatch[1] ?? baseTagMatch[2]) : null;
  if (rawBase) {
    effectiveBase = resolveUrl(rawBase, pageUrl) || pageUrl;
  }

  // 1. Try DOMParser if available (instant, robust, fully handles entity decoding & any attribute layout)
  if (typeof DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");

      const baseElem = doc.querySelector("base[href]");
      if (baseElem) {
        const bHref = baseElem.getAttribute("href");
        effectiveBase = resolveUrl(bHref, pageUrl) || effectiveBase;
      }

      // Priority 1: OpenGraph and Twitter image meta tags
      const ogSelectors = [
        'meta[property="og:image" i]',
        'meta[property="og:image:url" i]',
        'meta[property="og:image:secure_url" i]',
        'meta[name="og:image" i]',
        'meta[name="twitter:image" i]',
        'meta[name="twitter:image:src" i]',
        'meta[property="twitter:image" i]',
        'meta[itemprop="image" i]',
      ];

      for (const selector of ogSelectors) {
        const metaTags = doc.querySelectorAll(selector);
        for (const tag of metaTags) {
          const raw = tag.getAttribute("content") || tag.getAttribute("value");
          const resolved = resolveUrl(raw, effectiveBase);
          if (resolved) {
            ogImage = resolved;
            break;
          }
        }
        if (ogImage) break;
      }

      // Priority 2: <link rel="image_src" href="...">
      if (!ogImage) {
        const linkImg = doc.querySelector('link[rel="image_src" i]');
        if (linkImg) {
          ogImage = resolveUrl(linkImg.getAttribute("href"), effectiveBase);
        }
      }

      // Extract title
      const titleMeta =
        doc.querySelector('meta[property="og:title" i]') ||
        doc.querySelector('meta[name="twitter:title" i]');
      ogTitle = titleMeta?.getAttribute("content")?.trim() || doc.title?.trim() || null;

      // Extract favicon links
      const links = doc.querySelectorAll("link[rel]");
      links.forEach((link) => {
        const rel = link.getAttribute("rel") || "";
        const score = relScore(rel);
        if (score === 0) return;
        const href = link.getAttribute("href");
        const resolved = resolveUrl(href, effectiveBase);
        if (!resolved) return;
        const size = sizeScore(link.getAttribute("sizes"));
        faviconCandidates.push({ url: resolved, rel: score, size });
      });
    } catch {
      // Fall through to regex-based extraction
    }
  }

  // 2. Regex fallback for environments without DOMParser (e.g. background service worker)
  if (!ogImage) {
    const metaRegex = /<meta\b[^>]*>/gi;
    let match: RegExpExecArray | null;
    while ((match = metaRegex.exec(html)) !== null) {
      const tag = match[0];
      if (
        /\b(?:property|name|itemprop)\s*=\s*["'](?:og:image(?::url|:secure_url)?|twitter:image(?::src)?|image)["']/i.test(
          tag,
        )
      ) {
        const contentMatch = /\b(?:content|value)\s*=\s*(?:["']([^"']*)["']|([^\s>]+))/i.exec(tag);
        const raw = contentMatch ? (contentMatch[1] ?? contentMatch[2]) : null;
        if (raw) {
          const resolved = resolveUrl(raw, effectiveBase);
          if (resolved) {
            ogImage = resolved;
            break;
          }
        }
      }
    }
  }

  if (!ogImage) {
    const linkImgMatch =
      /<link\b[^>]*\brel\s*=\s*["']image_src["'][^>]*\bhref\s*=\s*(?:["']([^"']*)["']|([^\s>]+))/i.exec(
        html,
      );
    const rawLink = linkImgMatch ? (linkImgMatch[1] ?? linkImgMatch[2]) : null;
    if (rawLink) {
      ogImage = resolveUrl(rawLink, effectiveBase);
    }
  }

  if (!ogTitle) {
    const titleTagMatch = /<title\b[^>]*>([^<]+)<\/title>/i.exec(html);
    if (titleTagMatch && titleTagMatch[1]) {
      ogTitle = decodeHtmlEntities(titleTagMatch[1].trim());
    }
  }

  if (faviconCandidates.length === 0) {
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
      const resolved = resolveUrl(href, pageUrl);
      if (!resolved) continue;

      const sizesMatch = /\bsizes=["']([^"']+)["']/i.exec(attrs);
      const size = sizeScore(sizesMatch?.[1] ?? null);
      faviconCandidates.push({ url: resolved, rel: score, size });
    }
  }

  // Sort favicon candidates by priority and size
  faviconCandidates.sort((a, b) => b.size - a.size || b.rel - a.rel);
  const primaryFavicon = faviconCandidates[0]?.url || (origin ? `${origin}/favicon.ico` : null);

  return {
    favicon: primaryFavicon,
    ogImage,
    ogTitle,
  };
}

/**
 * Converts a raw binary ArrayBuffer into a base64 data URL string.
 */
function bufferToDataUrl(buffer: ArrayBuffer, mimeType: string): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

/**
 * Downloads the actual OG image bytes from its resolved URL and encodes it as a lightweight data URL.
 * Resizes large preview images down to max width 360px (preserving aspect ratio) using OffscreenCanvas
 * when available, keeping storage lightweight (< 25KB per image).
 */
export async function downloadImageAsDataUrlDirect(imageUrl: string): Promise<string | null> {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("data:")) return imageUrl;

  try {
    const res = await fetch(imageUrl, {
      redirect: "follow",
      referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(10000),
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });

    if (!res.ok) return null;

    const rawCt = res.headers.get("content-type") || "image/jpeg";
    const contentType = (rawCt.split(";")[0] ?? "image/jpeg").trim().toLowerCase();
    const isImage =
      contentType.startsWith("image/") ||
      contentType.includes("octet-stream") ||
      /\.(png|jpe?g|webp|gif|svg|avif)($|\?)/i.test(imageUrl);

    if (!isImage) {
      return null;
    }

    const blob = await res.blob();

    // Resize & compress to lightweight WebP if OffscreenCanvas is available and format is not SVG
    if (
      typeof OffscreenCanvas !== "undefined" &&
      typeof createImageBitmap !== "undefined" &&
      !contentType.includes("svg")
    ) {
      try {
        const bitmap = await createImageBitmap(blob);
        const maxWidth = 360;
        const scale = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));

        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0, width, height);
          bitmap.close();

          const compressedBlob = await canvas.convertToBlob({
            type: "image/webp",
            quality: 0.82,
          });

          const buffer = await compressedBlob.arrayBuffer();
          return bufferToDataUrl(buffer, "image/webp");
        }
        bitmap.close();
      } catch {
        // Fall through to direct buffer conversion below
      }
    }

    // Direct buffer conversion fallback
    const buffer = await blob.arrayBuffer();
    return bufferToDataUrl(
      buffer,
      contentType.includes("octet-stream") ? "image/jpeg" : contentType,
    );
  } catch {
    return null;
  }
}

export const downloadImageAsDataUrl = downloadImageAsDataUrlDirect;

/**
 * Downloads an image as a data URL. Routes through the background service worker
 * when available to bypass CORS and Referer restrictions.
 */
export async function downloadImage(imageUrl: string): Promise<string | null> {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("data:")) return imageUrl;

  // 1. If in Chrome extension environment, try background service worker first (bypasses CORS & hotlinking)
  if (
    typeof window !== "undefined" &&
    typeof chrome !== "undefined" &&
    chrome.runtime &&
    typeof chrome.runtime.sendMessage === "function"
  ) {
    try {
      const response = await new Promise<{ success: boolean; dataUrl?: string } | null>(
        (resolve) => {
          chrome.runtime.sendMessage({ type: "DOWNLOAD_IMAGE", url: imageUrl }, (res) => {
            if (chrome.runtime.lastError || !res) {
              resolve(null);
            } else {
              resolve(res);
            }
          });
        },
      );

      if (response?.success && response.dataUrl) {
        return response.dataUrl;
      }
    } catch {
      // Fall through to direct download
    }
  }

  // 2. Direct download fallback
  return downloadImageAsDataUrlDirect(imageUrl);
}

/**
 * Directly performs the HTTP fetch, HTML metadata extraction, and downloads the actual OG image.
 */
export async function fetchWebsiteMetadataDirect(pageUrl: string): Promise<WebsiteMetadata> {
  const normalizedUrl =
    pageUrl.startsWith("http://") || pageUrl.startsWith("https://")
      ? pageUrl
      : `https://${pageUrl}`;

  try {
    const res = await fetch(normalizedUrl, {
      cache: "no-store",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(7500),
    });

    if (!res.ok) {
      return { favicon: null, ogImage: null, ogTitle: null };
    }

    const html = await res.text();
    // Resolve relative to final response URL if available (handles redirects)
    const effectiveUrl = res.url || normalizedUrl;
    const meta = parseHtmlMetadata(html, effectiveUrl);

    // If no OG image found, and URL is on a subdomain (e.g. open.spotify.com),
    // try checking the root apex domain (e.g. spotify.com) as a brand fallback
    if (!meta.ogImage) {
      try {
        const parsed = new URL(effectiveUrl);
        const hostParts = parsed.hostname.split(".");
        if (hostParts.length > 2) {
          const apex = hostParts.slice(-2).join(".");
          const genericHosts = [
            "github.io",
            "vercel.app",
            "web.app",
            "herokuapp.com",
            "netlify.app",
            "pages.dev",
          ];
          if (!genericHosts.includes(apex)) {
            const apexUrl = `https://${apex}`;
            const apexRes = await fetch(apexUrl, {
              cache: "no-store",
              headers: {
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
              },
              redirect: "follow",
              referrerPolicy: "no-referrer",
              signal: AbortSignal.timeout(5000),
            });
            if (apexRes.ok) {
              const apexHtml = await apexRes.text();
              const apexMeta = parseHtmlMetadata(apexHtml, apexRes.url || apexUrl);
              if (apexMeta.ogImage) {
                meta.ogImage = apexMeta.ogImage;
              }
            }
          }
        }
      } catch {}
    }

    // If an OG image was extracted, download the actual image and store it as a local data URL
    if (meta.ogImage) {
      const localImageDataUrl = await downloadImageAsDataUrlDirect(meta.ogImage);
      meta.ogImage = localImageDataUrl;
    }

    return meta;
  } catch {
    return { favicon: null, ogImage: null, ogTitle: null };
  }
}

// Module-level in-memory cache and in-flight promise deduplication map
const metadataCache = new Map<string, WebsiteMetadata>();
const inflightFetches = new Map<string, Promise<WebsiteMetadata>>();

/**
 * Fetches website metadata (OpenGraph preview image, title, and favicon).
 * Uses in-memory caching and request deduplication to prevent redundant network calls
 * and state thrashing on re-renders.
 */
export async function fetchWebsiteMetadata(
  pageUrl: string,
  forceRefresh = false,
): Promise<WebsiteMetadata> {
  const normalized = pageUrl.trim();
  if (!normalized) {
    return { favicon: null, ogImage: null, ogTitle: null };
  }

  // Check cache unless forceRefresh requested
  if (!forceRefresh) {
    const cached = metadataCache.get(normalized);
    if (cached && (cached.ogImage || cached.favicon)) {
      return cached;
    }
  }

  // Deduplicate in-flight requests for the same URL
  const existingPromise = inflightFetches.get(normalized);
  if (existingPromise && !forceRefresh) {
    return existingPromise;
  }

  const fetchPromise = (async () => {
    try {
      // 1. If in Chrome extension environment, try background service worker first (bypasses CORS)
      if (
        typeof window !== "undefined" &&
        typeof chrome !== "undefined" &&
        chrome.runtime &&
        typeof chrome.runtime.sendMessage === "function"
      ) {
        try {
          const response = await new Promise<{ success: boolean; data?: WebsiteMetadata } | null>(
            (resolve) => {
              chrome.runtime.sendMessage(
                { type: "FETCH_WEBSITE_METADATA", url: normalized, forceRefresh },
                (res) => {
                  if (chrome.runtime.lastError || !res) {
                    resolve(null);
                  } else {
                    resolve(res);
                  }
                },
              );
            },
          );

          if (response?.success && response?.data) {
            const data = response.data;
            if (data.ogImage || data.favicon) {
              metadataCache.set(normalized, data);
            }
            return data;
          }
        } catch {
          // Fall through to direct fetch
        }
      }

      // 2. Direct fetch fallback
      const data = await fetchWebsiteMetadataDirect(normalized);
      if (data.ogImage || data.favicon) {
        metadataCache.set(normalized, data);
      }
      return data;
    } finally {
      inflightFetches.delete(normalized);
    }
  })();

  inflightFetches.set(normalized, fetchPromise);
  return fetchPromise;
}
