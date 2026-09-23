import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface http_request_result {
    body: Uint8Array;
    headers: Array<http_header>;
    status: bigint;
}
export interface http_header {
    name: string;
    value: string;
}
export interface WebhookResult {
    campaignId?: string;
    error?: string;
    ok: boolean;
    status?: CampaignStatus;
}
export interface VerifiedAddress {
    address_line1: string;
    address_line2?: string;
    city: string;
    name: string;
    state: string;
    zip_code: string;
    zip_plus4?: string;
}
export interface VerificationBatchResult {
    addressListId?: string;
    error?: string;
    invalidCount: bigint;
    ok: boolean;
    results: Array<AddressVerificationResult>;
    validCount: bigint;
}
export interface UserAccountShared {
    createdAt: bigint;
    creditBalance: bigint;
    email: string;
    firstPaymentAt?: bigint;
    freeMonthsAvailable: bigint;
    id: string;
    referralCode: string;
    referralCount: bigint;
    referralCreditsEarned: bigint;
    referralCreditsRedeemed: bigint;
    referralLink: string;
    referredBy?: string;
    subscriptionActive: boolean;
    subscriptionRenewsAt: bigint;
    updatedAt: bigint;
}
export interface TransformationOutput {
    body: Uint8Array;
    headers: Array<http_header>;
    status: bigint;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export enum TrackingSource {
    Manual = "Manual",
    Poll = "Poll",
    System = "System",
    Webhook = "Webhook"
}
export interface TrackingResolveResult {
    campaignId?: string;
    destinationUrl?: string;
    ok: boolean;
    recipientId?: string;
}
export interface TrackingEvent {
    campaignId: string;
    detail?: string;
    eventType: string;
    id: bigint;
    providerEventId: string;
    source: TrackingSource;
    status: CampaignStatus;
    timestamp: bigint;
}
export interface TextBlockState {
    align: string;
    color: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: bigint;
    height: number;
    id: string;
    text: string;
    width: number;
    x: number;
    y: number;
    zIndex: bigint;
}
export interface SyncResult {
    error?: string;
    newEvents: bigint;
    ok: boolean;
    status?: CampaignStatus;
}
export interface ReturnAddress {
    address_line1: string;
    address_line2?: string;
    city: string;
    name: string;
    organization?: string;
    state: string;
    zip_code: string;
}
export interface ReferralStats {
    freeMonthsAvailable: bigint;
    referralCode: string;
    referralCount: bigint;
    referralCreditsEarned: bigint;
    referralCreditsRedeemed: bigint;
    referralLink: string;
    rewards: Array<ReferralReward>;
    subscriptionActive: boolean;
}
export interface ReferralReward {
    amountCents: bigint;
    id: bigint;
    paymentIntentId: string;
    refereeId: string;
    referrerId: string;
    timestamp: bigint;
}
export interface QrScanStats {
    recentScans: Array<QrScanEvent>;
    totalScans: bigint;
    uniqueRecipients: bigint;
}
export interface QrScanEvent {
    campaignId: string;
    recipientId: string;
    timestamp: bigint;
    userAgent?: string;
}
export enum QrMode {
    DynamicTracking = "DynamicTracking",
    StaticUrl = "StaticUrl"
}
export interface QrCodeState {
    background: string;
    caption?: string;
    foreground: string;
    id: string;
    mode: QrMode;
    size: number;
    url: string;
    x: number;
    y: number;
    zIndex: bigint;
}
export interface PublicConfig {
    click2mailConfigured: boolean;
    click2mailEnvironment: Click2MailEnvironment;
    openAiConfigured: boolean;
    referralBaseUrl: string;
    resendConfigured: boolean;
    sandboxCheckout: boolean;
    stripeConfigured: boolean;
    stripePublishableKey?: string;
    trackingBaseUrl: string;
}
export enum ProductionStatus {
    AddressListReady = "AddressListReady",
    AwaitingPayment = "AwaitingPayment",
    DocumentUploaded = "DocumentUploaded",
    Draft = "Draft",
    Failed = "Failed",
    JobCreated = "JobCreated",
    ReadyToDispatch = "ReadyToDispatch",
    Submitted = "Submitted"
}
export enum ProductType {
    Booklet = "Booklet",
    Brochure = "Brochure",
    CardStock = "CardStock",
    CertifiedMail = "CertifiedMail",
    Eddm = "Eddm",
    Flyer = "Flyer",
    Letter = "Letter",
    Notecard = "Notecard",
    Postcard = "Postcard",
    PriorityMail = "PriorityMail",
    PriorityMailExpress = "PriorityMailExpress",
    RackCard = "RackCard",
    ReplyMail = "ReplyMail",
    SelfMailer = "SelfMailer",
    SnapPack = "SnapPack"
}
export interface ProductSelection {
    colorOption?: string;
    layoutVariant: string;
    productType: ProductType;
}
export interface PrintSpec {
    color: string;
    documentClass: string;
    envelope?: string;
    layout: string;
    mailClass: MailClass;
    paperType: string;
    printOption: string;
    productionTime: string;
}
export interface PricingRow {
    baseCostCents: bigint;
    displayName: string;
    heightInches: number;
    layoutVariant: string;
    marginCents: bigint;
    marginPercent: bigint;
    printSpec: PrintSpec;
    productType: ProductType;
    retailPriceCents: bigint;
    widthInches: number;
}
export interface PresetResult {
    error?: string;
    ok: boolean;
    presetId?: string;
}
export enum PaymentStatus {
    Paid = "Paid",
    Pending = "Pending",
    Refunded = "Refunded",
    Unpaid = "Unpaid",
    Waived = "Waived"
}
export enum PaymentState {
    Created = "Created",
    Failed = "Failed",
    Succeeded = "Succeeded",
    Waived = "Waived"
}
export enum PaymentPurpose {
    CampaignOrder = "CampaignOrder",
    CreditPack = "CreditPack",
    Subscription = "Subscription"
}
export interface PaymentIntentResult {
    amountCents?: bigint;
    clientSecret?: string;
    error?: string;
    ok: boolean;
    paymentIntentId?: string;
    publishableKey?: string;
    sandbox: boolean;
    waived: boolean;
}
export enum MailClass {
    FirstClass = "FirstClass",
    MarketingMail = "MarketingMail",
    Priority = "Priority",
    PriorityExpress = "PriorityExpress"
}
export interface LogoState {
    height: number;
    id: string;
    url: string;
    width: number;
    x: number;
    y: number;
    zIndex: bigint;
}
export interface HttpResponse {
    body: Uint8Array;
    headers: Array<HeaderField>;
    status_code: number;
    upgrade?: boolean;
}
export interface HttpRequest {
    body: Uint8Array;
    headers: Array<HeaderField>;
    method: string;
    url: string;
}
export type HeaderField = [string, string];
export interface DocumentUploadStatus {
    campaignId: string;
    complete: boolean;
    fileName: string;
    mimeType: string;
    receivedChunks: bigint;
    totalBytes: bigint;
    totalChunks: bigint;
}
export interface DispatchResult {
    addressListId?: string;
    documentId?: string;
    error?: string;
    jobId?: string;
    ok: boolean;
    productionStatus?: ProductionStatus;
}
export interface CreditResult {
    balance?: bigint;
    error?: string;
    ok: boolean;
}
export interface CreditPackInfo {
    bonusCredits: bigint;
    credits: bigint;
    name: string;
    pack: CreditPack;
    priceCents: bigint;
}
export enum CreditPack {
    Agency = "Agency",
    Growth = "Growth",
    Starter = "Starter"
}
export interface CreditLedgerEntry {
    balanceAfter: bigint;
    delta: bigint;
    id: bigint;
    reason: string;
    reference?: string;
    timestamp: bigint;
    userId: string;
}
export interface CreateCampaignResult {
    campaignId?: string;
    error?: string;
    ok: boolean;
    totalCents?: bigint;
    unitPriceCents?: bigint;
}
export interface CreateCampaignInput {
    audienceType: AudienceType;
    canvasState?: CanvasState;
    designTemplateId?: string;
    mailClass?: MailClass;
    name: string;
    product: ProductSelection;
    qrDestinationUrl?: string;
    recipientCount: bigint;
    recipients: Array<VerifiedAddress>;
    returnAddress?: ReturnAddress;
    sourcePresetId?: string;
}
export interface ConfirmPaymentResult {
    campaignId?: string;
    creditBalance?: bigint;
    error?: string;
    ok: boolean;
    referralRewardApplied: boolean;
    state?: PaymentState;
    subscriptionActive?: boolean;
}
export enum Click2MailEnvironment {
    Production = "Production",
    Staging = "Staging"
}
export interface CanvasState {
    back: CanvasSide;
    designPpi: bigint;
    front: CanvasSide;
    heightInches: number;
    widthInches: number;
}
export interface CanvasSide {
    backgroundColor: string;
    backgroundImageUrl?: string;
    logos: Array<LogoState>;
    qrCodes: Array<QrCodeState>;
    textBlocks: Array<TextBlockState>;
}
export enum CampaignStatus {
    Created = "Created",
    Delivered = "Delivered",
    InProduction = "InProduction",
    InTransit = "InTransit",
    SortedAtLocalHub = "SortedAtLocalHub"
}
export interface CampaignRecordShared {
    audienceType: AudienceType;
    baseCostCents: bigint;
    c2mAddressListId?: string;
    c2mDocumentId?: string;
    c2mJobId?: string;
    canvasState?: CanvasState;
    createdAt: bigint;
    designTemplateId?: string;
    id: string;
    lastError?: string;
    name: string;
    ownerId: string;
    paymentIntentId?: string;
    paymentStatus: PaymentStatus;
    printSpec: PrintSpec;
    product: ProductSelection;
    productionStatus: ProductionStatus;
    qrDestinationUrl?: string;
    qrScanCount: bigint;
    recipientCount: bigint;
    returnAddress?: ReturnAddress;
    sourcePresetId?: string;
    status: CampaignStatus;
    totalAmountChargedCents: bigint;
    unitPriceCents: bigint;
    updatedAt: bigint;
}
export enum AudienceType {
    CsvUpload = "CsvUpload",
    GeoRadius = "GeoRadius",
    SavedPreset = "SavedPreset"
}
export interface AudiencePresetShared {
    createdAt: bigint;
    id: string;
    name: string;
    ownerId: string;
    recipientCount: bigint;
    sourceCampaignId?: string;
    updatedAt: bigint;
}
export interface ApiResult {
    error?: string;
    ok: boolean;
}
export interface AiPricing {
    copyCredits: bigint;
    creditValueCents: bigint;
    hdImageCredits: bigint;
    monthlyAllowance: bigint;
    packs: Array<CreditPackInfo>;
    squareImageCredits: bigint;
    wideImageCredits: bigint;
}
export enum AiImageSize {
    Square1024 = "Square1024",
    Wide1792 = "Wide1792",
    WideHd1792 = "WideHd1792"
}
export interface AiImageResult {
    creditBalance?: bigint;
    creditsCharged: bigint;
    error?: string;
    imageUrl?: string;
    ok: boolean;
    revisedPrompt?: string;
}
export interface AiCopyResult {
    bullets: Array<string>;
    creditBalance?: bigint;
    creditsCharged: bigint;
    ctas: Array<string>;
    error?: string;
    headlines: Array<string>;
    ok: boolean;
}
export interface AiCopyInput {
    businessName: string;
    callToAction: string;
    industry: string;
    offer: string;
    tone?: string;
}
export interface AdminKeysView {
    adminPrincipal?: string;
    callerIsAdmin: boolean;
    click2mailEnvironment: Click2MailEnvironment;
    click2mailPasswordMasked?: string;
    click2mailUsername?: string;
    openAiKeyMasked?: string;
    outcallProxyUrl?: string;
    resendKeyMasked?: string;
    sandboxCheckout: boolean;
    stripePublishableKey?: string;
    stripeSecretKeyMasked?: string;
    webhookPath: string;
    webhookSecretMasked?: string;
}
export interface AdminKeysInput {
    click2mailEnvironment?: Click2MailEnvironment;
    click2mailPassword?: string;
    click2mailUsername?: string;
    openAiKey?: string;
    outcallProxyUrl?: string;
    resendKey?: string;
    sandboxCheckout?: boolean;
    stripePublishableKey?: string;
    stripeSecretKey?: string;
    webhookSecret?: string;
}
export interface AddressVerificationResult {
    errorMessage?: string;
    input: AddressInput;
    isValid: boolean;
    verified?: VerifiedAddress;
}
export interface AddressInput {
    address_line1: string;
    address_line2?: string;
    city: string;
    name: string;
    state: string;
    zip_code: string;
}
export interface AccountResult {
    account?: UserAccountShared;
    error?: string;
    ok: boolean;
}
export interface backendInterface {
    applyReferralReward(arg0: string): Promise<ApiResult>;
    confirmPayment(arg0: string): Promise<ConfirmPaymentResult>;
    createCampaign(arg0: CreateCampaignInput): Promise<CreateCampaignResult>;
    createPaymentIntent(arg0: PaymentPurpose, arg1: string | null, arg2: CreditPack | null): Promise<PaymentIntentResult>;
    deductAiCredits(arg0: bigint, arg1: string): Promise<CreditResult>;
    deletePreset(arg0: string): Promise<ApiResult>;
    dispatchClick2MailJob(arg0: string): Promise<DispatchResult>;
    ensureAccount(arg0: string | null, arg1: string | null): Promise<AccountResult>;
    executeClick2MailVerification(arg0: Array<AddressInput>): Promise<VerificationBatchResult>;
    exportCampaignRecipients(arg0: string): Promise<string | null>;
    generateAiCopy(arg0: AiCopyInput): Promise<AiCopyResult>;
    generateAiImage(arg0: string, arg1: AiImageSize): Promise<AiImageResult>;
    getAdminKeys(): Promise<AdminKeysView>;
    getAiPricing(): Promise<AiPricing>;
    getCampaign(arg0: string): Promise<CampaignRecordShared | null>;
    getCampaignRecipients(arg0: string): Promise<Array<VerifiedAddress>>;
    getCampaigns(): Promise<Array<CampaignRecordShared>>;
    getCanvasState(arg0: string): Promise<CanvasState | null>;
    getCreditLedger(): Promise<Array<CreditLedgerEntry>>;
    getDocumentUploadStatus(arg0: string): Promise<DocumentUploadStatus | null>;
    getMyAccount(): Promise<UserAccountShared | null>;
    getPresetAddresses(arg0: string): Promise<Array<VerifiedAddress>>;
    getPricingLedger(): Promise<Array<PricingRow>>;
    getPublicConfig(): Promise<PublicConfig>;
    getQrScanStats(arg0: string): Promise<QrScanStats>;
    getReferralStats(): Promise<ReferralStats | null>;
    getTrackingEvents(arg0: string): Promise<Array<TrackingEvent>>;
    handleDeliveryWebhook(arg0: string, arg1: string): Promise<WebhookResult>;
    http_request(arg0: HttpRequest): Promise<HttpResponse>;
    http_request_update(arg0: HttpRequest): Promise<HttpResponse>;
    listPresets(): Promise<Array<AudiencePresetShared>>;
    pollActiveTracking(): Promise<bigint>;
    resolveTrackingLink(arg0: string, arg1: string | null): Promise<TrackingResolveResult>;
    saveAdminKeys(arg0: AdminKeysInput): Promise<ApiResult>;
    saveCanvasState(arg0: string, arg1: CanvasState): Promise<boolean>;
    savePreset(arg0: string, arg1: Array<VerifiedAddress>, arg2: string | null): Promise<PresetResult>;
    syncClick2MailTracking(arg0: string): Promise<SyncResult>;
    transform(arg0: TransformationInput): Promise<TransformationOutput>;
    updateAccountEmail(arg0: string): Promise<ApiResult>;
    updateCampaignStatus(arg0: string, arg1: CampaignStatus, arg2: string, arg3: bigint): Promise<boolean>;
    updatePreset(arg0: string, arg1: string, arg2: Array<VerifiedAddress>): Promise<ApiResult>;
    uploadDocumentChunk(arg0: string, arg1: bigint, arg2: bigint, arg3: string, arg4: string, arg5: Uint8Array): Promise<ApiResult>;
}
