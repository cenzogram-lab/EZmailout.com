import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

/**
 * "We couldn't load …" with Try again: what a list or record shows when its
 * read fails, never its empty state (which would claim there is nothing).
 */
export function LoadError({
  what,
  onRetry,
  retrying = false,
  "data-ocid": ocid,
}: {
  /** What failed to load, e.g. "your recent campaigns". */
  what: string;
  onRetry: () => void;
  retrying?: boolean;
  "data-ocid"?: string;
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm text-muted-foreground"
      data-ocid={ocid}
    >
      <span>We couldn't load {what}. Try again in a moment.</span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-2 rounded-full"
        onClick={onRetry}
        disabled={retrying}
      >
        <RefreshCw className="size-3.5" /> Try again
      </Button>
    </div>
  );
}
