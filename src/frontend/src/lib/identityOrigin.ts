/**
 * Internet Identity derives a user's principal from the origin they sign in
 * on, so ezmailout.com and www.ezmailout.com would otherwise be two separate
 * accounts. Both hosts sign in as the canonical origin; II lets www do that
 * because https://ezmailout.com/.well-known/ii-alternative-origins lists it
 * (public/.well-known/ii-alternative-origins).
 */
export const CANONICAL_ORIGIN = "https://ezmailout.com";

/** Hosts that sign in as CANONICAL_ORIGIN. Every one except the canonical
 * host itself must be listed in ii-alternative-origins, or II refuses it. */
export const CANONICAL_HOSTS: readonly string[] = [
  "ezmailout.com",
  "www.ezmailout.com",
];

/**
 * AuthClient options for a page on `hostname`: the canonical derivation
 * origin on an ezmailout.com host, otherwise `undefined`, which keeps
 * env.json's `ii_derivation_origin` — the canister's own URL, previews and
 * localhost sign in as themselves.
 */
export function identityCreateOptions(
  hostname: string,
): { derivationOrigin: string } | undefined {
  return CANONICAL_HOSTS.includes(hostname.toLowerCase())
    ? { derivationOrigin: CANONICAL_ORIGIN }
    : undefined;
}
