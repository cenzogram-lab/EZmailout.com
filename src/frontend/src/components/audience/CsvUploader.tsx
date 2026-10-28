import type {
  AddressInput,
  VerificationBatchResult,
  VerifiedAddress,
} from "@/backend";
import { AddressTable } from "@/components/audience/AddressTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useSavePreset, useVerifyAddresses } from "@/hooks/use-backend";
import { SAMPLE_CSV, parseAddressCsv } from "@/lib/csv";
import { downloadText } from "@/lib/download";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  BookmarkPlus,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export interface CsvUploaderProps {
  onUseAudience: (addresses: VerifiedAddress[]) => void;
}

/**
 * Addresses one verification call takes (the canister's per-batch limit: its
 * address list goes to the print partner in one outcall). A larger list is
 * verified batch by batch, `VERIFY_GAP_MS` apart (the per-account gap).
 */
const VERIFY_BATCH = 5000;
const VERIFY_GAP_MS = 5500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The seconds a "Wait N seconds" refusal asks for, if it is one. */
function waitSeconds(error: string | undefined): number | null {
  const m = error?.match(/Wait (\d+) seconds/);
  return m ? Number(m[1]) : null;
}

/** One result for a list verified in several batches. */
function mergeBatches(
  batches: VerificationBatchResult[],
): VerificationBatchResult {
  return {
    ok: true,
    results: batches.flatMap((b) => b.results),
    validCount: batches.reduce((n, b) => n + b.validCount, 0n),
    invalidCount: batches.reduce((n, b) => n + b.invalidCount, 0n),
    addressListId: batches[0]?.addressListId,
  };
}

function collectVerified(result: VerificationBatchResult): VerifiedAddress[] {
  const out: VerifiedAddress[] = [];
  for (const r of result.results) {
    if (r.isValid && r.verified) out.push(r.verified);
  }
  return out;
}

