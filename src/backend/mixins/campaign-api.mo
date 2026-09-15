import Types "../types/campaign";
import Common "../types/common";
import CampaignLib "../lib/campaign";
import Map "mo:core/Map";
import List "mo:core/List";
import Array "mo:core/Array";
import Int "mo:core/Int";

mixin (
  campaigns : Map.Map<Text, Types.CampaignRecord>,
  campaignRecipients : Map.Map<Text, [Common.VerifiedAddress]>,
  trackingEvents : List.List<Types.TrackingEvent>,
  state : { var nextCampaignId : Nat },
) {
  /// Create a new campaign, returns the new campaign ID
  public shared func createCampaign(
    product : Types.ProductSelection,
    recipientCount : Nat,
    audienceType : Types.AudienceType,
  ) : async Text {
    let id = CampaignLib.nextId(state);
    let record = CampaignLib.create(id, product, recipientCount, audienceType);
    campaigns.add(id, record);
    id;
  };

  /// Return all campaigns as shared records sorted by createdAt descending
  public query func getCampaigns() : async [Types.CampaignRecordShared] {
    var result = List.empty<Types.CampaignRecordShared>();
    for ((_, r) in campaigns.entries()) {
      result.add(r.toShared());
    };
    let arr = result.toArray();
    arr.sort<Types.CampaignRecordShared>(func(a, b) = Int.compare(b.createdAt, a.createdAt));
  };

  /// Return a single campaign by ID
  public query func getCampaign(id : Text) : async ?Types.CampaignRecordShared {
    switch (campaigns.get(id)) {
      case null { null };
      case (?r) { ?r.toShared() };
    };
  };

  /// Update campaign status from a webhook event; returns false if not found
  public shared func updateCampaignStatus(
    id : Text,
    status : Types.CampaignStatus,
    lobEventId : Text,
    timestamp : Int,
  ) : async Bool {
    let updated = CampaignLib.updateStatus(campaigns, id, status);
    if (updated) {
      let event : Types.TrackingEvent = {
        campaignId = id;
        eventType = debug_show(status);
        timestamp;
        lobEventId;
      };
      trackingEvents.add(event);
    };
    updated;
  };

  /// Return all tracking events for a campaign
  public query func getTrackingEvents(campaignId : Text) : async [Types.TrackingEvent] {
    var result = List.empty<Types.TrackingEvent>();
    for (e in trackingEvents.values()) {
      if (e.campaignId == campaignId) { result.add(e) };
    };
    result.toArray();
  };

  /// Export verified recipient list for a campaign as CSV; returns null if campaign not found
  public query func exportCampaignRecipients(campaignId : Text) : async ?Text {
    CampaignLib.exportAsCsv(campaignId, campaignRecipients);
  };
  /// Persist canvas design state for a campaign; returns false if campaign not found
  public shared func saveCanvasState(
    campaignId : Text,
    canvas : Types.CanvasState,
  ) : async Bool {
    switch (campaigns.get(campaignId)) {
      case null { false };
      case (?record) {
        record.canvasState := ?canvas;
        true;
      };
    };
  };

  /// Retrieve canvas design state for a campaign; returns null if not found
  public query func getCanvasState(campaignId : Text) : async ?Types.CanvasState {
    switch (campaigns.get(campaignId)) {
      case null { null };
      case (?record) { record.canvasState };
    };
  };
};
