import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Home, LayoutDashboard, MailX } from "lucide-react";

/** Friendly 404 page for unknown routes. */
export function NotFoundPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4 py-20 sm:px-6">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto mb-6 inline-flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MailX className="size-8" />
        </div>
        <div className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Error 404
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Return to sender
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base text-muted-foreground">
          We couldn't find that page. It may have moved, or the link had a typo.
          Head back home or jump straight to your campaigns.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="gap-2">
            <Link to="/" data-ocid="not_found.home.link">
              <Home className="size-4" />
              Back to {BRAND.name}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
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
