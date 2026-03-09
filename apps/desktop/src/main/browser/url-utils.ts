/**
 * Normalize a URL input:
 * - If it already has a protocol, use it as-is
 * - If it looks like a domain (contains a dot), prepend https://
 * - Otherwise treat as a search query
 */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();

  // Already has a protocol
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    return trimmed;
  }

  // Looks like a domain (contains a dot and no spaces)
  if (trimmed.includes('.') && !trimmed.includes(' ')) {
    return `https://${trimmed}`;
  }

  // Treat as a search query
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}
