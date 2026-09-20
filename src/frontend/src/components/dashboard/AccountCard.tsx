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
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAccountSync } from "@/hooks/use-account";
import { useUpdateAccountEmail } from "@/hooks/use-backend";
import { copyText } from "@/lib/download";
import { formatTimestamp } from "@/lib/format";
import {
  CalendarDays,
  Check,
  Copy,
  Fingerprint,
  Loader2,
  Mail,
  Pencil,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/** Shortens a principal like `abcde-fghij-...-xyz` to `abcde…xyz`. */
export function shortPrincipal(principal: string): string {
  if (principal.length <= 16) return principal;
  return `${principal.slice(0, 7)}…${principal.slice(-5)}`;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function AccountCard() {
  const { account, principal } = useAccountSync();
  const updateEmail = useUpdateAccountEmail();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);

  const currentEmail = account?.email ?? "";
  const principalText = principal ?? account?.id ?? "";

  async function handleCopy() {
    if (!principalText) return;
    const ok = await copyText(principalText);
    if (ok) {
      setCopied(true);
      toast.success("Principal copied.");
      window.setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Could not copy to clipboard.");
    }
  }

  function startEditing() {
    setDraft(currentEmail);
    setEditing(true);
  }

  async function handleSaveEmail() {
    const email = draft.trim();
    if (email && !isValidEmail(email)) {
      toast.error("Enter a valid email address.");
      return;
    }
    try {
      const result = await updateEmail.mutateAsync(email);
      if (result.ok) {
        toast.success(email ? "Email updated." : "Email removed.");
        setEditing(false);
      } else {
        toast.error(result.error ?? "Could not update email.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update email.",
      );
    }
  }

  return (
    <Card data-ocid="dashboard.account.card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserRound className="size-4 text-primary" />
          Account
        </CardTitle>
        <CardDescription>
          Your Internet Identity principal and contact details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Principal</Label>
          <div className="flex items-center gap-2">
            <Fingerprint className="size-4 shrink-0 text-muted-foreground" />
            <Tooltip>
              <TooltipTrigger asChild>
                <code
                  className="truncate rounded-md bg-muted px-2 py-1 font-mono text-xs text-foreground"
                  data-ocid="dashboard.account.principal.text"
                >
                  {principalText ? shortPrincipal(principalText) : "—"}
                </code>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs break-all font-mono text-xs">
                {principalText || "Not signed in"}
              </TooltipContent>
            </Tooltip>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={handleCopy}
              disabled={!principalText}
              aria-label="Copy principal"
              data-ocid="dashboard.account.copy_principal.button"
            >
              {copied ? (
                <Check className="size-4 text-emerald-brand" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
        </div>

        <Separator />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Email</Label>
            {!editing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={startEditing}
                disabled={!account}
                data-ocid="dashboard.account.edit_email.button"
              >
                <Pencil className="size-3" />
                {currentEmail ? "Edit" : "Add"}
              </Button>
            )}
          </div>
          {editing ? (
            <div className="flex items-center gap-2">
              <Input
                type="email"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                className="h-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSaveEmail();
                  if (e.key === "Escape") setEditing(false);
                }}
                data-ocid="dashboard.account.email.input"
              />
              <Button
                type="button"
                size="icon"
                className="size-9 shrink-0"
                onClick={handleSaveEmail}
                disabled={updateEmail.isPending}
                aria-label="Save email"
                data-ocid="dashboard.account.save_email.button"
              >
                {updateEmail.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 shrink-0"
                onClick={() => setEditing(false)}
                disabled={updateEmail.isPending}
                aria-label="Cancel"
                data-ocid="dashboard.account.cancel_email.button"
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="size-4 shrink-0 text-muted-foreground" />
              {currentEmail ? (
                <span
                  className="truncate text-foreground"
                  data-ocid="dashboard.account.email.text"
                >
                  {currentEmail}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  No email on file — add one for receipts.
                </span>
              )}
            </div>
          )}
        </div>

        <Separator />

        <div className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="size-4" />
            Member since
          </span>
          <Badge
            variant="outline"
            data-ocid="dashboard.account.member_since.badge"
          >
            {account ? formatTimestamp(account.createdAt, false) : "—"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
