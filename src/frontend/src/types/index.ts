import type {
  AddressInput,
  AddressVerificationResult,
  AdminKeys,
  AudienceType,
  CampaignRecordShared,
  CampaignStatus,
  ProductSelection,
  ProductType,
  TrackingEvent,
  VerifiedAddress,
} from "@/backend";

export type {
  ProductType,
  ProductSelection,
  CampaignStatus,
  CampaignRecordShared,
  AddressInput,
  VerifiedAddress,
  AddressVerificationResult,
  AdminKeys,
  TrackingEvent,
  AudienceType,
};

export interface WizardState {
  currentStep: number;
  selectedProduct: ProductSelection | null;
  audienceType: "map" | "csv" | null;
  verifiedAddresses: VerifiedAddress[];
  recipientCount: number;
  designTemplate: DesignTemplate | null;
}

export interface DesignTemplate {
  id: string;
  name: string;
  category: string;
  productType: ProductType;
  layoutVariant: string;
  thumbnailDescription: string;
  backgroundColor: string;
  textBlocks: TextBlock[];
  hasQrCode: boolean;
  backgroundImage: string | null;
  qrCode: QrCodeElement | null;
}

export interface TextBlock {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

export interface QrCodeElement {
  id: string;
  x: number;
  y: number;
  url: string;
  size: number;
}

export interface MapTarget {
  lat: number;
  lng: number;
  radiusMiles: number;
  zipCodes: string[];
  estimatedHouseholds: number;
}

export interface CampaignDetail extends CampaignRecordShared {
  trackingEvents: TrackingEvent[];
}
