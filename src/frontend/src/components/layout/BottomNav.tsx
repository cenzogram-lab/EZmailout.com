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
 * Phone and tablet tab bar (below `lg`, where the header nav collapses): a
 * floating glass capsule dock (95 % opaque, the header pill's glass) over the
 * five slots, --dock-gap above the bottom edge (home-indicator inset
 * included) and at most 28rem wide. The active tab
 * is an enclosed pill (icon and label); Create is a raised glossy indigo
 * button rising out of the dock's middle, clear of the Stampy launcher in the
 * right corner. `--bottom-nav-h` in index.css is the dock's whole footprint
 * (height + gap + inset), and everything else anchored to the bottom (Stampy,
 * toasts, page padding) is offset by it. While the on-screen keyboard is up it
 * slides away (and is `inert`), so it never floats over the field being typed
 * in; the slide clears the gap and the raised Create button too.
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
        "glass-bar fixed inset-x-2 bottom-[var(--dock-gap)] z-40 mx-auto h-[var(--dock-h)] max-w-md rounded-full bg-popover/95 p-1 backdrop-blur-md backdrop-saturate-150 motion-safe:transition-transform min-[360px]:inset-x-4 min-[360px]:p-1.5 lg:hidden",
        keyboardOpen &&
          "pointer-events-none translate-y-[calc(100%+var(--dock-gap)+3rem)]",
      )}
      data-ocid="bottom_nav"
    >
      {/* One row exactly the dock's inner height, so the raised Create
          button overflows upwards instead of growing the row. */}
      <ul className="grid h-full grid-cols-5 grid-rows-1">
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
                className={cn(
                  "group flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5 rounded-full border pb-[7px] text-[10px] font-semibold tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/80 min-[390px]:text-[11px]",
                  create
                    ? "border-transparent"
                    : active
                      ? "border-primary/30 bg-primary/15 font-bold dark:bg-primary/20"
                      : "border-transparent hover:bg-muted/70",
                )}
                data-ocid={`bottom_nav.${ocid}.link`}
              >
                {/* Labels share one baseline (justify-end), so Create's sits
                    level with the others under its raised button, which
                    overflows the dock's top edge. 10 px below 390 px keeps
                    "Campaigns" (bold when active) whole on a 320 px phone. */}
                {create ? (
                  // Ringed in the page colour, so it reads as cut out of the
                  // dock's edge.
                  <span className="btn-3d-primary mb-0.5 flex size-14 shrink-0 items-center justify-center rounded-full ring-4 ring-background motion-safe:group-hover:-translate-y-0.5">
                    <Icon className="size-7" strokeWidth={2.6} />
                  </span>
                ) : (
                  <span
                    className={cn(
                      "relative flex h-6 shrink-0 items-center justify-center",
                      active
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    <Icon
                      className="size-[22px]"
                      strokeWidth={active ? 2.4 : 2}
                    />
                    {badge > 0 ? (
                      <span
                        className="absolute -right-3 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-popover bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground shadow-sm"
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
                    // shrink-0: under the raised Create button the column
                    // overflows, and a shrinking label would collapse to 0.
                    "max-w-full shrink-0 truncate leading-tight",
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