/** CSV drop zone, parser, print CASS verification and preset saving. */
export function CsvUploader({ onUseAudience }: CsvUploaderProps) {
  const { isAuthenticated } = useAccountSync();
  const verify = useVerifyAddresses();
  const savePreset = useSavePreset();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<AddressInput[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<VerificationBatchResult | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  /** Rows verified so far while a list larger than one batch is checked. */
  const [verifyProgress, setVerifyProgress] = useState<number | null>(null);
  // The whole run, waits and retries included: a second click must not start
  // another loop into the same batches.
  const [verifying, setVerifying] = useState(false);
  /** The batches verified for `rows` (the same array) so far. */
  const verifiedSoFar = useRef<{
    rows: AddressInput[];
    batches: VerificationBatchResult[];
  } | null>(null);
  const [presetOpen, setPresetOpen] = useState(false);
  const [presetName, setPresetName] = useState("");

  const verifiedAddresses = useMemo(
    () => (result?.ok ? collectVerified(result) : []),
    [result],
  );

  const statuses = useMemo(() => {
    if (!result || !result.ok) return undefined;
    return rows.map((_, i) => {
      const r = result.results[i];
      return r
        ? { isValid: r.isValid, errorMessage: r.errorMessage }
        : undefined;
    });
  }, [result, rows]);

  // The list on screen now: a verification run that outlives its list (a new
  // file dropped, a row deleted) must not put its results on another one.
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  async function loadFile(file: File) {
    if (verifying) return;
    setResult(null);
    setVerifyError(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      const parsed = parseAddressCsv(text);
      setRows(parsed.rows);
      setParseErrors(parsed.errors);
      if (parsed.errors.length === 0) {
        const dupes = parsed.duplicatesRemoved;
        toast.success(
          `Parsed ${formatNumber(parsed.rows.length)} recipients from ${file.name}.${
            dupes > 0
              ? ` ${formatNumber(dupes)} duplicate ${dupes === 1 ? "row was" : "rows were"} left out, so nobody gets two.`
              : ""
          }`,
        );
      }
    } catch (error) {
      setRows([]);
      setParseErrors([
        error instanceof Error ? error.message : "Could not read the file.",
      ]);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void loadFile(file);
  }

  function handleDeleteRow(index: number) {
    if (verifying) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
    setResult(null);
    setVerifyError(null);
  }

  async function handleVerify() {
    if (rows.length === 0) return;
    setVerifyError(null);
    setResult(null);
    // Fail-closed: a list is usable only when every batch verified. Batches
    // already verified for this same list are kept, so a list stopped by the
    // hourly quota continues where it stopped instead of starting over.
    if (verifiedSoFar.current?.rows !== rows) {
      verifiedSoFar.current = { rows, batches: [] };
    }
    const done = verifiedSoFar.current.batches;
    const resumeAt = done.length * VERIFY_BATCH;
    setVerifying(true);
    try {
      for (let start = resumeAt; start < rows.length; start += VERIFY_BATCH) {
        if (start > resumeAt) {
          setVerifyProgress(start);
          await sleep(VERIFY_GAP_MS);
        }
        if (rowsRef.current !== rows) return;
        const slice = rows.slice(start, start + VERIFY_BATCH);
        let batch = await verify.mutateAsync(slice);
        const wait = batch.ok ? null : waitSeconds(batch.error);
        if (wait !== null && wait <= 60) {
          await sleep(wait * 1000 + 500);
          batch = await verify.mutateAsync(slice);
        }
        if (rowsRef.current !== rows) return;
        if (!batch.ok) {
          const reason =
            batch.error ?? "EZmailout could not verify these addresses.";
          setVerifyError(
            start > 0
              ? `${reason} ${formatNumber(start)} of ${formatNumber(rows.length)} addresses are verified; verify again to continue from there.`
              : reason,
          );
          return;
        }
        done.push(batch);
      }
      if (rowsRef.current !== rows) return;
      const merged = mergeBatches(done);
      setResult(merged);
      toast.success(
        `${formatNumber(merged.validCount)} of ${formatNumber(rows.length)} addresses verified.`,
      );
    } catch (error) {
      setVerifyError(
        error instanceof Error
          ? error.message
          : "Address verification failed. Please try again.",
      );
    } finally {
      setVerifying(false);
      setVerifyProgress(null);
    }
  }

  async function handleSavePreset() {
    const name = presetName.trim();
    if (!name) {
      toast.error("Give your preset a name.");
      return;
    }
    if (verifiedAddresses.length === 0) {
      toast.error("Verify the list before saving it as a preset.");
      return;
    }
    try {
      const saved = await savePreset.mutateAsync({
        name,
        addresses: verifiedAddresses,
        sourceCampaignId: null,
      });
      if (saved.ok) {
        toast.success(
          `Preset "${name}" saved with ${formatNumber(verifiedAddresses.length)} recipients.`,
        );
        setPresetOpen(false);
      } else {
        toast.error(saved.error ?? "Could not save the preset.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save the preset.",
      );
    }
  }

  const canContinue = !!result?.ok && verifiedAddresses.length > 0;

  return (
    <div className="space-y-5">
      <section
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-4 py-10 text-center transition-smooth sm:px-6",
          dragging
            ? "border-primary bg-primary/10"
            : "border-hairline-strong bg-well hover:border-primary/40",
        )}
        data-ocid="audience.csv.dropzone"
      >
        <div className="btn-3d-primary flex size-14 items-center justify-center rounded-2xl">
          <Upload className="size-6" />
        </div>
        <div>
          <p className="text-base font-bold tracking-tight text-foreground">
            Drag a CSV here, or browse for one
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Columns: name, address_line1, address_line2, city, state, zip_code
            (headers like "street" or "postal code" are recognised too)
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-11 gap-2 sm:h-9"
            data-ocid="audience.csv.browse.button"
          >
            <FileSpreadsheet className="size-4" /> Choose file
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              downloadText("ezmailout-sample.csv", SAMPLE_CSV, "text/csv")
            }
            className="h-11 gap-2 sm:h-9"
            data-ocid="audience.csv.sample.button"
          >
            <Download className="size-4" /> Download sample CSV
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void loadFile(file);
            e.target.value = "";
          }}
          data-ocid="audience.csv.file.input"
        />
        {fileName && (
          <Badge variant="neutral" className="max-w-full truncate font-mono">
            {fileName}
          </Badge>
        )}
      </section>

      {parseErrors.length > 0 && (
        <Alert variant="destructive" data-ocid="audience.csv.parse.error">
          <AlertCircle className="size-4" />
          <AlertTitle>We could not read that file</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-0.5 pl-4">
              {parseErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="neutral" className="tabular-nums">
                {formatNumber(rows.length)} recipients parsed
              </Badge>
              {result?.ok && <Badge variant="success">CASS verified</Badge>}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleVerify()}
              disabled={
                verifying || verify.isPending || verifyProgress !== null
              }
              className="h-11 gap-2 sm:h-9"
              data-ocid="audience.csv.verify.button"
            >
              {verifying || verify.isPending || verifyProgress !== null ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              {verifyProgress !== null
                ? `Verifying ${formatNumber(verifyProgress)} of ${formatNumber(rows.length)}…`
                : "Verify with EZmailout (CASS)"}
            </Button>
          </div>

          <AddressTable
            rows={rows}
            statuses={statuses}
            onDeleteRow={verifying ? undefined : handleDeleteRow}
            ocidPrefix="audience.csv"
          />
        </div>
      )}

      {verifyError && (
        <Alert variant="destructive" data-ocid="audience.csv.verify.error">
          <AlertCircle className="size-4" />
          <AlertTitle>Verification unavailable</AlertTitle>
          <AlertDescription>
            {verifyError} Your parsed list is kept above; fix the configuration
            or try again before continuing.
          </AlertDescription>
        </Alert>
      )}

      {result?.ok && (
        <Card
          className="relative isolate rounded-2xl bg-card-raised py-4 shadow-none"
          data-ocid="audience.csv.summary.card"
        >
          <div aria-hidden className="ambient-glow-backdrop" />
          <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-4 px-4 sm:px-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-brand" />
              <span className="text-sm font-medium text-foreground">
                <span className="text-2xl font-black tracking-tight tabular-nums">
                  {formatNumber(result.validCount)}
                </span>{" "}
                valid
              </span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="size-5 text-destructive" />
              <span className="text-sm font-medium text-foreground">
                <span className="text-2xl font-black tracking-tight tabular-nums">
                  {formatNumber(result.invalidCount)}
                </span>{" "}
                invalid (skipped)
              </span>
            </div>
            <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!isAuthenticated) {
                    toast.error("Sign in to save presets.");
                    return;
                  }
                  setPresetName(
                    fileName
                      ? fileName.replace(/\.csv$/i, "")
                      : "Saved audience",
                  );
                  setPresetOpen(true);
                }}
                disabled={verifiedAddresses.length === 0}
                className="h-11 w-full gap-2 sm:h-9 sm:w-auto"
                data-ocid="audience.csv.save_preset.button"
              >
                <BookmarkPlus className="size-4" /> Save as preset
              </Button>
              <Button
                type="button"
                onClick={() => onUseAudience(verifiedAddresses)}
                disabled={!canContinue}
                className="h-11 w-full gap-2 sm:h-9 sm:w-auto"
                data-ocid="audience.csv.use.button"
              >
                Use verified audience <ArrowRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={presetOpen} onOpenChange={setPresetOpen}>
        <DialogContent data-ocid="audience.csv.save_preset.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Save as preset</DialogTitle>
            <DialogDescription>
              Keep these {formatNumber(verifiedAddresses.length)} verified
              recipients for future campaigns.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="csv-preset-name">Preset name</Label>
            <Input
              id="csv-preset-name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              maxLength={80}
              className="h-11 sm:h-9"
              data-ocid="audience.csv.save_preset.name.input"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPresetOpen(false)}
              className="h-11 sm:h-9"
              data-ocid="audience.csv.save_preset.cancel.button"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSavePreset()}
              disabled={savePreset.isPending}
              className="h-11 gap-2 sm:h-9"
              data-ocid="audience.csv.save_preset.confirm.button"
            >
              {savePreset.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <BookmarkPlus className="size-4" />
              )}
              Save preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
