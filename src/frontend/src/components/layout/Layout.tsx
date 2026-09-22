import { CreditTopUpModal } from "@/components/billing/CreditTopUpModal";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useAccountSync } from "@/hooks/use-account";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Fingerprint,
  LayoutDashboard,
  LayoutTemplate,
  Loader2,
  LogOut,
  Mail,
  Menu,
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
        "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-smooth",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

function AuthControls({ onNavigate }: { onNavigate?: () => void }) {
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
        className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
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
  return (
    <div className="flex items-center gap-2">
      <Link
        to="/dashboard"
        onClick={onNavigate}
        className="hidden items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium sm:inline-flex"
        data-ocid="nav.credits.link"
        title={principal ?? undefined}
      >
        <Sparkles className="size-3.5 text-primary" />
        {creditBalance.toLocaleString()} credits
        <span className="font-mono text-muted-foreground">· {short}</span>
      </Link>
      <Button
        variant="ghost"
        size="sm"
        onClick={logout}
        className="gap-1.5"
        data-ocid="nav.sign_out.button"
      >
        <LogOut className="size-4" />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            data-ocid="nav.logo.link"
            className="flex items-center gap-2.5"
          >
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Mail className="size-5" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-primary">
              {BRAND.name}
              <span className="text-primary">.</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <NavLink key={item.to} {...item} />
            ))}
            <Link
              to="/wizard"
              data-ocid="nav.launch_campaign.link"
              className="ml-2"
            >
              <Button size="sm" className="gap-1.5" variant="default">
                <Rocket className="size-4" /> Launch campaign
              </Button>
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <AuthControls />
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="inline-flex size-9 items-center justify-center rounded-md border bg-card text-foreground lg:hidden"
              aria-label="Toggle menu"
              data-ocid="nav.mobile_menu.button"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        {open && (
          <div
            className="border-t bg-card px-4 py-3 lg:hidden"
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

      <footer className="border-t bg-muted/40 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <span>
            &copy; {new Date().getFullYear()} {BRAND.site} · Direct mail without
            minimums · Fulfilled by Click2Mail · Built on the Internet Computer
            with{" "}
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
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
