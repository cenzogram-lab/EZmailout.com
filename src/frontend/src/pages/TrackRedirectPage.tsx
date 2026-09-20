import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBackendActor, useResolveTrackingLink } from "@/hooks/use-backend";
import { BRAND } from "@/lib/brand";
import { Link, useParams } from "@tanstack/react-router";
import { ExternalLink, Home, Loader2, Unlink } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Phase =
  | { kind: "resolving" }
  | { kind: "redirecting"; destinationUrl: string }
  | { kind: "inactive" };

/**
 * `/t/$code` and `/track/$code`: resolves a dynamic QR tracking code on the
 * canister (which records the scan) and forwards to the destination URL.
 */
export function TrackRedirectPage() {
  const params = useParams({ strict: false }) as { code?: string };
  const code = (params.code ?? "").trim();
  const { ready } = useBackendActor();
  const { mutateAsync: resolveLink } = useResolveTrackingLink();
  const [phase, setPhase] = useState<Phase>(
    code ? { kind: "resolving" } : { kind: "inactive" },
  );
  const fired = useRef(false);

  useEffect(() => {
    if (!code || !ready || fired.current) return;
    fired.current = true;
    resolveLink({ code, userAgent: navigator.userAgent })
      .then((result) => {
        if (result.ok && result.destinationUrl) {
          const destinationUrl = result.destinationUrl;
          setPhase({ kind: "redirecting", destinationUrl });
          window.location.replace(destinationUrl);
        } else {
          setPhase({ kind: "inactive" });
        }
      })
      .catch(() => {
        setPhase({ kind: "inactive" });
      });
  }, [code, ready, resolveLink]);

  return (
    <div
      className="mx-auto flex min-h-[60vh] max-w-md items-center px-4 py-12"
      data-ocid="track.page"
    >
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          {phase.kind === "inactive" ? (
            <>
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Unlink className="size-6" />
              </div>
              <div className="space-y-1">
                <h1
                  className="font-display text-xl font-semibold text-foreground"
                  data-ocid="track.inactive.title"
                >
                  This link isn't active
                </h1>
                <p className="text-sm text-muted-foreground">
                  The tracking code{code ? ` "${code}"` : ""} doesn't match a
                  live campaign, or its destination hasn't been set yet.
                </p>
              </div>
              <Button asChild className="gap-2" data-ocid="track.home.link">
                <Link to="/">
                  <Home className="size-4" /> Go to {BRAND.name}
                </Link>
              </Button>
            </>
          ) : (
            <>
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Loader2 className="size-6 animate-spin" />
              </div>
              <div className="space-y-1">
                <h1
                  className="font-display text-xl font-semibold text-foreground"
                  data-ocid="track.redirecting.title"
                >
                  {phase.kind === "redirecting"
                    ? "Redirecting…"
                    : "One moment…"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {phase.kind === "redirecting"
                    ? "Taking you to the destination."
                    : "Looking up this tracking link."}
                </p>
              </div>
              {phase.kind === "redirecting" && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  data-ocid="track.destination.link"
                >
                  <a href={phase.destinationUrl} rel="noreferrer">
                    <ExternalLink className="size-4" /> Continue if you aren't
                    redirected
                  </a>
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
