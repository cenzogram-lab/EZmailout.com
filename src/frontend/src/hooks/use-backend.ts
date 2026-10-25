import { createActor } from "@/backend";
import type {
  AccountResult,
  AddressInput,
  AdminKeysInput,
  AdminKeysView,
  AiCopyInput,
  AiCopyResult,
  AiImageResult,
  AiImageSize,
  AiPricing,
  ApiResult,
  AudiencePresetShared,
  CampaignRecordShared,
  CampaignStatus,
  CampaignSummary,
  CanvasState,
  ConfirmPaymentResult,
  CreateCampaignInput,
  CreateCampaignResult,
  CreditLedgerEntry,
  CreditPack,
  DispatchResult,
  DocumentUploadStatus,
  PaymentIntentResult,
  PaymentPurpose,
  PresetResult,
  PricingRow,
  PublicConfig,
  QrScanStats,
  RecipientPage,
  RecipientStageResult,
  ReferralStats,
  StampyReply,
  StampyTurn,
  SupportTicketInput,
  SupportTicketResult,
  SupportTicketView,
  SyncResult,
  TrackingEvent,
  TrackingResolveResult,
  UserAccountShared,
  VerificationBatchResult,
  VerifiedAddress,
} from "@/backend";
import { RECIPIENT_CHUNK_BYTES, recipientChunkEnd } from "@/lib/inputLimits";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useBackendActor() {
  const { actor, isFetching } = useActor(createActor);
  const { identity } = useInternetIdentity();
  /**
   * Who the actor calls as. Per-caller answers are cached under it, so one
   * person's account or admin view is never served to the next one to sign
   * in, nor an answer fetched before sign-in to the signed-in caller.
   */
  const caller = identity?.getPrincipal().toString() ?? "anonymous";
  return { actor, isFetching, ready: !!actor && !isFetching, caller };
}

const NO_BACKEND = "Backend not available";

// ─── Config & pricing ───────────────────────────────────────────────────────

export function usePublicConfig() {
  const { actor, ready } = useBackendActor();
  return useQuery<PublicConfig | null>({
    queryKey: ["publicConfig"],
    queryFn: async () => (actor ? actor.getPublicConfig() : null),
    enabled: ready,
    staleTime: 60_000,
  });
}

export function usePricingLedger() {
  const { actor, ready } = useBackendActor();
  return useQuery<PricingRow[]>({
    queryKey: ["pricingLedger"],
    queryFn: async () => (actor ? actor.getPricingLedger() : []),
    enabled: ready,
    staleTime: 600_000,
  });
}

// ─── Campaigns ──────────────────────────────────────────────────────────────

/** List rows only: the stored design comes with `useCampaign(id)`. */
export function useCampaigns(enabled = true) {
  const { actor, ready } = useBackendActor();
  return useQuery<CampaignSummary[]>({
    queryKey: ["campaigns"],
    queryFn: async () => (actor ? actor.getCampaigns() : []),
    enabled: ready && enabled,
    refetchInterval: 30_000,
  });
}

export function useCampaign(id: string) {
  const { actor, ready } = useBackendActor();
  return useQuery<CampaignRecordShared | null>({
    queryKey: ["campaign", id],
    queryFn: async () => (actor ? actor.getCampaign(id) : null),
    enabled: ready && !!id,
    refetchInterval: 15_000,
  });
}

/** Addresses per page of a list read (`AddressLib.maxPageSize`). */
const ADDRESS_PAGE = 2000;

/**
 * Reads a whole stored address list page by page: one reply is capped at a
 * few MB, and campaigns and saved audiences have no size limit.
 */
async function readAllPages(
  read: (offset: bigint, limit: bigint) => Promise<RecipientPage>,
): Promise<VerifiedAddress[]> {
  const out: VerifiedAddress[] = [];
  for (;;) {
    const page = await read(BigInt(out.length), BigInt(ADDRESS_PAGE));
    for (const a of page.addresses) out.push(a);
    if (page.addresses.length === 0 || out.length >= Number(page.total)) {
      return out;
    }
  }
}

/**
 * Sends `addresses` past the first `start` in chunks with `append`, which
 * stores them in order and answers how many are stored. Returns the error
 * that stopped it, or null once every address is stored.
 */
