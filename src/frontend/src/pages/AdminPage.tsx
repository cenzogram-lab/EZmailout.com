import {
  type AdminKeysInput,
  type AdminKeysView,
  FulfilmentEnvironment,
} from "@/backend";
import { PaymentsCard } from "@/components/admin/PaymentsCard";
import {
  GlossyTile,
  PanelHeader,
  SectionLabel,
  insetClass,
  raisedClass,
  titleGlowClass,
} from "@/components/campaigns/PanelParts";
import { MascotEmptyState } from "@/components/stampy";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAccountSync } from "@/hooks/use-account";
import {
  useAdminKeys,
  useAssignAdmin,
  usePublicConfig,
  useSaveAdminKeys,
  useSupportTickets,
} from "@/hooks/use-backend";
import { copyText } from "@/lib/download";
import { formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { loadConfig } from "@caffeineai/core-infrastructure";
import {
  AlertCircle,
  Check,
  Copy,
  Eye,
  EyeOff,
  Fingerprint,
  FlaskConical,
  Globe,
  KeyRound,
  LifeBuoy,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Webhook,
  X,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type TextField =
  | "fulfilmentUsername"
  | "fulfilmentPassword"
  | "stripeSecretKey"
  | "stripePublishableKey"
  | "resendKey"
  | "openAiKey"
  | "webhookSecret"
  | "outcallProxyUrl"
  | "supportEmailAddress";

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
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <Label htmlFor={`admin-${ocid}`} className="text-sm font-semibold">
          {label}
          {optional && (
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              (optional)
            </span>
          )}
        </Label>
        {/* ml-auto: a badge that wraps under a long label stays right. */}
        <div className="ml-auto flex items-center gap-2">
          {value !== undefined && (
            <Badge variant="info">
              {cleared ? "Will be cleared" : "Unsaved change"}
            </Badge>
          )}
          <Badge
            variant={configured ? "success" : "neutral"}
            data-ocid={`admin.${ocid}.${configured ? "configured" : "not_set"}.badge`}
          >
            {configured ? "Configured" : "Not set"}
          </Badge>
        </div>
      </div>
      {/* The field and its icon buttons share one row; an extra action
          (Generate) takes a full-width row of its own below sm. */}
      <div className="flex flex-wrap gap-2">
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
          className="h-11 min-w-[6rem] flex-1 font-mono text-sm sm:h-10"
          data-ocid={`admin.${ocid}.input`}
        />
        {secret && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 sm:size-10"
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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setDraft(field, cleared ? undefined : "")}
              disabled={!configured && value === undefined}
              aria-label={cleared ? "Undo clear" : "Clear stored value"}
              className={cn(
                "size-11 sm:size-10",
                cleared ? "text-destructive hover:text-destructive" : undefined,
              )}
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
        {/* Last in the DOM as on screen, so the tab order follows it. */}
        {extra}
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
      className="size-11 shrink-0 rounded-full text-muted-foreground hover:text-foreground sm:size-8"
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
  // A short detail (the environment) never breaks: the label wraps instead.
  // A long one (a publishable key) breaks anywhere, so all of it stays
  // readable and the row never overflows.
  const shortDetail = detail !== undefined && detail.length <= 16;
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "flex items-center gap-2",
          shortDetail ? "shrink-0" : "min-w-0",
        )}
      >
        {detail && (
          <span
            className={cn(
              "meta-mono",
              shortDetail ? "whitespace-nowrap" : "min-w-0 break-all",
            )}
          >
            {detail}
          </span>
        )}
        <Badge
          variant={on ? "success" : "neutral"}
          data-ocid={`admin.config.${toOcid(label)}.badge`}
        >
          {on ? "Yes" : "No"}
        </Badge>
      </span>
    </div>
  );
}

