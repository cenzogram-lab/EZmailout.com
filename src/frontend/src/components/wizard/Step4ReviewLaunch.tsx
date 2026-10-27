import type { DispatchResult } from "@/backend";
import { AudienceType, PaymentPurpose } from "@/backend";
import { StripeCheckout } from "@/components/billing/StripeCheckout";
import { StampyStep4Preflight, StampyTip } from "@/components/stampy";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAccountSync } from "@/hooks/use-account";
import {
  useAddCampaignRecipients,
  useCreateCampaign,
  useDeleteCampaignDraft,
  useDispatchPrintJob,
  useSaveCanvasState,
  useUploadDocumentChunk,
} from "@/hooks/use-backend";
import { formatNumber, layoutLabel } from "@/lib/format";
import {
  INLINE_RECIPIENT_BYTES,
  RECIPIENT_CHUNK_BYTES,
  canvasForStorage,
  recipientChunkEnd,
} from "@/lib/inputLimits";
import { catalogMailClassLabel, catalogMailClassToWire } from "@/lib/pricing";
import {
  MIN_ORDER_CENTS,
  SUBSCRIPTION_PRICE_CENTS,
  classSurchargeCents,
  formatCents,
  getPricingRow,
  getUnitPriceCents,
  pieceRateCents,
  volumeTiers,
} from "@/lib/pricing";
import { normalizeRedirectUrl } from "@/lib/qr";
import { useAccountStore } from "@/store/account";
import {
  discardWizardDraft,
  launchOrderKey,
  useWizardStore,
} from "@/store/wizard";
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
import { useCallback, useEffect, useMemo, useState } from "react";
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
  dispatching: "Sending to print",
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

