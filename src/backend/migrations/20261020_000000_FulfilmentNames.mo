/// Vendor-neutral names for the print fulfilment integration, and a stable
/// outbox for support-ticket emails.
///
/// - Every campaign record's `c2mDocumentId` / `c2mAddressListId` / `c2mJobId`
///   become `printDocumentId` / `printAddressListId` / `printJobId`. They are
///   mutable fields of records in a stable `Map`, so every campaign is copied.
/// - The admin credential record's `click2mailUsername` / `click2mailPassword`
///   / `click2mailEnvironment` become `fulfilmentUsername` /
///   `fulfilmentPassword` / `fulfilmentEnvironment`. Values (and every other
///   key) are carried over unchanged, so no credential has to be re-entered.
/// - `supportEmailOutbox` is new and starts empty: tickets filed before this
///   upgrade were already emailed (or not) by the old one-shot timers, and
///   there is no record of which, so none is re-sent.
/// Every other stable variable is carried over unchanged.
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

  type Environment = { #Production; #Staging };

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

  type OldAdminState = {
    var click2mailUsername : ?Text;
    var click2mailPassword : ?Text;
    var click2mailEnvironment : Environment;
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

  type AdminState = {
    var fulfilmentUsername : ?Text;
    var fulfilmentPassword : ?Text;
    var fulfilmentEnvironment : Environment;
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

  type EmailState = { #Queued; #Sent; #Failed };

  type EmailDelivery = {
    ticketId : Text;
    var state : EmailState;
    var attempts : Nat;
    var nextAttemptAt : Int;
    var lastStatus : Text;
  };

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

  // ─── OLD (equal to NewActor of 20260927_000000_ReturnedMail) ───

  type OldCampaignRecord = {
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

  type OldActor = {
    campaigns : Map.Map<Text, OldCampaignRecord>;
    campaignRecipients : Map.Map<Text, [VerifiedAddress]>;
    trackingEvents : List.List<TrackingEvent>;
    qrScans : List.List<QrScanEvent>;
    state : Counters;
    adminKeysState : OldAdminState;
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


  // ─── NEW (must equal src/backend/types/campaign.mo, common.mo, support.mo) ───

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
    var printDocumentId : ?Text;
    var printAddressListId : ?Text;
    var printJobId : ?Text;
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
    supportEmailOutbox : Map.Map<Text, EmailDelivery>;
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
      var printDocumentId = rec.c2mDocumentId;
      var printAddressListId = rec.c2mAddressListId;
      var printJobId = rec.c2mJobId;
      var lastError = rec.lastError;
      var qrDestinationUrl = rec.qrDestinationUrl;
      var qrScanCount = rec.qrScanCount;
      var returnAddress = rec.returnAddress;
      sourcePresetId = rec.sourcePresetId;
    };
  };

  func convertAdmin(a : OldAdminState) : AdminState {
    {
      var fulfilmentUsername = a.click2mailUsername;
      var fulfilmentPassword = a.click2mailPassword;
      var fulfilmentEnvironment = a.click2mailEnvironment;
      var stripeSecretKey = a.stripeSecretKey;
      var stripePublishableKey = a.stripePublishableKey;
      var resendKey = a.resendKey;
      var openAiKey = a.openAiKey;
      var webhookSecret = a.webhookSecret;
      var outcallProxyUrl = a.outcallProxyUrl;
      var sandboxCheckout = a.sandboxCheckout;
      var adminPrincipal = a.adminPrincipal;
      var supportEmailAddress = a.supportEmailAddress;
    };
  };

  public func migration(old : OldActor) : NewActor {
    {
      campaigns = old.campaigns.map<Text, OldCampaignRecord, CampaignRecord>(func(_, rec) = convertCampaign(rec));
      campaignRecipients = old.campaignRecipients;
      trackingEvents = old.trackingEvents;
      qrScans = old.qrScans;
      state = old.state;
      adminKeysState = convertAdmin(old.adminKeysState);
      accounts = old.accounts;
      referralCodes = old.referralCodes;
      savedAudiencePresets = old.savedAudiencePresets;
      presetMeta = old.presetMeta;
      creditLedger = old.creditLedger;
      payments = old.payments;
      referralRewards = old.referralRewards;
      documentUploads = old.documentUploads;
      supportTickets = old.supportTickets;
      supportEmailOutbox = Map.empty<Text, EmailDelivery>();
    };
  };
};