/** Controllers only: the one way the admin role is ever assigned. */
function AssignAdminForm() {
  const assign = useAssignAdmin();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const result = await assign.mutateAsync(value);
      if (result.ok) {
        toast.success("Admin assigned.");
        setValue("");
      } else {
        setError(result.error ?? "The canister rejected the change.");
      }
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes("principal")
          ? "That is not a valid principal."
          : e instanceof Error
            ? e.message
            : "Could not assign the admin.",
      );
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-2 border-t border-hairline pt-4"
      data-ocid="admin.assign.form"
    >
      <Label htmlFor="admin-assign-principal">Assign admin (controllers)</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="admin-assign-principal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="aaaaa-bbbbb-…-cai"
          className="h-11 min-w-0 font-mono text-xs sm:h-10"
          data-ocid="admin.assign.input"
        />
        <Button
          type="submit"
          className="h-11 px-5 sm:h-10"
          disabled={assign.isPending || value.trim() === ""}
          data-ocid="admin.assign.submit"
        >
          {assign.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ShieldCheck className="size-4" />
          )}
          Assign
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Replaces the current admin. Only a canister controller can do this.
      </p>
      {error ? (
        <p className="text-xs text-destructive" data-ocid="admin.assign.error">
          {error}
        </p>
      ) : null}
    </form>
  );
}

/**
 * An integration-key group: a raised inner panel from sm. On a phone the
 * frame and its padding would leave the fields beside their 44 px icon
 * buttons too narrow to show a stored masked key, so each group there is
 * the card's own surface, set off from the one above by a hairline.
 */
