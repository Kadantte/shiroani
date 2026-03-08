/**
 * Shared Utilities
 */

/**
 * Extract a human-readable error message from an unknown error value.
 *
 * @param error - The caught error value (could be anything)
 * @param fallback - Fallback message when error is not an Error instance (default: stringifies the error)
 * @returns A string error message
 */
export function extractErrorMessage(error: unknown, fallback?: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  return fallback ?? String(error);
}

/**
 * Normalize path separators to forward slashes.
 * Pure string operation - safe for both Node.js and browser environments.
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

/**
 * Formats byte size for human-readable display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
