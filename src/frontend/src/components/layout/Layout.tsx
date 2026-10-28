import { CreditTopUpModal } from "@/components/billing/CreditTopUpModal";
import { BottomNav } from "@/components/layout/BottomNav";
import { StampyPeek } from "@/components/layout/StampyPeek";
import { StampyMark } from "@/components/stampy";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MascotGloss } from "@/components/ui/mascot-gloss";
import { Toaster } from "@/components/ui/sonner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAccountSync } from "@/hooks/use-account";
import { useIsAdmin } from "@/hooks/use-backend";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { useAccountStore } from "@/store/account";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Fingerprint,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mailbox,
  Menu,
  Palette,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

/** Header destinations, each with a mail-themed icon in the brand indigo. */
const NAV = [
  { to: "/templates", label: "Templates", icon: Palette },
  { to: "/campaigns", label: "Campaigns", icon: Mailbox },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin", label: "Admin", icon: ShieldCheck },
] as const;

function useIsActive(to: string): boolean {
  const currentPath = useRouterState().location.pathname;
  return currentPath === to || currentPath.startsWith(`${to}/`);
}

const ocidFor = (label: string) =>
  `nav.${label.toLowerCase().replace(/\s+/g, "_")}.link`;

/**
 * Desktop nav item: a segment of the capsule track in the floating header
 * pill (`.segmented` / `.segmented-item` in index.css). The active section is
 * the raised pill, read from `aria-current="page"`. From `xl` it shows its
 * label; at `lg` the label is visually hidden (still its accessible name) so
 * the bar fits 1024 px.
 */
function NavLink({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
}) {
  const isActive = useIsActive(to);
  return (
    <Link
      to={to}
      title={label}
      data-ocid={ocidFor(label)}
      aria-current={isActive ? "page" : undefined}
      className="segmented-item h-9 shrink-0 gap-2 px-2.5 text-sm tracking-tight focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80 xl:px-3.5"
    >
      <Icon
        className={cn(
          "size-[18px]",
          isActive ? "text-primary" : "text-primary/80",
        )}
        strokeWidth={2.2}
      />
      <span className="sr-only xl:not-sr-only">{label}</span>
    </Link>
  );
}

