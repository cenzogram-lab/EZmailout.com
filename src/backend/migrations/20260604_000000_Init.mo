import Map "mo:core/Map";
import List "mo:core/List";

module {
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

  type CampaignRecord = {
    id : Text;
    product : ProductSelection;
    recipientCount : Nat;
    var status : CampaignStatus;
    createdAt : Int;
    trackingId : ?Text;
    audienceType : AudienceType;
    designTemplateId : ?Text;
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

  type OldActor = {};

  type NewActor = {
    campaigns : Map.Map<Text, CampaignRecord>;
    campaignRecipients : Map.Map<Text, [VerifiedAddress]>;
    trackingEvents : List.List<TrackingEvent>;
    state : { var nextCampaignId : Nat };
    adminKeysState : { var stripeKey : ?Text; var lobKey : ?Text; var resendKey : ?Text };
  };

  public func migration(_ : OldActor) : NewActor {
    {
      campaigns = Map.empty<Text, CampaignRecord>();
      campaignRecipients = Map.empty<Text, [VerifiedAddress]>();
      trackingEvents = List.empty<TrackingEvent>();
      state = { var nextCampaignId = 0 };
      adminKeysState = { var stripeKey = null; var lobKey = null; var resendKey = null };
    };
  };
};
