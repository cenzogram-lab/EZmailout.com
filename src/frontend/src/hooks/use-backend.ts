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
  CanvasState,
  ConfirmPaymentResult,
  CreateCampaignInput,
  CreateCampaignResult,
  CreditLedgerEntry,
  CreditPack,
  CreditResult,
  DispatchResult,
  DocumentUploadStatus,
  PaymentIntentResult,
  PaymentPurpose,
  PresetResult,
  PricingRow,
  PublicConfig,
  QrScanStats,
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
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useBackendActor() {
  const { actor, isFetching } = useActor(createActor);
  return { actor, isFetching, ready: !!actor && !isFetching };
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

export function useCampaigns() {
  const { actor, ready } = useBackendActor();
  return useQuery<CampaignRecordShared[]>({
    queryKey: ["campaigns"],
    queryFn: async () => (actor ? actor.getCampaigns() : []),
    enabled: ready,
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

export function useCampaignRecipients(id: string | null) {
  const { actor, ready } = useBackendActor();
  return useQuery<VerifiedAddress[]>({
    queryKey: ["campaignRecipients", id],
    queryFn: async () => (actor && id ? actor.getCampaignRecipients(id) : []),
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
      return actor.exportCampaignRecipients(campaignId);
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
      return actor.executeClick2MailVerification(addresses);
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
      actor && presetId ? actor.getPresetAddresses(presetId) : [],
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
      return actor.savePreset(name, addresses, sourceCampaignId);
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
      return actor.updatePreset(presetId, name, addresses);
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
  const { actor, ready } = useBackendActor();
  return useQuery<UserAccountShared | null>({
    queryKey: ["myAccount"],
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

export function useDeductAiCredits() {
  const queryClient = useQueryClient();
  const { actor } = useBackendActor();
  return useMutation<
    CreditResult,
    Error,
    { costCredits: bigint; reason: string }
  >({
    mutationFn: async ({ costCredits, reason }) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.deductAiCredits(costCredits, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myAccount"] });
      queryClient.invalidateQueries({ queryKey: ["creditLedger"] });
    },
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

export function useDispatchClick2MailJob() {
  const queryClient = useQueryClient();
  const { actor } = useBackendActor();
  return useMutation<DispatchResult, Error, string>({
    mutationFn: async (campaignId) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.dispatchClick2MailJob(campaignId);
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

export function useSyncClick2MailTracking() {
  const queryClient = useQueryClient();
  const { actor } = useBackendActor();
  return useMutation<SyncResult, Error, string>({
    mutationFn: async (campaignId) => {
      if (!actor) throw new Error(NO_BACKEND);
      return actor.syncClick2MailTracking(campaignId);
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

export function useAdminKeys() {
  const { actor, ready } = useBackendActor();
  return useQuery<AdminKeysView | null>({
    queryKey: ["adminKeys"],
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
