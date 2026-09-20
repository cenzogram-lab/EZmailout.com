import type { VerifiedAddress } from "@/backend";
import { SignInPrompt } from "@/components/billing/SignInPrompt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccountSync } from "@/hooks/use-account";
import { useCampaignRecipients, useSavePreset } from "@/hooks/use-backend";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BookmarkPlus, Loader2, Undo2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export interface SavePresetDialogProps {
  campaignId: string | null;
  campaignName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RecipientRow {
  key: string;
  index: number;
  address: VerifiedAddress;
}

function addressLine(address: VerifiedAddress): string {
  const line2 = address.address_line2 ? ` ${address.address_line2}` : "";
  const plus4 = address.zip_plus4 ? `-${address.zip_plus4}` : "";
  return `${address.address_line1}${line2}, ${address.city}, ${address.state} ${address.zip_code}${plus4}`;
}

/**
 * Loads a campaign's recipients, lets the user name the audience and prune
 * rows, then saves it as a reusable preset (requires sign-in).
 */
export function SavePresetDialog({
  campaignId,
  campaignName,
  open,
  onOpenChange,
}: SavePresetDialogProps) {
  const { isAuthenticated, isInitializing } = useAccountSync();
  const recipients = useCampaignRecipients(open ? campaignId : null);
  const savePreset = useSavePreset();
  const [name, setName] = useState("");
  const [filter, setFilter] = useState("");
  const [removed, setRemoved] = useState<ReadonlySet<number>>(new Set());

  useEffect(() => {
    if (!open) return;
    setName(campaignName ? `${campaignName} audience` : "Saved audience");
    setFilter("");
    setRemoved(new Set());
  }, [open, campaignName]);

  const rows = useMemo<RecipientRow[]>(
    () =>
      (recipients.data ?? []).map((address, index) => ({
        key: `${index}:${address.zip_code}:${address.address_line1}`,
        index,
        address,
      })),
    [recipients.data],
  );

  const visibleRows = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (row) =>
        row.address.name.toLowerCase().includes(needle) ||
        addressLine(row.address).toLowerCase().includes(needle),
    );
  }, [rows, filter]);

  const keptCount = rows.length - removed.size;

  function toggleRow(index: number) {
    setRemoved((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function handleSave() {
    if (!campaignId) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Give your preset a name.");
      return;
    }
    const addresses = rows
      .filter((row) => !removed.has(row.index))
      .map((row) => row.address);
    if (addresses.length === 0) {
      toast.error("Keep at least one recipient.");
      return;
    }
    try {
      const result = await savePreset.mutateAsync({
        name: trimmed,
        addresses,
        sourceCampaignId: campaignId,
      });
      if (result.ok) {
        toast.success(
          `Preset "${trimmed}" saved with ${formatNumber(addresses.length)} recipients.`,
        );
        onOpenChange(false);
      } else {
        toast.error(result.error ?? "Could not save the preset.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save the preset.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xl"
        data-ocid="campaigns.save_preset.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <BookmarkPlus className="size-5 text-primary" />
            Save audience as preset
          </DialogTitle>
          <DialogDescription>
            Reuse this mailing list in future campaigns. Remove anyone you no
            longer want to mail before saving.
          </DialogDescription>
        </DialogHeader>

        {isInitializing ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Checking your session…
          </div>
        ) : !isAuthenticated ? (
          <SignInPrompt message="Sign in to save audiences as reusable presets." />
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="save-preset-name">Preset name</Label>
              <Input
                id="save-preset-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Spring open-house list"
                maxLength={80}
                data-ocid="campaigns.save_preset.name.input"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge
                variant="outline"
                className="border-emerald-brand/30 bg-emerald-brand/10 text-emerald-brand"
              >
                {formatNumber(keptCount)} of {formatNumber(rows.length)} kept
              </Badge>
              <Input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Filter by name or address"
                className="h-8 w-full sm:w-56"
                data-ocid="campaigns.save_preset.filter.input"
              />
            </div>

            <div
              className="max-h-72 overflow-y-auto rounded-xl border bg-muted/30"
              data-ocid="campaigns.save_preset.recipient.list"
            >
              {recipients.isLoading ? (
                <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading recipients…
                </div>
              ) : rows.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  This campaign has no stored recipient addresses to save.
                </p>
              ) : visibleRows.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No recipients match that filter.
                </p>
              ) : (
                <ul className="divide-y">
                  {visibleRows.map((row) => {
                    const isRemoved = removed.has(row.index);
                    return (
                      <li
                        key={row.key}
                        className={cn(
                          "flex items-center justify-between gap-3 px-3 py-2 text-sm",
                          isRemoved && "opacity-60",
                        )}
                        data-ocid={`campaigns.save_preset.item.${row.index + 1}`}
                      >
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "truncate font-medium text-foreground",
                              isRemoved && "line-through",
                            )}
                          >
                            {row.address.name || "Resident"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {addressLine(row.address)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0"
                          onClick={() => toggleRow(row.index)}
                          aria-label={
                            isRemoved ? "Restore recipient" : "Remove recipient"
                          }
                          data-ocid={`campaigns.save_preset.item.${row.index + 1}.toggle.button`}
                        >
                          {isRemoved ? (
                            <Undo2 className="size-4 text-emerald-brand" />
                          ) : (
                            <X className="size-4 text-muted-foreground" />
                          )}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-ocid="campaigns.save_preset.cancel.button"
          >
            Cancel
          </Button>
          {isAuthenticated ? (
            <Button
              type="button"
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={handleSave}
              disabled={
                savePreset.isPending || recipients.isLoading || keptCount === 0
              }
              data-ocid="campaigns.save_preset.save.button"
            >
              {savePreset.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <BookmarkPlus className="size-4" />
              )}
              Save preset
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
