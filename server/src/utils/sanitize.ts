const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
};

const ESCAPE_REGEX = /&(?!#?\w+;)|[<>"'/]/g;

/** Escapes HTML special characters to reduce reflected/stored XSS vectors. */
export const sanitizeString = (value: string): string => value.replace(ESCAPE_REGEX, (char) => ESCAPE_MAP[char] ?? char);

/** Deeply sanitizes strings in plain objects/arrays while preserving primitives. */
export const sanitizeUnknown = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return sanitizeString(value.trim());
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeUnknown(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, sanitizeUnknown(nested)]),
    );
  }

  return value;
};
