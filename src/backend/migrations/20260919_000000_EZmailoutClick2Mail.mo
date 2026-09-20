import Map "mo:core/Map";
import List "mo:core/List";
import Text "mo:core/Text";
import Array "mo:core/Array";

module {
  // ─── Inlined OLD types (must equal NewActor of 20260604_120000_AddCanvasState) ───

  type ProductType = {
    #Postcard;
    #Letter;
    #SelfMailer;
    #SnapPack;
    #Booklet;
  };

  type ProductSelection = {
    productType : ProductType;
    layoutVariant : Text;
    colorOption : ?Text;
  };

  type CampaignStatus = {
    #Created;
    #InProduction;
    #InTransit;
    #SortedAtLocalHub;
    #Delivered;
  };

  type OldAudienceType = { #Map; #CSV };

  type OldTextBlockState = {
    id : Text;
    text : Text;
    x : Float;
    y : Float;
    width : Float;
    height : Float;
    fontSize : Float;
    color : Text;
  };

  type OldLogoState = {
    id : Text;
    url : Text;
    x : Float;
    y : Float;
    width : Float;
    height : Float;
  };

  type OldQrCodeState = {
    id : Text;
    x : Float;
    y : Float;
    size : Float;
    url : Text;
  };

  type OldCanvasState = {
    textBlocks : [OldTextBlockState];
    logos : [OldLogoState];
    backgroundImageUrl : ?Text;
    qrCode : ?OldQrCodeState;
  };

  type OldCampaignRecord = {
    id : Text;
    product : ProductSelection;
    recipientCount : Nat;
    var status : CampaignStatus;
    createdAt : Int;
    trackingId : ?Text;
    audienceType : OldAudienceType;
    designTemplateId : ?Text;
    var canvasState : ?OldCanvasState;
  };

  type VerifiedAddress = {
    name : Text;
    address_line1 : Text;
    address_line2 : ?Text;
    city : Text;
    state : Text;
    zip_code : Text;
    zip_plus4 : ?Text;
  };

  type OldTrackingEvent = {
    campaignId : Text;
    eventType : Text;
    timestamp : Int;
    lobEventId : Text;
  };

  type OldActor = {
    campaigns : Map.Map<Text, OldCampaignRecord>;
    campaignRecipients : Map.Map<Text, [VerifiedAddress]>;
    trackingEvents : List.List<OldTrackingEvent>;
    state : { var nextCampaignId : Nat };
    adminKeysState : { var stripeKey : ?Text; var lobKey : ?Text; var resendKey : ?Text };
  };

  // ─── Inlined NEW types (must equal src/backend/types/*.mo) ───

  type AudienceType = { #GeoRadius; #CsvUpload; #SavedPreset };
  type MailClass = { #FirstClass; #MarketingMail };

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

  type PaymentStatus = { #Unpaid; #Pending; #Paid; #Waived; #Refunded };
  type ProductionStatus = { #Draft; #AwaitingPayment; #ReadyToDispatch; #DocumentUploaded; #AddressListReady; #JobCreated; #Submitted; #Failed };

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

  type TrackingSource = { #Webhook; #Poll; #Manual; #System };

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
  };

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
  };

  // ─── Inlined pricing ledger (subset needed to price legacy campaigns) ───

  type Ledger = { spec : PrintSpec; base : Nat; retail : Nat; w : Float; h : Float };

  func gloss() : Text { "White Matte with Gloss UV Finish" };

  func spec(documentClass : Text, layout : Text, mailClass : MailClass, paperType : Text, envelope : ?Text) : PrintSpec {
    { documentClass; layout; mailClass; paperType; productionTime = "Next Day"; color = "Full Color"; printOption = "Printing both sides"; envelope };
  };

  func ledgerFor(variant : Text) : Ledger {
    if (variant == "4x6") { { spec = spec("Postcard 4 x 6", "Double Sided Postcard", #FirstClass, gloss(), null); base = 55; retail = 115; w = 6.0; h = 4.0 } }
    else if (variant == "6x11") { { spec = spec("Postcard 6 x 11", "Double Sided Postcard", #MarketingMail, gloss(), null); base = 73; retail = 165; w = 11.0; h = 6.0 } }
    else if (variant == "letter") { { spec = spec("Letter 8.5 x 11", "Address on Separate Page", #FirstClass, "White 24#", ?"#10 Double Window"); base = 70; retail = 150; w = 8.5; h = 11.0 } }
    else if (variant == "6x18_bifold") { { spec = spec("Self-Mailer 6 x 18", "Bifold Self-Mailer", #MarketingMail, gloss(), null); base = 95; retail = 210; w = 18.0; h = 6.0 } }
    else if (variant == "11x17_trifold") { { spec = spec("Self-Mailer 11 x 17", "Trifold Self-Mailer", #MarketingMail, gloss(), null); base = 95; retail = 210; w = 17.0; h = 11.0 } }
    else if (variant == "8.5x11_perforated") { { spec = spec("Secure Mailer 8.5 x 11", "Pressure Seal Snap Pack", #FirstClass, "White 28#", null); base = 85; retail = 195; w = 8.5; h = 11.0 } }
    else if (variant == "multi_page") { { spec = spec("Booklet", "Saddle Stitched Booklet", #MarketingMail, gloss(), null); base = 160; retail = 360; w = 8.5; h = 11.0 } }
    else { { spec = spec("Postcard 6 x 9", "Double Sided Postcard", #MarketingMail, gloss(), null); base = 57; retail = 135; w = 9.0; h = 6.0 } };
  };

  func emptySide() : CanvasSide {
    { backgroundColor = "#ffffff"; backgroundImageUrl = null; textBlocks = []; logos = []; qrCodes = [] };
  };

  func convertCanvas(old : OldCanvasState, w : Float, h : Float) : CanvasState {
    var i = 0;
    let textBlocks = old.textBlocks.map(func(t : OldTextBlockState) : TextBlockState {
      i += 1;
      { id = t.id; text = t.text; x = t.x; y = t.y; width = t.width; height = t.height; fontSize = t.fontSize; color = t.color; fontFamily = "DM Sans"; fontWeight = 600; align = "left"; zIndex = i };
    });
    let logos = old.logos.map(func(l : OldLogoState) : LogoState {
      i += 1;
      { id = l.id; url = l.url; x = l.x; y = l.y; width = l.width; height = l.height; zIndex = i };
    });
    let qrCodes : [QrCodeState] = switch (old.qrCode) {
      case (?q) { [{ id = q.id; x = q.x; y = q.y; size = q.size; url = "https://ezmailout.com/t/{{recipientId}}"; mode = #DynamicTracking; foreground = "#0f172a"; background = "#ffffff"; caption = null; zIndex = i + 1 }] };
      case null { [] };
    };
    {
      front = { backgroundColor = "#1e293b"; backgroundImageUrl = old.backgroundImageUrl; textBlocks; logos; qrCodes };
      back = emptySide();
      designPpi = 100;
      widthInches = w;
      heightInches = h;
    };
  };

  func convertAudience(a : OldAudienceType) : AudienceType {
    switch (a) { case (#Map) #GeoRadius; case (#CSV) #CsvUpload };
  };

  func statusFromEventType(t : Text) : CampaignStatus {
    let s = t.toLower();
    if (s.contains(#text "local") or s.contains(#text "processed_for") or s.contains(#text "sorted")) { #SortedAtLocalHub }
    else if (s.contains(#text "deliver") or s.contains(#text "returned") or s.contains(#text "re-routed")) { #Delivered }
    else if (s.contains(#text "transit")) { #InTransit }
    else if (s.contains(#text "rendered") or s.contains(#text "production")) { #InProduction }
    else { #Created };
  };

  public func migration(old : OldActor) : NewActor {
    let campaigns = old.campaigns.map<Text, OldCampaignRecord, CampaignRecord>(func(_, rec) {
      let ledger = ledgerFor(rec.product.layoutVariant);
      let canvas : ?CanvasState = switch (rec.canvasState) {
        case (?c) ?convertCanvas(c, ledger.w, ledger.h);
        case null null;
      };
      {
        id = rec.id;
        ownerId = "";
        name = "Campaign " # rec.id;
        product = rec.product;
        printSpec = ledger.spec;
        recipientCount = rec.recipientCount;
        var status = rec.status;
        createdAt = rec.createdAt;
        var updatedAt = rec.createdAt;
        audienceType = convertAudience(rec.audienceType);
        designTemplateId = rec.designTemplateId;
        var canvasState = canvas;
        unitPriceCents = ledger.retail;
        baseCostCents = ledger.base;
        var totalAmountChargedCents = ledger.retail * rec.recipientCount;
        var paymentStatus = #Unpaid;
        var paymentIntentId = null;
        var productionStatus = #Draft;
        var c2mDocumentId = null;
        var c2mAddressListId = null;
        var c2mJobId = null;
        var lastError = null;
        var qrDestinationUrl = null;
        var qrScanCount = 0;
        var returnAddress = null;
        sourcePresetId = null;
      };
    });
    let trackingEvents = List.empty<TrackingEvent>();
    var eventId = 0;
    for (e in old.trackingEvents.values()) {
      trackingEvents.add({
        id = eventId;
        campaignId = e.campaignId;
        status = statusFromEventType(e.eventType);
        eventType = e.eventType;
        timestamp = e.timestamp;
        providerEventId = e.lobEventId;
        source = #Manual;
        detail = ?"Migrated event";
      });
      eventId += 1;
    };
    {
      campaigns;
      campaignRecipients = old.campaignRecipients;
      trackingEvents;
      qrScans = List.empty<QrScanEvent>();
      state = {
        var nextCampaignId = old.state.nextCampaignId;
        var nextPresetId = 1;
        var nextLedgerId = 1;
        var nextRewardId = 1;
        var nextEventId = eventId;
        var nextPaymentId = 1;
      };
      adminKeysState = {
        var click2mailUsername = null;
        var click2mailPassword = null;
        var click2mailEnvironment = #Production;
        var stripeSecretKey = old.adminKeysState.stripeKey;
        var stripePublishableKey = null;
        var resendKey = old.adminKeysState.resendKey;
        var openAiKey = null;
        var webhookSecret = null;
        var outcallProxyUrl = null;
        var sandboxCheckout = false;
        var adminPrincipal = null;
      };
      accounts = Map.empty<Text, UserAccount>();
      referralCodes = Map.empty<Text, Text>();
      savedAudiencePresets = Map.empty<Text, [VerifiedAddress]>();
      presetMeta = Map.empty<Text, AudiencePreset>();
      creditLedger = List.empty<CreditLedgerEntry>();
      payments = Map.empty<Text, PaymentRecord>();
      referralRewards = List.empty<ReferralReward>();
      documentUploads = Map.empty<Text, DocumentUpload>();
    };
  };
};
