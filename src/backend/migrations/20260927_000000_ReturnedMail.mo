/// Adds `#Undeliverable` and `#Returned` to `CampaignStatus`, so a piece USPS
/// could not deliver or sent back is no longer reported as delivered.
/// `status` is a mutable field of every campaign record in a stable `Map`, and
/// the tracking log is a stable `List` of records carrying a status; both are
/// invariant, so this migration re-types every campaign and every event. No
/// value changes and every other stable variable is carried over unchanged.
import Map "mo:core/Map";
import List "mo:core/List";

module {
  // ─── Shared types (unchanged by this migration) ───

  type VerifiedAddress = {
    name : Text;
    address_line1 : Text;
    address_line2 : ?Text;
    city : Text;
    state : Text;
    zip_code : Text;
    zip_plus4 : ?Text;
  };

  type AudienceType = { #GeoRadius; #CsvUpload; #SavedPreset };

  type PaymentStatus = { #Unpaid; #Pending; #Paid; #Waived; #Refunded };

  type TextBlockState = {
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

  type LogoState = {
    id : Text;
    url : Text;
    x : Float;
    y : Float;
    width : Float;
    height : Float;
    zIndex : Nat;
  };

  type QrMode = { #StaticUrl; #DynamicTracking };

  type QrCodeState = {
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

  type CanvasSide = {
    backgroundColor : Text;
    backgroundImageUrl : ?Text;
    textBlocks : [TextBlockState];
    logos : [LogoState];
    qrCodes : [QrCodeState];
  };

  type CanvasState = {
    front : CanvasSide;
    back : CanvasSide;
    designPpi : Nat;
    widthInches : Float;
    heightInches : Float;
  };

  type ReturnAddress = {
    name : Text;
    organization : ?Text;
    address_line1 : Text;
    address_line2 : ?Text;
    city : Text;
    state : Text;
    zip_code : Text;
  };

  type TrackingSource = { #Webhook; #Poll; #Manual; #System };

  type QrScanEvent = {
    campaignId : Text;
    recipientId : Text;
    timestamp : Int;
    userAgent : ?Text;
  };

  type Counters = {
    var nextCampaignId : Nat;
    var nextPresetId : Nat;
    var nextLedgerId : Nat;
    var nextRewardId : Nat;
    var nextEventId : Nat;
    var nextPaymentId : Nat;
  };

  type Click2MailEnvironment = { #Production; #Staging };

  type UserAccount = {
    id : Text;
    var email : Text;
    var creditBalance : Nat;
    var subscriptionActive : Bool;
    var subscriptionRenewsAt : Int;
    var referralCode : Text;
    var referredBy : ?Text;
    var referralCreditsEarned : Nat;
    var referralCreditsRedeemed : Nat;
    var referralCount : Nat;
    var firstPaymentAt : ?Int;
    var lastMonthlyGrantAt : Int;
    createdAt : Int;
    var updatedAt : Int;
  };

  type AudiencePreset = {
    id : Text;
    ownerId : Text;
    name : Text;
    sourceCampaignId : ?Text;
    recipientCount : Nat;
    createdAt : Int;
    var updatedAt : Int;
  };

  type CreditLedgerEntry = {
    id : Nat;
    userId : Text;
    delta : Int;
    balanceAfter : Nat;
    reason : Text;
    reference : ?Text;
    timestamp : Int;
  };

  type CreditPack = { #Starter; #Growth; #Agency };
  type PaymentPurpose = { #CampaignOrder; #CreditPack; #Subscription };
  type PaymentState = { #Created; #Succeeded; #Failed; #Waived };

  type PaymentRecord = {
    paymentIntentId : Text;
    userId : Text;
    purpose : PaymentPurpose;
    amountCents : Nat;
    reference : ?Text;
    creditPack : ?CreditPack;
    var state : PaymentState;
    createdAt : Int;
    var confirmedAt : ?Int;
    sandbox : Bool;
  };

  type ReferralReward = {
    id : Nat;
    referrerId : Text;
    refereeId : Text;
    paymentIntentId : Text;
    amountCents : Nat;
    timestamp : Int;
  };

  type DocumentUpload = {
    campaignId : Text;
    mimeType : Text;
    fileName : Text;
    totalChunks : Nat;
    var chunks : [Blob];
    var receivedChunks : Nat;
    createdAt : Int;
  };

  // ─── Inlined pricing ledger (subset needed to price legacy campaigns) ───

  type ProductType = {
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

  type ProductSelection = {
    productType : ProductType;
    layoutVariant : Text;
    colorOption : ?Text;
  };

  type MailClass = { #FirstClass; #MarketingMail; #Priority; #PriorityExpress };

  type PrintSpec = {
    documentClass : Text;
    layout : Text;
    mailClass : MailClass;
    paperType : Text;
    productionTime : Text;
    color : Text;
    printOption : Text;
    envelope : ?Text;
  };

  type ProductionStatus = { #Draft; #AwaitingPayment; #ReadyToDispatch; #Processing; #DocumentUploaded; #AddressListReady; #JobCreated; #Submitted; #Failed };

  type SupportTicket = {
    id : Text;
    userId : ?Text;
    name : Text;
    email : Text;
    subject : Text;
    message : Text;
    pagePath : Text;
    createdAt : Int;
  };

  type AdminState = {
    var click2mailUsername : ?Text;
    var click2mailPassword : ?Text;
    var click2mailEnvironment : Click2MailEnvironment;
    var stripeSecretKey : ?Text;
    var stripePublishableKey : ?Text;
    var resendKey : ?Text;
    var openAiKey : ?Text;
    var webhookSecret : ?Text;
    var outcallProxyUrl : ?Text;
    var sandboxCheckout : Bool;
    var adminPrincipal : ?Text;
    var supportEmailAddress : ?Text;
  };

  // ─── OLD (equal to NewActor of 20260925_000000_SupportEmail) ───

  type OldCampaignStatus = {
    #Created;
    #InProduction;
    #InTransit;
    #SortedAtLocalHub;
    #Delivered;
  };

  type OldTrackingEvent = {
    id : Nat;
    campaignId : Text;
    status : OldCampaignStatus;
    eventType : Text;
    timestamp : Int;
    providerEventId : Text;
    source : TrackingSource;
    detail : ?Text;
  };

  type OldCampaignRecord = {
    id : Text;
    ownerId : Text;
    name : Text;
    product : ProductSelection;
    printSpec : PrintSpec;
    recipientCount : Nat;
    var status : OldCampaignStatus;
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
    var returnAddress : ?ReturnAddress;
    sourcePresetId : ?Text;
  };

  type OldActor = {
    campaigns : Map.Map<Text, OldCampaignRecord>;
    campaignRecipients : Map.Map<Text, [VerifiedAddress]>;
    trackingEvents : List.List<OldTrackingEvent>;
    qrScans : List.List<QrScanEvent>;
    state : Counters;
    adminKeysState : AdminState;
    accounts : Map.Map<Text, UserAccount>;
    referralCodes : Map.Map<Text, Text>;
    savedAudiencePresets : Map.Map<Text, [VerifiedAddress]>;
    presetMeta : Map.Map<Text, AudiencePreset>;
    creditLedger : List.List<CreditLedgerEntry>;
    payments : Map.Map<Text, PaymentRecord>;
    referralRewards : List.List<ReferralReward>;
    documentUploads : Map.Map<Text, DocumentUpload>;
    supportTickets : List.List<SupportTicket>;
  };

  // ─── NEW (must equal src/backend/types/campaign.mo) ───

  type CampaignStatus = {
    #Created;
    #InProduction;
    #InTransit;
    #SortedAtLocalHub;
    #Delivered;
    #Undeliverable;
    #Returned;
  };

  type TrackingEvent = {
    id : Nat;
    campaignId : Text;
    status : CampaignStatus;
    eventType : Text;
    timestamp : Int;
    providerEventId : Text;
    source : TrackingSource;
    detail : ?Text;
  };

  type CampaignRecord = {
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
    var returnAddress : ?ReturnAddress;
    sourcePresetId : ?Text;
  };

  type NewActor = {
    campaigns : Map.Map<Text, CampaignRecord>;
    campaignRecipients : Map.Map<Text, [VerifiedAddress]>;
    trackingEvents : List.List<TrackingEvent>;
    qrScans : List.List<QrScanEvent>;
    state : Counters;
    adminKeysState : AdminState;
    accounts : Map.Map<Text, UserAccount>;
    referralCodes : Map.Map<Text, Text>;
    savedAudiencePresets : Map.Map<Text, [VerifiedAddress]>;
    presetMeta : Map.Map<Text, AudiencePreset>;
    creditLedger : List.List<CreditLedgerEntry>;
    payments : Map.Map<Text, PaymentRecord>;
    referralRewards : List.List<ReferralReward>;
    documentUploads : Map.Map<Text, DocumentUpload>;
    supportTickets : List.List<SupportTicket>;
  };

  func convertCampaign(rec : OldCampaignRecord) : CampaignRecord {
    {
      id = rec.id;
      ownerId = rec.ownerId;
      name = rec.name;
      product = rec.product;
      printSpec = rec.printSpec;
      recipientCount = rec.recipientCount;
      var status = rec.status;
      createdAt = rec.createdAt;
      var updatedAt = rec.updatedAt;
      audienceType = rec.audienceType;
      designTemplateId = rec.designTemplateId;
      var canvasState = rec.canvasState;
      unitPriceCents = rec.unitPriceCents;
      baseCostCents = rec.baseCostCents;
      var totalAmountChargedCents = rec.totalAmountChargedCents;
      var paymentStatus = rec.paymentStatus;
      var paymentIntentId = rec.paymentIntentId;
      var productionStatus = rec.productionStatus;
      var c2mDocumentId = rec.c2mDocumentId;
      var c2mAddressListId = rec.c2mAddressListId;
      var c2mJobId = rec.c2mJobId;
      var lastError = rec.lastError;
      var qrDestinationUrl = rec.qrDestinationUrl;
      var qrScanCount = rec.qrScanCount;
      var returnAddress = rec.returnAddress;
      sourcePresetId = rec.sourcePresetId;
    };
  };

  func convertEvent(e : OldTrackingEvent) : TrackingEvent {
    {
      id = e.id;
      campaignId = e.campaignId;
      status = e.status;
      eventType = e.eventType;
      timestamp = e.timestamp;
      providerEventId = e.providerEventId;
      source = e.source;
      detail = e.detail;
    };
  };

  public func migration(old : OldActor) : NewActor {
    {
      campaigns = old.campaigns.map<Text, OldCampaignRecord, CampaignRecord>(func(_, rec) = convertCampaign(rec));
      campaignRecipients = old.campaignRecipients;
      trackingEvents = old.trackingEvents.map<OldTrackingEvent, TrackingEvent>(convertEvent);
      qrScans = old.qrScans;
      state = old.state;
      adminKeysState = old.adminKeysState;
      accounts = old.accounts;
      referralCodes = old.referralCodes;
      savedAudiencePresets = old.savedAudiencePresets;
      presetMeta = old.presetMeta;
      creditLedger = old.creditLedger;
      payments = old.payments;
      referralRewards = old.referralRewards;
      documentUploads = old.documentUploads;
      supportTickets = old.supportTickets;
    };
  };
};
