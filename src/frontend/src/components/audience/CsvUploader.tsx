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

function collectVerified(result: VerificationBatchResult): VerifiedAddress[] {
  const out: VerifiedAddress[] = [];
  for (const r of result.results) {
    if (r.isValid && r.verified) out.push(r.verified);
  }
  return out;
}

/** CSV drop zone, parser, Click2Mail CASS verification and preset saving. */
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

  async function loadFile(file: File) {
    setResult(null);
    setVerifyError(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      const parsed = parseAddressCsv(text);
      setRows(parsed.rows);
      setParseErrors(parsed.errors);
      if (parsed.errors.length === 0) {
        toast.success(
          `Parsed ${formatNumber(parsed.rows.length)} recipients from ${file.name}.`,
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
    setRows((prev) => prev.filter((_, i) => i !== index));
    setResult(null);
    setVerifyError(null);
  }

  async function handleVerify() {
    if (rows.length === 0) return;
    setVerifyError(null);
    setResult(null);
    try {
      const batch = await verify.mutateAsync(rows);
      setResult(batch);
      if (!batch.ok) {
        setVerifyError(
          batch.error ?? "Click2Mail could not verify these addresses.",
        );
      } else {
        toast.success(
          `${formatNumber(batch.validCount)} of ${formatNumber(rows.length)} addresses verified.`,
        );
      }
    } catch (error) {
      setVerifyError(
        error instanceof Error
          ? error.message
          : "Address verification failed. Please try again.",
      );
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
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-smooth",
          dragging
            ? "border-accent bg-accent/10"
            : "border-border bg-muted/30 hover:bg-muted/50",
        )}
        data-ocid="audience.csv.dropzone"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Upload className="size-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
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
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
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
            className="gap-2"
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
          <Badge variant="secondary" className="font-mono">
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
              <Badge variant="secondary">
                {formatNumber(rows.length)} recipients parsed
              </Badge>
              {result?.ok && (
                <Badge
                  variant="outline"
                  className="border-emerald-brand/30 bg-emerald-brand/10 text-emerald-brand"
                >
                  CASS verified
                </Badge>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleVerify()}
              disabled={verify.isPending}
              className="gap-2"
              data-ocid="audience.csv.verify.button"
            >
              {verify.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              Verify with Click2Mail (CASS)
            </Button>
          </div>

          <AddressTable
            rows={rows}
            statuses={statuses}
            onDeleteRow={handleDeleteRow}
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
        <Card className="bg-card" data-ocid="audience.csv.summary.card">
          <CardContent className="flex flex-wrap items-center gap-4 py-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-brand" />
              <span className="text-sm font-medium text-foreground">
                {formatNumber(result.validCount)} valid
              </span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="size-5 text-destructive" />
              <span className="text-sm font-medium text-foreground">
                {formatNumber(result.invalidCount)} invalid (skipped)
              </span>
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
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
                className="gap-2"
                data-ocid="audience.csv.save_preset.button"
              >
                <BookmarkPlus className="size-4" /> Save as preset
              </Button>
              <Button
                type="button"
                onClick={() => onUseAudience(verifiedAddresses)}
                disabled={!canContinue}
                className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
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
              data-ocid="audience.csv.save_preset.name.input"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPresetOpen(false)}
              data-ocid="audience.csv.save_preset.cancel.button"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSavePreset()}
              disabled={savePreset.isPending}
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
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