/** Step 4: preflight, invoice, payment and print dispatch. */
/** A launch is running (module level, so a remounted Step 4 sees it too). */
let launchRunning = false;

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
  const campaignPaid = useWizardStore((s) => s.campaignPaid);
  const campaignPrice = useWizardStore((s) => s.campaignPrice);
  const setLaunchedCampaign = useWizardStore((s) => s.setLaunchedCampaign);
  const markCampaignPaid = useWizardStore((s) => s.markCampaignPaid);
  const setStep = useWizardStore((s) => s.setStep);
  const reset = useWizardStore((s) => s.reset);

  const createCampaign = useCreateCampaign();
  const saveCanvas = useSaveCanvasState();
  const addRecipients = useAddCampaignRecipients();
  const deleteDraft = useDeleteCampaignDraft();
  const uploadChunk = useUploadDocumentChunk();
  const dispatchJob = useDispatchPrintJob();
  const { preflight, runPreflight, buildPdf } = usePrintDocument();
  const {
    isAuthenticated,
    login,
    isLoggingIn,
    subscriptionActive,
    accountReady,
  } = useAccountSync();

  const [machine, setMachine] = useState<Machine>({
    stage: "idle",
    failedStage: null,
    error: null,
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  /** Recipients staged so far while a large list uploads. */
  const [recipientProgress, setRecipientProgress] = useState<{
    stored: number;
    total: number;
  } | null>(null);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [pdfInfo, setPdfInfo] = useState<{
    pages: number;
    bytes: number;
  } | null>(null);
  const [dispatchResult, setDispatchResult] = useState<DispatchResult | null>(
    null,
  );
  const [paidTestMode, setPaidTestMode] = useState(false);
  const setLaunchInFlight = useWizardStore((s) => s.setLaunchInFlight);
  const launchInFlight = useWizardStore((s) => s.launchInFlight);
  const returnAddressUnsaved = useWizardStore((s) => s.returnAddressUnsaved);
  const campaignOrderKey = useWizardStore((s) => s.campaignOrderKey);
  // Checkout holds the wizard like a launch does: stepping back to the
  // studio and returning would open a second checkout for the same campaign
  // while the first card payment may still be unconfirmed.
  const paying = machine.stage === "paying";
  useEffect(() => {
    if (!paying) return;
    setLaunchInFlight(true);
    return () => setLaunchInFlight(false);
  }, [paying, setLaunchInFlight]);

  const row = selectedLayout ? getPricingRow(selectedLayout) : undefined;
  const mailClass = selectedSpec?.mailClass;
  // What First-Class adds to this order's per-piece rate: the surcharge, plus
  // a cent or two where the dearer piece's cost floor sits above the tier.
  const surchargeCents =
    selectedLayout &&
    mailClass &&
    classSurchargeCents(selectedLayout, mailClass) > 0
      ? pieceRateCents(
          selectedLayout,
          recipientCount,
          subscriptionActive,
          mailClass,
        ) - pieceRateCents(selectedLayout, recipientCount, subscriptionActive)
      : 0;
  // Quoted as the canister prices a new campaign: by volume and membership.
  const quotedUnitCents = selectedLayout
    ? getUnitPriceCents(
        selectedLayout,
        recipientCount,
        subscriptionActive,
        mailClass,
      )
    : 0;
  // Once checkout is open the order is the launched campaign, priced by the
  // canister (what the card is charged), not this browser's quote.
  const inCheckout =
    machine.stage === "paying" ||
    machine.stage === "dispatching" ||
    machine.stage === "done";
  const charged = inCheckout && campaignPrice ? campaignPrice : null;
  const unitCents = charged?.unitCents ?? quotedUnitCents;
  const dueCents = charged?.totalCents ?? quotedUnitCents * recipientCount;
  const belowMinimum = dueCents > 0 && dueCents < MIN_ORDER_CENTS;
  const tiered = selectedLayout ? volumeTiers(selectedLayout) !== null : false;
  const listUnitCents = selectedLayout
    ? pieceRateCents(selectedLayout, 1, false, mailClass)
    : 0;
  // The card fee has a fixed part per payment, so an order of a few pieces of
  // a thin-margin format is lifted above the per-piece rate to cover it.
  const smallOrderCents = selectedLayout
    ? Math.max(
        0,
        unitCents -
          pieceRateCents(
            selectedLayout,
            recipientCount,
            subscriptionActive,
            mailClass,
          ),
      )
    : 0;
  const savedCents =
    tiered && unitCents < listUnitCents
      ? (listUnitCents - unitCents) * recipientCount
      : 0;
  const memberRateApplies =
    selectedLayout !== null &&
    unitCents <
      getUnitPriceCents(selectedLayout, recipientCount, false, mailClass);
  const memberUnitCents = selectedLayout
    ? getUnitPriceCents(selectedLayout, recipientCount, true, mailClass)
    : 0;
  const memberSavingsCents = (unitCents - memberUnitCents) * recipientCount;
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
        returnAddressUnsaved,
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
      returnAddressUnsaved,
      qrDestinationUrl,
    ],
  );

  const fail = useCallback(
    (stage: Exclude<Stage, "idle" | "done">, error: string) => {
      setMachine({ stage: "idle", failedStage: stage, error });
    },
    [],
  );

  /** Runs creating → rendering → uploading, then parks at `paying`. */
  const runPreparation = useCallback(
    async (from: "creating" | "rendering" | "uploading") => {
      // One launch at a time, even across a remounted Step 4: leaving the
      // step mid-launch keeps the first run going.
      if (launchRunning) return;
      launchRunning = true;
      setLaunchInFlight(true);
      setMachine({ stage: from, failedStage: null, error: null });
      let reused = false;
      try {
        const state = useWizardStore.getState();
        const orderKey = launchOrderKey(state);
        // A retry or a second attempt reuses the campaign only while it is
        // unpaid and is still this order; the new design replaces its file.
        // The price is part of the order too (joining the membership after
        // a launch lowers it), so a campaign priced differently is replaced.
        const expectedTotal = state.selectedLayout
          ? getUnitPriceCents(
              state.selectedLayout,
              state.recipientCount,
              useAccountStore.getState().subscriptionActive,
              state.selectedSpec?.mailClass,
            ) * state.recipientCount
          : 0;
        let id =
          state.campaignId &&
          !state.campaignPaid &&
          state.campaignOrderKey === orderKey &&
          state.campaignPrice?.totalCents === expectedTotal
            ? state.campaignId
            : null;
        if (id) {
          reused = true;
        } else if (state.campaignId && !state.campaignPaid) {
          // The order changed: its old draft goes first, so it does not count
          // against the account's unpaid budget. Its open checkout is closed
          // with it; one that may already have been paid keeps the draft, and
          // the customer is told where to find it.
          const removed = await deleteDraft
            .mutateAsync(state.campaignId)
            .catch(() => null);
          const mayBePaid =
            removed &&
            !removed.ok &&
            /may already have been paid|opened meanwhile|can't be closed/i.test(
              removed.error ?? "",
            );
          if (removed && !removed.ok && !mayBePaid) {
            // Paid elsewhere, or already gone: it is not this order's draft
            // any more.
            useWizardStore.getState().forgetLaunchedCampaign(state.campaignId);
          }
          if (mayBePaid && removed) {
            // Its checkout may have been paid: launching another order now
            // could charge twice. The customer checks that draft first.
            throw new StageError(
              "creating",
              removed.error ??
                "Your previous draft of this order couldn't be removed. Open it from Campaigns and choose Pay now to check its payment.",
            );
          }
        }

        // 1. Create the campaign.
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
              // The first chunk rides along; the rest is staged below.
              recipients: state.verifiedAddresses.slice(
                0,
                recipientChunkEnd(
                  state.verifiedAddresses,
                  0,
                  INLINE_RECIPIENT_BYTES,
                ),
              ),
              recipientCount: BigInt(state.verifiedAddresses.length),
              designTemplateId:
                state.designTemplate?.id ?? state.mailTemplate?.id,
              // A preview copy that always fits the canister's canvas bounds.
              canvasState: canvasForStorage(state.canvas),
              // Sent only as a web address the canister will accept.
              qrDestinationUrl:
                normalizeRedirectUrl(state.qrDestinationUrl) ?? undefined,
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
          setLaunchedCampaign(id, orderKey, {
            unitCents:
              created.unitPriceCents !== undefined
                ? Number(created.unitPriceCents)
                : expectedTotal / Math.max(1, state.recipientCount),
            totalCents:
              created.totalCents !== undefined
                ? Number(created.totalCents)
                : expectedTotal,
          });
        }

        // 1b. Stage the rest of the recipient list (a campaign has no size
        // limit; each message carries a chunk). Resumes from what the
        // canister already holds, so a retry never sends a chunk twice.
        const all = state.verifiedAddresses;
        const stagedReply = await addRecipients
          .mutateAsync({ campaignId: id, offset: 0, recipients: [] })
          .catch((e) => {
            throw new StageError(
              "creating",
              messageOf(e, "The recipient list could not be uploaded."),
            );
          });
        let stored = Number(stagedReply.stored);
        if (!stagedReply.ok && reused) {
          // The reused draft was deleted or paid elsewhere: forget it, so the
          // next attempt creates the campaign afresh.
          useWizardStore.getState().forgetLaunchedCampaign(id);
          throw new StageError(
            "creating",
            "This order's earlier draft is no longer open. Launch again to create it afresh.",
          );
        }
        if (!stagedReply.ok) {
          throw new StageError(
            "creating",
            stagedReply.error ?? "The recipient list could not be uploaded.",
          );
        }
        if (stored < all.length) {
          setRecipientProgress({ stored, total: all.length });
        }
        while (stored < all.length) {
          const end = recipientChunkEnd(all, stored, RECIPIENT_CHUNK_BYTES);
          const reply = await addRecipients
            .mutateAsync({
              campaignId: id,
              offset: stored,
              recipients: all.slice(stored, end),
            })
            .catch((e) => {
              throw new StageError(
                "creating",
                messageOf(e, "The recipient list could not be uploaded."),
              );
            });
          if (!reply.ok || Number(reply.stored) <= stored) {
            throw new StageError(
              "creating",
              reply.error ?? "The recipient list could not be uploaded.",
            );
          }
          stored = Number(reply.stored);
          setRecipientProgress({ stored, total: all.length });
        }
        setRecipientProgress(null);

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
        if (reused) {
          // The stored preview follows the file only once the new file is in
          // place: a re-upload that stops keeps the old file staged, and the
          // campaign page must not show the new design over it.
          void saveCanvas
            .mutateAsync({
              campaignId: id,
              canvas: canvasForStorage(state.canvas),
            })
            .catch(() => {});
        }

        // 4. Hand off to Stripe.
        setMachine({ stage: "paying", failedStage: null, error: null });
      } catch (error) {
        if (error instanceof StageError) {
          fail(error.stage, error.message);
        } else {
          fail(from, messageOf(error, "Something went wrong."));
        }
      } finally {
        launchRunning = false;
        setLaunchInFlight(false);
      }
    },
    [
      buildPdf,
      createCampaign,
      uploadChunk,
      saveCanvas,
      addRecipients,
      deleteDraft,
      setLaunchedCampaign,
      setLaunchInFlight,
      fail,
    ],
  );

  /** Runs the print dispatch after payment succeeded. */
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
      if (res.ok) toast.success("Job submitted for printing.");
      else toast.warning("Paid, but the print hand-off needs a retry.");
    } catch {
      // No answer is not a failure: a campaign sent as many print jobs can
      // take longer than the browser waits, and the canister keeps going.
      setDispatchResult({
        ok: false,
        error:
          "Your order is paid. The print hand-off is still running or was interrupted; open Campaigns to see its status, and send it to print again from there if it stopped.",
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
  // The order on screen was already paid (from here, or confirmed from its
  // campaign page): launching it again would create and charge a second
  // campaign for the same mailing. Any change to the order makes it new.
  // Recomputed only when the order itself changes (a large audience makes the
  // key costly), never on every render.
  const sourcePresetId = useWizardStore((s) => s.sourcePresetId);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the key reads these fields from the store
  const currentOrderKey = useMemo(
    () => (campaignPaid ? launchOrderKey(useWizardStore.getState()) : null),
    [
      campaignPaid,
      campaignName,
      selectedProduct,
      selectedSpec,
      audienceType,
      recipientCount,
      verifiedAddresses,
      qrDestinationUrl,
      returnAddress,
      sourcePresetId,
    ],
  );
  const paidOrderLoaded =
    machine.stage === "idle" &&
    campaignPaid &&
    campaignId !== null &&
    currentOrderKey !== null &&
    campaignOrderKey === currentOrderKey;
  // Signed in, the price depends on membership, so it waits for the account.
  const launchDisabled =
    report.blocked ||
    busy ||
    launchInFlight ||
    paidOrderLoaded ||
    dueCents <= 0 ||
    belowMinimum ||
    (isAuthenticated && !accountReady);

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
              {paidTestMode
                ? "Test order placed"
                : "Campaign paid and on its way"}
            </h2>
            <p
              className="max-w-md text-sm text-muted-foreground"
              data-ocid="review.success.summary"
            >
              {campaignName || "Your campaign"} — {formatNumber(recipientCount)}{" "}
              pieces,{" "}
              {paidTestMode
                ? `${formatCents(dueCents)} in test mode: nothing was charged, and the job goes only to the print service's test system, so nothing is mailed.`
                : `${formatCents(dueCents)} charged.`}
            </p>
            <Badge variant="outline" className="font-mono">
              {paidId}
            </Badge>

            {dispatchResult?.ok ? (
              <Alert className="border-emerald-brand/40 bg-emerald-brand/10 text-left">
                <Truck className="size-4 text-emerald-brand" />
                <AlertTitle>Job submitted for printing</AlertTitle>
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
                <AlertTitle>Paid, but not yet sent to print</AlertTitle>
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
        {/* min-w-0: a grid item is otherwise as wide as its content, which
            widened the page past a phone's viewport. */}
        <div className="min-w-0 space-y-6">
          <Card className="bg-card" data-ocid="review.proof.card">
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
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

          <ReturnAddressForm
            disabled={busy || launchInFlight || machine.stage === "paying"}
          />
        </div>

        <div className="min-w-0 space-y-6">
          <StampyTip id="step4" mascot={StampyStep4Preflight}>
            Looking sharp! Inspect your front/back 3D proof, verify your
            recipient count, and click Launch when you're ready to print and
            induct into the mail stream.
          </StampyTip>
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
                  {formatCents(dueCents)}
                </span>
              </div>
              {savedCents > 0 ? (
                <p
                  className="rounded-lg bg-emerald-brand/10 p-2 text-xs text-emerald-brand"
                  data-ocid="review.invoice.volume_discount"
                >
                  {memberRateApplies
                    ? "Member rate active"
                    : "Volume discount active"}
                  : {formatCents(unitCents)}/pc (saved {formatCents(savedCents)}
                  )
                </p>
              ) : null}
              {surchargeCents > 0 ? (
                <div
                  className="flex justify-between gap-3 text-xs text-muted-foreground"
                  data-ocid="review.invoice.first_class"
                >
                  <span>
                    First-Class postage instead of Marketing Mail (
                    {formatCents(surchargeCents)} a piece)
                  </span>
                  <span className="shrink-0">Included</span>
                </div>
              ) : null}
              {smallOrderCents > 0 ? (
                <div
                  className="flex justify-between gap-3 text-xs text-muted-foreground"
                  data-ocid="review.invoice.small_order"
                >
                  <span>
                    Small-order rate: each card payment carries a fixed fee, so
                    this order costs {formatCents(smallOrderCents)} more a piece
                    (more pieces bring it down)
                  </span>
                  <span className="shrink-0">Included</span>
                </div>
              ) : null}
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
              <Separator />
              <div className="flex items-baseline justify-between">
                <span className="font-medium text-foreground">Total due</span>
                <span
                  className="font-display text-2xl font-bold text-primary"
                  data-ocid="review.invoice.total"
                >
                  {formatCents(dueCents)}
                </span>
              </div>
              {belowMinimum ? (
                <p
                  className="rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground"
                  data-ocid="review.invoice.minimum"
                >
                  Card payments start at {formatCents(MIN_ORDER_CENTS)}. Add a
                  few more recipients to place this order.
                </p>
              ) : null}
              {isAuthenticated && !accountReady ? (
                <p className="text-xs text-muted-foreground">
                  Loading your account to confirm your price…
                </p>
              ) : null}
              {subscriptionActive ? (
                <p className="text-xs text-muted-foreground">
                  Your EZmailout membership is a 30-day pass of its own and is
                  not part of this invoice.
                </p>
              ) : tiered && memberSavingsCents > 0 ? (
                <p
                  className="text-xs text-muted-foreground"
                  data-ocid="review.invoice.member_prompt"
                >
                  Members would pay {formatCents(memberUnitCents)}/pc on this
                  order ({formatCents(memberSavingsCents)} less).{" "}
                  <Link
                    to="/dashboard"
                    className="font-medium text-primary-ink underline-offset-2 hover:underline"
                    data-ocid="review.invoice.member_prompt.link"
                  >
                    Join for {formatCents(SUBSCRIPTION_PRICE_CENTS)} (30 days)
                  </Link>
                </p>
              ) : null}
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
                      !campaignPaid &&
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

              {recipientProgress && (
                <div className="space-y-1">
                  <Progress
                    value={
                      (recipientProgress.stored / recipientProgress.total) * 100
                    }
                    data-ocid="review.recipients.progress"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(recipientProgress.stored)} of{" "}
                    {formatNumber(recipientProgress.total)} recipients uploaded
                  </p>
                </div>
              )}

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
                  amountLabel={formatCents(dueCents)}
                  title="Pay for your campaign"
                  description={`${formatNumber(recipientCount)} × ${productLabel ?? "pieces"}`}
                  submitLabel="Pay"
                  onSuccess={(_result, testMode) => {
                    // Paid: the draft must not come back and be paid again,
                    // and no later launch may upload onto this campaign.
                    setPaidTestMode(testMode);
                    markCampaignPaid();
                    discardWizardDraft();
                    void runDispatch();
                  }}
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
                  {paidOrderLoaded && campaignId && (
                    <Alert
                      className="border-emerald-brand/40 bg-emerald-brand/10"
                      data-ocid="review.already_paid.alert"
                    >
                      <CheckCircle2 className="size-4 text-emerald-brand" />
                      <AlertTitle>This order is already paid</AlertTitle>
                      <AlertDescription className="space-y-3">
                        <p>
                          Follow it from its campaign page, or start a new
                          campaign. Change anything here to launch it as a new
                          order.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link
                              to="/campaigns/$campaignId"
                              params={{ campaignId }}
                            >
                              View campaign
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => reset()}
                            data-ocid="review.already_paid.new.button"
                          >
                            Start a new campaign
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  {machine.failedStage ? (
                    <Button
                      type="button"
                      size="lg"
                      onClick={handleRetry}
                      // A retry launches like the first try: never past the
                      // preflight (an unsaved return address included).
                      disabled={
                        busy ||
                        launchInFlight ||
                        paidOrderLoaded ||
                        (machine.failedStage !== "dispatching" &&
                          machine.failedStage !== "paying" &&
                          report.blocked)
                      }
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
