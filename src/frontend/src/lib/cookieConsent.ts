/**
 * The cookie notice's answer, kept on this device (localStorage
 * `ezmailout_cookie_consent` = "true"). EZmailout sets no tracking or
 * advertising storage, so the notice only records that it was seen and
 * accepted; clearing it (the Cookie Policy's "Show the notice again") brings
 * the banner back. Storage can be unavailable (private windows, blocked site
 * data), so every access is guarded and the banner simply shows again.
 */
export const COOKIE_CONSENT_KEY = "ezmailout_cookie_consent";
export const COOKIE_CONSENT_EVENT = "ezmailout:cookie-consent";

export function hasCookieConsent(): boolean {
  try {
    return localStorage.getItem(COOKIE_CONSENT_KEY) === "true";
  } catch {
    return false;
  }
}

export function setCookieConsent(accepted: boolean): void {
  try {
    if (accepted) localStorage.setItem(COOKIE_CONSENT_KEY, "true");
    else localStorage.removeItem(COOKIE_CONSENT_KEY);
  } catch {
    // Nothing to keep: the notice shows again on the next visit.
  }
  window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
}
