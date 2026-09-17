import { fetchWebsiteMetadata } from "./fetchMetadata";

export async function fetchFavicon(pageUrl: string): Promise<string | null> {
  const meta = await fetchWebsiteMetadata(pageUrl);
  return meta.favicon;
}

