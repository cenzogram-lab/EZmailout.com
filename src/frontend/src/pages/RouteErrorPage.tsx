import { StampyMark } from "@/components/stampy";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { type ErrorComponentProps, Link } from "@tanstack/react-router";
import { Home, RotateCcw } from "lucide-react";

/**
 * Shown by the router when a page throws while rendering (`defaultErrorComponent`
 * in App.tsx), instead of the router's bare error text — and instead of a blank
 * screen, which is what an uncaught render error leaves in React 19. The
 * error's text is not shown: it can be a canister reject or a stack frame,
 * which means nothing to a customer.
 */
export function RouteErrorPage({ reset }: ErrorComponentProps) {
  return (
    <div
      className="flex min-h-[60vh] flex-1 items-center justify-center bg-background px-4 py-16 sm:px-6"
      role="alert"
      data-ocid="route_error.page"
    >
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto mb-6 grid size-20 place-items-center overflow-hidden rounded-full bg-card shadow-soft ring-[3px] ring-primary">
          <StampyMark className="mt-[8%] h-[88%] w-[104%]" />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          This page hit a snag
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base text-muted-foreground">
          Something went wrong while showing this page. Your campaigns and
          credits are safe. Try again, or reload if it keeps happening.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            size="lg"
            className="gap-2"
            onClick={reset}
            data-ocid="route_error.retry.button"
          >
            <RotateCcw className="size-4" />
            Try again
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            onClick={() => window.location.reload()}
            data-ocid="route_error.reload.button"
          >
            Reload page
          </Button>
          <Button asChild variant="ghost" size="lg" className="gap-2">
            <Link to="/" data-ocid="route_error.home.link">
              <Home className="size-4" />
              {BRAND.name} home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