async function appendInChunks(
  addresses: VerifiedAddress[],
  start: number,
  append: (
    offset: bigint,
    chunk: VerifiedAddress[],
  ) => Promise<RecipientStageResult>,
): Promise<string | null> {
  let stored = start;
  while (stored < addresses.length) {
    const end = recipientChunkEnd(addresses, stored, RECIPIENT_CHUNK_BYTES);
    const reply = await append(BigInt(stored), addresses.slice(stored, end));
    if (!reply.ok || Number(reply.stored) <= stored) {
      return reply.error ?? "The address list could not be saved.";
    }
    stored = Number(reply.stored);
  }
  return null;
}

export function useCampaignRecipients(id: string | null) {
  const { actor, ready } = useBackendActor();
  return useQuery<VerifiedAddress[]>({
    queryKey: ["campaignRecipients", id],
    queryFn: async () =>
      actor && id
        ? readAllPages((offset, limit) =>
            actor.getCampaignRecipientsPage(id, offset, limit),
          )
        : [],
    enabled: ready && !!id,
  });
}

export function useTrackingEvents(campaignId: string) {
  const { actor, ready } = useBackendActor();
  return useQuery<TrackingEvent[]>({
    queryKey: ["trackingEvents", campaignId],
    queryFn: async () => (actor ? actor.getTrackingEvents(campaignId) : []),
    enabled: ready && !!campaignId,
    refetchInterval: 15_000,
  });
}

