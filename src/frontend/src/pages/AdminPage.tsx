import {
  type AdminKeysInput,
  type AdminKeysView,
  Click2MailEnvironment,
} from "@/backend";
import { SignInPrompt } from "@/components/billing/SignInPrompt";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAccountSync } from "@/hooks/use-account";
import {
  useAdminKeys,
  usePublicConfig,
  useSaveAdminKeys,
} from "@/hooks/use-backend";
import { copyText } from "@/lib/download";
import { loadConfig } from "@caffeineai/core-infrastructure";
import {
  AlertCircle,
  Check,
  Copy,
  Eye,
  EyeOff,
  FlaskConical,
  Globe,
  KeyRound,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Webhook,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type TextField =
  | "click2mailUsername"
  | "click2mailPassword"
  | "stripeSecretKey"
  | "stripePublishableKey"
  | "resendKey"
  | "openAiKey"
  | "webhookSecret"
  | "outcallProxyUrl";

/** Draft values: `undefined` = untouched (unchanged on save), `""` = clear. */
type Draft = Partial<Record<TextField, string>>;

const WEBHOOK_HEADER = "x-ezmailout-secret";
const WEBHOOK_EXAMPLE = JSON.stringify(
  {
    campaignId: "cmp_1",
    event: "InTransit",
    eventId: "evt_20260920_0001",
    timestamp: 1758326400,
  },
  null,
  2,
);

const ALPHANUMERIC =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** 32-char alphanumeric secret from the Web Crypto API (rejection-free modulo bias is negligible at 62/256). */
export function generateWebhookSecret(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHANUMERIC[b % ALPHANUMERIC.length];
  return out;
}

function toOcid(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

interface SecretFieldProps {
  label: string;
  field: TextField;
  draft: Draft;
  setDraft: (field: TextField, value: string | undefined) => void;
  masked?: string;
  secret?: boolean;
  optional?: boolean;
  helper?: string;
  placeholder?: string;
  extra?: React.ReactNode;
}

function SecretField({
  label,
  field,
  draft,
  setDraft,
  masked,
  secret = true,
  optional = false,
  helper,
  placeholder,
  extra,
}: SecretFieldProps) {
  const [show, setShow] = useState(false);
  const value = draft[field];
  const configured = !!masked;
  const cleared = value === "";
  const ocid = toOcid(label);

  return (
    <div className="space-y-2" data-ocid={`admin.${ocid}.field`}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`admin-${ocid}`} className="text-sm font-medium">
          {label}
          {optional && (
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              (optional)
            </span>
          )}
        </Label>
        <div className="flex items-center gap-2">
          {value !== undefined && (
            <Badge
              variant="outline"
              className="border-primary/40 bg-primary/15 text-primary-foreground"
            >
              {cleared ? "Will be cleared" : "Unsaved change"}
            </Badge>
          )}
          <Badge
            variant="outline"
            className={
              configured
                ? "border-emerald-brand/30 bg-emerald-brand/15 text-emerald-brand"
                : "border-border bg-muted text-muted-foreground"
            }
            data-ocid={`admin.${ocid}.${configured ? "configured" : "not_set"}.badge`}
          >
            {configured ? "Configured" : "Not set"}
          </Badge>
        </div>
      </div>
      <div className="flex gap-2">
        <Input
          id={`admin-${ocid}`}
          type={secret && !show ? "password" : "text"}
          value={value ?? ""}
          onChange={(e) => setDraft(field, e.target.value)}
          placeholder={
            cleared
              ? "Will be cleared on save"
              : (masked ?? placeholder ?? `Enter ${label}`)
          }
          autoComplete="off"
          spellCheck={false}
          className="flex-1 font-mono text-sm"
          data-ocid={`admin.${ocid}.input`}
        />
        {secret && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide value" : "Show value"}
                data-ocid={`admin.${ocid}.toggle`}
              >
                {show ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{show ? "Hide" : "Show"}</TooltipContent>
          </Tooltip>
        )}
        {extra}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setDraft(field, cleared ? undefined : "")}
              disabled={!configured && value === undefined}
              aria-label={cleared ? "Undo clear" : "Clear stored value"}
              className={cleared ? "text-destructive" : undefined}
              data-ocid={`admin.${ocid}.clear`}
            >
              {cleared ? (
                <RefreshCw className="size-4" />
              ) : (
                <X className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {cleared ? "Undo clear" : "Clear stored value on save"}
          </TooltipContent>
        </Tooltip>
      </div>
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}

function CopyButton({ value, ocid }: { value: string; ocid: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    const ok = await copyText(value);
    if (ok) {
      setCopied(true);
      toast.success("Copied.");
      window.setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Could not copy to clipboard.");
    }
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8 shrink-0"
      onClick={handleCopy}
      aria-label="Copy"
      data-ocid={ocid}
    >
      {copied ? (
        <Check className="size-4 text-emerald-brand" />
      ) : (
        <Copy className="size-4" />
      )}
    </Button>
  );
}

function ConfigFlag({
  label,
  on,
  detail,
}: {
  label: string;
  on: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2">
        {detail && (
          <span className="font-mono text-xs text-muted-foreground">
            {detail}
          </span>
        )}
        <Badge
          variant="outline"
          className={
            on
              ? "border-emerald-brand/30 bg-emerald-brand/15 text-emerald-brand"
              : "border-border bg-muted text-muted-foreground"
          }
          data-ocid={`admin.config.${toOcid(label)}.badge`}
        >
          {on ? "Yes" : "No"}
        </Badge>
      </span>
    </div>
  );
}

function principalShort(p: string): string {
  return p.length > 20 ? `${p.slice(0, 10)}…${p.slice(-6)}` : p;
}

export function AdminPage() {
  const { isAuthenticated, isInitializing, principal } = useAccountSync();
  const keysQuery = useAdminKeys();
  const configQuery = usePublicConfig();
  const saveKeys = useSaveAdminKeys();

  const [draft, setDraftState] = useState<Draft>({});
  const [environment, setEnvironment] = useState<
    Click2MailEnvironment | undefined
  >(undefined);
  const [sandbox, setSandbox] = useState<boolean | undefined>(undefined);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [canisterId, setCanisterId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadConfig()
      .then((cfg) => {
        if (!active) return;
        const id = cfg.backend_canister_id;
        setCanisterId(id && id !== "undefined" ? id : null);
      })
      .catch(() => {
        if (active) setCanisterId(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const setDraft = useCallback(
    (field: TextField, value: string | undefined) => {
      setDraftState((prev) => {
        const next = { ...prev };
        if (value === undefined) delete next[field];
        else next[field] = value;
        return next;
      });
    },
    [],
  );

  const view: AdminKeysView | null = keysQuery.data ?? null;
  const config = configQuery.data ?? null;
  const currentEnvironment =
    environment ?? view?.click2mailEnvironment ?? Click2MailEnvironment.Staging;
  const currentSandbox = sandbox ?? view?.sandboxCheckout ?? false;
  const dirty =
    Object.keys(draft).length > 0 ||
    (environment !== undefined &&
      environment !== view?.click2mailEnvironment) ||
    (sandbox !== undefined && sandbox !== view?.sandboxCheckout);

  const webhookPath = view?.webhookPath ?? "/webhooks/click2mail";
  const webhookUrl = `https://${canisterId ?? "<backend-canister-id>"}.icp0.io${webhookPath}`;
  const curlExample = `curl -X POST '${webhookUrl}' \\\n  -H 'content-type: application/json' \\\n  -H '${WEBHOOK_HEADER}: <your-webhook-secret>' \\\n  -d '${JSON.stringify(JSON.parse(WEBHOOK_EXAMPLE))}'`;

  function resetDraft() {
    setDraftState({});
    setEnvironment(undefined);
    setSandbox(undefined);
    setSaveError(null);
  }

  async function handleSave() {
    setSaveError(null);
    const payload: AdminKeysInput = { ...draft };
    if (
      environment !== undefined &&
      environment !== view?.click2mailEnvironment
    )
      payload.click2mailEnvironment = environment;
    if (sandbox !== undefined && sandbox !== view?.sandboxCheckout)
      payload.sandboxCheckout = sandbox;
    if (Object.keys(payload).length === 0) {
      toast.info("Nothing to save.");
      return;
    }
    try {
      const result = await saveKeys.mutateAsync(payload);
      if (result.ok) {
        toast.success("Settings saved.");
        resetDraft();
      } else {
        const message = result.error ?? "The canister rejected the change.";
        setSaveError(message);
        toast.error(message);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save settings.";
      setSaveError(message);
      toast.error(message);
    }
  }

  return (
    <div
      className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8"
      data-ocid="admin.page"
    >
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="size-5" />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Admin control panel
          </h1>
          <p className="text-sm text-muted-foreground">
            Secure credentials for Click2Mail, Stripe, Resend and OpenAI.
            Secrets are stored in the canister and never returned in full.
          </p>
        </div>
        {view?.callerIsAdmin && (
          <Badge
            className="gap-1 bg-emerald-brand text-white"
            data-ocid="admin.you_are_admin.badge"
          >
            <ShieldCheck className="size-3" /> You are admin
          </Badge>
        )}
      </div>

      {isInitializing ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Checking your session…
        </div>
      ) : !isAuthenticated ? (
        <SignInPrompt message="Sign in with Internet Identity to manage admin settings. The first signed-in caller claims the admin role." />
      ) : (
        <div className="space-y-6">
          <Card data-ocid="admin.identity.card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Admin identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Admin principal</span>
                {view?.adminPrincipal ? (
                  <span className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <code
                          className="rounded-md bg-muted px-2 py-1 font-mono text-xs"
                          data-ocid="admin.principal.text"
                        >
                          {principalShort(view.adminPrincipal)}
                        </code>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs break-all font-mono text-xs">
                        {view.adminPrincipal}
                      </TooltipContent>
                    </Tooltip>
                    <CopyButton
                      value={view.adminPrincipal}
                      ocid="admin.principal.copy"
                    />
                  </span>
                ) : (
                  <span
                    className="text-xs text-muted-foreground"
                    data-ocid="admin.principal.unclaimed"
                  >
                    {keysQuery.isLoading
                      ? "Loading…"
                      : "Not claimed yet — the first signed-in caller to save settings claims admin."}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Your principal</span>
                <code className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                  {principal ? principalShort(principal) : "—"}
                </code>
              </div>
              {view && !view.callerIsAdmin && view.adminPrincipal && (
                <Alert variant="destructive" data-ocid="admin.not_admin.alert">
                  <AlertCircle className="size-4" />
                  <AlertTitle>Read-only</AlertTitle>
                  <AlertDescription>
                    Another principal holds the admin role. Saving will be
                    rejected by the canister.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card data-ocid="admin.keys.card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="size-4 text-primary" /> Integration keys
              </CardTitle>
              <CardDescription>
                Leave a field empty to keep the stored value. Type a new value
                to replace it, or use the × button to clear it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {keysQuery.isLoading && !view ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading settings…
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Click2Mail
                    </p>
                    <SecretField
                      label="Click2Mail Username"
                      field="click2mailUsername"
                      draft={draft}
                      setDraft={setDraft}
                      masked={view?.click2mailUsername}
                      secret={false}
                    />
                    <SecretField
                      label="Click2Mail Password"
                      field="click2mailPassword"
                      draft={draft}
                      setDraft={setDraft}
                      masked={view?.click2mailPasswordMasked}
                    />
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Click2Mail environment
                      </Label>
                      <Select
                        value={currentEnvironment}
                        onValueChange={(v) =>
                          setEnvironment(v as Click2MailEnvironment)
                        }
                      >
                        <SelectTrigger
                          className="w-full sm:w-64"
                          data-ocid="admin.click2mail_environment.select"
                        >
                          <SelectValue placeholder="Select environment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={Click2MailEnvironment.Production}>
                            Production
                          </SelectItem>
                          <SelectItem value={Click2MailEnvironment.Staging}>
                            Staging
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Staging uses Click2Mail's sandbox REST endpoints; no
                        mail is printed.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Stripe
                    </p>
                    <SecretField
                      label="Stripe Secret Key"
                      field="stripeSecretKey"
                      draft={draft}
                      setDraft={setDraft}
                      masked={view?.stripeSecretKeyMasked}
                      placeholder="sk_live_…"
                    />
                    <SecretField
                      label="Stripe Publishable Key"
                      field="stripePublishableKey"
                      draft={draft}
                      setDraft={setDraft}
                      masked={view?.stripePublishableKey}
                      secret={false}
                      placeholder="pk_live_…"
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Email &amp; AI
                    </p>
                    <SecretField
                      label="Resend API Key"
                      field="resendKey"
                      draft={draft}
                      setDraft={setDraft}
                      masked={view?.resendKeyMasked}
                      placeholder="re_…"
                    />
                    <SecretField
                      label="OpenAI API Key"
                      field="openAiKey"
                      draft={draft}
                      setDraft={setDraft}
                      masked={view?.openAiKeyMasked}
                      placeholder="sk-…"
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Webhooks &amp; networking
                    </p>
                    <SecretField
                      label="Webhook Secret"
                      field="webhookSecret"
                      draft={draft}
                      setDraft={setDraft}
                      masked={view?.webhookSecretMasked}
                      helper={`Shared secret that Click2Mail (or your relay) sends in the ${WEBHOOK_HEADER} header.`}
                      extra={
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                setDraft(
                                  "webhookSecret",
                                  generateWebhookSecret(),
                                )
                              }
                              className="gap-1.5"
                              data-ocid="admin.webhook_secret.generate"
                            >
                              <RefreshCw className="size-4" /> Generate
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Generate a random 32-character secret
                          </TooltipContent>
                        </Tooltip>
                      }
                    />
                    <SecretField
                      label="Outcall proxy URL"
                      field="outcallProxyUrl"
                      draft={draft}
                      setDraft={setDraft}
                      masked={view?.outcallProxyUrl}
                      secret={false}
                      optional
                      placeholder="https://relay.example.com/"
                      helper="Optional IPv6-capable relay for Internet Computer outcalls; requests are sent here with an x-target-url header"
                    />
                  </div>

                  <Separator />

                  <div
                    className="flex items-start justify-between gap-4 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3"
                    data-ocid="admin.sandbox_checkout.field"
                  >
                    <div className="space-y-1">
                      <Label
                        htmlFor="admin-sandbox"
                        className="flex items-center gap-2 text-sm font-medium"
                      >
                        <FlaskConical className="size-4 text-primary" />
                        Sandbox checkout
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Launch campaigns without Stripe for testing — never
                        enable in production
                      </p>
                    </div>
                    <Switch
                      id="admin-sandbox"
                      checked={currentSandbox}
                      onCheckedChange={(checked) => setSandbox(checked)}
                      data-ocid="admin.sandbox_checkout.switch"
                    />
                  </div>

                  {saveError && (
                    <Alert variant="destructive" data-ocid="admin.save.error">
                      <AlertCircle className="size-4" />
                      <AlertTitle>Save failed</AlertTitle>
                      <AlertDescription>{saveError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={resetDraft}
                      disabled={!dirty || saveKeys.isPending}
                      data-ocid="admin.discard.button"
                    >
                      Discard
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSave}
                      disabled={!dirty || saveKeys.isPending}
                      className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                      data-ocid="admin.save_keys.button"
                    >
                      {saveKeys.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      {saveKeys.isPending ? "Saving…" : "Save settings"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card data-ocid="admin.webhook.card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Webhook className="size-4 text-primary" /> Delivery webhook
              </CardTitle>
              <CardDescription>
                Point Click2Mail tracking (or any relay) at this endpoint.
                Events are matched by{" "}
                <code className="font-mono">campaignId</code> or{" "}
                <code className="font-mono">jobId</code> and mapped onto the
                delivery timeline.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Endpoint (POST)
                </Label>
                <div className="flex items-center gap-2">
                  <code
                    className="flex-1 truncate rounded-md bg-muted px-2 py-1.5 font-mono text-xs"
                    data-ocid="admin.webhook.url.text"
                  >
                    {webhookUrl}
                  </code>
                  <CopyButton
                    value={webhookUrl}
                    ocid="admin.webhook.url.copy"
                  />
                </div>
                {!canisterId && (
                  <p className="text-xs text-muted-foreground">
                    Backend canister id unavailable in this build; substitute
                    your deployed canister id.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Auth header
                </Label>
                <div className="flex items-center gap-2">
                  <code className="rounded-md bg-muted px-2 py-1.5 font-mono text-xs">
                    {WEBHOOK_HEADER}: &lt;webhook secret&gt;
                  </code>
                  <CopyButton
                    value={WEBHOOK_HEADER}
                    ocid="admin.webhook.header.copy"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Example payload
                  </Label>
                  <CopyButton
                    value={WEBHOOK_EXAMPLE}
                    ocid="admin.webhook.payload.copy"
                  />
                </div>
                <pre
                  className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed"
                  data-ocid="admin.webhook.payload.text"
                >
                  {WEBHOOK_EXAMPLE}
                </pre>
                <p className="text-xs text-muted-foreground">
                  <code className="font-mono">event</code> accepts any stage
                  name (Created, InProduction, InTransit, SortedAtLocalHub,
                  Delivered) or Click2Mail scan wording;{" "}
                  <code className="font-mono">timestamp</code> may be seconds,
                  milliseconds or nanoseconds.
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Test with curl
                  </Label>
                  <CopyButton
                    value={curlExample}
                    ocid="admin.webhook.curl.copy"
                  />
                </div>
                <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed">
                  {curlExample}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card data-ocid="admin.config.card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="size-4 text-primary" /> Public configuration
              </CardTitle>
              <CardDescription>
                What the storefront sees. Updates after every save.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {configQuery.isLoading && !config ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading…
                </div>
              ) : config ? (
                <>
                  <ConfigFlag
                    label="Stripe configured"
                    on={config.stripeConfigured}
                    detail={config.stripePublishableKey}
                  />
                  <ConfigFlag
                    label="Click2Mail configured"
                    on={config.click2mailConfigured}
                    detail={config.click2mailEnvironment}
                  />
                  <ConfigFlag
                    label="OpenAI configured"
                    on={config.openAiConfigured}
                  />
                  <ConfigFlag
                    label="Resend configured"
                    on={config.resendConfigured}
                  />
                  <ConfigFlag
                    label="Sandbox checkout"
                    on={config.sandboxCheckout}
                  />
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">Tracking base</span>
                    <code className="font-mono text-xs">
                      {config.trackingBaseUrl}
                    </code>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">Referral base</span>
                    <code className="font-mono text-xs">
                      {config.referralBaseUrl}
                    </code>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Public config unavailable.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
