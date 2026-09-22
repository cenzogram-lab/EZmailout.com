/// Campaign ledger, canvas persistence, tracking timeline and dynamic QR links.
import Types "../types/campaign";
import Common "../types/common";
import CampaignLib "../lib/campaign";
import AddressLib "../lib/address";
import PricingLib "../lib/pricing";
import AdminLib "../lib/admin";
import Map "mo:core/Map";
import List "mo:core/List";
import Set "mo:core/Set";
import Array "mo:core/Array";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";

mixin (
  campaigns : Map.Map<Text, Types.CampaignRecord>,
  campaignRecipients : Map.Map<Text, [Common.VerifiedAddress]>,
  trackingEvents : List.List<Types.TrackingEvent>,
  qrScans : List.List<Types.QrScanEvent>,
  state : Common.Counters,
  adminKeysState : Common.AdminState,
) {
  transient let maxRecipients : Nat = 5_000;

  private func canAccess(record : Types.CampaignRecord, caller : Principal) : Bool {
    record.ownerId == caller.toText() or record.ownerId == "" or AdminLib.isAdmin(adminKeysState, caller);
  };

  /// The retail pricing ledger (base cost, retail price, margin, print spec).
  public query func getPricingLedger() : async [Types.PricingRow] {
    PricingLib.rows();
  };

  /// Create a campaign draft priced from the ledger; recipients are stored verbatim (sanitized).
  public shared ({ caller }) func createCampaign(input : Types.CreateCampaignInput) : async Types.CreateCampaignResult {
    let fail = func(msg : Text) : Types.CreateCampaignResult {
      { ok = false; error = ?msg; campaignId = null; unitPriceCents = null; totalCents = null };
    };
    let row = switch (PricingLib.find(input.product.layoutVariant)) {
      case (?r) r;
      case null { return fail("Unknown layout variant: " # input.product.layoutVariant) };
    };
    let printSpec = switch (PricingLib.printSpecFor(input.product)) {
      case (?s) s;
      case null { return fail("Unknown layout variant: " # input.product.layoutVariant) };
    };
    if (caller.isAnonymous()) { return fail("Sign in with Internet Identity before creating a campaign") };
    if (input.recipients.size() > maxRecipients) { return fail("A campaign may include at most 5,000 recipients") };
    let recipients = input.recipients.map(AddressLib.sanitizeVerified);
    // Billing and Click2Mail dispatch both key off the stored list, so a campaign
    // is priced for exactly the addresses supplied — never an estimated count.
    let count : Nat = recipients.size();
    if (count == 0) { return fail("Add at least one verified recipient address before creating a campaign") };
    let id = CampaignLib.nextId(state);
    let record = CampaignLib.create(id, caller.toText(), input, printSpec, row.retailPriceCents, row.baseCostCents, count);
    campaigns.add(id, record);
    campaignRecipients.add(id, recipients);
    CampaignLib.appendEvent(trackingEvents, state, id, #Created, "campaign.created", id, #System, ?"Campaign draft created");
    { ok = true; error = null; campaignId = ?id; unitPriceCents = ?row.retailPriceCents; totalCents = ?record.totalAmountChargedCents };
  };

  /// Campaigns visible to the caller (own + legacy), newest first.
  public shared query ({ caller }) func getCampaigns() : async [Types.CampaignRecordShared] {
    let result = List.empty<Types.CampaignRecordShared>();
    for ((_, r) in campaigns.entries()) {
      if (canAccess(r, caller)) { result.add(r.toShared()) };
    };
    result.toArray().sort<Types.CampaignRecordShared>(func(a, b) = Int.compare(b.createdAt, a.createdAt));
  };

  public query func getCampaign(id : Text) : async ?Types.CampaignRecordShared {
    switch (campaigns.get(id)) {
      case null null;
      case (?r) ?r.toShared();
    };
  };

  public query func getCampaignRecipients(campaignId : Text) : async [Common.VerifiedAddress] {
    switch (campaignRecipients.get(campaignId)) {
      case null [];
      case (?addrs) addrs;
    };
  };

  /// CSV export with recipient ids and tracking URLs.
  public query func exportCampaignRecipients(campaignId : Text) : async ?Text {
    CampaignLib.exportAsCsv(campaignId, campaignRecipients, AdminLib.trackingBaseUrl);
  };

  public shared ({ caller }) func saveCanvasState(campaignId : Text, canvas : Types.CanvasState) : async Bool {
    switch (campaigns.get(campaignId)) {
      case null false;
      case (?record) {
        if (not canAccess(record, caller)) { return false };
        record.canvasState := ?canvas;
        record.updatedAt := Time.now();
        true;
      };
    };
  };

  public query func getCanvasState(campaignId : Text) : async ?Types.CanvasState {
    switch (campaigns.get(campaignId)) {
      case null null;
      case (?record) record.canvasState;
    };
  };

  /// Admin-only manual status override (monotonic).
  public shared ({ caller }) func updateCampaignStatus(id : Text, status : Types.CampaignStatus, providerEventId : Text, timestamp : Int) : async Bool {
    if (not AdminLib.isAdmin(adminKeysState, caller)) { return false };
    switch (campaigns.get(id)) {
      case null false;
      case (?record) {
        if (CampaignLib.advanceStatus(record, status)) {
          let evtId = state.nextEventId;
          state.nextEventId += 1;
          trackingEvents.add({
            id = evtId;
            campaignId = id;
            status;
            eventType = "manual." # CampaignLib.stageName(status);
            timestamp = if (timestamp > 0) timestamp else Time.now();
            providerEventId;
            source = #Manual;
            detail = ?"Status set by admin";
          });
        };
        true;
      };
    };
  };

  public query func getTrackingEvents(campaignId : Text) : async [Types.TrackingEvent] {
    let result = List.empty<Types.TrackingEvent>();
    for (e in trackingEvents.values()) {
      if (e.campaignId == campaignId) { result.add(e) };
    };
    result.toArray();
  };

  /// Resolves `/t/{code}` and `/track/{code}` links, recording the scan.
  public shared func resolveTrackingLink(code : Text, userAgent : ?Text) : async Types.TrackingResolveResult {
    let trimmed = AddressLib.sanitizeText(code);
    let campaignId = AddressLib.campaignIdOf(trimmed);
    switch (campaigns.get(campaignId)) {
      case null { { ok = false; destinationUrl = null; campaignId = null; recipientId = null } };
      case (?record) {
        record.qrScanCount += 1;
        record.updatedAt := Time.now();
        qrScans.add({ campaignId; recipientId = trimmed; timestamp = Time.now(); userAgent });
        let destination = switch (record.qrDestinationUrl) {
          case (?d) { if (d == "") "https://ezmailout.com" else d };
          case null "https://ezmailout.com";
        };
        { ok = true; destinationUrl = ?destination; campaignId = ?campaignId; recipientId = ?trimmed };
      };
    };
  };

  public query func getQrScanStats(campaignId : Text) : async Types.QrScanStats {
    let unique = Set.empty<Text>();
    let recent = List.empty<Types.QrScanEvent>();
    var total = 0;
    for (scan in qrScans.reverseValues()) {
      if (scan.campaignId == campaignId) {
        total += 1;
        unique.add(scan.recipientId);
        if (recent.size() < 25) { recent.add(scan) };
      };
    };
    { totalScans = total; uniqueRecipients = unique.size(); recentScans = recent.toArray() };
  };
};
