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
import { Toaster } from "@/components/ui/sonner";
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
 * Desktop nav item: a 40 px pill with a 20 px indigo icon. From `xl` it shows
 * its label; at `lg` the label is visually hidden (still its accessible name)
 * so the bar fits 1024 px.
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
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 text-[15px] font-semibold transition-smooth xl:px-4",
        isActive
          ? "bg-primary/10 text-primary-ink"
          : "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
      )}
    >
      <Icon
        className={cn("size-5", isActive ? "text-primary" : "text-primary/75")}
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
        "flex h-12 items-center gap-3 rounded-2xl px-2 text-base font-semibold transition-smooth",
        isActive
          ? "bg-primary/10 text-primary-ink"
          : "text-foreground hover:bg-muted",
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
        <span className="hidden h-10 w-32 animate-pulse rounded-full bg-foreground/10 sm:block" />
        <span className="block size-10 animate-pulse rounded-full bg-foreground/10" />
      </output>
    ) : (
      <output
        className="block h-10 w-10 animate-pulse rounded-full bg-foreground/10 sm:w-[5.75rem]"
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
        className="size-10 shrink-0 gap-1.5 whitespace-nowrap rounded-full bg-primary p-0 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90 sm:h-10 sm:w-auto sm:px-4"
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
      <Link
        to="/dashboard"
        onClick={onNavigate}
        className="hidden h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border/60 bg-card px-4 text-sm font-semibold shadow-soft sm:inline-flex"
        data-ocid="nav.credits.link"
        title={principal ?? undefined}
      >
        <Sparkles className="size-4 text-primary" />
        {accountReady ? (
          creditBalance.toLocaleString()
        ) : (
          <span className="inline-block h-3.5 w-7 animate-pulse rounded bg-muted" />
        )}{" "}
        credits
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-deep text-sm font-bold text-primary-foreground shadow-soft ring-2 ring-card transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
            aria-label="Account menu"
            data-ocid="nav.account.button"
          >
            {initials(principal) || <UserRound className="size-4" />}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-60 rounded-2xl p-1.5"
          data-ocid="nav.account.menu"
        >
          <DropdownMenuLabel className="flex flex-col gap-0.5 px-2.5 py-2">
            <span className="text-sm font-semibold text-foreground">
              Signed in
            </span>
            <span className="font-mono text-xs font-normal text-muted-foreground">
              {short}
            </span>
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              {accountReady ? (
                creditBalance.toLocaleString()
              ) : (
                <span className="inline-block h-3.5 w-7 animate-pulse rounded bg-muted" />
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

export function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isAuthenticated, principal } = useAccountSync();
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
      <header className="sticky top-0 z-50 bg-background pt-[env(safe-area-inset-top,0px)]">
        {/* From 2xl the bar may use up to 100rem: the logo and the peeking Stampy keep growing with the viewport, and the page content (max-w-7xl) stays centred under it. */}
        <div className="mx-auto flex h-[var(--header-h)] max-w-7xl items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8 2xl:max-w-[100rem]">
          <Link
            to="/"
            data-ocid="nav.logo.link"
            className="flex shrink-0 items-center gap-2.5"
          >
            {/* Stampy is the brand mark: his head in an indigo-ringed disc. */}
            <span className="flex size-[clamp(2.5rem,2.1rem+0.9vw,3.25rem)] items-end justify-center overflow-hidden rounded-full bg-primary/10 ring-2 ring-primary/30">
              <StampyMark className="h-[88%] w-[104%]" />
            </span>
            <span className="font-display text-[clamp(1.125rem,0.95rem+0.55vw,1.5rem)] font-extrabold whitespace-nowrap tracking-tight text-primary">
              {BRAND.name}
              <span className="text-[#e5402a]">.</span>
            </span>
          </Link>

          <nav
            aria-label="Main"
            className="hidden flex-1 items-center justify-center gap-2 lg:flex"
          >
            <div className="flex items-center gap-0.5 rounded-full border border-border/60 bg-card p-1 shadow-soft">
              {navItems.map((item) => (
                <NavLink key={item.to} {...item} />
              ))}
            </div>
            <Link to="/wizard" data-ocid="nav.launch_campaign.link">
              <Button
                className="h-10 shrink-0 gap-2 whitespace-nowrap rounded-full px-5 text-[15px] font-semibold"
                variant="default"
              >
                <Send className="size-[18px]" strokeWidth={2.2} />
                <span className="xl:hidden">Launch</span>
                <span className="hidden xl:inline">Launch campaign</span>
              </Button>
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-1.5 self-stretch sm:gap-2 lg:ml-0">
            <StampyPeek />
            <div className="flex items-center gap-1.5 sm:gap-2">
              <AuthControls />
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="inline-flex size-10 items-center justify-center rounded-full border border-border/60 bg-card text-foreground shadow-soft lg:hidden"
                aria-label="Toggle menu"
                aria-expanded={open}
                data-ocid="nav.mobile_menu.button"
              >
                {open ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          </div>
        </div>
        <div className="airmail-stripe" aria-hidden />
        {open && (
          // Capped to the space between the header and the tab bar, so on a
          // landscape phone the last rows scroll instead of hiding under it.
          <div
            className="max-h-[calc(100dvh-var(--header-h)-4px-env(safe-area-inset-top,0px)-var(--bottom-nav-h))] overflow-y-auto overscroll-contain border-b border-border/60 bg-card px-4 py-3 lg:hidden"
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
      <footer className="border-t border-border/60 pb-[calc(6rem+var(--bottom-nav-h))] pt-8">
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
          <span className="monospace-accent">v2.0.0</span>
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
