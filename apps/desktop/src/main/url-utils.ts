/**
 * Shared URL helpers used by the main process.
 *
 * Kept in its own module so both `window.ts` and the IPC layer can import from
 * it without creating a cycle (window.ts → ipc/register.ts → ipc/browser.ts).
 */

const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Whether `url` is an external URL safe to hand to `shell.openExternal` or
 * to forward into a new-tab request. Parses via the WHATWG URL parser so
 * IDN-encoded hosts, `javascript:`/`data:` URLs, and malformed strings are
 * all rejected.
 */
export function isExternalUrlAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_EXTERNAL_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}
