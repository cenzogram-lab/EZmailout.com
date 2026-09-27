/// Campaign ledger, canvas persistence, tracking timeline and dynamic QR links.
import Types "../types/campaign";
import Common "../types/common";
import Account "../types/account";
import CampaignLib "../lib/campaign";
import AddressLib "../lib/address";
import PricingLib "../lib/pricing";
import AdminLib "../lib/admin";
import Limits "../lib/limits";
import Inputs "../lib/inputs";
import Map "mo:core/Map";
import List "mo:core/List";
import Set "mo:core/Set";
import Array "mo:core/Array";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

mixin (
  campaigns : Map.Map<Text, Types.CampaignRecord>,
  campaignRecipients : Map.Map<Text, [Common.VerifiedAddress]>,
  trackingEvents : List.List<Types.TrackingEvent>,
  qrScans : List.List<Types.QrScanEvent>,
  state : Common.Counters,
  adminKeysState : Common.AdminState,
  documentUploads : Map.Map<Text, Types.DocumentUpload>,
  payments : Map.Map<Text, Account.PaymentRecord>,
) {
  transient let maxRecipients : Nat = 5_000;

  // Drafts cost nothing to create, and identities are free to mint, so what
  // one identity can stage before paying is bounded.
  transient let maxUnpaidDrafts : Nat = 5;
  transient let maxUnpaidRecipients : Nat = 10_000;
  /// A draft with a checkout opened this recently may still be paid.
  transient let openCheckoutNs : Int = 86_400_000_000_000;

  // QR scans arrive from anyone, signed out. Only paid campaigns log them,
  // each campaign keeps its newest `maxStoredScans` (FIFO), and the free-text
  // fields are clipped. `qrScanCount` still counts every scan.
  transient let maxStoredScans : Nat = 500;
  transient let scanTrimBatch : Nat = 50;
  transient let maxScanCodeChars : Nat = 64;
  transient let maxUserAgentChars : Nat = 128;
  /// Stored scans per campaign. Rebuilt from `qrScans` on first use after an
  /// upgrade, so it never disagrees with the stable log.
  transient var storedScans : ?Map.Map<Text, Nat> = null;

  private func isPaid(record : Types.CampaignRecord) : Bool {
    record.paymentStatus == #Paid or record.paymentStatus == #Waived;
  };

  /// The owner's unpaid drafts: how many, and how many recipients they hold.
  private func unpaidDrafts(owner : Text) : (Nat, Nat) {
    var drafts = 0;
    var recipients = 0;
    for ((_, r) in campaigns.entries()) {
      if (r.ownerId == owner and r.paymentStatus == #Unpaid) {
        drafts += 1;
        recipients += r.recipientCount;
      };
    };
    (drafts, recipients);
  };

  /// Why this owner cannot stage `adding` more recipients in a new draft, or
  /// null when their own caps have room. The canister-wide cap never
  /// refuses while a draft can be evicted (`makeRoomForDraft`).
  private func ownerDraftRefusal(owner : Text, adding : Nat) : ?Text {
    let (drafts, recipients) = unpaidDrafts(owner);
    if (drafts >= maxUnpaidDrafts) {
      return ?("You have " # drafts.toText() # " unpaid drafts. Pay for one or delete a draft from Campaigns before starting another.");
    };
    if (recipients + adding > maxUnpaidRecipients) {
      return ?"Unpaid drafts may hold at most 10,000 recipients in total. Pay for or delete a draft before adding this list.";
    };
    null;
  };

  private func unpaidDraftTotal() : Nat {
    var total = 0;
    for ((_, r) in campaigns.entries()) { if (r.paymentStatus == #Unpaid) { total += 1 } };
    total;
  };

  /// Drafts an eviction must never touch: one with a confirmed payment, or
  /// with a live checkout opened in the last 24 hours that may still
  /// complete (the same window `deleteCampaignDraft` respects).
  private func evictionProtected(now : Int) : Set.Set<Text> {
    let out = Set.empty<Text>();
    for ((_, p) in payments.entries()) {
      switch (p.purpose, p.reference) {
        case (#CampaignOrder, ?id) {
          let confirmed = p.state == #Succeeded or p.state == #Waived;
          let openCheckout = p.state == #Created and not p.sandbox and now - p.createdAt < openCheckoutNs;
          if (confirmed or openCheckout) { out.add(id) };
        };
        case _ {};
      };
    };
    out;
  };

  /// Makes room under the canister-wide cap for one new draft: expired
  /// drafts go first, then the oldest idle ones (`CampaignLib.oldestIdleDraft`),
  /// so a full canister never turns away a new draft while an unprotected
  /// draft could make way. False only when nothing may be evicted.
  private func makeRoomForDraft(now : Int) : Bool {
    if (unpaidDraftTotal() < CampaignLib.maxUnpaidDraftsGlobal) { return true };
    ignore pruneExpiredDrafts(now);
    let checkouts = checkoutActivity();
    let isProtected = evictionProtected(now);
    while (unpaidDraftTotal() >= CampaignLib.maxUnpaidDraftsGlobal) {
      switch (CampaignLib.oldestIdleDraft(campaigns, func(id : Text) : Int = lastDraftActivity(id, checkouts), func(id : Text) : Bool = isProtected.contains(id))) {
        case (?id) { removeDrafts([id]) };
        case null { return false };
      };
    };
    true;
  };

  /// The newest checkout opened for each campaign.
  private func checkoutActivity() : Map.Map<Text, Int> {
    let latest = Map.empty<Text, Int>();
    for ((_, p) in payments.entries()) {
      switch (p.purpose, p.reference) {
        case (#CampaignOrder, ?id) {
          switch (latest.get(id)) {
            case (?t) { if (p.createdAt > t) { latest.add(id, p.createdAt) } };
            case null { latest.add(id, p.createdAt) };
          };
        };
        case _ {};
      };
    };
    latest;
  };

  /// A campaign's latest activity outside its record: a staged print file
  /// or a checkout opened for it.
  private func lastDraftActivity(id : Text, checkouts : Map.Map<Text, Int>) : Int {
    let checkout : Int = switch (checkouts.get(id)) { case (?t) t; case null 0 };
    switch (documentUploads.get(id)) {
      case (?u) { if (u.createdAt > checkout) u.createdAt else checkout };
      case null checkout;
    };
  };

  /// When `record` expires if it stays unpaid (`CampaignLib.draftExpiresAt`).
  private func draftExpiry(record : Types.CampaignRecord, checkouts : Map.Map<Text, Int>) : ?Int {
    CampaignLib.draftExpiresAt(record, lastDraftActivity(record.id, checkouts));
  };

  /// Removes drafts with their recipients, staged print files and timeline.
  private func removeDrafts(ids : [Text]) {
    if (ids.size() == 0) { return };
    let gone = Set.empty<Text>();
    for (id in ids.vals()) {
      campaigns.remove(id);
      campaignRecipients.remove(id);
      documentUploads.remove(id);
      gone.add(id);
    };
    trackingEvents.retain(func(e : Types.TrackingEvent) : Bool { not gone.contains(e.campaignId) });
  };

  /// Removes every unpaid draft whose `draftExpiry` has passed and returns
  /// how many. Orders (paid, waived, or sent to Click2Mail) never expire.
  /// Runs from the 6-hourly timer in `main.mo`, and from `createCampaign`
  /// before a draft cap refuses.
  private func pruneExpiredDrafts(now : Int) : Nat {
    let checkouts = checkoutActivity();
    let expired = CampaignLib.expiredDrafts(campaigns, func(id : Text) : Int = lastDraftActivity(id, checkouts), now);
    removeDrafts(expired);
    expired.size();
  };

  private func scanKey(s : Types.QrScanEvent) : Text { s.campaignId };

  /// Appends a scan, keeping each campaign's newest `maxStoredScans`.
  private func logScan(scan : Types.QrScanEvent) {
    let counts = switch (storedScans) {
      case (?c) c;
      case null { let c = Limits.countByKey(qrScans, scanKey); storedScans := ?c; c };
    };
    Limits.appendCapped(qrScans, counts, scan, scanKey, maxStoredScans, scanTrimBatch);
  };

  /// Owner or admin. Unowned legacy records are admin-only.
  private func canAccess(record : Types.CampaignRecord, caller : Principal) : Bool {
    CampaignLib.isOwnedBy(record, caller) or AdminLib.isAdmin(adminKeysState, caller);
  };

  /// The campaign when `caller` may read it; traps otherwise, with the same
  /// message for an unknown id as for a foreign one.
  private func requireAccess(id : Text, caller : Principal) : Types.CampaignRecord {
    switch (campaigns.get(id)) {
      case (?record) { if (canAccess(record, caller)) { return record } };
      case null {};
    };
    Runtime.trap(CampaignLib.accessDenied);
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
    let printSpec = switch (PricingLib.printSpecFor(input.product, input.mailClass)) {
      case (?s) s;
      case null { return fail("Unknown layout variant: " # input.product.layoutVariant) };
    };
    if (caller.isAnonymous()) { return fail("Sign in with Internet Identity before creating a campaign") };
    if (input.recipients.size() > maxRecipients) { return fail("A campaign may include at most 5,000 recipients") };
    // Drafts past their 14 days are pruned before an owner's cap refuses, so
    // an expired draft never holds a slot the timer has not freed yet.
    let owner = caller.toText();
    let refusal = switch (ownerDraftRefusal(owner, input.recipients.size())) {
      case (?_) { ignore pruneExpiredDrafts(Time.now()); ownerDraftRefusal(owner, input.recipients.size()) };
      case null null;
    };
    switch (refusal) { case (?msg) { return fail(msg) }; case null {} };
    let recipients = input.recipients.map(AddressLib.sanitizeVerified);
    // Billing and Click2Mail dispatch both key off the stored list, so a campaign
    // is priced for exactly the addresses supplied — never an estimated count.
    let count : Nat = recipients.size();
    if (count == 0) { return fail("Add at least one verified recipient address before creating a campaign") };
    // Text bounds at the boundary (lib/inputs.mo, mirrored in the frontend).
    if (AddressLib.sanitizeText(input.name).size() > Inputs.maxCampaignNameChars) {
      return fail("Campaign names are limited to " # Inputs.maxCampaignNameChars.toText() # " characters");
    };
    switch (Inputs.firstLongRecipient(recipients)) {
      case (?i) { return fail("Recipient " # (i + 1).toText() # " has an address line longer than " # Inputs.maxAddressFieldChars.toText() # " characters") };
      case null {};
    };
    switch (input.returnAddress) {
      case (?r) { if (Inputs.returnAddressTooLong(r)) { return fail("Return address lines are limited to " # Inputs.maxAddressFieldChars.toText() # " characters") } };
      case null {};
    };
    let idTooLong = func(t : ?Text) : Bool { switch (t) { case (?v) v.size() > Inputs.maxIdChars; case null false } };
    if (idTooLong(input.designTemplateId) or idTooLong(input.sourcePresetId)) { return fail("The template or preset reference is too long") };
    if (idTooLong(input.product.colorOption)) { return fail("The colour option is not valid") };
    switch (input.canvasState) {
      case (?c) { switch (Inputs.canvasError(c)) { case (?e) { return fail(e) }; case null {} } };
      case null {};
    };
    let qrDestination : ?Text = switch (input.qrDestinationUrl) {
      case (?raw) {
        if (AddressLib.sanitizeText(raw) == "") null else {
          switch (Inputs.redirectUrl(raw)) {
            case (?u) ?u;
            case null { return fail("The QR destination must be a web address starting with https:// or http://") };
          };
        };
      };
      case null null;
    };
    // Only now, with every check passed, may the canister-wide cap evict an
    // idle draft: a request that would be refused anyway evicts nothing.
    if (not makeRoomForDraft(Time.now())) {
      return fail("EZmailout is holding as many unpaid drafts as it can right now. Please try again later, or pay for a draft you already have.");
    };
    let id = CampaignLib.nextId(state);
    let record = CampaignLib.create(id, caller.toText(), { input with qrDestinationUrl = qrDestination }, printSpec, row.retailPriceCents, row.baseCostCents, count);
    campaigns.add(id, record);
    campaignRecipients.add(id, recipients);
    CampaignLib.appendEvent(trackingEvents, state, id, #Created, "campaign.created", id, #System, ?"Campaign draft created");
    { ok = true; error = null; campaignId = ?id; unitPriceCents = ?row.retailPriceCents; totalCents = ?record.totalAmountChargedCents };
  };

  /// The caller's campaigns as list rows, newest first; an admin sees all of
  /// them, including unowned legacy records. Rows carry no design or
  /// recipients, so the reply stays small however many campaigns there are.
  public shared query ({ caller }) func getCampaigns() : async [Types.CampaignSummary] {
    let checkouts = checkoutActivity();
    let result = List.empty<Types.CampaignSummary>();
    for ((_, r) in campaigns.entries()) {
      if (canAccess(r, caller)) { result.add(r.toSummary(draftExpiry(r, checkouts))) };
    };
    result.toArray().sort<Types.CampaignSummary>(func(a, b) = Int.compare(b.createdAt, a.createdAt));
  };

  /// One campaign in full, stored canvas included.
  public shared query ({ caller }) func getCampaign(id : Text) : async ?Types.CampaignRecordShared {
    let record = requireAccess(id, caller);
    ?record.toShared(draftExpiry(record, checkoutActivity()));
  };

  public shared query ({ caller }) func getCampaignRecipients(campaignId : Text) : async [Common.VerifiedAddress] {
    ignore requireAccess(campaignId, caller);
    switch (campaignRecipients.get(campaignId)) {
      case null [];
      case (?addrs) addrs;
    };
  };

  /// CSV export with recipient ids and tracking URLs.
  public shared query ({ caller }) func exportCampaignRecipients(campaignId : Text) : async ?Text {
    ignore requireAccess(campaignId, caller);
    CampaignLib.exportAsCsv(campaignId, campaignRecipients, AdminLib.trackingBaseUrl);
  };

  /// Replaces an unpaid draft's stored design. Once paid, the stored canvas is
  /// the design that was ordered and stays as it is.
  public shared ({ caller }) func saveCanvasState(campaignId : Text, canvas : Types.CanvasState) : async Bool {
    switch (campaigns.get(campaignId)) {
      case null false;
      case (?record) {
        if (not canAccess(record, caller)) { return false };
        if (record.paymentStatus != #Unpaid or Inputs.canvasError(canvas) != null) { return false };
        record.canvasState := ?canvas;
        record.updatedAt := Time.now();
        true;
      };
    };
  };

  public shared query ({ caller }) func getCanvasState(campaignId : Text) : async ?Types.CanvasState {
    requireAccess(campaignId, caller).canvasState;
  };

  /// Admin-only manual status override. Follows `CampaignLib.deliveryMoveAllowed`
  /// like every other delivery update: forward only, and only once Click2Mail
  /// has the job. Returns whether the campaign moved.
  public shared ({ caller }) func updateCampaignStatus(id : Text, status : Types.CampaignStatus, providerEventId : Text, timestamp : Int) : async Bool {
    if (not AdminLib.isAdmin(adminKeysState, caller)) { return false };
    switch (campaigns.get(id)) {
      case null false;
      case (?record) {
        if (not CampaignLib.advanceStatus(record, status)) { return false };
        let evtId = state.nextEventId;
        state.nextEventId += 1;
        trackingEvents.add({
          id = evtId;
          campaignId = id;
          status;
          eventType = "manual." # CampaignLib.stageName(status);
          timestamp = if (timestamp > 0) timestamp else Time.now();
          providerEventId = Limits.clip(AddressLib.sanitizeText(providerEventId), Inputs.maxEventIdChars);
          source = #Manual;
          detail = ?"Status set by admin";
        });
        true;
      };
    };
  };

  public shared query ({ caller }) func getTrackingEvents(campaignId : Text) : async [Types.TrackingEvent] {
    ignore requireAccess(campaignId, caller);
    let result = List.empty<Types.TrackingEvent>();
    for (e in trackingEvents.values()) {
      if (e.campaignId == campaignId) { result.add(e) };
    };
    result.toArray();
  };

  /// Deletes one of the caller's unpaid drafts with its recipients and staged
  /// print file. Refused once the campaign is paid, while a checkout opened
  /// in the last 24 hours could still complete, or after its document reached
  /// Click2Mail.
  public shared ({ caller }) func deleteCampaignDraft(campaignId : Text) : async Common.ApiResult {
    let record = switch (campaigns.get(campaignId)) {
      case (?r) { if (canAccess(r, caller)) r else { return { ok = false; error = ?CampaignLib.accessDenied } } };
      case null { return { ok = false; error = ?CampaignLib.accessDenied } };
    };
    if (record.paymentStatus != #Unpaid) { return { ok = false; error = ?"Only unpaid drafts can be deleted" } };
    if (record.c2mDocumentId != null) { return { ok = false; error = ?"This draft's document is already with Click2Mail" } };
    let now = Time.now();
    for ((_, p) in payments.entries()) {
      if (p.reference == ?campaignId and p.state == #Created and not p.sandbox and now - p.createdAt < openCheckoutNs) {
        return { ok = false; error = ?"A checkout for this draft was opened in the last 24 hours; try again later" };
      };
    };
    removeDrafts([campaignId]);
    { ok = true; error = null };
  };

  /// Resolves `/t/{code}` and `/track/{code}` links. Scans are counted and
  /// logged for paid campaigns only (unpaid drafts are never mailed).
  public shared func resolveTrackingLink(code : Text, userAgent : ?Text) : async Types.TrackingResolveResult {
    let trimmed = Limits.clip(AddressLib.sanitizeText(code), maxScanCodeChars);
    let campaignId = AddressLib.campaignIdOf(trimmed);
    switch (campaigns.get(campaignId)) {
      case null { { ok = false; destinationUrl = null; campaignId = null; recipientId = null } };
      case (?record) {
        if (isPaid(record)) {
          let now = Time.now();
          record.qrScanCount += 1;
          record.updatedAt := now;
          let agent = switch (userAgent) { case (?u) ?Limits.clip(AddressLib.sanitizeText(u), maxUserAgentChars); case null null };
          logScan({ campaignId; recipientId = trimmed; timestamp = now; userAgent = agent });
        };
        // Stored destinations are checked again, so a record saved before the
        // rule existed can never send a scan somewhere unsafe.
        let destination = switch (record.qrDestinationUrl) {
          case (?d) { switch (Inputs.redirectUrl(d)) { case (?u) u; case null "https://ezmailout.com" } };
          case null "https://ezmailout.com";
        };
        { ok = true; destinationUrl = ?destination; campaignId = ?campaignId; recipientId = ?trimmed };
      };
    };
  };

  public shared query ({ caller }) func getQrScanStats(campaignId : Text) : async Types.QrScanStats {
    ignore requireAccess(campaignId, caller);
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
