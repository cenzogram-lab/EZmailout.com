/// Adds an optional `rotation` (clockwise degrees about the layer's centre)
/// to every stored text block, image or shape and QR code, so the design a
/// campaign keeps (its campaign page) shows layers turned as they were
/// designed and printed. The canvas is a mutable field of every campaign
/// record in a stable `Map`, which is invariant, so every campaign is re-typed;
/// every existing layer gets `rotation = null` (unturned, as it was stored).
/// Every other stable variable is carried over unchanged.
import Map "mo:core/Map";

module {
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

  type ProductSelection = { productType : ProductType; layoutVariant : Text; colorOption : ?Text };

  type CampaignStatus = { #Created; #InProduction; #InTransit; #SortedAtLocalHub; #Delivered; #Undeliverable; #Returned };

  type AudienceType = { #GeoRadius; #CsvUpload; #SavedPreset };

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

  type PaymentStatus = { #Unpaid; #Pending; #Paid; #Waived; #Refunded };

  type ProductionStatus = {
    #Draft;
    #AwaitingPayment;
    #ReadyToDispatch;
    #Processing;
    #DocumentUploaded;
    #AddressListReady;
    #JobCreated;
    #Submitted;
    #Failed;
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

  type QrMode = { #StaticUrl; #DynamicTracking };

  // ─── Before: layers without a turn ───

  type OldTextBlockState = {
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

  type OldLogoState = {
    id : Text;
    url : Text;
    x : Float;
    y : Float;
    width : Float;
    height : Float;
    zIndex : Nat;
  };

  type OldQrCodeState = {
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

  type OldCanvasSide = {
    backgroundColor : Text;
    backgroundImageUrl : ?Text;
    textBlocks : [OldTextBlockState];
    logos : [OldLogoState];
    qrCodes : [OldQrCodeState];
  };

  type OldCanvasState = {
    front : OldCanvasSide;
    back : OldCanvasSide;
    designPpi : Nat;
    widthInches : Float;
    heightInches : Float;
  };

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
    var canvasState : ?OldCanvasState;
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

  // ─── After: every layer may carry a turn ───

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
    rotation : ?Float;
  };

  type LogoState = {
    id : Text;
    url : Text;
    x : Float;
    y : Float;
    width : Float;
    height : Float;
    zIndex : Nat;
    rotation : ?Float;
  };

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
    rotation : ?Float;
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

  func text(t : OldTextBlockState) : TextBlockState {
    {
      id = t.id;
      text = t.text;
      x = t.x;
      y = t.y;
      width = t.width;
      height = t.height;
      fontSize = t.fontSize;
      color = t.color;
      fontFamily = t.fontFamily;
      fontWeight = t.fontWeight;
      align = t.align;
      zIndex = t.zIndex;
      rotation = null;
    };
  };

  func logo(l : OldLogoState) : LogoState {
    { id = l.id; url = l.url; x = l.x; y = l.y; width = l.width; height = l.height; zIndex = l.zIndex; rotation = null };
  };

  func qr(q : OldQrCodeState) : QrCodeState {
    {
      id = q.id;
      x = q.x;
      y = q.y;
      size = q.size;
      url = q.url;
      mode = q.mode;
      foreground = q.foreground;
      background = q.background;
      caption = q.caption;
      zIndex = q.zIndex;
      rotation = null;
    };
  };

  func side(s : OldCanvasSide) : CanvasSide {
    {
      backgroundColor = s.backgroundColor;
      backgroundImageUrl = s.backgroundImageUrl;
      textBlocks = s.textBlocks.map(text);
      logos = s.logos.map(logo);
      qrCodes = s.qrCodes.map(qr);
    };
  };

  func canvas(c : OldCanvasState) : CanvasState {
    { front = side(c.front); back = side(c.back); designPpi = c.designPpi; widthInches = c.widthInches; heightInches = c.heightInches };
  };

  func campaign(rec : OldCampaignRecord) : CampaignRecord {
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
      var canvasState = switch (rec.canvasState) { case (?c) ?canvas(c); case null null };
      unitPriceCents = rec.unitPriceCents;
      baseCostCents = rec.baseCostCents;
      var totalAmountChargedCents = rec.totalAmountChargedCents;
      var paymentStatus = rec.paymentStatus;
      var paymentIntentId = rec.paymentIntentId;
      var productionStatus = rec.productionStatus;
      var printDocumentId = rec.printDocumentId;
      var printAddressListId = rec.printAddressListId;
      var printJobId = rec.printJobId;
      var lastError = rec.lastError;
      var qrDestinationUrl = rec.qrDestinationUrl;
      var qrScanCount = rec.qrScanCount;
      var returnAddress = rec.returnAddress;
      sourcePresetId = rec.sourcePresetId;
    };
  };

  public func migration(old : { campaigns : Map.Map<Text, OldCampaignRecord> }) : { campaigns : Map.Map<Text, CampaignRecord> } {
    { campaigns = old.campaigns.map<Text, OldCampaignRecord, CampaignRecord>(func(_, rec) = campaign(rec)) };
  };
};
