import { cn } from "@/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  LayoutDashboard,
  LayoutTemplate,
  Mail,
  Rocket,
  Settings,
} from "lucide-react";

function NavLink({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
}) {
  const router = useRouterState();
  const currentPath = router.location.pathname;
  const isActive = currentPath === to || currentPath.startsWith(`${to}/`);

  return (
    <Link
      to={to}
      data-ocid={`nav.${label.toLowerCase().replace(/\s+/g, "_")}.link`}
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-smooth",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            data-ocid="nav.logo.link"
            className="flex items-center gap-2.5"
          >
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Mail className="size-5" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">
              MailCommand
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/" label="Home" icon={Home} />
            <NavLink to="/templates" label="Templates" icon={LayoutTemplate} />
            <NavLink to="/campaigns" label="Campaigns" icon={LayoutDashboard} />
            <NavLink to="/wizard" label="Launch Campaign" icon={Rocket} />
            <NavLink to="/admin" label="Admin" icon={Settings} />
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <MobileNav />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-muted/40 py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <span>
            &copy; {new Date().getFullYear()} MailCommand. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </span>
          <span className="monospace-accent">v1.0.0</span>
        </div>
      </footer>
    </div>
  );
}

function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const router = useRouterState();
  const currentPath = router.location.pathname;

  const links = [
    { to: "/", label: "Home", icon: Home },
    { to: "/templates", label: "Templates", icon: LayoutTemplate },
    { to: "/campaigns", label: "Campaigns", icon: LayoutDashboard },
    { to: "/wizard", label: "Launch Campaign", icon: Rocket },
    { to: "/admin", label: "Admin", icon: Settings },
  ];

  return (
    <>
      <button
        type="button"
        data-ocid="nav.mobile_menu.button"
        onClick={() => setOpen(!open)}
        className="inline-flex size-9 items-center justify-center rounded-md border bg-card text-foreground"
        aria-label="Toggle menu"
      >
        <span className="sr-only">Menu</span>
        <svg
          className="size-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          {open ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute right-4 top-16 z-50 w-56 rounded-lg border bg-card p-2 shadow-lg">
          {links.map((link) => {
            const isActive =
              currentPath === link.to || currentPath.startsWith(`${link.to}/`);
            return (
              <Link
                key={link.to}
                to={link.to}
                data-ocid={`nav.mobile.${link.label.toLowerCase()}.link`}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-smooth",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <link.icon className="size-4" />
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

import React from "react";
