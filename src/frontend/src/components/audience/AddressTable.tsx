import type { AddressInput } from "@/backend";
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
      <p
        className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground"
        data-ocid={`${ocidPrefix}.table.empty`}
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="overflow-auto rounded-xl border border-border"
        data-ocid={`${ocidPrefix}.table`}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-right">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>City</TableHead>
              <TableHead>State</TableHead>
              <TableHead>ZIP</TableHead>
              {showStatus && <TableHead>Status</TableHead>}
              {showDelete && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row, i) => {
              const index = start + i;
              const status = statuses?.[index];
              const invalid = status ? !status.isValid : false;
              return (
                <TableRow
                  key={rowKey(row, index)}
                  className={cn(invalid && "bg-destructive/5")}
                  data-ocid={`${ocidPrefix}.item.${index + 1}`}
                >
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {row.name || "Resident"}
                  </TableCell>
                  <TableCell>
                    {row.address_line1}
                    {row.address_line2 ? (
                      <span className="text-muted-foreground">
                        , {row.address_line2}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>{row.city}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.state}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.zip_code}
                    {row.zip_plus4 ? `-${row.zip_plus4}` : ""}
                  </TableCell>
                  {showStatus && (
                    <TableCell>
                      {status ? (
                        status.isValid ? (
                          <Badge
                            variant="outline"
                            className="gap-1 border-emerald-brand/30 bg-emerald-brand/10 text-emerald-brand"
                          >
                            <CheckCircle2 className="size-3" /> Valid
                          </Badge>
                        ) : (
                          <span className="flex flex-col gap-0.5">
                            <Badge
                              variant="outline"
                              className="w-fit gap-1 border-destructive/30 bg-destructive/10 text-destructive"
                            >
                              <XCircle className="size-3" /> Invalid
                            </Badge>
                            {status.errorMessage && (
                              <span className="text-xs text-destructive">
                                {status.errorMessage}
                              </span>
                            )}
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  {showDelete && (
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
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
        <span>
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
              className="gap-1"
              data-ocid={`${ocidPrefix}.pagination.prev.button`}
            >
              <ChevronLeft className="size-3.5" /> Prev
            </Button>
            <span className="px-2 font-mono">
              {page + 1} / {pageCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1}
              className="gap-1"
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
