import type { AddressInput } from "@/backend";
import { MascotEmptyState } from "@/components/stampy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

export const ADDRESS_PAGE_SIZE = 25;

/** Any address-shaped row (AddressInput or VerifiedAddress). */
export interface AddressRowLike extends AddressInput {
  zip_plus4?: string;
}

export interface AddressRowStatus {
  isValid: boolean;
  errorMessage?: string;
}

export interface AddressTableProps {
  rows: AddressRowLike[];
  /** Per-row verification status (index-aligned with `rows`). */
  statuses?: (AddressRowStatus | undefined)[];
  /** Enables the trash button on each row. */
  onDeleteRow?: (index: number) => void;
  /** Prefix for data-ocid attributes, e.g. "audience.csv". */
  ocidPrefix: string;
  emptyMessage?: string;
}

function rowKey(row: AddressRowLike, index: number): string {
  return `${index}:${row.zip_code}:${row.address_line1}:${row.name}`;
}

/** A row's verification result: Valid, Invalid (with the reason) or a dash. */
function RowStatus({ status }: { status: AddressRowStatus | undefined }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  if (status.isValid) {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="size-3" /> Valid
      </Badge>
    );
  }
  return (
    <span className="flex flex-col gap-0.5">
      <Badge
        variant="outline"
        className="w-fit gap-1 border-destructive/30 bg-destructive/10 text-destructive"
      >
        <XCircle className="size-3" /> Invalid
      </Badge>
      {status.errorMessage && (
        <span className="whitespace-normal text-xs text-destructive sm:whitespace-nowrap">
          {status.errorMessage}
        </span>
      )}
    </span>
  );
}

/** Paginated recipient table with optional status and delete columns. */
export function AddressTable({
  rows,
  statuses,
  onDeleteRow,
  ocidPrefix,
  emptyMessage = "No recipients yet.",
}: AddressTableProps) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / ADDRESS_PAGE_SIZE));

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  const start = page * ADDRESS_PAGE_SIZE;
  const visible = rows.slice(start, start + ADDRESS_PAGE_SIZE);
  const showStatus = !!statuses;
  const showDelete = !!onDeleteRow;

  if (rows.length === 0) {
    return (
      <MascotEmptyState
        pose="audience"
        size="sm"
        title={emptyMessage}
        description="Recipients you add or verify appear here."
        className="rounded-3xl border border-dashed border-hairline-strong bg-card-raised px-4"
        data-ocid={`${ocidPrefix}.table.empty`}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="overflow-auto rounded-2xl border border-hairline bg-card-raised shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]"
        data-ocid={`${ocidPrefix}.table`}
      >
        <Table>
          <TableHeader className="bg-well">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 text-right">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Address</TableHead>
              <TableHead className="hidden sm:table-cell">City</TableHead>
              <TableHead className="hidden sm:table-cell">State</TableHead>
              <TableHead className="hidden sm:table-cell">ZIP</TableHead>
              {showStatus && (
                <TableHead className="hidden sm:table-cell">Status</TableHead>
              )}
              {showDelete && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row, i) => {
              const index = start + i;
              const status = statuses?.[index];
              const invalid = status ? !status.isValid : false;
              const zip = `${row.zip_code}${row.zip_plus4 ? `-${row.zip_plus4}` : ""}`;
              return (
                <TableRow
                  key={rowKey(row, index)}
                  className={cn(invalid && "bg-destructive/5")}
                  data-ocid={`${ocidPrefix}.item.${index + 1}`}
                >
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="whitespace-normal font-medium text-foreground sm:whitespace-nowrap">
                    {row.name || "Resident"}
                    {/* Phones: the address and status go under the name and
                        wrap, instead of five more columns scrolling out of
                        the card with the street cut mid-word. */}
                    <span className="mt-0.5 block text-xs font-normal leading-snug text-muted-foreground [overflow-wrap:anywhere] sm:hidden">
                      {row.address_line1}
                      {row.address_line2 ? `, ${row.address_line2}` : ""}
                      <br />
                      {row.city}, {row.state} {zip}
                    </span>
                    {showStatus && (
                      <span className="mt-1.5 block font-normal sm:hidden">
                        <RowStatus status={status} />
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {row.address_line1}
                    {row.address_line2 ? (
                      <span className="text-muted-foreground">
                        , {row.address_line2}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {row.city}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs sm:table-cell">
                    {row.state}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs sm:table-cell">
                    {zip}
                  </TableCell>
                  {showStatus && (
                    <TableCell className="hidden sm:table-cell">
                      <RowStatus status={status} />
                    </TableCell>
                  )}
                  {showDelete && (
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-11 text-muted-foreground hover:text-destructive sm:size-8"
                        onClick={() => onDeleteRow?.(index)}
                        aria-label={`Remove recipient ${index + 1}`}
                        data-ocid={`${ocidPrefix}.item.${index + 1}.delete.button`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="tabular-nums">
          Showing {formatNumber(start + 1)}–
          {formatNumber(Math.min(rows.length, start + ADDRESS_PAGE_SIZE))} of{" "}
          {formatNumber(rows.length)}
        </span>
        {pageCount > 1 && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-11 gap-1 sm:h-8"
              data-ocid={`${ocidPrefix}.pagination.prev.button`}
            >
              <ChevronLeft className="size-3.5" /> Prev
            </Button>
            <span className="meta-mono px-2">
              {page + 1} / {pageCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1}
              className="h-11 gap-1 sm:h-8"
              data-ocid={`${ocidPrefix}.pagination.next.button`}
            >
              Next <ChevronRight className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
