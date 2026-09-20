/// Campaign record helpers: shared projection, creation, monotonic status,
/// IMb keyword mapping and CSV export.
import Types "../types/campaign";
import Common "../types/common";
import AddressLib "address";
import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Text "mo:core/Text";

module {
  public func toShared(self : Types.CampaignRecord) : Types.CampaignRecordShared {
    {
      id = self.id;
      ownerId = self.ownerId;
      name = self.name;
      product = self.product;
      printSpec = self.printSpec;
      recipientCount = self.recipientCount;
      status = self.status;
      createdAt = self.createdAt;
      updatedAt = self.updatedAt;
      audienceType = self.audienceType;
      designTemplateId = self.designTemplateId;
      canvasState = self.canvasState;
      unitPriceCents = self.unitPriceCents;
      baseCostCents = self.baseCostCents;
      totalAmountChargedCents = self.totalAmountChargedCents;
      paymentStatus = self.paymentStatus;
      paymentIntentId = self.paymentIntentId;
      productionStatus = self.productionStatus;
      c2mDocumentId = self.c2mDocumentId;
      c2mAddressListId = self.c2mAddressListId;
      c2mJobId = self.c2mJobId;
      lastError = self.lastError;
      qrDestinationUrl = self.qrDestinationUrl;
      qrScanCount = self.qrScanCount;
      returnAddress = self.returnAddress;
      sourcePresetId = self.sourcePresetId;
    };
  };

  public func create(
    id : Text,
    ownerId : Text,
    input : Types.CreateCampaignInput,
    printSpec : Types.PrintSpec,
    unitPriceCents : Nat,
    baseCostCents : Nat,
    recipientCount : Nat,
  ) : Types.CampaignRecord {
    let now = Time.now();
    {
      id;
      ownerId;
      name = if (AddressLib.sanitizeText(input.name) == "") { "Campaign " # id } else { AddressLib.sanitizeText(input.name) };
      product = input.product;
      printSpec;
      recipientCount;
      var status = #Created;
      createdAt = now;
      var updatedAt = now;
      audienceType = input.audienceType;
      designTemplateId = input.designTemplateId;
      var canvasState = input.canvasState;
      unitPriceCents;
      baseCostCents;
      var totalAmountChargedCents = unitPriceCents * recipientCount;
      var paymentStatus = #Unpaid;
      var paymentIntentId = null;
      var productionStatus = #AwaitingPayment;
      var c2mDocumentId = null;
      var c2mAddressListId = null;
      var c2mJobId = null;
      var lastError = null;
      var qrDestinationUrl = input.qrDestinationUrl;
      var qrScanCount = 0;
      var returnAddress = input.returnAddress;
      sourcePresetId = input.sourcePresetId;
    };
  };

  public func stageIndex(status : Types.CampaignStatus) : Nat {
    switch (status) {
      case (#Created) 0;
      case (#InProduction) 1;
      case (#InTransit) 2;
      case (#SortedAtLocalHub) 3;
      case (#Delivered) 4;
    };
  };

  public func stageName(status : Types.CampaignStatus) : Text {
    switch (status) {
      case (#Created) "created";
      case (#InProduction) "in_production";
      case (#InTransit) "in_transit";
      case (#SortedAtLocalHub) "sorted_at_local_hub";
      case (#Delivered) "delivered";
    };
  };

  public func stageFromIndex(i : Nat) : Types.CampaignStatus {
    if (i >= 4) { #Delivered } else if (i == 3) { #SortedAtLocalHub } else if (i == 2) { #InTransit } else if (i == 1) { #InProduction } else { #Created };
  };

  /// Advances a campaign's status monotonically. Returns true when the status changed.
  public func advanceStatus(record : Types.CampaignRecord, status : Types.CampaignStatus) : Bool {
    if (stageIndex(status) > stageIndex(record.status)) {
      record.status := status;
      record.updatedAt := Time.now();
      true;
    } else { false };
  };

  /// Maps free-form IMb / provider event text onto the 5-stage timeline.
  public func statusFromText(raw : Text) : ?Types.CampaignStatus {
    let t = raw.toLower();
    let has = func(p : Text) : Bool { t.contains(#text p) };
    if (has("out for") or has("sorted") or has("local") or has("destination") or has("arrived") or has("processed_for") or has("processed for")) { return ?#SortedAtLocalHub };
    if (has("deliver")) { return ?#Delivered };
    if (has("returned") or has("re-routed") or has("rerouted")) { return ?#Delivered };
    if (has("transit") or has("mailed") or has("accepted") or has("en route") or has("enroute") or has("usps") or has("in_transit") or has("processed")) { return ?#InTransit };
    if (has("production") or has("print") or has("processing") or has("submitted") or has("rendered") or has("imposition")) { return ?#InProduction };
    if (has("created") or has("received") or has("queued") or has("pending")) { return ?#Created };
    null;
  };

  public func nextId(state : { var nextCampaignId : Nat }) : Text {
    let id = state.nextCampaignId;
    state.nextCampaignId += 1;
    "cmp_" # id.toText();
  };

  /// Export verified recipients as CSV with recipient ids and tracking URLs.
  public func exportAsCsv(
    campaignId : Text,
    recipients : Map.Map<Text, [Common.VerifiedAddress]>,
    trackingBase : Text,
  ) : ?Text {
    switch (recipients.get(campaignId)) {
      case null { null };
      case (?addrs) {
        let header = "name,address_line1,address_line2,city,state,zip_code,zip_plus4,recipient_id,tracking_url";
        let rows = List.empty<Text>();
        rows.add(header);
        var idx = 0;
        for (addr in addrs.vals()) {
          let line2 = switch (addr.address_line2) { case (?v) v; case null "" };
          let zipPlus4 = switch (addr.zip_plus4) { case (?v) v; case null "" };
          let rid = AddressLib.recipientId(campaignId, idx);
          rows.add(
            csvEscape(addr.name) # "," # csvEscape(addr.address_line1) # "," # csvEscape(line2) # "," #
            csvEscape(addr.city) # "," # csvEscape(addr.state) # "," # csvEscape(addr.zip_code) # "," #
            csvEscape(zipPlus4) # "," # rid # "," # trackingBase # rid
          );
          idx += 1;
        };
        ?rows.values().join("\n");
      };
    };
  };

  private func csvEscape(s : Text) : Text {
    if (s.contains(#char ',') or s.contains(#char '\22') or s.contains(#char '\n')) {
      "\"" # s.replace(#char '\22', "\"\"") # "\"";
    } else { s };
  };

  /// Appends a tracking event with a fresh sequential id.
  public func appendEvent(
    trackingEvents : List.List<Types.TrackingEvent>,
    state : { var nextEventId : Nat },
    campaignId : Text,
    status : Types.CampaignStatus,
    eventType : Text,
    providerEventId : Text,
    source : Types.TrackingSource,
    detail : ?Text,
  ) {
    let id = state.nextEventId;
    state.nextEventId += 1;
    trackingEvents.add({ id; campaignId; status; eventType; timestamp = Time.now(); providerEventId; source; detail });
  };
};
