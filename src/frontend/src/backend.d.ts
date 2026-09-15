import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface QrCodeState {
    x: number;
    y: number;
    id: string;
    url: string;
    size: number;
}
export interface TextBlockState {
    x: number;
    y: number;
    id: string;
    height: number;
    color: string;
    text: string;
    width: number;
    fontSize: number;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface TrackingEvent {
    lobEventId: string;
    campaignId: string;
    timestamp: bigint;
    eventType: string;
}
export interface ProductSelection {
    productType: ProductType;
    layoutVariant: string;
    colorOption?: string;
}
export interface AddressInput {
    zip_code: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    name: string;
    state: string;
}
export interface LogoState {
    x: number;
    y: number;
    id: string;
    url: string;
    height: number;
    width: number;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface CanvasState {
    backgroundImageUrl?: string;
    logos: Array<LogoState>;
    textBlocks: Array<TextBlockState>;
    qrCode?: QrCodeState;
}
export interface CampaignRecordShared {
    id: string;
    status: CampaignStatus;
    createdAt: bigint;
    trackingId?: string;
    canvasState?: CanvasState;
    designTemplateId?: string;
    recipientCount: bigint;
    audienceType: AudienceType;
    product: ProductSelection;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface AdminKeys {
    resendKey?: string;
    lobKey?: string;
    stripeKey?: string;
}
export interface AddressVerificationResult {
    verified?: VerifiedAddress;
    errorMessage?: string;
    input: AddressInput;
    isValid: boolean;
}
export interface VerifiedAddress {
    zip_code: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    name: string;
    state: string;
    zip_plus4?: string;
}
export enum AudienceType {
    CSV = "CSV",
    Map_ = "Map"
}
export enum CampaignStatus {
    InTransit = "InTransit",
    InProduction = "InProduction",
    Delivered = "Delivered",
    Created = "Created",
    SortedAtLocalHub = "SortedAtLocalHub"
}
export enum ProductType {
    SelfMailer = "SelfMailer",
    Booklet = "Booklet",
    Letter = "Letter",
    SnapPack = "SnapPack",
    Postcard = "Postcard"
}
export interface backendInterface {
    createCampaign(product: ProductSelection, recipientCount: bigint, audienceType: AudienceType): Promise<string>;
    exportCampaignRecipients(campaignId: string): Promise<string | null>;
    fireLobOutcall(campaignId: string, recipientId: string, lobKey: string): Promise<string>;
    getAdminKeys(): Promise<AdminKeys>;
    getCampaign(id: string): Promise<CampaignRecordShared | null>;
    getCampaigns(): Promise<Array<CampaignRecordShared>>;
    getCanvasState(campaignId: string): Promise<CanvasState | null>;
    getTrackingEvents(campaignId: string): Promise<Array<TrackingEvent>>;
    handleLobWebhook(payload: string): Promise<boolean>;
    saveAdminKeys(keys: AdminKeys): Promise<boolean>;
    saveCanvasState(campaignId: string, canvas: CanvasState): Promise<boolean>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateCampaignStatus(id: string, status: CampaignStatus, lobEventId: string, timestamp: bigint): Promise<boolean>;
    verifyAddresses(addresses: Array<AddressInput>): Promise<Array<AddressVerificationResult>>;
}