export function useQrScanStats(campaignId: string) {
  const { actor, ready } = useBackendActor();
  return useQuery<QrScanStats | null>({
    queryKey: ["qrScanStats", campaignId],
    queryFn: async () => (actor ? actor.getQrScanStats(campaignId) : null),
    enabled: ready && !!campaignId,
    refetchInterval: 30_000,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  const { actor } = useBackendActor();
  return useMutation<CreateCampaignResult, Error, CreateCampaignInput>({
    mutationFn: async (input) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.createCampaign(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

/**
 * Stages more of an unpaid campaign's recipients from `offset` (the list
 * past what `createCampaign` carried). An empty chunk only reports how many
 * are stored, so a resumed launch continues from there.
 */
export function useAddCampaignRecipients() {
  const { actor } = useBackendActor();
  return useMutation<
    RecipientStageResult,
    Error,
    { campaignId: string; offset: number; recipients: VerifiedAddress[] }
  >({
    mutationFn: async ({ campaignId, offset, recipients }) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.addCampaignRecipients(
        campaignId,
        BigInt(offset),
        recipients,
      );
    },
  });
}

export function useSaveCanvasState() {
  const queryClient = useQueryClient();
  const { actor } = useBackendActor();
  return useMutation<
    boolean,
    Error,
    { campaignId: string; canvas: CanvasState }
  >({
    mutationFn: async ({ campaignId, canvas }) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.saveCanvasState(campaignId, canvas);
    },
    onSuccess: (_, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
    },
  });
}

export function useExportCampaign() {
  const { actor } = useBackendActor();
  return useMutation<string | null, Error, string>({
    mutationFn: async (campaignId) => {
      if (!actor) throw new Error(NO_BACKEND);
      // Page by page (the header row comes with the first), so a campaign of
      // any size exports.
      const parts: string[] = [];
      let offset = 0;
      for (;;) {
        const page = await actor.exportCampaignRecipientsPage(
          campaignId,
          BigInt(offset),
          BigInt(ADDRESS_PAGE),
        );
        if (!page) return parts.length ? parts.join("\n") : null;
        if (page.csv) parts.push(page.csv);
        offset += ADDRESS_PAGE;
        if (offset >= Number(page.total)) return parts.join("\n");
      }
    },
  });
}

export function useUpdateCampaignStatus() {
  const queryClient = useQueryClient();
  const { actor } = useBackendActor();
  return useMutation<
    boolean,
    Error,
    {
      id: string;
      status: CampaignStatus;
      providerEventId: string;
      timestamp: bigint;
    }
  >({
    mutationFn: async ({ id, status, providerEventId, timestamp }) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.updateCampaignStatus(id, status, providerEventId, timestamp);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      queryClient.invalidateQueries({ queryKey: ["trackingEvents", id] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useResolveTrackingLink() {
  const { actor } = useBackendActor();
  return useMutation<
    TrackingResolveResult,
    Error,
    { code: string; userAgent: string | null }
  >({
    mutationFn: async ({ code, userAgent }) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.resolveTrackingLink(code, userAgent);
    },
  });
}

// ─── Audience ───────────────────────────────────────────────────────────────

export function useVerifyAddresses() {
  const { actor } = useBackendActor();
  return useMutation<VerificationBatchResult, Error, AddressInput[]>({
    mutationFn: async (addresses) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.verifyAddresses(addresses);
    },
  });
}

export function usePresets() {
  const { actor, ready } = useBackendActor();
  return useQuery<AudiencePresetShared[]>({
    queryKey: ["presets"],
    queryFn: async () => (actor ? actor.listPresets() : []),
    enabled: ready,
  });
}

export function usePresetAddresses(presetId: string | null) {
  const { actor, ready } = useBackendActor();
  return useQuery<VerifiedAddress[]>({
    queryKey: ["presetAddresses", presetId],
    queryFn: async () =>
      actor && presetId
        ? readAllPages((offset, limit) =>
            actor.getPresetAddressesPage(presetId, offset, limit),
          )
        : [],
    enabled: ready && !!presetId,
  });
}

export function useSavePreset() {
  const queryClient = useQueryClient();
  const { actor } = useBackendActor();
  return useMutation<
    PresetResult,
    Error,
    {
      name: string;
      addresses: VerifiedAddress[];
      sourceCampaignId: string | null;
    }
  >({
    mutationFn: async ({ name, addresses, sourceCampaignId }) => {
      if (!actor) throw new Error(NO_BACKEND);
      // The first chunk creates the preset and the rest is appended, so a
      // saved audience of any size fits the 2 MB message limit.
      const first = recipientChunkEnd(addresses, 0, RECIPIENT_CHUNK_BYTES);
      const created = await actor.savePreset(
        name,
        addresses.slice(0, first),
        sourceCampaignId,
      );
      if (!created.ok || !created.presetId) return created;
      const presetId = created.presetId;
      const error = await appendInChunks(addresses, first, (offset, chunk) =>
        actor.addPresetAddresses(presetId, offset, chunk),
      );
      if (error) {
        // Never leave half a list behind as if it were the audience.
        await actor.deletePreset(presetId).catch(() => {});
        return { ok: false, error };
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presets"] });
    },
  });
}

export function useUpdatePreset() {
  const queryClient = useQueryClient();
  const { actor } = useBackendActor();
  return useMutation<
    ApiResult,
    Error,
    { presetId: string; name: string; addresses: VerifiedAddress[] }
  >({
    mutationFn: async ({ presetId, name, addresses }) => {
      if (!actor) throw new Error(NO_BACKEND);
      // The first chunk replaces the list and the rest is appended.
      const first = recipientChunkEnd(addresses, 0, RECIPIENT_CHUNK_BYTES);
      const replaced = await actor.updatePreset(
        presetId,
        name,
        addresses.slice(0, first),
      );
      if (!replaced.ok) return replaced;
      const error = await appendInChunks(addresses, first, (offset, chunk) =>
        actor.addPresetAddresses(presetId, offset, chunk),
      );
      return error
        ? {
            ok: false,
            error: `${error} Only part of the list was saved; save again to finish it.`,
          }
        : replaced;
    },
    onSuccess: (_, { presetId }) => {
      queryClient.invalidateQueries({ queryKey: ["presets"] });
      queryClient.invalidateQueries({
        queryKey: ["presetAddresses", presetId],
      });
    },
  });
}

export function useDeletePreset() {
  const queryClient = useQueryClient();
  const { actor } = useBackendActor();
  return useMutation<ApiResult, Error, string>({
    mutationFn: async (presetId) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.deletePreset(presetId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presets"] });
    },
  });
}

// ─── Accounts, credits, referrals ───────────────────────────────────────────

export function useMyAccount(enabled = true) {
  const { actor, ready, caller } = useBackendActor();
  return useQuery<UserAccountShared | null>({
    queryKey: ["myAccount", caller],
    queryFn: async () => (actor ? actor.getMyAccount() : null),
    enabled: ready && enabled,
    refetchInterval: 60_000,
  });
}

export function useEnsureAccount() {
  const queryClient = useQueryClient();
  const { actor } = useBackendActor();
  return useMutation<
    AccountResult,
    Error,
    { referralCode: string | null; email: string | null }
  >({
    mutationFn: async ({ referralCode, email }) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.ensureAccount(referralCode, email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myAccount"] });
      queryClient.invalidateQueries({ queryKey: ["referralStats"] });
    },
  });
}

export function useUpdateAccountEmail() {
  const queryClient = useQueryClient();
  const { actor } = useBackendActor();
  return useMutation<ApiResult, Error, string>({
    mutationFn: async (email) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.updateAccountEmail(email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myAccount"] });
    },
  });
}

export function useReferralStats(enabled = true) {
  const { actor, ready } = useBackendActor();
  return useQuery<ReferralStats | null>({
    queryKey: ["referralStats"],
    queryFn: async () => (actor ? actor.getReferralStats() : null),
    enabled: ready && enabled,
    refetchInterval: 60_000,
  });
}

export function useCreditLedger(enabled = true) {
  const { actor, ready } = useBackendActor();
  return useQuery<CreditLedgerEntry[]>({
    queryKey: ["creditLedger"],
    queryFn: async () => (actor ? actor.getCreditLedger() : []),
    enabled: ready && enabled,
  });
}

export function useAiPricing() {
  const { actor, ready } = useBackendActor();
  return useQuery<AiPricing | null>({
    queryKey: ["aiPricing"],
    queryFn: async () => (actor ? actor.getAiPricing() : null),
    enabled: ready,
    staleTime: 600_000,
  });
}

export function useCreatePaymentIntent() {
  const { actor } = useBackendActor();
  return useMutation<
    PaymentIntentResult,
    Error,
    {
      purpose: PaymentPurpose;
      reference: string | null;
      pack: CreditPack | null;
    }
  >({
    mutationFn: async ({ purpose, reference, pack }) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.createPaymentIntent(purpose, reference, pack);
    },
  });
}

export function useConfirmPayment() {
  const queryClient = useQueryClient();
  const { actor } = useBackendActor();
  return useMutation<ConfirmPaymentResult, Error, string>({
    mutationFn: async (paymentIntentId) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.confirmPayment(paymentIntentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myAccount"] });
      queryClient.invalidateQueries({ queryKey: ["creditLedger"] });
      queryClient.invalidateQueries({ queryKey: ["referralStats"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign"] });
    },
  });
}

export function useApplyReferralReward() {
  const queryClient = useQueryClient();
  const { actor } = useBackendActor();
  return useMutation<ApiResult, Error, string>({
    mutationFn: async (paymentIntentId) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.applyReferralReward(paymentIntentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referralStats"] });
      queryClient.invalidateQueries({ queryKey: ["myAccount"] });
    },
  });
}

// ─── AI studio ──────────────────────────────────────────────────────────────

export function useGenerateAiImage() {
  const queryClient = useQueryClient();
  const { actor } = useBackendActor();
  return useMutation<
    AiImageResult,
    Error,
    { prompt: string; size: AiImageSize }
  >({
    mutationFn: async ({ prompt, size }) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.generateAiImage(prompt, size);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["myAccount"] });
      queryClient.invalidateQueries({ queryKey: ["creditLedger"] });
    },
  });
}

export function useGenerateAiCopy() {
  const queryClient = useQueryClient();
  const { actor } = useBackendActor();
  return useMutation<AiCopyResult, Error, AiCopyInput>({
    mutationFn: async (input) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.generateAiCopy(input);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["myAccount"] });
      queryClient.invalidateQueries({ queryKey: ["creditLedger"] });
    },
  });
}

// ─── Production ─────────────────────────────────────────────────────────────

export function useUploadDocumentChunk() {
  const { actor } = useBackendActor();
  return useMutation<
    ApiResult,
    Error,
    {
      campaignId: string;
      chunkIndex: number;
      totalChunks: number;
      mimeType: string;
      fileName: string;
      data: Uint8Array;
    }
  >({
    mutationFn: async ({
      campaignId,
      chunkIndex,
      totalChunks,
      mimeType,
      fileName,
      data,
    }) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.uploadDocumentChunk(
        campaignId,
        BigInt(chunkIndex),
        BigInt(totalChunks),
        mimeType,
        fileName,
        data,
      );
    },
  });
}

export function useDocumentUploadStatus(campaignId: string | null) {
  const { actor, ready } = useBackendActor();
  return useQuery<DocumentUploadStatus | null>({
    queryKey: ["documentUpload", campaignId],
    queryFn: async () =>
      actor && campaignId ? actor.getDocumentUploadStatus(campaignId) : null,
    enabled: ready && !!campaignId,
  });
}

export function useDispatchPrintJob() {
  const queryClient = useQueryClient();
  const { actor } = useBackendActor();
  return useMutation<DispatchResult, Error, string>({
    mutationFn: async (campaignId) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.dispatchPrintJob(campaignId);
    },
    onSettled: (_, __, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      queryClient.invalidateQueries({
        queryKey: ["trackingEvents", campaignId],
      });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

/** Deletes one of the caller's unpaid drafts (recipients and staged file too). */
export function useDeleteCampaignDraft() {
  const queryClient = useQueryClient();
  const { actor } = useBackendActor();
  return useMutation<ApiResult, Error, string>({
    mutationFn: async (campaignId) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.deleteCampaignDraft(campaignId);
    },
    onSuccess: (result, campaignId) => {
      if (!result.ok) return;
      queryClient.removeQueries({ queryKey: ["campaign", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useSyncPrintTracking() {
  const queryClient = useQueryClient();
  const { actor } = useBackendActor();
  return useMutation<SyncResult, Error, string>({
    mutationFn: async (campaignId) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.syncPrintTracking(campaignId);
    },
    onSettled: (_, __, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      queryClient.invalidateQueries({
        queryKey: ["trackingEvents", campaignId],
      });
    },
  });
}

// ─── Admin ──────────────────────────────────────────────────────────────────

/**
 * Whether the signed-in caller is the admin (or a controller). Gates the
 * Admin link in the header, so customers never see it; the page itself
 * checks again and shows provider settings to the admin only.
 */
export function useIsAdmin(principal: string | null): boolean {
  const { actor, ready } = useBackendActor();
  const query = useQuery<boolean>({
    queryKey: ["isAdmin", principal],
    queryFn: async () =>
      actor ? (await actor.getAdminKeys()).callerIsAdmin : false,
    enabled: ready && !!principal,
    staleTime: 5 * 60_000,
  });
  return query.data === true;
}

export function useAdminKeys() {
  const { actor, ready, caller } = useBackendActor();
  return useQuery<AdminKeysView | null>({
    queryKey: ["adminKeys", caller],
    queryFn: async () => (actor ? actor.getAdminKeys() : null),
    enabled: ready,
  });
}

export function useSaveAdminKeys() {
  const queryClient = useQueryClient();
  const { actor } = useBackendActor();
  return useMutation<ApiResult, Error, AdminKeysInput>({
    mutationFn: async (keys) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.saveAdminKeys(keys);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminKeys"] });
      queryClient.invalidateQueries({ queryKey: ["publicConfig"] });
    },
  });
}

/** Assigns the admin principal. The canister accepts it from controllers only. */
export function useAssignAdmin() {
  const queryClient = useQueryClient();
  const { actor } = useBackendActor();
  return useMutation<ApiResult, Error, string>({
    mutationFn: async (principalText) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.assignAdmin(Principal.fromText(principalText.trim()));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminKeys"] });
    },
  });
}

// ─── Stampy copilot & support ───────────────────────────────────────────────

/** One copilot turn through the canister's LLM relay (signed-in callers). */
export function useAskStampy() {
  const { actor } = useBackendActor();
  return useMutation<StampyReply, Error, StampyTurn[]>({
    mutationFn: async (turns) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.askStampy(turns);
    },
  });
}

export function useSubmitSupportTicket() {
  const queryClient = useQueryClient();
  const { actor } = useBackendActor();
  return useMutation<SupportTicketResult, Error, SupportTicketInput>({
    mutationFn: async (input) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.submitSupportTicket(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supportTickets"] });
    },
  });
}

/** Admin inbox. Only enable for an admin: the canister traps for anyone else. */
export function useSupportTickets(enabled: boolean) {
  const { actor, ready } = useBackendActor();
  return useQuery<SupportTicketView[]>({
    queryKey: ["supportTickets"],
    queryFn: async () => (actor ? actor.listSupportTickets() : []),
    enabled: ready && enabled,
    refetchInterval: 60_000,
  });
}
