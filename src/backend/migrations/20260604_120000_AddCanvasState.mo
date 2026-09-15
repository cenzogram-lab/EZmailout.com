import Map "mo:core/Map";
import List "mo:core/List";

module {
  // ---- Inlined types (no project imports allowed) ----

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

  type AudienceType = { #Map; #CSV };

  // Old CampaignRecord — no canvasState field
  type OldCampaignRecord = {
    id : Text;
    product : ProductSelection;
    recipientCount : Nat;
    var status : CampaignStatus;
    createdAt : Int;
    trackingId : ?Text;
    audienceType : AudienceType;
    designTemplateId : ?Text;
  };

  // New sub-types for canvasState
  type TextBlockState = {
    id : Text;
    text : Text;
    x : Float;
    y : Float;
    width : Float;
    height : Float;
    fontSize : Float;
    color : Text;
  };

  type LogoState = {
    id : Text;
    url : Text;
    x : Float;
    y : Float;
    width : Float;
    height : Float;
  };

  type QrCodeState = {
    id : Text;
    x : Float;
    y : Float;
    size : Float;
    url : Text;
  };

  type CanvasState = {
    textBlocks : [TextBlockState];
    logos : [LogoState];
    backgroundImageUrl : ?Text;
    qrCode : ?QrCodeState;
  };

  // New CampaignRecord — adds var canvasState
  type NewCampaignRecord = {
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

  type VerifiedAddress = {
    name : Text;
    address_line1 : Text;
    address_line2 : ?Text;
    city : Text;
    state : Text;
    zip_code : Text;
    zip_plus4 : ?Text;
  };

  type TrackingEvent = {
    campaignId : Text;
    eventType : Text;
    timestamp : Int;
    lobEventId : Text;
  };

  // OldActor = NewActor of 20260604_000000_Init.mo
  type OldActor = {
    campaigns : Map.Map<Text, OldCampaignRecord>;
    campaignRecipients : Map.Map<Text, [VerifiedAddress]>;
    trackingEvents : List.List<TrackingEvent>;
    state : { var nextCampaignId : Nat };
    adminKeysState : { var stripeKey : ?Text; var lobKey : ?Text; var resendKey : ?Text };
  };

  type NewActor = {
    campaigns : Map.Map<Text, NewCampaignRecord>;
    campaignRecipients : Map.Map<Text, [VerifiedAddress]>;
    trackingEvents : List.List<TrackingEvent>;
    state : { var nextCampaignId : Nat };
    adminKeysState : { var stripeKey : ?Text; var lobKey : ?Text; var resendKey : ?Text };
  };

  public func migration(old : OldActor) : NewActor {
    // Map each existing CampaignRecord to the new shape, defaulting canvasState to null
    let campaigns = old.campaigns.map<Text, OldCampaignRecord, NewCampaignRecord>(
      func(_, rec) {
        {
          id = rec.id;
          product = rec.product;
          recipientCount = rec.recipientCount;
          var status = rec.status;
          createdAt = rec.createdAt;
          trackingId = rec.trackingId;
          audienceType = rec.audienceType;
          designTemplateId = rec.designTemplateId;
          var canvasState = null : ?CanvasState;
        }
      }
    );
    {
      campaigns;
      campaignRecipients = old.campaignRecipients;
      trackingEvents = old.trackingEvents;
      state = old.state;
      adminKeysState = old.adminKeysState;
    };
  };
};
