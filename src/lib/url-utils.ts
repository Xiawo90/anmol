/**
 * URL validation and sanitization utilities for study materials.
 * Only allows http/https protocols to prevent XSS attacks.
 */

/**
 * Validates that a string is a well-formed http(s) URL.
 */
export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitizes a URL string – trims whitespace and verifies protocol.
 * Returns the sanitised URL or null if invalid.
 */
export function sanitizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!isValidUrl(trimmed)) return null;
  return trimmed;
}

/**
 * Returns true when the URL points to an external resource (not a data: URI
 * or Supabase storage blob that should be downloaded instead).
 */
export function isExternalLink(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}
