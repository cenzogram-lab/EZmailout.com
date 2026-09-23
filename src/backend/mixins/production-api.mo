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

  private func isOwner(record : Types.CampaignRecord, caller : Principal) : Bool {
    record.ownerId == caller.toText() or record.ownerId == "" or AdminLib.isAdmin(adminKeysState, caller);
  };

  // ─── Document staging ────────────────────────────────────────────────────

  /// Stages one chunk of the print-ready PDF/PNG for a campaign (≤ 1.9 MB per chunk, ≤ 8 chunks).
  public shared ({ caller }) func uploadDocumentChunk(campaignId : Text, chunkIndex : Nat, totalChunks : Nat, mimeType : Text, fileName : Text, data : Blob) : async Common.ApiResult {
    let record = switch (campaigns.get(campaignId)) { case (?r) r; case null { return { ok = false; error = ?"Campaign not found" } } };
    if (not isOwner(record, caller)) { return { ok = false; error = ?"Unauthorized" } };
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

  public query func getDocumentUploadStatus(campaignId : Text) : async ?Types.DocumentUploadStatus {
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
    let auth = switch (AdminLib.click2mailAuth(adminKeysState)) { case (?a) a; case null { return dispatchResult(record, false, ?"Click2Mail credentials not configured (Admin → Click2Mail)") } };
    let recipients = switch (campaignRecipients.get(campaignId)) { case (?r) r; case null [] };
    if (recipients.size() == 0) { return dispatchResult(record, false, ?"Campaign has no verified recipients") };
    let returnAddress = switch (record.returnAddress) { case (?r) r; case null { return dispatchResult(record, false, ?"A return address is required") } };
    let base = Click2Mail.baseUrl(adminKeysState.click2mailEnvironment);
    let opts = AdminLib.outcallOptions(adminKeysState, 256_000);

    // 1. Document
    if (record.c2mDocumentId == null) {
      let upload = switch (documentUploads.get(campaignId)) { case (?u) u; case null { return dispatchResult(record, false, ?"Print document has not been uploaded") } };
      if (upload.receivedChunks != upload.totalChunks) { return dispatchResult(record, false, ?"Print document upload is incomplete") };
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
    let jobId = switch (record.c2mJobId) { case (?j) j; case null { return { ok = false; error = ?"Campaign has not been dispatched"; status = ?record.status; newEvents = 0 } } };
    let auth = switch (AdminLib.click2mailAuth(adminKeysState)) { case (?a) a; case null { return { ok = false; error = ?"Click2Mail credentials not configured"; status = ?record.status; newEvents = 0 } } };
    let base = Click2Mail.baseUrl(adminKeysState.click2mailEnvironment);
    let headers = Click2Mail.jsonHeaders(auth, "application/json");
    let jobResp = await Http.get(base # "/jobs/" # jobId, headers, AdminLib.outcallOptions(adminKeysState, 64_000), transformFn);
    let trackResp = await Http.get(base # "/jobs/" # jobId # "/tracking?trackingType=IMB", headers, AdminLib.outcallOptions(adminKeysState, 1_900_000), transformFn);
    if (not Http.isSuccess(jobResp) and not Http.isSuccess(trackResp)) {
      return { ok = false; error = ?responseError("Tracking lookup failed", jobResp); status = ?record.status; newEvents = 0 };
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
    { ok = true; error = null; status = ?record.status; newEvents };
  };

  /// Polls Click2Mail for IMb scan events and advances the 5-stage timeline.
  public shared ({ caller }) func syncClick2MailTracking(campaignId : Text) : async Types.SyncResult {
    switch (campaigns.get(campaignId)) {
      case null { { ok = false; error = ?"Campaign not found"; status = null; newEvents = 0 } };
      case (?record) {
        if (not isOwner(record, caller)) { return { ok = false; error = ?"Unauthorized"; status = null; newEvents = 0 } };
        await syncOne(record);
      };
    };
  };

  /// Timer job: syncs up to 10 in-flight campaigns. Returns the number synced.
  public shared func pollActiveTracking() : async Nat {
    if (not AdminLib.hasClick2Mail(adminKeysState)) { return 0 };
    let pending = List.empty<Types.CampaignRecord>();
    for ((_, r) in campaigns.entries()) {
      if (r.c2mJobId != null and r.status != #Delivered and pending.size() < maxPollPerTick) { pending.add(r) };
    };
    var synced = 0;
    for (r in pending.values()) {
      ignore await syncOne(r);
      synced += 1;
    };
    synced;
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
