import { PaymentStatus } from "@/backend";
import { useAccountSync } from "@/hooks/use-account";
import { useCampaigns } from "@/hooks/use-backend";
import { cn } from "@/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import { House, Mailbox, SquarePen, UserRound } from "lucide-react";

const TABS = [
  { to: "/", label: "Home", icon: House, ocid: "home" },
  { to: "/wizard", label: "Create", icon: SquarePen, ocid: "create" },
  { to: "/campaigns", label: "Campaigns", icon: Mailbox, ocid: "campaigns" },
  { to: "/dashboard", label: "Account", icon: UserRound, ocid: "account" },
] as const;

function isActive(path: string, to: string): boolean {
  if (to === "/") return path === "/";
  return path === to || path.startsWith(`${to}/`);
}

/**
 * Phone and tablet tab bar (below `lg`, where the header nav collapses).
 * Fixed to the viewport edge above the home indicator; `--bottom-nav-h` in
 * index.css is its height, and everything else anchored to the bottom
 * (Stampy, toasts, page padding) is offset by it. Hidden on the QR redirect
 * routes, which recipients rather than customers land on.
 */
export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isAuthenticated } = useAccountSync();
  const { data: campaigns } = useCampaigns(isAuthenticated);
  if (path.startsWith("/t/") || path.startsWith("/track/")) return null;

  // Unpaid drafts expire after 14 days, so they are worth a count.
  const drafts = isAuthenticated
    ? (campaigns ?? []).filter((c) => c.paymentStatus === PaymentStatus.Unpaid)
        .length
    : 0;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] lg:hidden"
      data-ocid="bottom_nav"
    >
      {/* Fades the page out under the floating bar, so content never peeks
          through the gap between the pill and the screen edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-4 bottom-0 -z-10 bg-gradient-to-t from-background from-60% to-transparent"
      />
      <div className="mx-auto flex h-14 max-w-md items-stretch gap-1 rounded-full border border-border/60 bg-card p-1 shadow-soft">
        {TABS.map(({ to, label, icon: Icon, ocid }) => {
          const active = isActive(path, to);
          const badge = to === "/campaigns" ? drafts : 0;
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-semibold transition-colors",
                active
                  ? "bg-primary/10 text-primary-ink"
                  : "text-muted-foreground hover:text-foreground",
              )}
              data-ocid={`bottom_nav.${ocid}.link`}
            >
              <span className="relative">
                <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
                {badge > 0 ? (
                  <span
                    className="absolute -right-3 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-card bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground"
                    aria-label={`${badge} unpaid ${badge === 1 ? "draft" : "drafts"}`}
                    data-ocid={`bottom_nav.${ocid}.badge`}
                  >
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </span>
              <span className="max-w-full truncate px-1">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
