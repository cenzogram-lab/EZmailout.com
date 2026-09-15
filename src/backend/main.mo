import Types "types/campaign";
import Common "types/common";
import CampaignApi "mixins/campaign-api";
import AdminApi "mixins/admin-api";
import WebhookApi "mixins/webhook-api";
import Map "mo:core/Map";
import List "mo:core/List";

actor {
  // Stable state — initialized by migration chain (no inline initializers)
  let campaigns : Map.Map<Text, Types.CampaignRecord>;
  let campaignRecipients : Map.Map<Text, [Common.VerifiedAddress]>;
  let trackingEvents : List.List<Types.TrackingEvent>;
  let state : { var nextCampaignId : Nat };
  let adminKeysState : { var stripeKey : ?Text; var lobKey : ?Text; var resendKey : ?Text };

  // Mixin composition — all public endpoints delegated to mixins
  include CampaignApi(campaigns, campaignRecipients, trackingEvents, state);
  include AdminApi(adminKeysState);
  include WebhookApi(campaigns, trackingEvents);
};

