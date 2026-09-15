import type {
  DesignTemplate,
  ProductSelection,
  VerifiedAddress,
} from "@/types";
import { create } from "zustand";

interface WizardStore {
  currentStep: number;
  selectedProduct: ProductSelection | null;
  selectedLayout: string | null;
  audienceType: "map" | "csv" | null;
  verifiedAddresses: VerifiedAddress[];
  recipientCount: number;
  designTemplate: DesignTemplate | null;

  setStep: (step: number) => void;
  setCurrentStep: (step: number) => void;
  setProduct: (product: ProductSelection) => void;
  setLayout: (layout: string) => void;
  setAudienceType: (type: "map" | "csv") => void;
  setVerifiedAddresses: (addresses: VerifiedAddress[]) => void;
  setRecipientCount: (count: number) => void;
  setDesignTemplate: (template: DesignTemplate | null) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 1,
  selectedProduct: null,
  selectedLayout: null,
  audienceType: null,
  verifiedAddresses: [],
  recipientCount: 0,
  designTemplate: null,
};

export const useWizardStore = create<WizardStore>((set) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setProduct: (product) => set({ selectedProduct: product }),
  setLayout: (layout) => set({ selectedLayout: layout }),
  setAudienceType: (type) => set({ audienceType: type }),
  setVerifiedAddresses: (addresses) => set({ verifiedAddresses: addresses }),
  setRecipientCount: (count) => set({ recipientCount: count }),
  setDesignTemplate: (template) => set({ designTemplate: template }),
  reset: () => set(initialState),
}));
