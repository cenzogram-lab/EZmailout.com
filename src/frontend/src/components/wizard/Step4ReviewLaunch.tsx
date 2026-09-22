import type { DispatchResult } from "@/backend";
import { AudienceType, PaymentPurpose } from "@/backend";
import { StripeCheckout } from "@/components/billing/StripeCheckout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAccountSync } from "@/hooks/use-account";
import {
  useCreateCampaign,
  useDispatchClick2MailJob,
  useUploadDocumentChunk,
} from "@/hooks/use-backend";
import { formatNumber, layoutLabel } from "@/lib/format";
import {
  catalogMailClassLabel,
  catalogMailClassToWire,
  isBaseRateOnly,
} from "@/lib/pricing";
import {
  SUBSCRIPTION_PRICE_CENTS,
  formatCents,
  getPricingRow,
  getUnitPriceCents,
} from "@/lib/pricing";
import { useWizardStore } from "@/store/wizard";
import type { WizardAudienceType } from "@/types";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileImage,
  Fingerprint,
  Loader2,
  PartyPopper,
  Receipt,
  RefreshCw,
  Rocket,
  Truck,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PreflightChecklist, computePreflight } from "./PreflightChecklist";
import { ReturnAddressForm } from "./ReturnAddressForm";
import { usePrintDocument } from "./usePrintDocument";

const CHUNK_BYTES = 1_500_000;

type Stage =
  | "idle"
  | "creating"
  | "rendering"
  | "uploading"
  | "paying"
  | "dispatching"
  | "done";

interface Machine {
  stage: Stage;
  /** Stage that failed; the retry button resumes from here. */
  failedStage: Exclude<Stage, "idle" | "done"> | null;
  error: string | null;
}

const STAGE_LABELS: Record<Stage, string> = {
  idle: "Ready",
  creating: "Creating campaign",
  rendering: "Rendering print-ready PDF",
  uploading: "Uploading document",
  paying: "Awaiting payment",
  dispatching: "Submitting to Click2Mail",
  done: "Complete",
};

const STAGE_ORDER: Stage[] = [
  "creating",
  "rendering",
  "uploading",
  "paying",
  "dispatching",
  "done",
];

function toAudienceType(kind: WizardAudienceType | null): AudienceType {
  switch (kind) {
    case "map":
      return AudienceType.GeoRadius;
    case "preset":
      return AudienceType.SavedPreset;
    default:
      return AudienceType.CsvUpload;
  }
}

function audienceLabel(kind: WizardAudienceType | null): string {
  switch (kind) {
    case "map":
      return "Radius (EDDM)";
    case "csv":
      return "CSV upload";
    case "preset":
      return "Saved preset";
    default:
      return "—";
  }
}

function messageOf(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : fallback;
}

class StageError extends Error {
  stage: Exclude<Stage, "idle" | "done">;
  constructor(stage: Exclude<Stage, "idle" | "done">, message: string) {
    super(message);
    this.stage = stage;
  }
}

