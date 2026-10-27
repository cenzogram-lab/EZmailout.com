/// Campaign ledger, canvas persistence, tracking timeline and dynamic QR links.
import Types "../types/campaign";
import Common "../types/common";
import Account "../types/account";
import AccountLib "../lib/account";
import CampaignLib "../lib/campaign";
import AddressLib "../lib/address";
import PricingLib "../lib/pricing";
import AdminLib "../lib/admin";
import Fulfilment "../lib/fulfilment";
import Limits "../lib/limits";
import Inputs "../lib/inputs";
import Http "../lib/http";
import Stripe "../lib/stripe";
import Map "mo:core/Map";
import List "mo:core/List";
import Set "mo:core/Set";
import Array "mo:core/Array";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Nat "mo:core/Nat";
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
  /// The campaign-order payments made for a campaign (the billing mixin's
  /// payment index), so no lookup scans every payment.
  paymentsForCampaign : Text -> [Account.PaymentRecord],
  accounts : Map.Map<Text, Account.UserAccount>,
  transformFn : Http.TransformFn,
) {
  /// Recipients one message may carry (`createCampaign` or
  /// `addCampaignRecipients`): an ingress message is at most 2 MB. A campaign
  /// itself has no recipient limit; a larger list is staged in chunks.
  transient let maxRecipientsPerCall : Nat = 5_000;

  // Drafts cost nothing to create, and identities are free to mint, so what
  // unpaid drafts hold is bounded per identity (by the recipients they are
  // priced for) and for the whole canister (by the recipients actually
  // stored, about 300 B each and up to ~900 B with long lines, so the heap
  // stays well inside the canister's memory). These bound staging, not
  // orders: paid campaigns do not count. The canister-wide budget evicts
  // idle drafts before it refuses (`makeRoom`).
  transient let maxUnpaidDrafts : Nat = 5;
  transient let maxUnpaidRecipients : Nat = 1_000_000;
  transient let maxUnpaidRecipientsGlobal : Nat = 1_500_000;
  /// A draft with a checkout opened this recently may still be paid.
  transient let openCheckoutNs : Int = 86_400_000_000_000;
  /// Drafts an open checkout alone may protect from eviction (half the
  /// canister-wide draft cap), the most recently opened first.
  transient let maxProtectedCheckouts : Nat = 250;

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

  /// The owner's unpaid drafts: how many, and how many recipients they are
  /// priced for.
  private func unpaidDrafts(owner : Text) : (Nat, Nat) {
    var drafts = 0;
    var recipients = 0;
    for ((_, r) in campaigns.entries()) {
      if (r.paymentStatus == #Unpaid and r.ownerId == owner) {
        drafts += 1;
        recipients += r.recipientCount;
      };
    };
    (drafts, recipients);
  };

  /// Recipients stored for every unpaid draft together.
  private func unpaidStoredRecipients() : Nat {
    var total = 0;
    for ((id, r) in campaigns.entries()) {
      if (r.paymentStatus == #Unpaid) {
        switch (campaignRecipients.get(id)) { case (?a) { total += a.size() }; case null {} };
      };
    };
    total;
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
      return ?"Unpaid drafts may hold at most 1,000,000 recipients in total. Pay for or delete a draft before adding this list.";
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
  /// complete (the same window `deleteCampaignDraft` respects). Open
  /// checkouts protect at most `maxProtectedCheckouts` drafts, the most
  /// recently opened: identities are free, and drafts each holding an open
  /// checkout could otherwise fill the canister-wide cap with drafts nothing
  /// may evict and turn every new campaign away for a day at a time.
  private func evictionProtected(now : Int) : Set.Set<Text> {
    let out = Set.empty<Text>();
    let open = Map.empty<Text, Int>();
    // Only an expirable draft can be evicted, so only drafts' payments count.
    for ((id, r) in campaigns.entries()) {
      if (CampaignLib.isExpirableDraft(r)) {
        for (p in paymentsForCampaign(id).vals()) {
          if (p.state == #Succeeded or p.state == #Waived) { out.add(id) } else if (p.state == #Created and not p.sandbox and now - p.createdAt < openCheckoutNs) {
            switch (open.get(id)) {
              case (?t) { if (p.createdAt > t) open.add(id, p.createdAt) };
              case null { open.add(id, p.createdAt) };
            };
          };
        };
      };
    };
    let newestFirst = open.entries().toArray().sort(func(a : (Text, Int), b : (Text, Int)) : Order.Order = Int.compare(b.1, a.1));
    var kept = 0;
    for ((id, _) in newestFirst.vals()) {
      if (kept < maxProtectedCheckouts and not out.contains(id)) { out.add(id); kept += 1 };
    };
    out;
  };

  /// Makes room under the canister-wide caps for a new draft (`newDraft`)
  /// and for `adding` more stored recipients: expired drafts go first, then
  /// the oldest idle ones (`CampaignLib.oldestIdleDraft`), never `keep` (the
  /// draft being staged), so a full canister never turns a customer away
  /// while an unprotected draft could make way. False only when nothing more
  /// may be evicted, or when `adding` alone is over the budget.
  private func makeRoom(now : Int, newDraft : Bool, adding : Nat, keep : ?Text) : Bool {
    if (adding > maxUnpaidRecipientsGlobal) { return false };
    let full = func() : Bool {
      (newDraft and unpaidDraftTotal() >= CampaignLib.maxUnpaidDraftsGlobal) or unpaidStoredRecipients() + adding > maxUnpaidRecipientsGlobal;
    };
    if (not full()) { return true };
    ignore pruneExpiredDrafts(now, keep);
    let isProtected = evictionProtected(now);
    // Chosen first and removed together, so the tracking log is swept once
    // (not once per draft), and nothing is evicted unless it makes room.
    var drafts = unpaidDraftTotal();
    var stored = unpaidStoredRecipients();
    let evict = Set.empty<Text>();
    while ((newDraft and drafts >= CampaignLib.maxUnpaidDraftsGlobal) or stored + adding > maxUnpaidRecipientsGlobal) {
      switch (CampaignLib.oldestIdleDraft(campaigns, func(id : Text) : Int = lastDraftActivity(id), func(id : Text) : Bool = isProtected.contains(id) or ?id == keep or evict.contains(id))) {
        case (?id) {
          evict.add(id);
          switch (campaigns.get(id)) {
            case (?r) {
              if (r.paymentStatus == #Unpaid) {
                drafts := Nat.sub(drafts, 1);
                stored := Nat.sub(stored, switch (campaignRecipients.get(id)) { case (?a) Nat.min(a.size(), stored); case null 0 });
              };
            };
            case null {};
          };
        };
        case null { return false };
      };
    };
    removeDrafts(evict.toArray());
    true;
  };

  /// When the newest checkout for a campaign was opened (0: none).
  private func latestCheckout(id : Text) : Int {
    var latest : Int = 0;
    for (p in paymentsForCampaign(id).vals()) {
      if (p.createdAt > latest) { latest := p.createdAt };
    };
    latest;
  };

  /// A campaign's latest activity outside its record: a staged print file
  /// or a checkout opened for it.
  private func lastDraftActivity(id : Text) : Int {
    let checkout = latestCheckout(id);
    switch (documentUploads.get(id)) {
      case (?u) { if (u.createdAt > checkout) u.createdAt else checkout };
      case null checkout;
    };
  };

  /// When `record` expires if it stays unpaid (`CampaignLib.draftExpiresAt`).
  private func draftExpiry(record : Types.CampaignRecord) : ?Int {
    if (not CampaignLib.isExpirableDraft(record)) { return null };
    CampaignLib.draftExpiresAt(record, lastDraftActivity(record.id));
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
  /// how many. Orders (paid, waived, or sent to the print partner) never expire.
  /// Runs from the 6-hourly timer in `main.mo`, and from `createCampaign`
  /// before a draft cap refuses.
  private func pruneExpiredDrafts(now : Int, keep : ?Text) : Nat {
    // `keep` is the draft being staged: it is in use, whatever its age.
    let expired = CampaignLib.expiredDrafts(campaigns, func(id : Text) : Int = lastDraftActivity(id), now).filter(func(id : Text) : Bool = ?id != keep);
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
    if (input.recipients.size() > maxRecipientsPerCall) {
      return fail("Send at most 5,000 recipients with createCampaign and add the rest with addCampaignRecipients");
    };
    let recipients = input.recipients.map(AddressLib.sanitizeVerified);
    if (recipients.size() == 0) { return fail("Add at least one verified recipient address before creating a campaign") };
    // The campaign is priced for `recipientCount` pieces; recipients past the
    // first message are staged with `addCampaignRecipients`, and checkout and
    // dispatch both require the stored list to hold exactly that many, so
    // the order is never priced on an estimate.
    let count : Nat = Nat.max(input.recipientCount, recipients.size());
    // Drafts past their 14 days are pruned before an owner's cap refuses, so
    // an expired draft never holds a slot the timer has not freed yet.
    let owner = caller.toText();
    let refusal = switch (ownerDraftRefusal(owner, count)) {
      case (?_) { ignore pruneExpiredDrafts(Time.now(), null); ownerDraftRefusal(owner, count) };
      case null null;
    };
    switch (refusal) { case (?msg) { return fail(msg) }; case null {} };
    // Text bounds at the boundary (lib/inputs.mo, mirrored in the frontend).
    if (AddressLib.sanitizeText(input.name).size() > Inputs.maxCampaignNameChars) {
      return fail("Campaign names are limited to " # Inputs.maxCampaignNameChars.toText() # " characters");
    };
    switch (Inputs.firstLongRecipient(recipients)) {
      case (?i) { return fail("Recipient " # (i + 1).toText() # " has an address line longer than " # Inputs.maxAddressFieldChars.toText() # " characters") };
      case null {};
    };
    switch (input.returnAddress) {
      case (?r) {
        if (Inputs.returnAddressTooLong(r)) { return fail("Return address lines are limited to " # Inputs.maxAddressFieldChars.toText() # " characters") };
        switch (Inputs.returnAddressError(r)) { case (?e) { return fail(e) }; case null {} };
      };
      // Dispatch needs one and a paid order's address cannot be changed, so
      // an order without one is never taken.
      case null { return fail("A return address is required") };
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
    // Priced here, once, and charged exactly as stored: volume tiers by the
    // number of pieces, members at the 10,000 tier whatever the batch.
    let isMember = switch (accounts.get(owner)) {
      case (?a) AccountLib.isSubscriptionLive(a, Time.now());
      case null false;
    };
    // Sent First-Class, the formats priced for Marketing Mail that cannot
    // absorb the dearer postage carry its surcharge (`classSurchargeCents`).
    let unitCents = PricingLib.unitPriceFor(row, count, isMember, printSpec.mailClass);
    if (unitCents * count < PricingLib.minOrderCents) {
      return fail("Card payments start at $0.50, so this order needs a few more pieces");
    };
    switch (PricingLib.campaignCostCents(unitCents, count)) {
      case null { return fail("This order is too large for one checkout; split it into smaller campaigns") };
      case (?_) {};
    };
    // Only now, with every check passed, may the canister-wide caps evict an
    // idle draft: a request that would be refused anyway evicts nothing.
    if (not makeRoom(Time.now(), true, recipients.size(), null)) {
      return fail("EZmailout is holding as many unpaid drafts as it can right now. Please try again later, or pay for a draft you already have.");
    };
    let id = CampaignLib.nextId(state);
    let record = CampaignLib.create(id, caller.toText(), { input with qrDestinationUrl = qrDestination }, printSpec, unitCents, row.baseCostCents, count);
    campaigns.add(id, record);
    campaignRecipients.add(id, recipients);
    CampaignLib.appendEvent(trackingEvents, state, id, #Created, "campaign.created", id, #System, ?"Campaign draft created");
    { ok = true; error = null; campaignId = ?id; unitPriceCents = ?unitCents; totalCents = ?record.totalAmountChargedCents };
  };

  /// Stages more of an unpaid campaign's recipients, in order: `offset` is
  /// where `recipients` start in the full list. A chunk already stored (a
  /// retried call) is acknowledged without being stored twice, and an empty
  /// chunk only reports progress, so a client resumes from `stored`.
  public shared ({ caller }) func addCampaignRecipients(campaignId : Text, offset : Nat, recipients : [Common.VerifiedAddress]) : async Types.RecipientStageResult {
    let record = switch (campaigns.get(campaignId)) {
      case (?r) { if (canAccess(r, caller)) r else { return { ok = false; error = ?"Campaign not found"; stored = 0; total = 0 } } };
      case null { return { ok = false; error = ?"Campaign not found"; stored = 0; total = 0 } };
    };
    let current = switch (campaignRecipients.get(campaignId)) { case (?r) r; case null [] };
    let stored = current.size();
    let reply = func(ok : Bool, error : ?Text, now : Nat) : Types.RecipientStageResult {
      { ok; error; stored = now; total = record.recipientCount };
    };
    if (recipients.size() == 0 or offset + recipients.size() <= stored) { return reply(true, null, stored) };
    if (record.paymentStatus != #Unpaid) { return reply(false, ?"This campaign is paid, so its recipient list can no longer change", stored) };
    if (recipients.size() > maxRecipientsPerCall) { return reply(false, ?"Send at most 5,000 recipients per call", stored) };
    if (offset > stored) { return reply(false, ?("Recipients are added in order; " # stored.toText() # " are stored"), stored) };
    // Only the part past what is stored is new (a retried chunk can overlap).
    let fresh = recipients.sliceToArray(Nat.sub(stored, offset), recipients.size()).map(AddressLib.sanitizeVerified);
    if (stored + fresh.size() > record.recipientCount) {
      return reply(false, ?("This campaign was created for " # record.recipientCount.toText() # " recipients; start a new campaign for a larger list"), stored);
    };
    switch (Inputs.firstLongRecipient(fresh)) {
      case (?i) { return reply(false, ?("Recipient " # (stored + i + 1).toText() # " has an address line longer than " # Inputs.maxAddressFieldChars.toText() # " characters"), stored) };
      case null {};
    };
    if (not makeRoom(Time.now(), false, fresh.size(), ?campaignId)) {
      return reply(false, ?"EZmailout is holding as many unpaid recipients as it can right now. Please try again in a little while.", stored);
    };
    campaignRecipients.add(campaignId, current.concat(fresh));
    record.updatedAt := Time.now();
    reply(true, null, stored + fresh.size());
  };

  /// The caller's campaigns as list rows, newest first; an admin sees all of
  /// them, including unowned legacy records. Rows carry no design or
  /// recipients, so the reply stays small however many campaigns there are.
  public shared query ({ caller }) func getCampaigns() : async [Types.CampaignSummary] {
    let result = List.empty<Types.CampaignSummary>();
    for ((_, r) in campaigns.entries()) {
      if (canAccess(r, caller)) { result.add(r.toSummary(draftExpiry(r))) };
    };
    result.toArray().sort<Types.CampaignSummary>(func(a, b) = Int.compare(b.createdAt, a.createdAt));
  };

  /// One campaign in full, stored canvas included.
  public shared query ({ caller }) func getCampaign(id : Text) : async ?Types.CampaignRecordShared {
    let record = requireAccess(id, caller);
    let view = record.toShared(draftExpiry(record));
    // A dispatch failure quotes the print partner or the network; the owner
    // sees which step failed and what to do, the admin sees the detail.
    switch (view.lastError) {
      case (?e) { ?{ view with lastError = ?AdminLib.providerError(adminKeysState, caller, e, Fulfilment.customerError(e)) } };
      case null ?view;
    };
  };

  public shared query ({ caller }) func getCampaignRecipients(campaignId : Text) : async [Common.VerifiedAddress] {
    ignore requireAccess(campaignId, caller);
    switch (campaignRecipients.get(campaignId)) {
      case null [];
      case (?addrs) addrs;
    };
  };

  /// One page (at most 2,000) of a campaign's recipients from `offset`, and
  /// how many it holds: a list of any size is read page by page.
  public shared query ({ caller }) func getCampaignRecipientsPage(campaignId : Text, offset : Nat, limit : Nat) : async Types.RecipientPage {
    ignore requireAccess(campaignId, caller);
    AddressLib.page(switch (campaignRecipients.get(campaignId)) { case (?a) a; case null [] }, offset, limit);
  };

  /// One page (at most 2,000 rows) of `exportCampaignRecipients`, the header
  /// row on the first page only; pages joined with newlines make the file.
  public shared query ({ caller }) func exportCampaignRecipientsPage(campaignId : Text, offset : Nat, limit : Nat) : async ?Types.CsvPage {
    ignore requireAccess(campaignId, caller);
    switch (campaignRecipients.get(campaignId)) {
      case null null;
      case (?addrs) ?{ csv = CampaignLib.exportCsvRows(campaignId, addrs, AdminLib.trackingBaseUrl, offset, Nat.min(limit, AddressLib.maxPageSize)); total = addrs.size() };
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
  /// like every other delivery update: forward only, and only once the print partner
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
  /// the print partner.
  public shared ({ caller }) func deleteCampaignDraft(campaignId : Text) : async Common.ApiResult {
    let record = switch (campaigns.get(campaignId)) {
      case (?r) { if (canAccess(r, caller)) r else { return { ok = false; error = ?CampaignLib.accessDenied } } };
      case null { return { ok = false; error = ?CampaignLib.accessDenied } };
    };
    if (record.paymentStatus != #Unpaid and record.paymentStatus != #Refunded) { return { ok = false; error = ?"Only unpaid or refunded drafts can be deleted" } };
    if (record.printDocumentId != null) { return { ok = false; error = ?"This draft's document is already in production" } };
    // Its open checkouts are cancelled with the payment processor first, so
    // none can take a payment for a draft that no longer exists. One that
    // cannot be cancelled may already be paid: the draft then stays, so the
    // payment can still be confirmed (Pay now finds it again).
    let open = List.empty<Account.PaymentRecord>();
    for (p in paymentsForCampaign(campaignId).vals()) {
      if (p.state == #Created and not p.sandbox) { open.add(p) };
    };
    for (p in open.values()) {
      let secret = switch (adminKeysState.stripeSecretKey) {
        case (?s) s;
        case null { return { ok = false; error = ?"A checkout for this draft is still open, and it can't be closed right now; try again later" } };
      };
      let resp = await* Http.postText(Stripe.apiBase # "/payment_intents/" # p.paymentIntentId # "/cancel", Stripe.headers(secret, null), "", AdminLib.outcallOptions(adminKeysState, 32_000), transformFn);
      if (not Http.isSuccess(resp) and resp.status != 404) {
        // Refused: already cancelled (a lost earlier answer) is fine; paid
        // or paying keeps the draft.
        let check = await* Http.get(Stripe.apiBase # "/payment_intents/" # p.paymentIntentId, Stripe.headers(secret, null), AdminLib.outcallOptions(adminKeysState, 32_000), transformFn);
        let closed = check.status == 404 or (Http.isSuccess(check) and (switch (Stripe.parseIntent(check.body)) { case (?i) i.status == "canceled"; case null false }));
        if (not closed) {
          return { ok = false; error = ?"A checkout for this draft may already have been paid, so the draft was kept. Open it from Campaigns and choose Pay now to check the payment." };
        };
      };
      // Cancelled, or unknown to the processor (made with another key).
      p.state := #Failed;
    };
    // A checkout opened while the others were being cancelled must not be
    // left payable for a draft that is about to go.
    for (p in paymentsForCampaign(campaignId).vals()) {
      if (p.state == #Created and not p.sandbox) {
        return { ok = false; error = ?"A checkout for this draft was opened meanwhile; try deleting it again in a moment" };
      };
    };
    // Re-read after the processor answered: a payment may have settled it.
    switch (campaigns.get(campaignId)) {
      case (?r) { if (r.paymentStatus != #Unpaid and r.paymentStatus != #Refunded) { return { ok = false; error = ?"Only unpaid or refunded drafts can be deleted" } } };
      case null { return { ok = true; error = null } };
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
          // Not an `updatedAt` change: that marks the timeline moving, and the
          // tracking poll stops after 45 quiet days (`trackingQuietNs`); a
          // scanned QR code must not keep an unscanned mailing polled for ever.
          record.qrScanCount += 1;
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
