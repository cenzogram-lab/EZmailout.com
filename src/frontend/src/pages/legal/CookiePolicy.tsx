import { Button } from "@/components/ui/button";
import {
  COOKIE_CONSENT_EVENT,
  hasCookieConsent,
  setCookieConsent,
} from "@/lib/cookieConsent";
import { PRIVACY_EMAIL } from "@/lib/legal";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { useEffect, useState } from "react";
import {
  LegalPage,
  type LegalSection,
  List,
  Mail,
  P,
  Strong,
} from "./LegalPage";

interface StorageItem {
  name: string;
  where: string;
  purpose: string;
  lasts: string;
}

const NECESSARY: StorageItem[] = [
  {
    name: "Internet Identity session",
    where: "IndexedDB (the sign in library's database)",
    purpose:
      "Holds the temporary key and signed delegation that keep you securely signed in. Created only when you sign in.",
    lasts: "Until you sign out, or 30 days at most",
  },
  {
    name: "Campaign draft",
    where: "IndexedDB (ezmailout)",
    purpose:
      "Keeps your order across the wizard steps and recovers your studio design if the page is closed or reloaded.",
    lasts: "Until you pay, start over or sign out",
  },
  {
    name: "ezmailout_support_outbox",
    where: "localStorage",
    purpose:
      "Holds a support message that could not be sent yet, so it is delivered when the connection returns.",
    lasts: "Until the message is sent",
  },
  {
    name: "ezmailout_cookie_consent",
    where: "localStorage",
    purpose:
      "Remembers that you accepted this notice so it is not shown again.",
    lasts: "Until you clear it here or in your browser",
  },
  {
    name: "Payment processor cookies",
    where: "Cookies set by our payment processor's checkout",
    purpose:
      "Set only when the secure checkout opens, to process the payment and prevent fraud.",
    lasts: "As set by the payment processor, typically up to one year",
  },
];

const FUNCTIONAL: StorageItem[] = [
  {
    name: "ezmailout_theme",
    where: "localStorage",
    purpose: "Remembers whether you chose the light or the dark theme.",
    lasts: "Until you change it or clear site data",
  },
  {
    name: "ez_return_address",
    where: "localStorage",
    purpose:
      "Remembers the return address you saved, so the next campaign is filled in for you.",
    lasts: "Until you sign out or clear site data",
  },
  {
    name: "ezmailout_hide_stampy_tips",
    where: "localStorage",
    purpose: "Remembers that you hid Stampy's tips in the wizard.",
    lasts: "Until you show the tips again",
  },
  {
    name: "ezmailout_signed_in",
    where: "localStorage",
    purpose:
      "Remembers whether your last visit ended signed in, so the header does not jump while the session loads.",
    lasts: "Until you sign out",
  },
  {
    name: "ez_ref",
    where: "localStorage",
    purpose:
      "Keeps a referral code from a link you opened until your account is linked to it.",
    lasts: "Until the referral is applied",
  },
];