/** Step 4: preflight, invoice, payment and Click2Mail dispatch. */
export function Step4ReviewLaunch() {
  const campaignName = useWizardStore((s) => s.campaignName);
  const selectedProduct = useWizardStore((s) => s.selectedProduct);
  const selectedLayout = useWizardStore((s) => s.selectedLayout);
  const selectedSpec = useWizardStore((s) => s.selectedSpec);
  const audienceType = useWizardStore((s) => s.audienceType);
  const recipientCount = useWizardStore((s) => s.recipientCount);
  const verifiedAddresses = useWizardStore((s) => s.verifiedAddresses);
  const geoTarget = useWizardStore((s) => s.geoTarget);
  const canvas = useWizardStore((s) => s.canvas);
  const returnAddress = useWizardStore((s) => s.returnAddress);
  const qrDestinationUrl = useWizardStore((s) => s.qrDestinationUrl);
  const campaignId = useWizardStore((s) => s.campaignId);
  const setCampaignId = useWizardStore((s) => s.setCampaignId);
  const setStep = useWizardStore((s) => s.setStep);
  const reset = useWizardStore((s) => s.reset);

  const createCampaign = useCreateCampaign();
  const uploadChunk = useUploadDocumentChunk();
  const dispatchJob = useDispatchClick2MailJob();
  const { preflight, runPreflight, buildPdf } = usePrintDocument();
  const { isAuthenticated, login, isLoggingIn } = useAccountSync();

  const [machine, setMachine] = useState<Machine>({
    stage: "idle",
    failedStage: null,
    error: null,
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [pdfInfo, setPdfInfo] = useState<{
    pages: number;
    bytes: number;
  } | null>(null);
  const [dispatchResult, setDispatchResult] = useState<DispatchResult | null>(
    null,
  );
  const running = useRef(false);

  const row = selectedLayout ? getPricingRow(selectedLayout) : undefined;
  const unitCents = selectedLayout ? getUnitPriceCents(selectedLayout) : 0;
  const totalCents = unitCents * recipientCount;
  const productLabel = row
    ? `${row.name}${
        selectedProduct?.colorOption === "bw" ? " (black & white)" : ""
      }`
    : null;

  const report = useMemo(
    () =>
      computePreflight({
        selectedLayout,
        productLabel,
        canvas,
        preflight,
        audienceType,
        recipientCount,
        verifiedCount: verifiedAddresses.length,
        isAuthenticated,
        returnAddress,
        qrDestinationUrl,
      }),
    [
      selectedLayout,
      productLabel,
      canvas,
      preflight,
      audienceType,
      recipientCount,
      verifiedAddresses.length,
      isAuthenticated,
      returnAddress,
      qrDestinationUrl,
    ],
  );

  const fail = useCallback(
    (stage: Exclude<Stage, "idle" | "done">, error: string) => {
      setMachine({ stage: "idle", failedStage: stage, error });
      running.current = false;
    },
    [],
  );

  /** Runs creating → rendering → uploading, then parks at `paying`. */
  const runPreparation = useCallback(
    async (from: "creating" | "rendering" | "uploading") => {
      if (running.current) return;
      running.current = true;
      setMachine({ stage: from, failedStage: null, error: null });
      try {
        const state = useWizardStore.getState();
        let id = state.campaignId;

        // 1. Create the campaign (skipped on retry once an id exists).
        if (!id) {
          if (!state.selectedProduct) {
            throw new StageError("creating", "No product selected.");
          }
          setMachine({ stage: "creating", failedStage: null, error: null });
          const created = await createCampaign
            .mutateAsync({
              name: state.campaignName.trim() || "Untitled campaign",
              product: state.selectedProduct,
              mailClass: state.selectedSpec
                ? catalogMailClassToWire(state.selectedSpec.mailClass)
                : undefined,
              audienceType: toAudienceType(state.audienceType),
              recipients: state.verifiedAddresses,
              recipientCount: BigInt(state.recipientCount),
              designTemplateId: state.designTemplate?.id,
              canvasState: state.canvas,
              qrDestinationUrl: state.qrDestinationUrl.trim() || undefined,
              returnAddress: state.returnAddress ?? undefined,
              sourcePresetId: state.sourcePresetId ?? undefined,
            })
            .catch((e) => {
              throw new StageError(
                "creating",
                messageOf(e, "The campaign could not be created."),
              );
            });
          if (!created.ok || !created.campaignId) {
            throw new StageError(
              "creating",
              created.error ?? "The campaign could not be created.",
            );
          }
          id = created.campaignId;
          setCampaignId(id);
        }

        // 2. Render the print-ready PDF.
        setMachine({ stage: "rendering", failedStage: null, error: null });
        const doc = await buildPdf(id).catch((e) => {
          throw new StageError(
            "rendering",
            messageOf(e, "The design could not be rendered to PDF."),
          );
        });
        setPdfInfo({ pages: doc.pages, bytes: doc.pdf.byteLength });

        // 3. Upload in chunks.
        setMachine({ stage: "uploading", failedStage: null, error: null });
        const total = doc.pdf.byteLength;
        const totalChunks = Math.max(1, Math.ceil(total / CHUNK_BYTES));
        setUploadProgress(0);
        setUploadedBytes(0);
        for (let index = 0; index < totalChunks; index++) {
          const start = index * CHUNK_BYTES;
          const data = doc.pdf.slice(
            start,
            Math.min(total, start + CHUNK_BYTES),
          );
          const res = await uploadChunk
            .mutateAsync({
              campaignId: id,
              chunkIndex: index,
              totalChunks,
              mimeType: "application/pdf",
              fileName: `${id}.pdf`,
              data,
            })
            .catch((e) => {
              throw new StageError(
                "uploading",
                messageOf(e, `Chunk ${index + 1} of ${totalChunks} failed.`),
              );
            });
          if (!res.ok) {
            throw new StageError(
              "uploading",
              res.error ?? `Chunk ${index + 1} of ${totalChunks} was rejected.`,
            );
          }
          const done = Math.min(total, start + data.byteLength);
          setUploadedBytes(done);
          setUploadProgress(Math.round((done / total) * 100));
        }

        // 4. Hand off to Stripe.
        setMachine({ stage: "paying", failedStage: null, error: null });
        running.current = false;
      } catch (error) {
        if (error instanceof StageError) {
          fail(error.stage, error.message);
        } else {
          fail(from, messageOf(error, "Something went wrong."));
        }
      }
    },
    [buildPdf, createCampaign, uploadChunk, setCampaignId, fail],
  );

  /** Runs the Click2Mail dispatch after payment succeeded. */
  const runDispatch = useCallback(async () => {
    const id = useWizardStore.getState().campaignId;
    if (!id) {
      fail("dispatching", "Campaign id missing after payment.");
      return;
    }
    setMachine({ stage: "dispatching", failedStage: null, error: null });
    try {
      const res = await dispatchJob.mutateAsync(id);
      setDispatchResult(res);
      if (res.ok) toast.success("Job submitted to Click2Mail.");
      else toast.warning("Paid, but the Click2Mail hand-off needs a retry.");
    } catch (error) {
      setDispatchResult({
        ok: false,
        error: messageOf(error, "Dispatch failed."),
      });
    }
    setMachine({ stage: "done", failedStage: null, error: null });
  }, [dispatchJob, fail]);

  function handleRetry() {
    const stage = machine.failedStage;
    if (!stage) return;
    if (stage === "dispatching" || stage === "paying") {
      // Payment is handled by StripeCheckout; dispatch retries directly.
      if (stage === "dispatching") void runDispatch();
      else setMachine({ stage: "paying", failedStage: null, error: null });
      return;
    }
    void runPreparation(stage);
  }

  const stageIndex = STAGE_ORDER.indexOf(machine.stage);
  const busy =
    machine.stage === "creating" ||
    machine.stage === "rendering" ||
    machine.stage === "uploading" ||
    machine.stage === "dispatching";
  const launchDisabled = report.blocked || busy || totalCents <= 0;

  if (machine.stage === "done") {
    const paidId = campaignId ?? "";
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
        <Card
          className="surface-glow border-emerald-brand/30 bg-card"
          data-ocid="review.success.card"
        >
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-brand/10 text-emerald-brand">
              <PartyPopper className="size-8" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Campaign paid and on its way
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              {campaignName || "Your campaign"} — {formatNumber(recipientCount)}{" "}
              pieces, {formatCents(totalCents)} charged.
            </p>
            <Badge variant="outline" className="font-mono">
              {paidId}
            </Badge>

            {dispatchResult?.ok ? (
              <Alert className="border-emerald-brand/40 bg-emerald-brand/10 text-left">
                <Truck className="size-4 text-emerald-brand" />
                <AlertTitle>Job submitted to Click2Mail</AlertTitle>
                <AlertDescription>
                  Job ID{" "}
                  <span className="font-mono">
                    {dispatchResult.jobId ?? "—"}
                  </span>
                  {dispatchResult.productionStatus
                    ? ` · ${dispatchResult.productionStatus}`
                    : ""}
                  . Tracking events will appear as USPS scans the pieces.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert
                className="border-primary/40 bg-primary/10 text-left"
                data-ocid="review.dispatch.warning"
              >
                <AlertCircle className="size-4 text-primary" />
                <AlertTitle>Paid, but not yet handed to Click2Mail</AlertTitle>
                <AlertDescription>
                  {dispatchResult?.error ?? "The print job was not submitted."}{" "}
                  Your payment is recorded; retry the dispatch here or from the
                  campaign page at any time.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {!dispatchResult?.ok && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void runDispatch()}
                  disabled={dispatchJob.isPending}
                  className="gap-2"
                  data-ocid="review.dispatch.retry.button"
                >
                  {dispatchJob.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  Retry dispatch
                </Button>
              )}
              <Button
                asChild
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                data-ocid="review.view_tracking.link"
              >
                <Link
                  to="/campaigns/$campaignId"
                  params={{ campaignId: paidId }}
                >
                  <Truck className="size-4" /> View tracking
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => reset()}
                data-ocid="review.start_another.button"
              >
                Start another campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
      <div className="space-y-1">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Review and launch
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Check the proof and the preflight list, confirm the return address,
          then pay to send the job to print.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <Card className="bg-card" data-ocid="review.proof.card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2">
                  <FileImage className="size-4 text-primary" /> Print proof
                </span>
                <div className="flex items-center gap-2">
                  {row && (
                    <Badge variant="secondary" className="font-mono">
                      {row.widthInches}" × {row.heightInches}" · 300 DPI
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void runPreflight()}
                    disabled={preflight.status === "running"}
                    className="gap-1"
                    data-ocid="review.proof.refresh.button"
                  >
                    <RefreshCw
                      className={
                        preflight.status === "running"
                          ? "size-3.5 animate-spin"
                          : "size-3.5"
                      }
                    />
                    Re-render
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="checkerboard flex min-h-56 items-center justify-center overflow-hidden rounded-xl border border-border p-4">
                {preflight.frontPreviewUrl ? (
                  <img
                    src={preflight.frontPreviewUrl}
                    alt="Front face print proof"
                    className="max-h-[420px] w-auto max-w-full rounded-md shadow-md"
                    data-ocid="review.proof.image"
                  />
                ) : preflight.status === "error" ? (
                  <p className="text-sm text-destructive">
                    {preflight.error ?? "Could not render the proof."}
                  </p>
                ) : (
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Rendering proof…
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Front face as it will print. {layoutLabel(selectedLayout ?? "")}{" "}
                {audienceType === "map" && geoTarget
                  ? `· ${geoTarget.radiusMiles} mi radius around ${geoTarget.label ?? `${geoTarget.lat.toFixed(3)}, ${geoTarget.lng.toFixed(3)}`}`
                  : ""}
              </p>
            </CardContent>
          </Card>

          <PreflightChecklist report={report} />

          <ReturnAddressForm />
        </div>

        <div className="space-y-6">
          <Card
            className="surface-glow border-primary/20 bg-card"
            data-ocid="review.invoice.card"
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="size-4 text-primary" /> Invoice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Campaign</span>
                <span className="max-w-[60%] truncate font-medium text-foreground">
                  {campaignName || "Untitled campaign"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Format</span>
                <span className="font-medium text-foreground">
                  {productLabel ?? "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Audience</span>
                <span className="font-medium text-foreground">
                  {audienceLabel(audienceType)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mail class</span>
                <span
                  className="font-medium text-foreground"
                  data-ocid="review.invoice.mail_class"
                >
                  {selectedSpec
                    ? catalogMailClassLabel(selectedSpec.mailClass)
                    : "—"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {formatNumber(recipientCount)} pieces ×{" "}
                  {formatCents(unitCents)}
                </span>
                <span
                  className="font-medium text-foreground"
                  data-ocid="review.invoice.line_total"
                >
                  {formatCents(totalCents)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Printing, postage and CASS included</span>
                <span>$0.00</span>
              </div>
              {row?.note ? (
                <div
                  className="flex justify-between gap-3 text-xs text-muted-foreground"
                  data-ocid="review.invoice.addon"
                >
                  <span>{row.note}</span>
                  <span className="shrink-0">Included</span>
                </div>
              ) : null}
              {row && isBaseRateOnly(row) ? (
                <p
                  className="rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground"
                  data-ocid="review.invoice.eddm_note"
                >
                  EDDM® is billed at the print base rate above; USPS saturation
                  postage is added per carrier route once the routes are bound.
                </p>
              ) : null}
              <Separator />
              <div className="flex items-baseline justify-between">
                <span className="font-medium text-foreground">Total due</span>
                <span className="font-display text-2xl font-bold text-primary">
                  {formatCents(totalCents)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Member wholesale rate. Your{" "}
                {formatCents(SUBSCRIPTION_PRICE_CENTS)}/month EZmailout
                membership is billed separately and is not part of this invoice.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card" data-ocid="review.launch.card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Rocket className="size-4 text-primary" /> Launch
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="space-y-1.5 text-xs">
                {STAGE_ORDER.filter((s) => s !== "done").map((s, i) => {
                  const idx = STAGE_ORDER.indexOf(s);
                  const isCurrent = machine.stage === s;
                  const isDone =
                    stageIndex > idx ||
                    (machine.stage === "idle" &&
                      machine.failedStage &&
                      STAGE_ORDER.indexOf(machine.failedStage) > idx) ||
                    (machine.stage === "idle" &&
                      campaignId &&
                      s === "creating");
                  const isFailed = machine.failedStage === s;
                  return (
                    <li
                      key={s}
                      className="flex items-center gap-2"
                      data-ocid={`review.launch.stage.${s}`}
                    >
                      {isFailed ? (
                        <AlertCircle className="size-3.5 text-destructive" />
                      ) : isCurrent && busy ? (
                        <Loader2 className="size-3.5 animate-spin text-primary" />
                      ) : isDone ? (
                        <CheckCircle2 className="size-3.5 text-emerald-brand" />
                      ) : (
                        <span className="inline-block size-3.5 rounded-full border border-border" />
                      )}
                      <span
                        className={
                          isCurrent || isFailed
                            ? "font-medium text-foreground"
                            : "text-muted-foreground"
                        }
                      >
                        {i + 1}. {STAGE_LABELS[s]}
                      </span>
                    </li>
                  );
                })}
              </ol>

              {machine.stage === "uploading" && (
                <div className="space-y-1">
                  <Progress
                    value={uploadProgress}
                    data-ocid="review.upload.progress"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(Math.round(uploadedBytes / 1024))} KB of{" "}
                    {formatNumber(Math.round((pdfInfo?.bytes ?? 0) / 1024))} KB
                    uploaded
                    {pdfInfo ? ` · ${pdfInfo.pages}-page PDF` : ""}
                  </p>
                </div>
              )}

              {machine.error && machine.failedStage && (
                <Alert variant="destructive" data-ocid="review.launch.error">
                  <AlertCircle className="size-4" />
                  <AlertTitle>
                    {STAGE_LABELS[machine.failedStage]} failed
                  </AlertTitle>
                  <AlertDescription>{machine.error}</AlertDescription>
                </Alert>
              )}

              {machine.stage === "paying" && campaignId && (
                <StripeCheckout
                  purpose={PaymentPurpose.CampaignOrder}
                  reference={campaignId}
                  amountLabel={formatCents(totalCents)}
                  title="Pay for your campaign"
                  description={`${formatNumber(recipientCount)} × ${productLabel ?? "pieces"}`}
                  submitLabel="Pay"
                  onSuccess={() => void runDispatch()}
                  onCancel={() =>
                    setMachine({
                      stage: "idle",
                      failedStage: null,
                      error: null,
                    })
                  }
                />
              )}

              {machine.stage !== "paying" && (
                <div className="flex flex-col gap-2">
                  {!isAuthenticated && (
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      onClick={login}
                      disabled={isLoggingIn}
                      className="w-full gap-2"
                      data-ocid="review.sign_in.button"
                    >
                      {isLoggingIn ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Fingerprint className="size-4" />
                      )}
                      Sign in to launch
                    </Button>
                  )}
                  {machine.failedStage ? (
                    <Button
                      type="button"
                      size="lg"
                      onClick={handleRetry}
                      disabled={busy}
                      className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                      data-ocid="review.launch.retry.button"
                    >
                      <RefreshCw className="size-4" /> Retry{" "}
                      {STAGE_LABELS[machine.failedStage].toLowerCase()}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="lg"
                      onClick={() => void runPreparation("creating")}
                      disabled={launchDisabled}
                      className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                      data-ocid="review.launch.button"
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Rocket className="size-4" />
                      )}
                      {busy
                        ? `${STAGE_LABELS[machine.stage]}…`
                        : "Create campaign & pay"}
                    </Button>
                  )}
                  {report.blocked && !busy && (
                    <p className="text-center text-xs text-muted-foreground">
                      Resolve the preflight items above to enable launch.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-start border-t border-border pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep(3)}
          disabled={busy || machine.stage === "paying"}
          className="gap-2"
          data-ocid="review.back.button"
        >
          <ArrowLeft className="size-4" /> Back to design
        </Button>
      </div>
    </div>
  );
}
