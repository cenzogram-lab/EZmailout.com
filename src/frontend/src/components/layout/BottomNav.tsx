import { PaymentStatus } from "@/backend";
import { useAccountSync } from "@/hooks/use-account";
import { useCampaigns } from "@/hooks/use-backend";
import { useSoftKeyboardOpen } from "@/hooks/use-soft-keyboard";
import { cn } from "@/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import { House, Mailbox, Palette, Plus, UserRound } from "lucide-react";

const TABS = [
  { to: "/", label: "Home", icon: House, ocid: "home" },
  { to: "/templates", label: "Templates", icon: Palette, ocid: "templates" },
  { to: "/wizard", label: "Create", icon: Plus, ocid: "create" },
  { to: "/campaigns", label: "Campaigns", icon: Mailbox, ocid: "campaigns" },
  { to: "/dashboard", label: "Account", icon: UserRound, ocid: "account" },
] as const;

function isActive(path: string, to: string): boolean {
  if (to === "/") return path === "/";
  return path === to || path.startsWith(`${to}/`);
}

/**
 * Phone and tablet tab bar (below `lg`, where the header nav collapses): an
 * opaque sheet across the bottom edge with rounded top corners, five slots and
 * Create as a raised indigo button in the middle. The active tab gets a tinted
 * pill behind its icon and an indigo label. `--bottom-nav-h` in index.css is
 * the sheet's height including the home-indicator inset, and everything else
 * anchored to the bottom (Stampy, toasts, page padding) is offset by it; the
 * Create button rises above the sheet in the middle, clear of the Stampy
 * launcher in the right corner. While the on-screen keyboard is up it slides
 * away (and is `inert`), so it never floats over the field being typed in.
 * Hidden on the QR redirect routes, which recipients rather than customers
 * land on.
 */
export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isAuthenticated } = useAccountSync();
  const { data: campaigns } = useCampaigns(isAuthenticated);
  const keyboardOpen = useSoftKeyboardOpen();
  if (path.startsWith("/t/") || path.startsWith("/track/")) return null;

  // Unpaid drafts expire after 14 days, so they are worth a count.
  const drafts = isAuthenticated
    ? (campaigns ?? []).filter((c) => c.paymentStatus === PaymentStatus.Unpaid)
        .length
    : 0;

  return (
    <nav
      aria-label="Primary"
      inert={keyboardOpen}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 rounded-t-[1.75rem] border-t border-border/60 bg-card pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-10px_30px_-18px_rgb(15_23_42/0.35)] motion-safe:transition-transform lg:hidden",
        keyboardOpen && "pointer-events-none translate-y-full",
      )}
      data-ocid="bottom_nav"
    >
      <ul className="mx-auto grid h-[4.25rem] max-w-lg grid-cols-5 px-1">
        {TABS.map(({ to, label, icon: Icon, ocid }) => {
          const active = isActive(path, to);
          const badge = to === "/campaigns" ? drafts : 0;
          const create = to === "/wizard";
          return (
            <li key={to} className="flex min-w-0">
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                aria-label={create ? "Create a campaign" : undefined}
                className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1 rounded-2xl pb-2.5 text-[10px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 min-[360px]:text-[11px]"
                data-ocid={`bottom_nav.${ocid}.link`}
              >
                {/* Labels share one baseline (justify-end), so Create's sits
                    level with the others under its raised button. 10 px below
                    360 px keeps "Campaigns" whole on a 320 px phone. */}
                {create ? (
                  // Raised above the sheet, ringed in the card colour so it
                  // reads as cut out of the bar.
                  <span className="-mt-9 mb-0.5 flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-[5px] ring-card transition-transform group-active:scale-95 motion-safe:group-hover:-translate-y-0.5">
                    <Icon className="size-7" strokeWidth={2.6} />
                  </span>
                ) : (
                  <span
                    className={cn(
                      "relative flex h-8 w-14 shrink-0 items-center justify-center rounded-full transition-colors",
                      active
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground group-hover:bg-muted group-hover:text-foreground",
                    )}
                  >
                    <Icon
                      className="size-[22px]"
                      strokeWidth={active ? 2.4 : 2}
                    />
                    {badge > 0 ? (
                      <span
                        className="absolute -top-1 right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-card bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground"
                        aria-label={`${badge} unpaid ${badge === 1 ? "draft" : "drafts"}`}
                        data-ocid={`bottom_nav.${ocid}.badge`}
                      >
                        {badge > 9 ? "9+" : badge}
                      </span>
                    ) : null}
                  </span>
                )}
                <span
                  className={cn(
                    "max-w-full truncate px-0.5",
                    active ? "text-primary-ink" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
