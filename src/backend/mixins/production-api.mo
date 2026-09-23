/// Click2Mail production: document upload, address list, job dispatch, IMb tracking,
/// delivery webhooks (HTTP gateway) and the polling job.
import Types "../types/campaign";
import Common "../types/common";
import AddressLib "../lib/address";
import AdminLib "../lib/admin";
import CampaignLib "../lib/campaign";
import Click2Mail "../lib/click2mail";
import Http "../lib/http";
import Json "../lib/json";
import Map "mo:core/Map";
import List "mo:core/List";
import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Set "mo:core/Set";

mixin (
  campaigns : Map.Map<Text, Types.CampaignRecord>,
  campaignRecipients : Map.Map<Text, [Common.VerifiedAddress]>,
  trackingEvents : List.List<Types.TrackingEvent>,
  documentUploads : Map.Map<Text, Types.DocumentUpload>,
  state : Common.Counters,
  adminKeysState : Common.AdminState,
  transformFn : Http.TransformFn,
) {
  transient let maxChunkBytes : Nat = 1_900_000;
  transient let maxChunks : Nat = 8;
  transient let maxPollPerTick : Nat = 10;

  /// Campaigns with a Click2Mail dispatch running. Taken before the first
  /// outcall and released in `finally`, so it survives a trap in any
  /// continuation. Deliberately transient: a canister cannot be upgraded with
  /// calls in flight, so the set is always empty across an upgrade and can
  /// never strand a campaign behind a stale lock.
  transient let dispatchInFlight = Set.empty<Text>();

  /// Set while a tracking poll runs, so the timer and a manual trigger never
  /// pay for the same outcalls twice.
  transient var pollRunning : Bool = false;

  /// Owners may trigger a live tracking lookup at most once per campaign in
  /// this window; one lookup is two outcalls and about 24.6 B cycles.
  transient let syncCooldownNanos : Int = 10 * 60 * 1_000_000_000;

  /// Time of the last live Click2Mail lookup per campaign, from any path
  /// (owner, admin or the timer). Transient: it only rate-limits, so losing it
  /// on upgrade costs at most one extra lookup per campaign.
  transient let syncCooldowns = Map.empty<Text, Int>();

  /// Owner or admin. Unowned legacy records are admin-only.
  private func isOwner(record : Types.CampaignRecord, caller : Principal) : Bool {
    CampaignLib.isOwnedBy(record, caller) or AdminLib.isAdmin(adminKeysState, caller);
  };

  // ─── Document staging ────────────────────────────────────────────────────

  /// Stages one chunk of the print-ready PDF/PNG for a campaign (≤ 1.9 MB per chunk, ≤ 8 chunks).
  public shared ({ caller }) func uploadDocumentChunk(campaignId : Text, chunkIndex : Nat, totalChunks : Nat, mimeType : Text, fileName : Text, data : Blob) : async Common.ApiResult {
    let record = switch (campaigns.get(campaignId)) { case (?r) r; case null { return { ok = false; error = ?"Campaign not found" } } };
    if (not isOwner(record, caller)) { return { ok = false; error = ?"Unauthorized" } };
    if (dispatchInFlight.contains(campaignId)) { return { ok = false; error = ?"A dispatch is running for this campaign; upload again once it finishes" } };
    if (totalChunks == 0 or totalChunks > maxChunks) { return { ok = false; error = ?"totalChunks must be between 1 and 8" } };
    if (chunkIndex >= totalChunks) { return { ok = false; error = ?"chunkIndex out of range" } };
    if (data.size() == 0 or data.size() > maxChunkBytes) { return { ok = false; error = ?"Chunk must be between 1 byte and 1.9 MB" } };
    let upload : Types.DocumentUpload = switch (documentUploads.get(campaignId)) {
      case (?u) {
        if (u.totalChunks == totalChunks and u.mimeType == mimeType) u else {
          let fresh : Types.DocumentUpload = { campaignId; mimeType; fileName = AddressLib.sanitizeText(fileName); totalChunks; var chunks = Array.repeat<Blob>(Blob.empty(), totalChunks); var receivedChunks = 0; createdAt = Time.now() };
          documentUploads.add(campaignId, fresh);
          fresh;
        };
      };
      case null {
        let fresh : Types.DocumentUpload = { campaignId; mimeType; fileName = AddressLib.sanitizeText(fileName); totalChunks; var chunks = Array.repeat<Blob>(Blob.empty(), totalChunks); var receivedChunks = 0; createdAt = Time.now() };
        documentUploads.add(campaignId, fresh);
        fresh;
      };
    };
    let wasEmpty = upload.chunks[chunkIndex].size() == 0;
    upload.chunks := Array.tabulate<Blob>(totalChunks, func(i) = if (i == chunkIndex) data else upload.chunks[i]);
    if (wasEmpty) { upload.receivedChunks += 1 };
    { ok = true; error = null };
  };

  public shared query ({ caller }) func getDocumentUploadStatus(campaignId : Text) : async ?Types.DocumentUploadStatus {
    switch (campaigns.get(campaignId)) {
      case (?record) { if (not isOwner(record, caller)) { Runtime.trap(CampaignLib.accessDenied) } };
      case null { Runtime.trap(CampaignLib.accessDenied) };
    };
    switch (documentUploads.get(campaignId)) {
      case null null;
      case (?u) {
        var bytes = 0;
        for (c in u.chunks.vals()) { bytes += c.size() };
        ?{ campaignId = u.campaignId; mimeType = u.mimeType; fileName = u.fileName; totalChunks = u.totalChunks; receivedChunks = u.receivedChunks; totalBytes = bytes; complete = u.receivedChunks == u.totalChunks };
      };
    };
  };

  // ─── Dispatch ────────────────────────────────────────────────────────────

  private func dispatchResult(record : Types.CampaignRecord, ok : Bool, error : ?Text) : Types.DispatchResult {
    { ok; error; documentId = record.c2mDocumentId; addressListId = record.c2mAddressListId; jobId = record.c2mJobId; productionStatus = ?record.productionStatus };
  };

  private func markFailed(record : Types.CampaignRecord, msg : Text) : Types.DispatchResult {
    record.productionStatus := #Failed;
    record.lastError := ?msg;
    record.updatedAt := Time.now();
    dispatchResult(record, false, ?msg);
  };

  private func responseError(prefix : Text, resp : Http.Response) : Text {
    if (resp.status == 0) { prefix # ": " # resp.body } else { prefix # " (HTTP " # resp.status.toText() # "): " # Click2Mail.parseDescription(resp.body) };
  };

  /// Uploads the document, submits the address list, creates and submits the Click2Mail job.
  /// Safe to re-run: completed steps are skipped.
  public shared ({ caller }) func dispatchClick2MailJob(campaignId : Text) : async Types.DispatchResult {
    let record = switch (campaigns.get(campaignId)) {
      case (?r) r;
      case null { return { ok = false; error = ?"Campaign not found"; documentId = null; addressListId = null; jobId = null; productionStatus = null } };
    };
    if (not isOwner(record, caller)) { return dispatchResult(record, false, ?"Unauthorized") };
    if (record.paymentStatus != #Paid and record.paymentStatus != #Waived) { return dispatchResult(record, false, ?"Payment required before dispatch") };
    if (record.productionStatus == #Submitted) { return dispatchResult(record, true, null) };
    // Checked and taken in the same message as the checks above, before the
    // first await, so no interleaving call can get past it.
    if (dispatchInFlight.contains(campaignId)) { return dispatchResult(record, false, ?"Dispatch already in flight for this campaign") };
    let auth = switch (AdminLib.click2mailAuth(adminKeysState)) { case (?a) a; case null { return dispatchResult(record, false, ?"Click2Mail credentials not configured (Admin → Click2Mail)") } };
    let recipients = switch (campaignRecipients.get(campaignId)) { case (?r) r; case null [] };
    if (recipients.size() == 0) { return dispatchResult(record, false, ?"Campaign has no verified recipients") };
    let returnAddress = switch (record.returnAddress) { case (?r) r; case null { return dispatchResult(record, false, ?"A return address is required") } };
    if (record.c2mDocumentId == null) {
      switch (documentUploads.get(campaignId)) {
        case null { return dispatchResult(record, false, ?"Print document has not been uploaded") };
        case (?u) { if (u.receivedChunks != u.totalChunks) { return dispatchResult(record, false, ?"Print document upload is incomplete") } };
      };
    };

    dispatchInFlight.add(campaignId);
    record.productionStatus := #Processing;
    record.lastError := null;
    record.updatedAt := Time.now();
    try {
      await* runDispatch(record, campaignId, auth, recipients, returnAddress);
    } finally {
      dispatchInFlight.remove(campaignId);
      // Every normal exit ends in #Submitted or #Failed. Anything else means a
      // continuation trapped mid-run; the ids of completed steps are kept, so
      // a retry resumes where this run stopped.
      switch (record.productionStatus) {
        case (#Submitted or #Failed) {};
        case (_) {
          record.productionStatus := #Failed;
          record.lastError := ?"Dispatch was interrupted before Click2Mail confirmed it; completed steps are kept and it is safe to retry";
          record.updatedAt := Time.now();
        };
      };
    };
  };

  /// The four Click2Mail steps. Runs under `dispatchInFlight`; every return is
  /// `markFailed` or the final `#Submitted` result.
  private func runDispatch(
    record : Types.CampaignRecord,
    campaignId : Text,
    auth : Text,
    recipients : [Common.VerifiedAddress],
    returnAddress : Common.ReturnAddress,
  ) : async* Types.DispatchResult {
    let base = Click2Mail.baseUrl(adminKeysState.click2mailEnvironment);
    let opts = AdminLib.outcallOptions(adminKeysState, 256_000);

    // 1. Document
    if (record.c2mDocumentId == null) {
      let upload = switch (documentUploads.get(campaignId)) { case (?u) u; case null { return markFailed(record, "Print document has not been uploaded") } };
      let bytes = Blob.fromArray(upload.chunks.map(func(b : Blob) : [Nat8] = b.toArray()).flatten());
      let boundary = "----EZmailoutBoundary" # Time.now().toText();
      let fileName = if (upload.fileName == "") { campaignId # ".pdf" } else { upload.fileName };
      let body = Click2Mail.buildDocumentMultipart(boundary, [
        ("documentName", record.name # " (" # campaignId # ")"),
        ("documentClass", record.printSpec.documentClass),
        ("documentFormat", Click2Mail.documentFormat(upload.mimeType)),
      ], fileName, upload.mimeType, bytes);
      let resp = await Http.postBlob(base # "/documents", Click2Mail.jsonHeaders(auth, "multipart/form-data; boundary=" # boundary), body, opts, transformFn);
      if (not Http.isSuccess(resp) or Click2Mail.reportedFailure(resp.body)) { return markFailed(record, responseError("Document upload failed", resp)) };
      switch (Click2Mail.parseId(resp.body)) {
        case (?id) { record.c2mDocumentId := ?id; record.productionStatus := #DocumentUploaded; record.updatedAt := Time.now(); documentUploads.remove(campaignId) };
        case null { return markFailed(record, "Document upload returned no id") };
      };
    };

    // 2. Address list
    if (record.c2mAddressListId == null) {
      let xml = Click2Mail.buildAddressListXml(record.name # " " # campaignId, recipients);
      let resp = await Http.postText(base # "/addressLists", Click2Mail.jsonHeaders(auth, "application/xml"), xml, opts, transformFn);
      if (not Http.isSuccess(resp) or Click2Mail.reportedFailure(resp.body)) { return markFailed(record, responseError("Address list submission failed", resp)) };
      switch (Click2Mail.parseId(resp.body)) {
        case (?id) { record.c2mAddressListId := ?id; record.productionStatus := #AddressListReady; record.updatedAt := Time.now() };
        case null { return markFailed(record, "Address list returned no id") };
      };
    };

    // 3. Job
    if (record.c2mJobId == null) {
      let documentId = switch (record.c2mDocumentId) { case (?d) d; case null "" };
      let addressListId = switch (record.c2mAddressListId) { case (?a) a; case null "" };
      let form = Click2Mail.buildJobForm(record.printSpec, documentId, addressListId, returnAddress);
      let resp = await Http.postText(base # "/jobs", Click2Mail.jsonHeaders(auth, "application/x-www-form-urlencoded"), form, opts, transformFn);
      if (not Http.isSuccess(resp) or Click2Mail.reportedFailure(resp.body)) { return markFailed(record, responseError("Job creation failed", resp)) };
      switch (Click2Mail.parseId(resp.body)) {
        case (?id) { record.c2mJobId := ?id; record.productionStatus := #JobCreated; record.updatedAt := Time.now() };
        case null { return markFailed(record, "Job creation returned no id") };
      };
    };

    // 4. Submit
    let jobId = switch (record.c2mJobId) { case (?j) j; case null "" };
    let submit = await Http.postText(base # "/jobs/" # jobId # "/submit", Click2Mail.jsonHeaders(auth, "application/x-www-form-urlencoded"), Click2Mail.formEncode([("billingType", "User Credit")]), opts, transformFn);
    if (not Http.isSuccess(submit) or Click2Mail.reportedFailure(submit.body)) { return markFailed(record, responseError("Job submission failed", submit)) };
    record.productionStatus := #Submitted;
    record.lastError := null;
    record.updatedAt := Time.now();
    if (CampaignLib.advanceStatus(record, #InProduction)) {
      CampaignLib.appendEvent(trackingEvents, state, campaignId, #InProduction, "job.submitted", jobId, #System, ?"Click2Mail job submitted for production");
    };
    dispatchResult(record, true, null);
  };

  // ─── Tracking ────────────────────────────────────────────────────────────

  private func syncOne(record : Types.CampaignRecord) : async Types.SyncResult {
    let jobId = switch (record.c2mJobId) { case (?j) j; case null { return { ok = false; error = ?"Campaign has not been dispatched"; status = ?record.status; newEvents = 0; cached = false } } };
    let auth = switch (AdminLib.click2mailAuth(adminKeysState)) { case (?a) a; case null { return { ok = false; error = ?"Click2Mail credentials not configured"; status = ?record.status; newEvents = 0; cached = false } } };
    let base = Click2Mail.baseUrl(adminKeysState.click2mailEnvironment);
    let headers = Click2Mail.jsonHeaders(auth, "application/json");
    let jobResp = await Http.get(base # "/jobs/" # jobId, headers, AdminLib.outcallOptions(adminKeysState, 64_000), transformFn);
    let trackResp = await Http.get(base # "/jobs/" # jobId # "/tracking?trackingType=IMB", headers, AdminLib.outcallOptions(adminKeysState, 1_900_000), transformFn);
    if (not Http.isSuccess(jobResp) and not Http.isSuccess(trackResp)) {
      return { ok = false; error = ?responseError("Tracking lookup failed", jobResp); status = ?record.status; newEvents = 0; cached = false };
    };
    let statuses = List.empty<Text>();
    if (Http.isSuccess(jobResp)) {
      switch (Json.getString(jobResp.body, "status")) { case (?s) statuses.add(s); case null {} };
      switch (Json.xmlTag(jobResp.body, "status")) { case (?s) statuses.add(s); case null {} };
      statuses.add(Click2Mail.parseDescription(jobResp.body));
    };
    let pieceStatuses = if (Http.isSuccess(trackResp)) Click2Mail.parseTrackingStatuses(trackResp.body) else [];
    let stage = if (pieceStatuses.size() > 0) {
      Click2Mail.aggregateStage(pieceStatuses);
    } else {
      Click2Mail.aggregateStage(statuses.toArray());
    };
    var newEvents = 0;
    switch (stage) {
      case (?s) {
        if (CampaignLib.advanceStatus(record, s)) {
          CampaignLib.appendEvent(trackingEvents, state, record.id, s, "imb." # CampaignLib.stageName(s), jobId # ":" # Time.now().toText(), #Poll, ?("USPS IMb scan aggregate across " # pieceStatuses.size().toText() # " pieces"));
          newEvents += 1;
        };
      };
      case null {};
    };
    { ok = true; error = null; status = ?record.status; newEvents; cached = false };
  };

  /// Polls Click2Mail for IMb scan events and advances the 5-stage timeline.
  /// Owners get the stored state instead of a new lookup within 10 minutes of
  /// the last one; controllers and the admin are not rate-limited.
  public shared ({ caller }) func syncClick2MailTracking(campaignId : Text) : async Types.SyncResult {
    switch (campaigns.get(campaignId)) {
      case null { { ok = false; error = ?"Campaign not found"; status = null; newEvents = 0; cached = false } };
      case (?record) {
        if (not isOwner(record, caller)) { return { ok = false; error = ?"Unauthorized"; status = null; newEvents = 0; cached = false } };
        // Only a call that will reach Click2Mail is rate-limited; the early
        // returns in `syncOne` cost nothing. Checked and stamped before the
        // first await, so concurrent calls cannot both get through.
        if (record.c2mJobId != null and AdminLib.hasClick2Mail(adminKeysState)) {
          let now = Time.now();
          if (not AdminLib.isAdmin(adminKeysState, caller)) {
            switch (syncCooldowns.get(campaignId)) {
              case (?lastSync) {
                if (now - lastSync < syncCooldownNanos) {
                  return { ok = true; error = null; status = ?record.status; newEvents = 0; cached = true };
                };
              };
              case null {};
            };
          };
          syncCooldowns.add(campaignId, now);
        };
        await syncOne(record);
      };
    };
  };

  /// Syncs up to 10 in-flight campaigns and returns how many were synced.
  /// Private: the 6-hourly timer in `main.mo` calls it directly, so it is not
  /// reachable as a canister method.
  private func pollActiveCampaigns() : async Nat {
    if (pollRunning or not AdminLib.hasClick2Mail(adminKeysState)) { return 0 };
    let pending = List.empty<Types.CampaignRecord>();
    for ((_, r) in campaigns.entries()) {
      if (r.c2mJobId != null and r.status != #Delivered and pending.size() < maxPollPerTick) { pending.add(r) };
    };
    pollRunning := true;
    var synced = 0;
    try {
      for (r in pending.values()) {
        syncCooldowns.add(r.id, Time.now());
        ignore await syncOne(r);
        synced += 1;
      };
    } finally {
      pollRunning := false;
    };
    synced;
  };

  /// Manual trigger for the tracking poll — controllers and the admin only.
  /// One run makes up to 20 HTTPS outcalls (about 0.25 T cycles), so an open
  /// endpoint would let anyone drain the canister.
  public shared ({ caller }) func pollActiveTracking() : async Nat {
    if (not AdminLib.isAdmin(adminKeysState, caller)) { Runtime.trap("Only a controller or the admin can trigger a tracking poll") };
    await pollActiveCampaigns();
  };

  // ─── Webhooks ────────────────────────────────────────────────────────────

  private func findByJobId(jobId : Text) : ?Types.CampaignRecord {
    for ((_, r) in campaigns.entries()) {
      if (r.c2mJobId == ?jobId) { return ?r };
    };
    null;
  };

  private func processWebhook(secret : Text, payload : Text) : Types.WebhookResult {
    let expected = switch (adminKeysState.webhookSecret) { case (?s) s; case null { return { ok = false; error = ?"Webhook secret not configured; rejecting"; campaignId = null; status = null } } };
    if (secret != expected) { return { ok = false; error = ?"Unauthorized"; campaignId = null; status = null } };
    if (payload.size() > 200_000) { return { ok = false; error = ?"Payload too large"; campaignId = null; status = null } };
    let record : Types.CampaignRecord = switch (Json.getString(payload, "campaignId")) {
      case (?cid) { switch (campaigns.get(cid)) { case (?r) r; case null { return { ok = false; error = ?"Unknown campaign"; campaignId = ?cid; status = null } } } };
      case null {
        switch (Json.getString(payload, "jobId")) {
          case (?jid) { switch (findByJobId(jid)) { case (?r) r; case null { return { ok = false; error = ?"Unknown job"; campaignId = null; status = null } } } };
          case null {
            switch (Json.getNumber(payload, "jobId")) {
              case (?n) { switch (findByJobId(n.toText())) { case (?r) r; case null { return { ok = false; error = ?"Unknown job"; campaignId = null; status = null } } } };
              case null { return { ok = false; error = ?"Payload must include campaignId or jobId"; campaignId = null; status = null } };
            };
          };
        };
      };
    };
    var eventText = "";
    for (k in ["event", "status", "scanEvent", "scanDescription", "eventType"].vals()) {
      if (eventText == "") {
        switch (Json.getString(payload, k)) { case (?v) { eventText := v }; case null {} };
      };
    };
    let status = switch (CampaignLib.statusFromText(eventText)) {
      case (?s) s;
      case null { return { ok = false; error = ?("Unrecognized event: " # eventText); campaignId = ?record.id; status = ?record.status } };
    };
    let providerEventId = switch (Json.getString(payload, "eventId")) {
      case (?e) e;
      case null { switch (Json.getString(payload, "id")) { case (?e) e; case null ("webhook:" # Time.now().toText()) } };
    };
    let ts : Int = switch (Json.getNumber(payload, "timestamp")) {
      case (?t) { if (t > 100_000_000_000_000) t else if (t > 100_000_000_000) t * 1_000_000 else if (t > 0) t * 1_000_000_000 else Time.now() };
      case null Time.now();
    };
    let advanced = CampaignLib.advanceStatus(record, status);
    let evtId = state.nextEventId;
    state.nextEventId += 1;
    trackingEvents.add({ id = evtId; campaignId = record.id; status; eventType = "webhook." # CampaignLib.stageName(status); timestamp = ts; providerEventId; source = #Webhook; detail = ?(if (advanced) eventText else eventText # " (no stage change)") });
    { ok = true; error = null; campaignId = ?record.id; status = ?record.status };
  };

  /// Authenticated delivery webhook (shared-secret). Maps IMb events onto the timeline.
  public shared func handleDeliveryWebhook(secret : Text, payload : Text) : async Types.WebhookResult {
    processWebhook(secret, payload);
  };

  // ─── HTTP gateway ────────────────────────────────────────────────────────

  public query func http_request(req : Http.HttpRequest) : async Http.HttpResponse {
    let p = Http.path(req.url);
    if (req.method == "GET" and (p == "/health" or p == "/")) {
      return Http.textResponse(200, "application/json", "{\"service\":\"ezmailout\",\"status\":\"ok\"}");
    };
    if (req.method == "POST" and p == AdminLib.webhookPath) {
      return { status_code = 200; headers = []; body = Blob.empty(); upgrade = ?true };
    };
    Http.textResponse(404, "application/json", "{\"error\":\"not found\"}");
  };

  public shared func http_request_update(req : Http.HttpRequest) : async Http.HttpResponse {
    let p = Http.path(req.url);
    if (req.method != "POST" or p != AdminLib.webhookPath) {
      return Http.textResponse(404, "application/json", "{\"error\":\"not found\"}");
    };
    let secret = switch (Http.headerValue(req, "x-ezmailout-secret")) {
      case (?s) s;
      case null { switch (Http.queryParam(req.url, "secret")) { case (?s) s; case null "" } };
    };
    let payload = switch (req.body.decodeUtf8()) { case (?t) t; case null "" };
    let result = processWebhook(secret, payload);
    let body = "{\"ok\":" # (if (result.ok) "true" else "false") # ",\"error\":" # (switch (result.error) { case (?e) Json.str(e); case null "null" }) # ",\"campaignId\":" # (switch (result.campaignId) { case (?c) Json.str(c); case null "null" }) # "}";
    let code : Nat16 = if (result.ok) 200 else if (result.error == ?"Unauthorized" or result.error == ?"Webhook secret not configured; rejecting") 401 else 400;
    Http.textResponse(code, "application/json", body);
  };
};
