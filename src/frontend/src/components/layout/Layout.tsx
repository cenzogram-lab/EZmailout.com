import { CreditTopUpModal } from "@/components/billing/CreditTopUpModal";
import { BottomNav } from "@/components/layout/BottomNav";
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
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { useAccountStore } from "@/store/account";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Fingerprint,
  LayoutDashboard,
  LayoutTemplate,
  Loader2,
  LogOut,
  Mail,
  Menu,
  Plus,
  Rocket,
  Settings,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { to: "/templates", label: "Templates", icon: LayoutTemplate },
  { to: "/campaigns", label: "Campaigns", icon: LayoutDashboard },
  { to: "/dashboard", label: "Dashboard", icon: UserRound },
  { to: "/admin", label: "Admin", icon: Settings },
] as const;

function NavLink({
  to,
  label,
  icon: Icon,
  onClick,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
}) {
  const currentPath = useRouterState().location.pathname;
  const isActive = currentPath === to || currentPath.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      onClick={onClick}
      data-ocid={`nav.${label.toLowerCase().replace(/\s+/g, "_")}.link`}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-smooth",
        isActive
          ? "bg-primary/10 text-primary-ink"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

/** Two characters of the principal, for the avatar disc. */
function initials(principal: string | null): string {
  return principal ? principal.slice(0, 2).toUpperCase() : "";
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
  } = useAccountSync();
  if (isInitializing) {
    return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  }
  if (!isAuthenticated) {
    return (
      <Button
        size="sm"
        onClick={login}
        disabled={isLoggingIn}
        className="gap-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
        data-ocid="nav.sign_in.button"
      >
        {isLoggingIn ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Fingerprint className="size-4" />
        )}
        Sign in
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
        className="hidden h-9 items-center gap-1.5 rounded-full border border-border/60 bg-card px-3.5 text-xs font-semibold shadow-soft sm:inline-flex"
        data-ocid="nav.credits.link"
        title={principal ?? undefined}
      >
        <Sparkles className="size-3.5 text-primary" />
        {creditBalance.toLocaleString()} credits
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-deep text-xs font-bold text-primary-foreground shadow-soft ring-2 ring-card transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
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
              {creditBalance.toLocaleString()} credits
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
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            data-ocid="nav.logo.link"
            className="flex items-center gap-2.5"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
              <Mail className="size-5" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-primary">
              {BRAND.name}
              <span className="text-primary">.</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-2 lg:flex">
            <div className="flex items-center gap-0.5 rounded-full border border-border/60 bg-card p-1 shadow-soft">
              {NAV.map((item) => (
                <NavLink key={item.to} {...item} />
              ))}
            </div>
            <Link to="/wizard" data-ocid="nav.launch_campaign.link">
              <Button
                size="sm"
                className="h-9 gap-1.5 rounded-full px-4"
                variant="default"
              >
                <Rocket className="size-4" /> Launch campaign
              </Button>
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <AuthControls />
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="inline-flex size-9 items-center justify-center rounded-full border border-border/60 bg-card text-foreground shadow-soft lg:hidden"
              aria-label="Toggle menu"
              data-ocid="nav.mobile_menu.button"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        {open && (
          <div
            className="border-t border-border/60 bg-card px-4 py-3 lg:hidden"
            data-ocid="nav.mobile.menu"
          >
            <div className="flex flex-col gap-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  {...item}
                  onClick={() => setOpen(false)}
                />
              ))}
              <NavLink
                to="/wizard"
                label="Launch campaign"
                icon={Rocket}
                onClick={() => setOpen(false)}
              />
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

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
