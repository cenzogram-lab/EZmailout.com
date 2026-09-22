/**
 * Shared frontend types for EZmailout.
 *
 * Backend record/variant types are re-exported from the generated bindgen
 * client (`@/backend`) so UI code has a single import path. Payload-less
 * Motoko variants become TypeScript enums, which are runtime values, so they
 * are re-exported as values (not `export type`).
 */
import type { ProductType } from "@/backend";

// ─── Backend enums (runtime values) ─────────────────────────────────────────
export {
  AiImageSize,
  AudienceType,
  CampaignStatus,
  Click2MailEnvironment,
  CreditPack,
  MailClass,
  PaymentPurpose,
  PaymentStatus,
  ProductType,
  ProductionStatus,
  QrMode,
  TrackingSource,
} from "@/backend";

// ─── Backend records (type-only) ────────────────────────────────────────────
export type {
  AddressInput,
  AddressVerificationResult,
  AdminKeysInput,
  AdminKeysView,
  AiCopyInput,
  AiCopyResult,
  AiImageResult,
  AiPricing,
  AudiencePresetShared,
  CampaignRecordShared,
  CanvasSide,
  CanvasState,
  ConfirmPaymentResult,
  CreateCampaignInput,
  CreateCampaignResult,
  CreditLedgerEntry,
  CreditPackInfo,
  DispatchResult,
  DocumentUploadStatus,
  LogoState,
  PaymentIntentResult,
  PricingRow,
  PrintSpec,
  ProductSelection,
  PublicConfig,
  QrCodeState,
  QrScanStats,
  ReferralStats,
  ReturnAddress,
  SyncResult,
  TextBlockState,
  TrackingEvent,
  TrackingResolveResult,
  UserAccountShared,
  VerificationBatchResult,
  VerifiedAddress,
} from "@/backend";

// ─── UI-only types ──────────────────────────────────────────────────────────

/** Minimal text block definition used by the template gallery. */
export interface TemplateTextBlock {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

/** A pre-built design shown in the Templates gallery and loadable into the wizard canvas. */
export interface DesignTemplate {
  id: string;
  name: string;
  category: string;
  industry: string;
  productType: ProductType;
  layoutVariant: string;
  thumbnailDescription: string;
  backgroundColor: string;
  textBlocks: TemplateTextBlock[];
  hasQrCode: boolean;
  sizeLabel: string;
  gradient: string;
  accentColor: string;
  overlayText: string;
}

/** Geo-radius audience target selected on the map step. */
export interface MapTarget {
  lat: number;
  lng: number;
  radiusMiles: number;
  zipCodes: string[];
  estimatedHouseholds: number;
  carrierRoutes: number;
  label?: string;
}

/** How the wizard audience was sourced (maps 1:1 onto backend `AudienceType`). */
export type WizardAudienceType = "map" | "csv" | "preset";

/** Which face of the mail piece the canvas is editing. */
export type CanvasSideKey = "front" | "back";

/** Kinds of draggable elements on a canvas side. */
export type CanvasElementKind = "text" | "logo" | "qr";

/** Align-to-canvas commands offered by the studio position tools. */
export type CanvasAlignment =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom";

/** Tools on the studio's left rail (Canva-style). */
export type StudioTool = "text" | "uploads" | "brand" | "ai" | "qr" | "layers";
