import type { AudiencePresetShared } from "@/backend";
import { SignInPrompt } from "@/components/billing/SignInPrompt";
import { MascotEmptyState } from "@/components/stampy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadError } from "@/components/ui/load-error";
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

  if (presets.isError && !presets.data) {
    return (
      <Card>
        <CardContent>
          <LoadError
            what="your saved audiences"
            onRetry={() => void presets.refetch()}
            retrying={presets.isRefetching}
            data-ocid="audience.presets.error"
          />
        </CardContent>
      </Card>
    );
  }

  const list = presets.data ?? [];
  if (list.length === 0) {
    return (
      <Card
        className="border-dashed border-hairline-strong bg-card-raised shadow-none"
        data-ocid="audience.presets.empty"
      >
        <CardContent>
          <MascotEmptyState
            pose="audience"
            size="sm"
            title="No saved audiences yet"
            description={
              'Verify a CSV list and choose "Save as preset", or save recipients from any finished campaign to reuse them here.'
            }
          />
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
                "h-auto w-full items-start justify-between gap-3 rounded-2xl border p-4 text-left font-normal whitespace-normal shadow-surface transition-smooth hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
                active
                  ? "border-primary/60 bg-primary/[0.07] ring-1 ring-primary/30"
                  : "border-hairline bg-card-raised hover:border-primary/40 hover:bg-card-raised",
              )}
              data-ocid={`audience.presets.item.${index + 1}`}
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary-ink">
                <Users className="size-5" />
              </span>
              <span className="min-w-0 flex-1 space-y-1.5">
                <span className="block truncate font-bold tracking-tight text-foreground">
                  {preset.name}
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-baseline gap-1.5">
                    <span className="text-2xl font-black leading-none tracking-tight tabular-nums text-foreground">
                      {formatNumber(preset.recipientCount)}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {" recipients"}
                    </span>
                  </span>
                  {preset.sourceCampaignId && (
                    <Badge variant="neutral" className="font-mono font-medium">
                      from {preset.sourceCampaignId}
                    </Badge>
                  )}
                </span>
                <span className="meta-mono block tracking-normal">
                  Updated {formatTimestamp(preset.updatedAt, false)}
                </span>
              </span>
              <ChevronRight className="mt-3 size-4 shrink-0 text-muted-foreground" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
