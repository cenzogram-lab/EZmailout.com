import { MascotStage, StampyChatAvatarThinking } from "@/components/stampy";
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
      className="relative isolate flex min-h-[60vh] flex-1 items-center justify-center bg-background px-4 py-14 sm:px-6 sm:py-20"
      role="alert"
      data-ocid="route_error.page"
    >
      <div aria-hidden="true" className="ambient-glow-backdrop" />
      <div className="w-full max-w-lg text-center">
        {/* Stampy thinking it over, on stage (decoration). */}
        <MascotStage
          mascot={StampyChatAvatarThinking}
          size="md"
          className="mb-8 sm:mb-10"
        />
        <h1 className="display-heading text-4xl leading-[1.05] sm:text-5xl">
          This page hit a snag
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
          Something went wrong while showing this page. Your campaigns and
          credits are safe. Try again, or reload if it keeps happening.
        </p>
        <div className="mx-auto mt-8 flex max-w-sm flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center">
          <Button
            size="lg"
            className="h-12 gap-2 px-6 text-base"
            onClick={reset}
            data-ocid="route_error.retry.button"
          >
            <RotateCcw className="size-4" />
            Try again
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-12 gap-2 px-6 text-base"
            onClick={() => window.location.reload()}
            data-ocid="route_error.reload.button"
          >
            Reload page
          </Button>
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="h-12 gap-2 px-5 text-base"
          >
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
