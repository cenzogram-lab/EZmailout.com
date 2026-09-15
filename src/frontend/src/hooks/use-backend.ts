import { createActor } from "@/backend";
import type {
  AddressInput,
  AddressVerificationResult,
  AdminKeys,
  AudienceType,
  CampaignRecordShared,
  ProductSelection,
  TrackingEvent,
} from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

function useBackend() {
  const { actor, isFetching } = useActor(createActor);
  return { actor, isFetching };
}

export function useCampaigns() {
  const { actor, isFetching } = useBackend();
  return useQuery<CampaignRecordShared[]>({
    queryKey: ["campaigns"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCampaigns();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useCampaign(id: string) {
  const { actor, isFetching } = useBackend();
  return useQuery<CampaignRecordShared | null>({
    queryKey: ["campaign", id],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCampaign(id);
    },
    enabled: !!actor && !isFetching && !!id,
    refetchInterval: 15000,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation<
    string,
    Error,
    {
      product: ProductSelection;
      recipientCount: bigint;
      audienceType: AudienceType;
    }
  >({
    mutationFn: async ({ product, recipientCount, audienceType }) => {
      if (!actor) throw new Error("Backend not available");
      return actor.createCampaign(product, recipientCount, audienceType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useVerifyAddresses() {
  const { actor } = useBackend();
  return useMutation<AddressVerificationResult[], Error, AddressInput[]>({
    mutationFn: async (addresses) => {
      if (!actor) throw new Error("Backend not available");
      return actor.verifyAddresses(addresses);
    },
  });
}

export function useSaveAdminKeys() {
  const queryClient = useQueryClient();
  const { actor } = useBackend();
  return useMutation<boolean, Error, AdminKeys>({
    mutationFn: async (keys) => {
      if (!actor) throw new Error("Backend not available");
      return actor.saveAdminKeys(keys);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminKeys"] });
    },
  });
}

export function useGetAdminKeys() {
  const { actor, isFetching } = useBackend();
  return useQuery<AdminKeys>({
    queryKey: ["adminKeys"],
    queryFn: async () => {
      if (!actor) return {};
      return actor.getAdminKeys();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useExportCampaign() {
  const { actor } = useBackend();
  return useMutation<string | null, Error, string>({
    mutationFn: async (campaignId) => {
      if (!actor) throw new Error("Backend not available");
      return actor.exportCampaignRecipients(campaignId);
    },
  });
}

export function useTrackingEvents(campaignId: string) {
  const { actor, isFetching } = useBackend();
  return useQuery<TrackingEvent[]>({
    queryKey: ["trackingEvents", campaignId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTrackingEvents(campaignId);
    },
    enabled: !!actor && !isFetching && !!campaignId,
    refetchInterval: 15000,
  });
}
