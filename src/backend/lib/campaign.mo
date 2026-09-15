import Types "../types/campaign";
import Common "../types/common";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Text "mo:core/Text";

module {
  /// Convert internal mutable CampaignRecord to shared form for API boundary
  public func toShared(self : Types.CampaignRecord) : Types.CampaignRecordShared {
    {
      id = self.id;
      product = self.product;
      recipientCount = self.recipientCount;
      status = self.status;
      createdAt = self.createdAt;
      trackingId = self.trackingId;
      audienceType = self.audienceType;
      designTemplateId = self.designTemplateId;
      canvasState = self.canvasState;
    };
  };

  /// Create a new campaign record with #Created status
  public func create(
    id : Text,
    product : Types.ProductSelection,
    recipientCount : Nat,
    audienceType : Types.AudienceType,
  ) : Types.CampaignRecord {
    {
      id;
      product;
      recipientCount;
      var status = #Created;
      createdAt = Time.now();
      trackingId = null;
      audienceType;
      designTemplateId = null;
      var canvasState = null;
    };
  };

  /// Update campaign status, returns false if campaign not found
  public func updateStatus(
    campaigns : Map.Map<Text, Types.CampaignRecord>,
    id : Text,
    status : Types.CampaignStatus,
  ) : Bool {
    switch (campaigns.get(id)) {
      case null { false };
      case (?record) {
        record.status := status;
        true;
      };
    };
  };

  /// Generate next campaign ID and increment counter
  public func nextId(state : { var nextCampaignId : Nat }) : Text {
    let id = state.nextCampaignId;
    state.nextCampaignId += 1;
    "cmp_" # id.toText();
  };

  /// Export campaign recipients as CSV text
  public func exportAsCsv(
    campaignId : Text,
    recipients : Map.Map<Text, [Common.VerifiedAddress]>,
  ) : ?Text {
    switch (recipients.get(campaignId)) {
      case null { null };
      case (?addrs) {
        let header = "name,address_line1,address_line2,city,state,zip_code,zip_plus4,tracking_id";
        var rows = header;
        var idx = 0;
        for (addr in addrs.vals()) {
          let line2 = switch (addr.address_line2) { case (?v) v; case null "" };
          let zipPlus4 = switch (addr.zip_plus4) { case (?v) v; case null "" };
          let trackingId = campaignId # "_" # idx.toText();
          rows #= "\n" # csvEscape(addr.name) # "," #
            csvEscape(addr.address_line1) # "," #
            csvEscape(line2) # "," #
            csvEscape(addr.city) # "," #
            csvEscape(addr.state) # "," #
            csvEscape(addr.zip_code) # "," #
            csvEscape(zipPlus4) # "," #
            trackingId;
          idx += 1;
        };
        ?rows;
      };
    };
  };

  private func csvEscape(s : Text) : Text {
    // Wrap in quotes if contains comma, newline, or quote
    if (s.contains(#char ',') or s.contains(#char '\22') or s.contains(#char '\n')) {
      // Replace " with ""
      let escaped = s.replace(#char '\22', "\"\"");
      "\"" # escaped # "\"";
    } else {
      s;
    };
  };
};
