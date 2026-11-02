import { Button } from "@/components/ui/button";
import {
  COOKIE_CONSENT_EVENT,
  hasCookieConsent,
  setCookieConsent,
} from "@/lib/cookieConsent";
import { Link } from "@tanstack/react-router";
import { Cookie } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * The cookie notice: a floating glass capsule shown until it is accepted on
 * this device (`ezmailout_cookie_consent`). It is a notice, not a modal: the
 * page stays usable behind it. Below `sm` it spans the width above the
 * Stampy launcher and the tab dock; from `sm` it sits bottom left, clear of
 * the launcher in the bottom right corner. It hides while an on screen
 * keyboard is up (`.hide-with-keyboard`), like the launcher.
 */
export function CookieBanner() {
  const [show, setShow] = useState(() => !hasCookieConsent());

  useEffect(() => {
    const sync = () => setShow(!hasCookieConsent());
    window.addEventListener(COOKIE_CONSENT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!show) return null;

  return (
    <section
      aria-label="Cookie notice"
      className="hide-with-keyboard fixed inset-x-3 bottom-[calc(5.75rem+var(--bottom-nav-h))] z-30 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 sm:inset-x-auto sm:bottom-[calc(1.25rem+var(--bottom-nav-h))] sm:left-5 sm:w-[min(24rem,calc(100vw-14rem))]"
      data-ocid="cookie.banner"
    >
      <div className="rounded-2xl border border-hairline-strong bg-popover/95 p-4 text-popover-foreground shadow-raised backdrop-blur-md">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary-text">
            <Cookie className="size-[18px]" aria-hidden />
          </span>
          <p className="text-sm leading-relaxed text-foreground/90">
            We use necessary cookies and storage on your device to keep you
            signed in securely, save your design drafts and process print
            orders. No tracking or advertising.
          </p>
        </div>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-10 px-3 sm:h-9"
          >
            <Link
              to="/cookies"
              hash="choices"
              data-ocid="cookie.banner.customize"
            >
              Customize / view policy
            </Link>
          </Button>
          <Button
            size="sm"
            className="h-10 px-4 sm:h-9"
            onClick={() => setCookieConsent(true)}
            data-ocid="cookie.banner.accept"
          >
            Accept all
          </Button>
        </div>
      </div>
    </section>
  );
}