const keyGroupClass = cn(
  raisedClass,
  "space-y-4 p-4 sm:p-5",
  "max-sm:rounded-none max-sm:border-x-0 max-sm:border-b-0 max-sm:bg-transparent max-sm:p-0 max-sm:pt-5 max-sm:shadow-none max-sm:dark:shadow-none max-sm:first:border-t-0 max-sm:first:pt-0",
);

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
    FulfilmentEnvironment | undefined
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
  // Provider names and settings are for the signed-in admin only.
  const showProviders = isAuthenticated && view?.callerIsAdmin === true;
  const config = configQuery.data ?? null;
  const currentEnvironment =
    environment ?? view?.fulfilmentEnvironment ?? FulfilmentEnvironment.Staging;
  const currentSandbox = sandbox ?? view?.sandboxCheckout ?? false;
  const dirty =
    Object.keys(draft).length > 0 ||
    (environment !== undefined &&
      environment !== view?.fulfilmentEnvironment) ||
    (sandbox !== undefined && sandbox !== view?.sandboxCheckout);

  const webhookPath = view?.webhookPath ?? "/webhooks/fulfilment";
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
      environment !== view?.fulfilmentEnvironment
    )
      payload.fulfilmentEnvironment = environment;
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

  // The page is for the admin (the founder) and canister controllers only.
  // Anyone else, signed in or not, gets the same 404 as an unknown address,
  // so the page does not even reveal that it exists; the canister refuses
  // them every setting anyway (getAdminKeys answers only callerIsAdmin).
  // `isPending`, not `isLoading`: right after sign-in the actor is not ready
  // yet, the query is disabled (so not loading), and the admin saw a 404.
  if (isInitializing || (isAuthenticated && keysQuery.isPending)) {
    return (
      <output
        className="flex min-h-[60vh] items-center justify-center"
        aria-label="Loading"
        data-ocid="admin.loading"
      >
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </output>
    );
  }
  if (!showProviders) return <NotFoundPage />;

  return (
    <div
      className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8"
      data-ocid="admin.page"
    >
      <div className="relative isolate mb-8">
        {/* The brand backlight behind the page title. */}
        <div aria-hidden="true" className={titleGlowClass} />
        <div className="flex flex-wrap items-center gap-4">
          <GlossyTile icon={ShieldCheck} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="display-heading text-3xl sm:text-4xl">
              Admin control panel
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Team settings for EZmailout. Only you can open this page.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Card data-ocid="admin.identity.card">
          <CardHeader className="pb-0 max-sm:px-4">
            <PanelHeader icon={Fingerprint} title="Admin identity" />
          </CardHeader>
          <CardContent className="space-y-3 text-sm max-sm:px-4">
            <div className={cn(raisedClass, "divide-y divide-hairline")}>
              {/* Both rows stack (label over value) below sm, where the
                  admin row's pill and copy button do not fit beside it. */}
              <div className="flex flex-col items-start gap-1.5 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <span className="text-muted-foreground">Admin principal</span>
                {view?.adminPrincipal ? (
                  <span className="flex max-w-full items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <code
                          className="min-w-0 truncate rounded-full border border-hairline bg-well px-2.5 py-1 font-mono text-xs text-foreground"
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
                      : "Not assigned — a canister controller assigns the admin."}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-start gap-1.5 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <span className="text-muted-foreground">Your principal</span>
                {/* From sm the spacer holds the admin row's copy-button slot,
                    so both pills end at the same edge and the rows match. */}
                <span className="flex max-w-full items-center gap-1">
                  <code className="min-w-0 truncate rounded-full border border-hairline bg-well px-2.5 py-1 font-mono text-xs text-foreground">
                    {principal ? principalShort(principal) : "—"}
                  </code>
                  <span
                    aria-hidden="true"
                    className="hidden size-8 shrink-0 sm:block"
                  />
                </span>
              </div>
            </div>
            {view?.callerIsController ? <AssignAdminForm /> : null}
          </CardContent>
        </Card>

        {/* Integration keys, the webhook and the public configuration name the
              providers behind EZmailout, so only the admin (the founder) and
              controllers see them; anyone else gets the identity card only. */}
        {showProviders ? (
          <>
            {/* Here rather than in the page header, which is the same for
                  everyone: the header no longer shifts when the caller's admin
                  status arrives, and this appears with the cards below it. */}
            {/* A status card: the white card surface with an emerald edge in
                light (a tint over the grey page read as a stained panel),
                an emerald tint over obsidian in dark. */}
            <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-emerald-brand/35 bg-card px-4 py-3 shadow-surface dark:border-emerald-brand/30 dark:bg-emerald-brand/10">
              <Badge
                className="gap-1 border-transparent bg-emerald-brand text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]"
                data-ocid="admin.you_are_admin.badge"
              >
                <ShieldCheck className="size-3" /> You are admin
              </Badge>
              <p className="min-w-[14rem] flex-1 text-sm text-foreground">
                Secure credentials for Click2Mail, Stripe, Resend and OpenAI.
                Secrets are stored in the canister and never returned in full.
              </p>
            </div>
            <Card data-ocid="admin.keys.card">
              <CardHeader className="pb-0 max-sm:px-4">
                <PanelHeader
                  icon={KeyRound}
                  title="Integration keys"
                  description="Leave a field empty to keep the stored value. Type a new value to replace it, or use the × button to clear it."
                />
              </CardHeader>
              <CardContent className="space-y-4 max-sm:px-4">
                {keysQuery.isLoading && !view ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Loading
                    settings…
                  </div>
                ) : (
                  <>
                    <div className={keyGroupClass}>
                      <SectionLabel>Click2Mail · print fulfilment</SectionLabel>
                      <SecretField
                        label="Click2Mail username"
                        field="fulfilmentUsername"
                        draft={draft}
                        setDraft={setDraft}
                        masked={view?.fulfilmentUsername}
                        secret={false}
                      />
                      <SecretField
                        label="Click2Mail password"
                        field="fulfilmentPassword"
                        draft={draft}
                        setDraft={setDraft}
                        masked={view?.fulfilmentPasswordMasked}
                      />
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                          Click2Mail environment
                        </Label>
                        <Select
                          value={currentEnvironment}
                          onValueChange={(v) =>
                            setEnvironment(v as FulfilmentEnvironment)
                          }
                        >
                          <SelectTrigger
                            className="h-11 w-full sm:h-10 sm:w-64"
                            data-ocid="admin.fulfilment_environment.select"
                          >
                            <SelectValue placeholder="Select environment" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem
                              value={FulfilmentEnvironment.Production}
                            >
                              Production
                            </SelectItem>
                            <SelectItem value={FulfilmentEnvironment.Staging}>
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

                    <div className={keyGroupClass}>
                      <SectionLabel>Stripe</SectionLabel>
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

                    <div className={keyGroupClass}>
                      <SectionLabel>Email &amp; AI</SectionLabel>
                      <SecretField
                        label="Resend API Key"
                        field="resendKey"
                        draft={draft}
                        setDraft={setDraft}
                        masked={view?.resendKeyMasked}
                        placeholder="re_…"
                      />
                      <SecretField
                        label="Support Notification Email"
                        field="supportEmailAddress"
                        draft={draft}
                        setDraft={setDraft}
                        masked={view?.supportEmailAddress}
                        secret={false}
                        optional
                        placeholder="support@yourdomain.com"
                        helper="New support tickets are emailed here through Resend, with the customer as reply-to. Sent from notifications@ezmailout.com, so verify that domain in Resend."
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

                    <div className={keyGroupClass}>
                      <SectionLabel>Webhooks &amp; networking</SectionLabel>
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
                                className="h-11 w-full gap-1.5 sm:h-10 sm:w-auto"
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
                        helper="Optional https:// relay (IPv6-capable) for Internet Computer outcalls; requests and their credentials are sent here with an x-target-url header"
                      />
                    </div>

                    <div
                      className="flex items-start justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3.5"
                      data-ocid="admin.sandbox_checkout.field"
                    >
                      <div className="space-y-1">
                        <Label
                          htmlFor="admin-sandbox"
                          className="flex items-center gap-2 text-sm font-semibold text-foreground"
                        >
                          <FlaskConical className="size-4 text-primary-ink" />
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

                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline pt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-11 px-5 sm:h-10"
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
                        className="h-11 gap-2 px-5 sm:h-10"
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
              <CardHeader className="pb-0 max-sm:px-4">
                <PanelHeader
                  icon={Webhook}
                  title="Delivery webhook"
                  description={
                    <>
                      Point Click2Mail tracking (or any relay) at this endpoint.
                      Events are matched by{" "}
                      <code className="font-mono text-foreground">
                        campaignId
                      </code>{" "}
                      or{" "}
                      <code className="font-mono text-foreground">jobId</code>{" "}
                      and mapped onto the delivery timeline.
                    </>
                  }
                />
              </CardHeader>
              <CardContent className="space-y-5 text-sm max-sm:px-4">
                <div className="space-y-1.5">
                  <SectionLabel>Endpoint (POST)</SectionLabel>
                  <div className="flex items-center gap-2">
                    <code
                      className={cn(
                        insetClass,
                        "min-w-0 flex-1 truncate px-3 py-2 font-mono text-xs text-foreground",
                      )}
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
                  <SectionLabel>Auth header</SectionLabel>
                  <div className="flex items-center gap-2">
                    <code
                      className={cn(
                        insetClass,
                        "min-w-0 truncate px-3 py-2 font-mono text-xs text-foreground",
                      )}
                    >
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
                    <SectionLabel>Example payload</SectionLabel>
                    <CopyButton
                      value={WEBHOOK_EXAMPLE}
                      ocid="admin.webhook.payload.copy"
                    />
                  </div>
                  <pre
                    className={cn(
                      insetClass,
                      "overflow-x-auto p-4 font-mono text-xs leading-relaxed text-foreground",
                    )}
                    data-ocid="admin.webhook.payload.text"
                  >
                    {WEBHOOK_EXAMPLE}
                  </pre>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    <code className="font-mono text-foreground">event</code>{" "}
                    accepts any stage name (Created, InProduction, InTransit,
                    SortedAtLocalHub, Delivered) or USPS scan wording;{" "}
                    <code className="font-mono text-foreground">timestamp</code>{" "}
                    may be seconds, milliseconds or nanoseconds.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <SectionLabel>Test with curl</SectionLabel>
                    <CopyButton
                      value={curlExample}
                      ocid="admin.webhook.curl.copy"
                    />
                  </div>
                  <pre
                    className={cn(
                      insetClass,
                      "overflow-x-auto p-4 font-mono text-xs leading-relaxed text-foreground",
                    )}
                  >
                    {curlExample}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card data-ocid="admin.config.card">
              <CardHeader className="pb-0 max-sm:px-4">
                <PanelHeader
                  icon={Globe}
                  title="Public configuration"
                  description="What the storefront sees. Updates after every save."
                />
              </CardHeader>
              <CardContent className="max-sm:px-4">
                {configQuery.isLoading && !config ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Loading…
                  </div>
                ) : config ? (
                  <div
                    className={cn(
                      raisedClass,
                      "divide-y divide-hairline overflow-hidden",
                    )}
                  >
                    <ConfigFlag
                      label="Stripe configured"
                      on={config.stripeConfigured}
                      detail={config.stripePublishableKey}
                    />
                    <ConfigFlag
                      label="Click2Mail configured"
                      on={config.fulfilmentConfigured}
                      detail={config.fulfilmentEnvironment}
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
                    <div className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                      <span className="shrink-0 text-muted-foreground">
                        Tracking base
                      </span>
                      <code className="meta-mono min-w-0 break-all text-foreground">
                        {config.trackingBaseUrl}
                      </code>
                    </div>
                    <div className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                      <span className="shrink-0 text-muted-foreground">
                        Referral base
                      </span>
                      <code className="meta-mono min-w-0 break-all text-foreground">
                        {config.referralBaseUrl}
                      </code>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Public config unavailable.
                  </p>
                )}
              </CardContent>
            </Card>

            <PaymentsCard />
            <SupportInboxCard />
          </>
        ) : null}
      </div>
    </div>
  );
}