/** Mobile menu row: a 48 px row with the icon in a tinted tile. */
function MenuLink({
  to,
  label,
  icon: Icon,
  onClick,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
}) {
  const isActive = useIsActive(to);
  return (
    <Link
      to={to}
      onClick={onClick}
      data-ocid={ocidFor(label)}
      className={cn(
        "flex h-12 items-center gap-3 rounded-2xl border px-2 text-base font-semibold transition-smooth focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80",
        isActive
          ? "border-primary/25 bg-primary/10 font-bold text-primary-ink"
          : "border-transparent text-foreground hover:bg-muted",
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" strokeWidth={2.2} />
      </span>
      {label}
    </Link>
  );
}

/** Two characters of the principal, for the avatar disc. */
function initials(principal: string | null): string {
  return principal ? principal.slice(0, 2).toUpperCase() : "";
}

/**
 * Whether the last visit ended signed in, so the placeholder shown while
 * Internet Identity restores the session has the width of what replaces it
 * (credits chip + avatar, or the Sign in button) and the header does not shift.
 */
const SIGNED_IN_HINT = "ezmailout_signed_in";
function readSignedInHint(): boolean {
  try {
    return localStorage.getItem(SIGNED_IN_HINT) === "1";
  } catch {
    return false;
  }
}

function AuthControls({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const setTopUpOpen = useAccountStore((s) => s.setTopUpOpen);
  const {
    isAuthenticated,
    isInitializing,
    isLoggingIn,
    login,
    logout,
    principal,
    creditBalance,
    accountReady,
  } = useAccountSync();
  useEffect(() => {
    if (isInitializing) return;
    try {
      if (isAuthenticated) localStorage.setItem(SIGNED_IN_HINT, "1");
      else localStorage.removeItem(SIGNED_IN_HINT);
    } catch {
      // Storage unavailable: the placeholder falls back to the Sign in width.
    }
  }, [isInitializing, isAuthenticated]);
  if (isInitializing) {
    // Holds the controls' place, so nothing (the nav pill and the peeking
    // Stampy included) jumps sideways when the session check ends.
    return readSignedInHint() ? (
      <output
        className="flex items-center gap-2"
        aria-label="Checking your session"
        data-ocid="nav.auth.loading"
      >
        <span className="hidden h-11 w-32 animate-pulse rounded-full bg-foreground/10 sm:block lg:h-10" />
        <span className="block size-11 animate-pulse rounded-full bg-foreground/10 lg:size-10" />
      </output>
    ) : (
      <output
        className="block size-11 animate-pulse rounded-full bg-foreground/10 sm:w-[5.75rem] lg:h-10"
        aria-label="Checking your session"
        data-ocid="nav.auth.loading"
      />
    );
  }
  if (!isAuthenticated) {
    return (
      <Button
        size="sm"
        onClick={login}
        disabled={isLoggingIn}
        className="size-11 shrink-0 gap-1.5 whitespace-nowrap rounded-full p-0 text-[15px] font-semibold sm:h-11 sm:w-auto sm:px-4 lg:h-10"
        aria-label="Sign in"
        data-ocid="nav.sign_in.button"
      >
        {isLoggingIn ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Fingerprint className="size-[18px]" />
        )}
        {/* On phones the button is the fingerprint alone; Account in the tab bar also signs in. */}
        <span className="hidden sm:inline">Sign in</span>
      </Button>
    );
  }
  const short = principal
    ? `${principal.slice(0, 5)}…${principal.slice(-3)}`
    : "";
  const go = (to: string) => {
    onNavigate?.();
    navigate({ to });
  };
  return (
    <div className="flex items-center gap-2">
      {/* A raised glossy pill: the balance as a heavy figure, "credits"
          small beside it. */}
      <Link
        to="/dashboard"
        onClick={onNavigate}
        className="btn-3d-neutral hidden h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full pl-1.5 pr-3.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80 sm:inline-flex lg:h-10"
        data-ocid="nav.credits.link"
        title={principal ?? undefined}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="size-4" />
        </span>
        {accountReady ? (
          <span className="text-base font-black tabular-nums tracking-tight">
            {creditBalance.toLocaleString()}
          </span>
        ) : (
          <span className="inline-block h-4 w-7 animate-pulse rounded bg-muted" />
        )}{" "}
        <span className="text-xs font-semibold text-muted-foreground">
          credits
        </span>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="btn-3d-primary flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold tracking-wide lg:size-10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
            aria-label="Account menu"
            data-ocid="nav.account.button"
          >
            {initials(principal) || <UserRound className="size-4" />}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={10}
          className="w-64 rounded-3xl p-1.5"
          data-ocid="nav.account.menu"
        >
          <DropdownMenuLabel className="flex flex-col gap-0.5 px-2.5 py-2">
            <span className="text-sm font-semibold text-foreground">
              Signed in
            </span>
            <span className="meta-mono font-normal">{short}</span>
            <span className="mt-2 inline-flex items-baseline gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 self-center text-primary" />
              {accountReady ? (
                <span className="text-2xl font-black tabular-nums tracking-tight text-foreground">
                  {creditBalance.toLocaleString()}
                </span>
              ) : (
                <span className="inline-block h-6 w-10 animate-pulse self-center rounded bg-muted" />
              )}{" "}
              credits
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 rounded-xl"
            onSelect={() => go("/dashboard")}
            data-ocid="nav.account.dashboard"
          >
            <UserRound className="size-4" /> Dashboard
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 rounded-xl"
            onSelect={() => go("/campaigns")}
            data-ocid="nav.account.campaigns"
          >
            <LayoutDashboard className="size-4" /> Campaigns
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 rounded-xl"
            onSelect={() => setTopUpOpen(true)}
            data-ocid="nav.account.top_up"
          >
            <Plus className="size-4" /> Top up credits
          </DropdownMenuItem>
          <ThemeToggle
            variant="menu-item"
            className="rounded-xl"
            data-ocid="nav.account.theme"
          />
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 rounded-xl text-destructive focus:text-destructive"
            onSelect={logout}
            data-ocid="nav.sign_out.button"
          >
            <LogOut className="size-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** The home page's title, from index.html. */
const SITE_TITLE = "EZmailout — Direct Mail Campaigns Without Minimums";

/**
 * Each page names itself in the tab, history and screen readers. /admin
 * keeps the site title: for anyone but the admin it is the 404, and a tab
 * reading "Admin" would give away that the page exists.
 */
function pageTitle(pathname: string): string {
  const page =
    pathname === "/templates"
      ? "Templates"
      : pathname === "/wizard"
        ? "Create a campaign"
        : pathname === "/campaigns"
          ? "Campaigns"
          : pathname.startsWith("/campaigns/")
            ? "Campaign"
            : pathname === "/dashboard"
              ? "Dashboard"
              : pathname.startsWith("/ref/")
                ? "You're invited"
                : null;
  return page ? `${page} · EZmailout` : SITE_TITLE;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isAuthenticated, principal } = useAccountSync();
  useEffect(() => {
    document.title = pageTitle(pathname);
  }, [pathname]);
  // The phone menu closes on any navigation (the tab bar, Back, a link in the
  // page), not only through its own links, and on Escape.
  // biome-ignore lint/correctness/useExhaustiveDependencies: closes on path change by design
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  // The Admin link is for the founder only; customers never see it.
  const isAdmin = useIsAdmin(isAuthenticated ? principal : null);
  const navItems = NAV.filter((item) => item.to !== "/admin" || isAdmin);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* The hidden lighting filter behind `.mascot-3d` (glossy Stampy). */}
      <MascotGloss />
      {/* The header is a transparent sticky band (its footprint is
          --header-h + 4px + the notch inset) holding a floating glass pill.
          Nothing between it and the viewport sets transform, filter, contain
          or overflow. */}
      <header className="sticky top-0 z-50 pt-[env(safe-area-inset-top,0px)]">
        {/* Under a notch the status bar keeps the page colour. */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[env(safe-area-inset-top,0px)] bg-background"
        />
        {/* From 2xl the pill may use up to 100rem: the logo and the peeking Stampy keep growing with the viewport, and the page content (max-w-7xl) stays centred under it. */}
        <div className="mx-auto h-[var(--header-h)] max-w-7xl px-2 pt-[var(--header-gap)] min-[360px]:px-3 sm:px-4 lg:px-6 2xl:max-w-[100rem]">
          {/* Glass at 95 % (page text scrolling under the bar barely shows
              where the blur is clamped at its edges) and 12 px of blur, not
              the utility's 24 px: Chromium's software renderer skips larger
              backdrop blurs, and the bar must look the same everywhere. */}
          <div className="glass-bar relative h-full rounded-full bg-popover/95 backdrop-blur-md backdrop-saturate-150">
            {/* The airmail stripe runs along the pill's bottom edge; the
                peeking Stampy rests his paws on it. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
            >
              <span className="airmail-stripe absolute inset-x-0 bottom-0" />
            </span>
            <div className="relative flex h-full items-center gap-1 pb-[3px] pl-1.5 pr-1.5 min-[360px]:gap-2 sm:gap-3 sm:pl-2 sm:pr-2 lg:pl-3">
              <Link
                to="/"
                data-ocid="nav.logo.link"
                className="flex shrink-0 items-center gap-1.5 rounded-full focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80 min-[360px]:gap-2.5"
              >
                {/* Stampy is the brand mark: his head in an indigo-ringed disc. */}
                <span className="flex size-[clamp(2.5rem,2.1rem+0.9vw,3.25rem)] items-end justify-center overflow-hidden rounded-full bg-primary/10 ring-2 ring-primary/30">
                  <StampyMark className="h-[88%] w-[104%]" />
                </span>
                <span className="font-display text-[clamp(1.125rem,0.95rem+0.55vw,1.5rem)] font-extrabold whitespace-nowrap tracking-tight text-primary">
                  {BRAND.name}
                  {/* The red stamp dot, a shade per theme so it reads on the
                      glass in both (AA). */}
                  <span className="text-[#d33a24] dark:text-[#f05a44]">.</span>
                </span>
              </Link>

              <nav
                aria-label="Main"
                className="hidden flex-1 items-center justify-center gap-2 lg:flex xl:gap-3"
              >
                <ul className="segmented gap-0.5 p-1">
                  {navItems.map((item) => (
                    <li key={item.to} className="flex">
                      <NavLink {...item} />
                    </li>
                  ))}
                </ul>
                <Link
                  to="/wizard"
                  className="shrink-0"
                  data-ocid="nav.launch_campaign.link"
                >
                  <Button
                    className="h-10 shrink-0 gap-2 whitespace-nowrap rounded-full px-4 text-sm font-bold xl:px-5"
                    variant="default"
                  >
                    <Send className="size-[18px]" strokeWidth={2.2} />
                    <span className="xl:hidden">Launch</span>
                    <span className="hidden xl:inline">Launch campaign</span>
                  </Button>
                </Link>
              </nav>

              <div className="ml-auto flex items-center gap-1 self-stretch min-[360px]:gap-1.5 sm:gap-2 lg:ml-0">
                <StampyPeek />
                <div className="flex items-center gap-1 min-[360px]:gap-1.5 sm:gap-2">
                  {/* The phone menu and the account menu carry the switch
                      too; below 390 px the pill has no room for it. */}
                  <ThemeToggle
                    className="hidden size-11 min-[390px]:inline-flex lg:size-10"
                    data-ocid="nav.theme.toggle"
                  />
                  <AuthControls />
                  <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    className="btn-3d-neutral inline-flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80 lg:hidden"
                    aria-label="Toggle menu"
                    aria-expanded={open}
                    data-ocid="nav.mobile_menu.button"
                  >
                    {open ? (
                      <X className="size-5" />
                    ) : (
                      <Menu className="size-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* The 4 px under the pill that --header-h + 4px counts. */}
        <div aria-hidden className="h-1" />
        {open && (
          // A floating sheet under the pill, capped to the space between the
          // header and the tab bar, so on a landscape phone the last rows
          // scroll instead of hiding under it.
          <div className="mx-auto max-w-7xl px-2 pb-2 min-[360px]:px-3 sm:px-4 lg:hidden">
            <div
              className="surface-sheet max-h-[calc(100dvh-var(--header-h)-4px-env(safe-area-inset-top,0px)-var(--bottom-nav-h)-1rem)] overflow-y-auto overscroll-contain p-2"
              data-ocid="nav.mobile.menu"
            >
              <div className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <MenuLink
                    key={item.to}
                    {...item}
                    onClick={() => setOpen(false)}
                  />
                ))}
                <MenuLink
                  to="/wizard"
                  label="Launch campaign"
                  icon={Send}
                  onClick={() => setOpen(false)}
                />
              </div>
              <div aria-hidden className="mx-2 my-1.5 h-px bg-hairline" />
              <ThemeToggle
                variant="row"
                className="px-2"
                data-ocid="nav.mobile.theme"
              />
            </div>
          </div>
        )}
      </header>

      {/* At least one screen tall, so the footer starts below the fold: while
          a page is loading its content is short, and a footer resting on screen
          jumped down when the data arrived (layout shift up to 0.88). */}
      <main className="min-h-[calc(100dvh-var(--header-h)-4px-env(safe-area-inset-top,0px))] flex-1">
        {children}
      </main>

      {/* Extra bottom padding lets the end of every page scroll clear of the
          Stampy launcher in the bottom-right corner and, below lg, the tab bar. */}
      <footer className="border-t border-hairline pb-[calc(6rem+var(--bottom-nav-h))] pt-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <span>
            &copy; {new Date().getFullYear()} {BRAND.site} · Direct mail without
            minimums · Printed and mailed by EZmailout · Built on the Internet
            Computer with{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </span>
          {/* Uppercase, as `monospace-accent` set it before the restyle:
              it has always read "V2.0.0". */}
          <span className="meta-mono uppercase">v2.0.0</span>
        </div>
      </footer>
      <CreditTopUpModal />
      <BottomNav />
      {/* Lifted above the Stampy launcher, which owns the bottom-right corner,
          and the tab bar below lg. */}
      <Toaster
        position="bottom-right"
        richColors
        offset={{ bottom: "calc(92px + var(--bottom-nav-h))" }}
        mobileOffset={{ bottom: "calc(88px + var(--bottom-nav-h))" }}
      />
    </div>
  );
}
