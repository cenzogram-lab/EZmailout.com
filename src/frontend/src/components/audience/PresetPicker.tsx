import type { AudiencePresetShared } from "@/backend";
import { SignInPrompt } from "@/components/billing/SignInPrompt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAccountSync } from "@/hooks/use-account";
import { usePresets } from "@/hooks/use-backend";
import { formatNumber, formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Bookmark, ChevronRight, Loader2, Users } from "lucide-react";

export interface PresetPickerProps {
  selectedId: string | null;
  onSelect: (preset: AudiencePresetShared) => void;
}

/** Lists the signed-in user's saved audience presets. */
export function PresetPicker({ selectedId, onSelect }: PresetPickerProps) {
  const { isAuthenticated, isInitializing } = useAccountSync();
  const presets = usePresets();

  if (isInitializing) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Checking your session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <SignInPrompt message="Sign in with Internet Identity to see and reuse your saved audiences." />
    );
  }

  if (presets.isLoading) {
    return (
      <div
        className="flex items-center gap-2 py-6 text-sm text-muted-foreground"
        data-ocid="audience.presets.loading"
      >
        <Loader2 className="size-4 animate-spin" /> Loading presets…
      </div>
    );
  }

  const list = presets.data ?? [];
  if (list.length === 0) {
    return (
      <Card
        className="border-dashed bg-muted/30"
        data-ocid="audience.presets.empty"
      >
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <Bookmark className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            No saved audiences yet
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Verify a CSV list and choose "Save as preset", or save recipients
            from any finished campaign to reuse them here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2" data-ocid="audience.presets.list">
      {list.map((preset, index) => {
        const active = preset.id === selectedId;
        return (
          <li key={preset.id}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onSelect(preset)}
              className={cn(
                "h-auto w-full items-start justify-between gap-3 rounded-xl border p-4 text-left whitespace-normal",
                active
                  ? "border-accent bg-accent/10"
                  : "border-border bg-card hover:border-primary/40",
              )}
              data-ocid={`audience.presets.item.${index + 1}`}
            >
              <span className="min-w-0 flex-1 space-y-1.5">
                <span className="block truncate font-medium text-foreground">
                  {preset.name}
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="gap-1 font-normal">
                    <Users className="size-3" />{" "}
                    {formatNumber(preset.recipientCount)} recipients
                  </Badge>
                  {preset.sourceCampaignId && (
                    <Badge variant="outline" className="font-mono font-normal">
                      from {preset.sourceCampaignId}
                    </Badge>
                  )}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Updated {formatTimestamp(preset.updatedAt, false)}
                </span>
              </span>
              <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