/** Tickets filed from Stampy's Contact Support drawer, newest first. */
function SupportInboxCard() {
  const tickets = useSupportTickets(true);
  const list = tickets.data ?? [];
  return (
    <Card className="lg:col-span-2" data-ocid="admin.support.card">
      <CardHeader className="pb-0 max-sm:px-4">
        <PanelHeader
          icon={LifeBuoy}
          title={
            <>
              Support inbox
              {list.length > 0 ? (
                <Badge variant="info" className="tabular-nums">
                  {list.length}
                </Badge>
              ) : null}
            </>
          }
          description="Tickets filed through Stampy's Contact Support drawer. Reply to each sender by email."
        />
      </CardHeader>
      <CardContent className="max-sm:px-4">
        {tickets.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : list.length === 0 ? (
          <MascotEmptyState
            pose="checklist"
            size="sm"
            title="Inbox zero"
            description="No support tickets yet. New ones from the Contact Support form land here."
            data-ocid="admin.support.empty"
          />
        ) : (
          <ul className={cn(raisedClass, "divide-y divide-hairline")}>
            {list.map((t) => (
              <li
                key={t.id}
                className="space-y-1.5 px-4 py-3.5"
                data-ocid={`admin.support.ticket.${t.id}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="min-w-0 break-words font-semibold text-foreground">
                    {t.subject}
                  </p>
                  <span className="meta-mono">
                    {t.id} · {formatTimestamp(t.createdAt)}
                  </span>
                </div>
                <p className="break-words text-sm text-muted-foreground">
                  {t.name} ·{" "}
                  <a
                    href={`mailto:${t.email}?subject=${encodeURIComponent(`Re: ${t.subject}`)}`}
                    className="rounded-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
                  >
                    {t.email}
                  </a>
                  {t.pagePath ? ` · from ${t.pagePath}` : ""}
                  {t.userId ? " · signed in" : " · signed out"}
                </p>
                {t.emailStatus ? (
                  <p
                    className={
                      t.emailStatus.startsWith("Emailed")
                        ? "text-xs font-medium text-emerald-brand"
                        : t.emailStatus.startsWith("Email failed")
                          ? "text-xs font-medium text-destructive"
                          : "text-xs text-muted-foreground"
                    }
                    data-ocid={`admin.support.ticket.${t.id}.email_status`}
                  >
                    {t.emailStatus}
                  </p>
                ) : null}
                <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                  {t.message}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
