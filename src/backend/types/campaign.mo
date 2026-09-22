/// Campaign, print-spec, canvas and tracking domain types.
import Common "common";

module {
  /// Click2Mail product families. `#SelfMailer` is kept for records created
  /// before flyers and brochures became their own categories; `#SnapPack` is
  /// the Secure Mailer family.
  public type ProductType = {
    #Postcard;
    #Letter;
    #SelfMailer;
    #SnapPack;
    #Booklet;
    #CertifiedMail;
    #Eddm;
    #PriorityMail;
    #PriorityMailExpress;
    #Flyer;
    #Notecard;
    #RackCard;
    #Brochure;
    #ReplyMail;
    #CardStock;
  };

  public type ProductSelection = {
    productType : ProductType;
    layoutVariant : Text;
    colorOption : ?Text;
  };

  /// 5-stage USPS Intelligent Mail Barcode timeline.
  public type CampaignStatus = {
    #Created;
    #InProduction;
    #InTransit;
    #SortedAtLocalHub;
    #Delivered;
  };

  public type AudienceType = {
    #GeoRadius;
    #CsvUpload;
    #SavedPreset;
  };

  public type MailClass = {
    #FirstClass;
    #MarketingMail;
    #Priority;
    #PriorityExpress;
  };

  /// Physical print options bound to a Click2Mail job.
  public type PrintSpec = {
    documentClass : Text;
    layout : Text;
    mailClass : MailClass;
    paperType : Text;
    productionTime : Text;
    color : Text;
    printOption : Text;
    envelope : ?Text;
  };

  /// Retail pricing ledger row (authoritative copy lives in lib/pricing.mo).
  public type PricingRow = {
    layoutVariant : Text;
    displayName : Text;
    productType : ProductType;
    baseCostCents : Nat;
    retailPriceCents : Nat;
    marginCents : Nat;
    marginPercent : Nat;
    widthInches : Float;
    heightInches : Float;
    printSpec : PrintSpec;
  };

  public type PaymentStatus = {
    #Unpaid;
    #Pending;
    #Paid;
    #Waived;
    #Refunded;
  };

  public type ProductionStatus = {
    #Draft;
    #AwaitingPayment;
    #ReadyToDispatch;
    #DocumentUploaded;
    #AddressListReady;
    #JobCreated;
    #Submitted;
    #Failed;
  };

  // ─── Canvas (design) state ───────────────────────────────────────────────

  public type TextBlockState = {
    id : Text;
    text : Text;
    x : Float;
    y : Float;
    width : Float;
    height : Float;
    fontSize : Float;
    color : Text;
    fontFamily : Text;
    fontWeight : Nat;
    align : Text;
    zIndex : Nat;
  };

  public type LogoState = {
    id : Text;
    url : Text;
    x : Float;
    y : Float;
    width : Float;
    height : Float;
    zIndex : Nat;
  };

  public type QrMode = {
    #StaticUrl;
    #DynamicTracking;
  };

  public type QrCodeState = {
    id : Text;
    x : Float;
    y : Float;
    size : Float;
    url : Text;
    mode : QrMode;
    foreground : Text;
    background : Text;
    caption : ?Text;
    zIndex : Nat;
  };

  public type CanvasSide = {
    backgroundColor : Text;
    backgroundImageUrl : ?Text;
    textBlocks : [TextBlockState];
    logos : [LogoState];
    qrCodes : [QrCodeState];
  };

  /// Coordinates are stored in "design pixels" at `designPpi` pixels per inch.
  public type CanvasState = {
    front : CanvasSide;
    back : CanvasSide;
    designPpi : Nat;
    widthInches : Float;
    heightInches : Float;
  };

  // ─── Campaign ledger ─────────────────────────────────────────────────────

  public type CampaignRecord = {
    id : Text;
    ownerId : Text;
    name : Text;
    product : ProductSelection;
    printSpec : PrintSpec;
    recipientCount : Nat;
    var status : CampaignStatus;
    createdAt : Int;
    var updatedAt : Int;
    audienceType : AudienceType;
    designTemplateId : ?Text;
    var canvasState : ?CanvasState;
    unitPriceCents : Nat;
    baseCostCents : Nat;
    var totalAmountChargedCents : Nat;
    var paymentStatus : PaymentStatus;
    var paymentIntentId : ?Text;
    var productionStatus : ProductionStatus;
    var c2mDocumentId : ?Text;
    var c2mAddressListId : ?Text;
    var c2mJobId : ?Text;
    var lastError : ?Text;
    var qrDestinationUrl : ?Text;
    var qrScanCount : Nat;
    var returnAddress : ?Common.ReturnAddress;
    sourcePresetId : ?Text;
  };

  public type CampaignRecordShared = {
    id : Text;
    ownerId : Text;
    name : Text;
    product : ProductSelection;
    printSpec : PrintSpec;
    recipientCount : Nat;
    status : CampaignStatus;
    createdAt : Int;
    updatedAt : Int;
    audienceType : AudienceType;
    designTemplateId : ?Text;
    canvasState : ?CanvasState;
    unitPriceCents : Nat;
    baseCostCents : Nat;
    totalAmountChargedCents : Nat;
    paymentStatus : PaymentStatus;
    paymentIntentId : ?Text;
    productionStatus : ProductionStatus;
    c2mDocumentId : ?Text;
    c2mAddressListId : ?Text;
    c2mJobId : ?Text;
    lastError : ?Text;
    qrDestinationUrl : ?Text;
    qrScanCount : Nat;
    returnAddress : ?Common.ReturnAddress;
    sourcePresetId : ?Text;
  };

  public type CreateCampaignInput = {
    name : Text;
    product : ProductSelection;
    audienceType : AudienceType;
    recipients : [Common.VerifiedAddress];
    recipientCount : Nat;
    designTemplateId : ?Text;
    canvasState : ?CanvasState;
    qrDestinationUrl : ?Text;
    returnAddress : ?Common.ReturnAddress;
    sourcePresetId : ?Text;
  };

  public type CreateCampaignResult = {
    ok : Bool;
    error : ?Text;
    campaignId : ?Text;
    unitPriceCents : ?Nat;
    totalCents : ?Nat;
  };

  // ─── Tracking ────────────────────────────────────────────────────────────

  public type TrackingSource = {
    #Webhook;
    #Poll;
    #Manual;
    #System;
  };

  public type TrackingEvent = {
    id : Nat;
    campaignId : Text;
    status : CampaignStatus;
    eventType : Text;
    timestamp : Int;
    providerEventId : Text;
    source : TrackingSource;
    detail : ?Text;
  };

  public type DispatchResult = {
    ok : Bool;
    error : ?Text;
    documentId : ?Text;
    addressListId : ?Text;
    jobId : ?Text;
    productionStatus : ?ProductionStatus;
  };

  public type SyncResult = {
    ok : Bool;
    error : ?Text;
    status : ?CampaignStatus;
    newEvents : Nat;
  };

  public type WebhookResult = {
    ok : Bool;
    error : ?Text;
    campaignId : ?Text;
    status : ?CampaignStatus;
  };

  // ─── Dynamic QR tracking ─────────────────────────────────────────────────

  public type QrScanEvent = {
    campaignId : Text;
    recipientId : Text;
    timestamp : Int;
    userAgent : ?Text;
  };

  public type QrScanStats = {
    totalScans : Nat;
    uniqueRecipients : Nat;
    recentScans : [QrScanEvent];
  };

  public type TrackingResolveResult = {
    ok : Bool;
    destinationUrl : ?Text;
    campaignId : ?Text;
    recipientId : ?Text;
  };

  // ─── Document upload staging (chunked, pre-dispatch) ─────────────────────

  public type DocumentUpload = {
    campaignId : Text;
    mimeType : Text;
    fileName : Text;
    totalChunks : Nat;
    var chunks : [Blob];
    var receivedChunks : Nat;
    createdAt : Int;
  };

  public type DocumentUploadStatus = {
    campaignId : Text;
    mimeType : Text;
    fileName : Text;
    totalChunks : Nat;
    receivedChunks : Nat;
    totalBytes : Nat;
    complete : Bool;
  };

  // ─── Saved audience presets ──────────────────────────────────────────────

  public type AudiencePreset = {
    id : Text;
    ownerId : Text;
    name : Text;
    sourceCampaignId : ?Text;
    recipientCount : Nat;
    createdAt : Int;
    var updatedAt : Int;
  };

  public type AudiencePresetShared = {
    id : Text;
    ownerId : Text;
    name : Text;
    sourceCampaignId : ?Text;
    recipientCount : Nat;
    createdAt : Int;
    updatedAt : Int;
  };

  public type PresetResult = {
    ok : Bool;
    error : ?Text;
    presetId : ?Text;
  };
};
