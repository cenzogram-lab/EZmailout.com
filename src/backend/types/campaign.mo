module {
  public type ProductType = {
    #Postcard;
    #Letter;
    #SelfMailer;
    #SnapPack;
    #Booklet;
  };

  public type ProductSelection = {
    productType : ProductType;
    layoutVariant : Text;
    colorOption : ?Text;
  };

  public type CampaignStatus = {
    #Created;
    #InProduction;
    #InTransit;
    #SortedAtLocalHub;
    #Delivered;
  };

  public type AudienceType = {
    #Map;
    #CSV;
  };

  public type TextBlockState = {
    id : Text;
    text : Text;
    x : Float;
    y : Float;
    width : Float;
    height : Float;
    fontSize : Float;
    color : Text;
  };

  public type LogoState = {
    id : Text;
    url : Text;
    x : Float;
    y : Float;
    width : Float;
    height : Float;
  };

  public type QrCodeState = {
    id : Text;
    x : Float;
    y : Float;
    size : Float;
    url : Text;
  };

  public type CanvasState = {
    textBlocks : [TextBlockState];
    logos : [LogoState];
    backgroundImageUrl : ?Text;
    qrCode : ?QrCodeState;
  };

  // Internal campaign record with mutable fields for status updates
  public type CampaignRecord = {
    id : Text;
    product : ProductSelection;
    recipientCount : Nat;
    var status : CampaignStatus;
    createdAt : Int;
    trackingId : ?Text;
    audienceType : AudienceType;
    designTemplateId : ?Text;
    var canvasState : ?CanvasState;
  };

  // Shared (immutable) version for API boundary — no var fields
  public type CampaignRecordShared = {
    id : Text;
    product : ProductSelection;
    recipientCount : Nat;
    status : CampaignStatus;
    createdAt : Int;
    trackingId : ?Text;
    audienceType : AudienceType;
    designTemplateId : ?Text;
    canvasState : ?CanvasState;
  };

  public type TrackingEvent = {
    campaignId : Text;
    eventType : Text;
    timestamp : Int;
    lobEventId : Text;
  };
};
