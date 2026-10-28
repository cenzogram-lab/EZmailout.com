import { MascotStage } from "@/components/stampy";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAccountSync } from "@/hooks/use-account";
import { useBackendActor, useEnsureAccount } from "@/hooks/use-backend";
import { BRAND } from "@/lib/brand";
import { MONTHLY_ALLOWANCE } from "@/lib/credits";
import { SUBSCRIPTION_PRICE_CENTS, formatCents } from "@/lib/pricing";
import { useAccountStore } from "@/store/account";
import { Link, useParams } from "@tanstack/react-router";
import {
  CheckCircle2,
  Fingerprint,
  Gift,
  Home,
  Info,
  Loader2,
  Mailbox,
  Rocket,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type LinkResult =
  | { kind: "pending" }
  | { kind: "linked" }
  | { kind: "existing" }
  | { kind: "error"; message: string };

const PERKS = [
  {
    icon: Mailbox,
    text: "Send real postcards, letters and self-mailers from your browser — no minimums.",
  },
  {
    icon: Wand2,
    text: `AI copy and imagery with ${MONTHLY_ALLOWANCE} credits with each 30-day membership.`,
  },
  {
    icon: Sparkles,
    text: "Dynamic QR tracking and USPS delivery timeline for every campaign.",
  },
  {
    icon: Gift,
    text: `Your first payment of ${formatCents(SUBSCRIPTION_PRICE_CENTS)} or more earns your referrer a free month while their membership is active — and you get your own referral link to share.`,
  },
];

/** `/ref/$code`: stores the referral code and links it to the caller's account. */
export function ReferralLandingPage() {
  const params = useParams({ strict: false }) as { code?: string };
  const code = (params.code ?? "").trim().toUpperCase();
  const { isAuthenticated, isInitializing, isLoggingIn, login, account } =
    useAccountSync();
  const { ready } = useBackendActor();
  const { mutateAsync: ensureAccount } = useEnsureAccount();
  const setPendingReferralCode = useAccountStore(
    (s) => s.setPendingReferralCode,
  );
  const setAccount = useAccountStore((s) => s.setAccount);
  const [result, setResult] = useState<LinkResult>({ kind: "pending" });
  const stored = useRef(false);
  const ensured = useRef(false);

  useEffect(() => {
    if (!code || stored.current) return;
    stored.current = true;
    setPendingReferralCode(code);
  }, [code, setPendingReferralCode]);

  useEffect(() => {
    if (!code || !isAuthenticated || !ready || ensured.current) return;
    ensured.current = true;
    ensureAccount({ referralCode: code, email: null })
      .then((res) => {
        if (!res.ok) {
          setResult({
            kind: "error",
            message: res.error ?? "Could not link this referral.",
          });
          return;
        }
        if (res.account) setAccount(res.account);
        const referredBy = res.account?.referredBy;
        if (referredBy) {
          setPendingReferralCode(null);
          setResult({ kind: "linked" });
        } else {
          setResult({ kind: "existing" });
        }
      })
      .catch((error: unknown) => {
        setResult({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not link this referral.",
        });
      });
  }, [
    code,
    isAuthenticated,
    ready,
    ensureAccount,
    setAccount,
    setPendingReferralCode,
  ]);

  const referredBy = account?.referredBy;

  return (
    <div className="relative isolate" data-ocid="referral.page">
      <div aria-hidden="true" className="ambient-glow-backdrop" />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {/* The invitation: Stampy waving a postcard on stage, the code, a
          heavy headline. */}
        <div className="flex flex-col items-center text-center motion-safe:animate-fade-up">
          <MascotStage pose="mail" size="lg" className="mb-8" />
          <Badge
            variant="info"
            className="gap-1.5 px-3 py-1 font-mono tracking-wider"
            data-ocid="referral.code.badge"
          >
            <Gift className="size-3" /> {code || "No code"}
          </Badge>
          <h1 className="display-heading mt-4 text-3xl leading-[1.1] sm:text-4xl">
            You've been invited to {BRAND.name}
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
            Sign in with Internet Identity to claim your welcome. Direct mail
            that's designed, addressed and shipped in minutes.
          </p>
        </div>

        <Card className="mt-8 motion-safe:animate-fade-up">
          <CardContent className="space-y-6">
            {!code && (
              <Alert variant="destructive" data-ocid="referral.missing.alert">
                <Info className="size-4" />
                <AlertTitle>Missing referral code</AlertTitle>
                <AlertDescription>
                  This invitation link doesn't include a code. You can still
                  sign up — you just won't be linked to a referrer.
                </AlertDescription>
              </Alert>
            )}

            {isAuthenticated && code && (
              <>
                {result.kind === "pending" && (
                  <div
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                    data-ocid="referral.linking.status"
                  >
                    <Loader2 className="size-4 animate-spin" /> Linking your
                    referral…
                  </div>
                )}
                {result.kind === "linked" && (
                  <Alert
                    className="border-emerald-brand/40 bg-emerald-brand/10"
                    data-ocid="referral.linked.alert"
                  >
                    <CheckCircle2 className="size-4 text-emerald-brand" />
                    <AlertTitle>Referral linked</AlertTitle>
                    <AlertDescription>
                      Your account is linked to referral code{" "}
                      <span className="font-mono">{referredBy ?? code}</span>.
                      Your first payment of{" "}
                      {formatCents(SUBSCRIPTION_PRICE_CENTS)} or more will earn
                      your referrer a free month if their membership is active
                      then.
                    </AlertDescription>
                  </Alert>
                )}
                {result.kind === "existing" && (
                  <Alert
                    className="bg-card-raised"
                    data-ocid="referral.existing.alert"
                  >
                    <Info className="size-4" />
                    <AlertTitle>Already have an account</AlertTitle>
                    <AlertDescription>
                      Referral codes apply to new accounts only. You're all set
                      — head to the wizard to launch your next campaign.
                    </AlertDescription>
                  </Alert>
                )}
                {result.kind === "error" && (
                  <Alert variant="destructive" data-ocid="referral.error.alert">
                    <Info className="size-4" />
                    <AlertTitle>Could not link referral</AlertTitle>
                    <AlertDescription>{result.message}</AlertDescription>
                  </Alert>
                )}
              </>
            )}

            <ul className="space-y-4">
              {PERKS.map((perk) => (
                <li
                  key={perk.text}
                  className="flex items-start gap-3.5 text-sm"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]">
                    <perk.icon className="size-4" />
                  </span>
                  <span className="pt-2 leading-relaxed text-foreground">
                    {perk.text}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2.5 border-t border-hairline pt-6 sm:flex-row sm:flex-wrap sm:items-center">
              {!isAuthenticated ? (
                <Button
                  onClick={login}
                  disabled={isLoggingIn || isInitializing}
                  size="lg"
                  className="h-12 gap-2 px-6 text-base"
                  data-ocid="referral.sign_in.button"
                >
                  {isLoggingIn ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Fingerprint className="size-4" />
                  )}
                  Sign in with Internet Identity
                </Button>
              ) : (
                <Button
                  asChild
                  size="lg"
                  className="h-12 gap-2 px-6 text-base"
                  data-ocid="referral.wizard.link"
                >
                  <Link to="/wizard">
                    <Rocket className="size-4" /> Start a campaign
                  </Link>
                </Button>
              )}
              {!isAuthenticated && (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 gap-2 px-6 text-base"
                  data-ocid="referral.wizard.link"
                >
                  <Link to="/wizard">
                    <Rocket className="size-4" /> Explore the wizard
                  </Link>
                </Button>
              )}
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 gap-2 px-6 text-base"
                data-ocid="referral.home.link"
              >
                <Link to="/">
                  <Home className="size-4" /> Home
                </Link>
              </Button>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Your referral code is saved in this browser and applied
              automatically when you create your account.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
