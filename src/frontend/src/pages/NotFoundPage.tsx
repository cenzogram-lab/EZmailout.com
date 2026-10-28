import { MascotStage } from "@/components/stampy";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Home, LayoutDashboard } from "lucide-react";

/**
 * Friendly 404 page for unknown routes: Stampy waving a postcard on stage
 * under a soft brand backlight, a heavy headline and the way home.
 */
export function NotFoundPage() {
  return (
    <div className="relative isolate flex flex-1 items-center justify-center bg-background px-4 py-14 sm:px-6 sm:py-20">
      <div aria-hidden="true" className="ambient-glow-backdrop" />
      <div className="w-full max-w-lg text-center">
        <MascotStage pose="mail" size="lg" className="mb-8 sm:mb-10" />
        <div className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Error 404
        </div>
        <h1 className="display-heading mt-3 text-4xl leading-[1.05] sm:text-5xl">
          Return to sender
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
          We couldn't find that page. It may have moved, or the link had a typo.
          Head back home or jump straight to your campaigns.
        </p>
        <div className="mx-auto mt-8 flex max-w-sm flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center">
          <Button asChild size="lg" className="h-12 gap-2 px-6 text-base">
            <Link to="/" data-ocid="not_found.home.link">
              <Home className="size-4" />
              Back to {BRAND.name}
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 gap-2 px-6 text-base"
          >
            <Link to="/campaigns" data-ocid="not_found.campaigns.link">
              <LayoutDashboard className="size-4" />
              My campaigns
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
