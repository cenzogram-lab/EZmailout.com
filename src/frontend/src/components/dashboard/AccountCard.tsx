import { Button } from "@/components/ui/button";
import { GroupedList, GroupedListRow } from "@/components/ui/grouped-list";
import { Input } from "@/components/ui/input";
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
    <GroupedList
      title="Account"
      footer="Your Internet Identity principal and contact details."
      data-ocid="dashboard.account.card"
    >
      <GroupedListRow
        icon={Fingerprint}
        label="Principal"
        description={
          <Tooltip>
            <TooltipTrigger asChild>
              <code
                className="font-mono text-xs text-muted-foreground"
                data-ocid="dashboard.account.principal.text"
              >
                {principalText ? shortPrincipal(principalText) : "—"}
              </code>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs break-all font-mono text-xs">
              {principalText || "Not signed in"}
            </TooltipContent>
          </Tooltip>
        }
        trailing={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
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
        }
      />
      {editing ? (
        <div className="flex items-center gap-2 px-4 py-2.5">
          <Input
            type="email"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="you@example.com"
            autoFocus
            aria-label="Email"
            className="h-9 rounded-full"
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSaveEmail();
              if (e.key === "Escape") setEditing(false);
            }}
            data-ocid="dashboard.account.email.input"
          />
          <Button
            type="button"
            size="icon"
            className="size-9 shrink-0 rounded-full"
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
            className="size-9 shrink-0 rounded-full"
            onClick={() => setEditing(false)}
            disabled={updateEmail.isPending}
            aria-label="Cancel"
            data-ocid="dashboard.account.cancel_email.button"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <GroupedListRow
          icon={Mail}
          label="Email"
          description={
            currentEmail ? (
              <span data-ocid="dashboard.account.email.text">
                {currentEmail}
              </span>
            ) : (
              "Add one for receipts"
            )
          }
          trailing={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 rounded-full px-3 text-xs"
              onClick={startEditing}
              disabled={!account}
              data-ocid="dashboard.account.edit_email.button"
            >
              <Pencil className="size-3" />
              {currentEmail ? "Edit" : "Add"}
            </Button>
          }
        />
      )}
      <GroupedListRow
        icon={CalendarDays}
        label="Member since"
        value={
          <span data-ocid="dashboard.account.member_since.badge">
            {account ? formatTimestamp(account.createdAt, false) : "—"}
          </span>
        }
      />
    </GroupedList>
  );
}
