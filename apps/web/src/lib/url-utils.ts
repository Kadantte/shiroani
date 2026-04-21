/**
 * Normalize a URL input:
 * - If it already has a protocol, use it as-is
 * - If it looks like a domain (contains a dot), prepend https://
 * - Otherwise treat as a search query
 */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();

  // Already has a protocol — only allow http(s), treat others as search
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    const protocol = trimmed.split('://')[0].toLowerCase();
    if (protocol === 'http' || protocol === 'https') {
      return trimmed;
    }
    return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
  }

  // Looks like a domain (contains a dot and no spaces)
  if (trimmed.includes('.') && !trimmed.includes(' ')) {
    return `https://${trimmed}`;
  }

  // Treat as a search query
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

/**
 * Normalize a user-entered host for the adblock whitelist:
 * - Lowercase + trim
 * - Strip leading protocol (`http://`, `https://`)
 * - Strip leading `www.`
 * - Drop any path / query / port — keep just the bare hostname
 *
 * Returns the normalized host, or an empty string if the input is invalid.
 *
 * Stricter than {@link hostFromUrl}: this accepts raw user text (including
 * bare hostnames) and never throws; used for canonicalising entries before
 * they hit persistent storage.
 */
export function normalizeWhitelistHost(input: string): string {
  const raw = input.trim().toLowerCase();
  if (!raw) return '';

  // Strip protocol
  let candidate = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  // Strip everything after the first `/`, `?`, or `#`
  candidate = candidate.split(/[/?#]/)[0];
  // Strip credentials if any `user:pass@host` sneaks through
  const atIndex = candidate.lastIndexOf('@');
  if (atIndex !== -1) candidate = candidate.slice(atIndex + 1);
  // Strip port
  candidate = candidate.split(':')[0];
  // Strip leading www.
  if (candidate.startsWith('www.')) candidate = candidate.slice(4);

  return candidate;
}

/**
 * Parse a full URL string and return its bare hostname (without `www.`),
 * or `null` if the input is not a valid URL. Use this when you already have
 * a well-formed URL string (e.g. `tab.url`, an RSS item link) and need a
 * display host — it does not try to recover from malformed input the way
 * {@link normalizeWhitelistHost} does.
 */
export function hostFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
