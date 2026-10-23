/**
 * Safe redirect-target validation.
 *
 * `?next=...` (or `?redirect=...`) query params are convenient but dangerous:
 * an attacker can craft a link to `/login?next=https://evil.example` and
 * trick a user into bouncing to a phishing page after a successful login.
 *
 * This helper enforces a strict same-origin path policy. It is intentionally
 * permissive only in ways that match our route shape:
 *
 *   - Must start with `/` (absolute path, not protocol-relative).
 *   - Must NOT start with `//` (protocol-relative URL).
 *   - Must NOT start with `/\` (Windows-style protocol-relative trick).
 *   - Must NOT contain a backslash anywhere (some browsers normalize
 *     `/\evil.example` to `//evil.example`).
 *   - Must be a string at most 2048 chars (defense in depth against DoS).
 *
 * Anything else returns `null` and the caller falls back to a default
 * destination (e.g. `/dashboard`).
 */
export const SAFE_REDIRECT_MAX_LENGTH = 2048;

/**
 * Returns `next` if it is a safe same-origin path, otherwise `fallback`.
 *
 * Use this in server actions and route handlers that read `?next=` from
 * user input. Do not pass `next` to `redirect()` without checking.
 */
export function safeRedirectPath(
  next: string | null | undefined,
  fallback: string
): string {
  if (typeof next !== "string") return fallback;
  if (next.length === 0 || next.length > SAFE_REDIRECT_MAX_LENGTH) {
    return fallback;
  }
  // Must be a rooted path.
  if (next[0] !== "/") return fallback;
  // Reject protocol-relative URLs and Windows-style protocol-relative.
  if (next[1] === "/" || next[1] === "\\") return fallback;
  // Reject any backslashes — some browsers treat them like slashes.
  if (next.includes("\\")) return fallback;
  // Reject embedded control characters.
  if (/[\u0000-\u001f\u007f]/.test(next)) return fallback;
  return next;
}
