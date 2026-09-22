import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAccountSync } from "@/hooks/use-account";
import { useBackendActor, useEnsureAccount } from "@/hooks/use-backend";
import { BRAND } from "@/lib/brand";
import { MONTHLY_ALLOWANCE } from "@/lib/credits";
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
    text: `AI copy and imagery with ${MONTHLY_ALLOWANCE} credits included every month of membership.`,
  },
  {
    icon: Sparkles,
    text: "Dynamic QR tracking and USPS delivery timeline for every campaign.",
  },
  {
    icon: Gift,
    text: "Your first payment earns your referrer a free month — and you get your own referral link to share.",
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
    <div
      className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8"
      data-ocid="referral.page"
    >
      <Card className="surface-glow animate-fade-up">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-primary/40 bg-primary/15 font-mono text-primary-foreground"
              data-ocid="referral.code.badge"
            >
              <Gift className="size-3" /> {code || "No code"}
            </Badge>
          </div>
          <CardTitle className="font-display text-2xl tracking-tight">
            You've been invited to {BRAND.name}
          </CardTitle>
          <CardDescription>
            Sign in with Internet Identity to claim your welcome. Direct mail
            that's designed, addressed and shipped in minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!code && (
            <Alert variant="destructive" data-ocid="referral.missing.alert">
              <Info className="size-4" />
              <AlertTitle>Missing referral code</AlertTitle>
              <AlertDescription>
                This invitation link doesn't include a code. You can still sign
                up — you just won't be linked to a referrer.
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
                    Your first payment will earn your referrer a free month.
                  </AlertDescription>
                </Alert>
              )}
              {result.kind === "existing" && (
                <Alert data-ocid="referral.existing.alert">
                  <Info className="size-4" />
                  <AlertTitle>Already have an account</AlertTitle>
                  <AlertDescription>
                    Referral codes apply to new accounts only. You're all set —
                    head to the wizard to launch your next campaign.
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

          <ul className="space-y-3">
            {PERKS.map((perk) => (
              <li key={perk.text} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <perk.icon className="size-3.5" />
                </span>
                <span className="text-foreground">{perk.text}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {!isAuthenticated ? (
              <Button
                onClick={login}
                disabled={isLoggingIn || isInitializing}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
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
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
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
                className="gap-2"
                data-ocid="referral.wizard.link"
              >
                <Link to="/wizard">
                  <Rocket className="size-4" /> Explore the wizard
                </Link>
              </Button>
            )}
            <Button
              asChild
              variant="ghost"
              className="gap-2"
              data-ocid="referral.home.link"
            >
              <Link to="/">
                <Home className="size-4" /> Home
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Your referral code is saved in this browser and applied
            automatically when you create your account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
