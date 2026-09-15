import Types "../types/campaign";
import AddressLib "../lib/address";
import CampaignLib "../lib/campaign";
import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";

mixin (
  campaigns : Map.Map<Text, Types.CampaignRecord>,
  trackingEvents : List.List<Types.TrackingEvent>,
) {
  /// Accept a raw Lob webhook payload (JSON as Text), parse it, and update campaign status
  public shared func handleLobWebhook(payload : Text) : async Bool {
    switch (AddressLib.parseLobWebhook(payload)) {
      case null { false };
      case (?(campaignId, eventType, lobEventId, _)) {
        switch (AddressLib.lobEventToCampaignStatus(eventType)) {
          case null { false };
          case (?status) {
            let updated = CampaignLib.updateStatus(campaigns, campaignId, status);
            if (updated) {
              let event : Types.TrackingEvent = {
                campaignId;
                eventType;
                timestamp = Time.now();
                lobEventId;
              };
              trackingEvents.add(event);
            };
            updated;
          };
        };
      };
    };
  };
};
