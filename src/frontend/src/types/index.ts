/**
 * Shared frontend types for EZmailout.
 *
 * Backend record/variant types are re-exported from the generated bindgen
 * client (`@/backend`) so UI code has a single import path. Payload-less
 * Motoko variants become TypeScript enums, which are runtime values, so they
 * are re-exported as values (not `export type`).
 */
import type { ProductType } from "@/backend";
import type { Orientation } from "@/lib/printSpec";
import type { FrameKind, SceneKind, TemplatePalette } from "@/lib/templateArt";
import type { TemplateArchetype } from "@/lib/templateLayout";

// ─── Backend enums (runtime values) ─────────────────────────────────────────
export {
  AiImageSize,
  AudienceType,
  CampaignStatus,
  FulfilmentEnvironment,
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
  CampaignSummary,
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

/** Gallery filter: the look of a template. */
export type TemplateStyle =
  | "Modern"
  | "Minimalist"
  | "Bold"
  | "Elegant"
  | "Playful"
  | "Corporate";

/** Gallery filter: the business a template is written for. */
export type TemplateTheme =
  | "Real Estate"
  | "Restaurants & Cafés"
  | "Health & Dental"
  | "Home Services"
  | "Retail & E-commerce"
  | "Professional Services"
  | "Fitness & Wellness"
  | "Beauty & Salon"
  | "Automotive"
  | "Events & Nonprofit"
  | "Education"
  | "Pets";

/** Gallery filter: dominant colours. */
export type TemplateColor =
  | "Blue"
  | "Navy"
  | "Green"
  | "Teal"
  | "Red"
  | "Orange"
  | "Yellow"
  | "Purple"
  | "Pink"
  | "Brown"
  | "Cream"
  | "Black"
  | "White";

/** Gallery filter: what is on the piece. */
export type TemplateFeature =
  | "QR code"
  | "Coupon or offer"
  | "Checklist"
  | "Event details"
  | "Illustration"
  | "Signature";

/** Words a template prints; every one becomes an editable text layer. */
export interface TemplateCopy {
  brand: string;
  eyebrow: string;
  headline: string;
  /** Second headline line in the accent colour (two-tone headlines). */
  headline2?: string;
  /** Script word above an event headline ("Creative", "Join us"). */
  script?: string;
  subhead: string;
  /** Heading over the checklist. */
  listTitle: string;
  bullets: string[];
  offer?: { big: string; small: string; code?: string; expires?: string };
  cta: string;
  contact: { phone: string; web: string; address?: string };
  /** Event date, time and venue lines. */
  details?: string[];
  qrLabel: string;
  back: { headline: string; body: string };
  /** Letter body for the letterhead composition. */
  letter?: {
    date?: string;
    greeting: string;
    paragraphs: string[];
    closing: string;
    signer: string;
    title: string;
    ps?: string;
  };
}

/**
 * A gallery design: content plus a composition. It is laid out natively for
 * any format and orientation by `lib/templateLayout.ts`, front and back.
 */
export interface DesignTemplate {
  id: string;
  name: string;
  /** One sentence for the preview dialog. */
  description: string;
  productType: ProductType;
  /** The format it is shown in; it builds on every other format too. */
  layoutVariant: string;
  /** How it is shown on that format (`rotated` turns the sheet). */
  orientation: Orientation;
  archetype: TemplateArchetype;
  palette: TemplatePalette;
  fonts: { head: string; headWeight: number };
  scene: SceneKind;
  frame?: FrameKind;
  copy: TemplateCopy;
  hasQrCode: boolean;
  style: TemplateStyle;
  theme: TemplateTheme;
  colors: TemplateColor[];
  features: TemplateFeature[];
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
export type StudioTool =
  | "templates"
  | "elements"
  | "text"
  | "uploads"
  | "brand"
  | "qr"
  | "ai"
  | "layers";
