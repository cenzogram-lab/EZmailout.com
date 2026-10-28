import { MascotStage } from "@/components/stampy";
import { Button } from "@/components/ui/button";
import { useBackendActor, useResolveTrackingLink } from "@/hooks/use-backend";
import { BRAND } from "@/lib/brand";
import { normalizeRedirectUrl } from "@/lib/qr";
import { Link, useParams } from "@tanstack/react-router";
import { ExternalLink, Home, Loader2 } from "lucide-react";
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
        // The canister only stores and returns web addresses; checked again
        // here so nothing else can ever be navigated to.
        const destinationUrl =
          result.ok && result.destinationUrl
            ? normalizeRedirectUrl(result.destinationUrl)
            : null;
        if (destinationUrl) {
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
    <div className="relative isolate" data-ocid="track.page">
      <div aria-hidden="true" className="ambient-glow-backdrop" />
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
        {phase.kind === "inactive" ? (
          <>
            {/* Stampy with his map: this link leads nowhere yet. */}
            <MascotStage pose="audience" size="md" className="mb-8" />
            <div className="space-y-3">
              <h1
                className="display-heading text-3xl leading-tight sm:text-4xl"
                data-ocid="track.inactive.title"
              >
                This link isn't active
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground">
                The tracking code
                {code ? (
                  <>
                    {" "}
                    <span className="font-mono text-sm tracking-wider text-foreground">
                      "{code}"
                    </span>
                  </>
                ) : (
                  ""
                )}{" "}
                doesn't match a live campaign, or its destination hasn't been
                set yet.
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="mt-8 h-12 w-full gap-2 px-6 text-base sm:w-auto"
              data-ocid="track.home.link"
            >
              <Link to="/">
                <Home className="size-4" /> Go to {BRAND.name}
              </Link>
            </Button>
          </>
        ) : (
          <>
            {/* A raised disc with the spinner while the code resolves. */}
            <div className="btn-3d-neutral mb-8 grid size-16 place-items-center rounded-full text-primary">
              <Loader2 className="size-7 motion-safe:animate-spin" />
            </div>
            <div className="space-y-2">
              <h1
                className="display-heading text-2xl sm:text-3xl"
                data-ocid="track.redirecting.title"
              >
                {phase.kind === "redirecting" ? "Redirecting…" : "One moment…"}
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
                className="mt-6 gap-2"
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
      </div>
    </div>
  );
}