function StorageTable({ items }: { items: StorageItem[] }) {
  return (
    <ul className="divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline">
      {items.map((it) => (
        <li
          key={it.name}
          className="grid gap-1 bg-card-raised px-4 py-3 text-sm sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-x-4"
        >
          <div className="min-w-0">
            <p className="break-words font-semibold text-foreground">
              {it.name}
            </p>
            <p className="meta-mono mt-0.5 break-words">{it.where}</p>
          </div>
          <div className="min-w-0 text-foreground/85">
            <p>{it.purpose}</p>
            <p className="mt-1 text-muted-foreground">Kept: {it.lasts}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The notice's state on this device, with a way to bring it back. */
function ConsentChoices() {
  const [accepted, setAccepted] = useState(hasCookieConsent);
  useEffect(() => {
    const sync = () => setAccepted(hasCookieConsent());
    window.addEventListener(COOKIE_CONSENT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-hairline bg-card-raised p-4 sm:flex-row sm:items-center sm:justify-between"
      data-ocid="legal.cookies.choices"
    >
      <div className="flex items-start gap-3 text-sm">
        {accepted ? (
          <CheckCircle2
            className="mt-0.5 size-5 shrink-0 text-emerald-brand"
            aria-hidden
          />
        ) : (
          <CircleDashed
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
        )}
        <div>
          <p className="font-semibold text-foreground">
            {accepted
              ? "You have accepted the cookie notice on this device."
              : "You have not accepted the cookie notice on this device yet."}
          </p>
          <p className="text-muted-foreground">
            Strictly necessary and functional storage is always on: the Service
            cannot sign you in or keep your draft without it. There is no
            analytics or advertising storage to switch on or off.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {accepted ? (
          <Button
            variant="outline"
            className="h-11 sm:h-9"
            onClick={() => setCookieConsent(false)}
            data-ocid="legal.cookies.reset.button"
          >
            Show the notice again
          </Button>
        ) : (
          <Button
            className="h-11 sm:h-9"
            onClick={() => setCookieConsent(true)}
            data-ocid="legal.cookies.accept.button"
          >
            Accept all
          </Button>
        )}
      </div>
    </div>
  );
}

const SECTIONS: LegalSection[] = [
  {
    id: "what",
    title: "Cookies and storage on your device",
    body: (
      <>
        <P>
          Cookies are small text files a website stores in your browser.
          Websites can also keep information on your device with{" "}
          <Strong>localStorage</Strong> and <Strong>sessionStorage</Strong>{" "}
          (simple key and value storage) and <Strong>IndexedDB</Strong> (a small
          database in the browser). This policy calls all of these "storage" and
          explains what EZmailout keeps on your device and why.
        </P>
        <P>
          <Strong>
            EZmailout sets no advertising, analytics or cross site tracking
            cookies and uses no tracking pixels.
          </Strong>{" "}
          EZmailout itself sets no cookies at all: it uses localStorage and
          IndexedDB for the items below. The only cookies involved are set by
          our payment processor when you open the secure checkout.
        </P>
      </>
    ),
  },
  {
    id: "necessary",
    title: "Strictly necessary storage",
    body: (
      <>
        <P>
          Needed to sign you in securely, keep your order together across the
          wizard steps and take payment. The Service does not work without it,
          so it cannot be switched off (although you can clear it, see Section
          6).
        </P>
        <StorageTable items={NECESSARY} />
      </>
    ),
  },
  {
    id: "functional",
    title: "Functional storage",
    body: (
      <>
        <P>
          Remembers choices you make so you do not have to repeat them. It never
          leaves your device and is not used to track you.
        </P>
        <StorageTable items={FUNCTIONAL} />
      </>
    ),
  },
  {
    id: "performance",
    title: "Performance and analytics",
    body: (
      <>
        <P>
          <Strong>None.</Strong> EZmailout does not use analytics or performance
          cookies, third party behavioural advertising, or tracking pixels. If
          we ever add first party analytics, we will update this policy and ask
          for your consent first where the law requires it.
        </P>
        <P>
          Some features load content from other services, which receive your IP
          address and browser information when they do: the radius map (map
          tiles and address search from OpenStreetMap), the secure checkout (our
          payment processor) and AI generated images (our AI provider's image
          host). See the{" "}
          <Link
            to="/privacy"
            hash="sharing"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </P>
      </>
    ),
  },
  {
    id: "choices",
    title: "Your choices",
    body: (
      <>
        <P>
          The cookie notice is shown on your first visit. Your answer is kept on
          this device.
        </P>
        <ConsentChoices />
      </>
    ),
  },
  {
    id: "manage",
    title: "Managing or blocking storage in your browser",
    body: (
      <>
        <P>
          You can view, delete and block cookies and site data in your browser
          settings. Blocking or clearing strictly necessary storage signs you
          out and removes unsaved drafts on that device.
        </P>
        <List
          items={[
            <>
              <Strong>Chrome:</Strong> Settings, then Privacy and security, then
              Third party cookies or Site settings, then View permissions and
              data stored across sites.
            </>,
            <>
              <Strong>Safari (Mac):</Strong> Settings, then Privacy, then Manage
              Website Data. <Strong>Safari (iPhone and iPad):</Strong> Settings,
              then Apps, then Safari, then Advanced, then Website Data.
            </>,
            <>
              <Strong>Firefox:</Strong> Settings, then Privacy and Security,
              then Cookies and Site Data, then Manage Data.
            </>,
            <>
              <Strong>Edge:</Strong> Settings, then Cookies and site
              permissions, then Manage and delete cookies and site data.
            </>,
          ]}
        />
        <P>
          Signing out of EZmailout also clears your draft, remembered return
          address and session from that browser.
        </P>
      </>
    ),
  },
  {
    id: "contact",
    title: "Changes and contact",
    body: (
      <>
        <P>
          We will update this policy when the storage we use changes, with a new
          "last updated" date. Questions: <Mail to={PRIVACY_EMAIL} />.
        </P>
      </>
    ),
  },
];

export function CookiePolicy() {
  return (
    <LegalPage
      slug="cookies"
      title="Cookie Policy"
      summary={
        <p>
          What EZmailout stores in your browser and why. In short: only what is
          needed to sign you in, keep your design and order, take payment and
          remember your preferences. No analytics, no advertising, no cross site
          tracking.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
