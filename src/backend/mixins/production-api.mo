/// Print production: document upload, address list, job dispatch, IMb tracking,
/// delivery webhooks (HTTP gateway) and the polling job.
import Types "../types/campaign";
import Common "../types/common";
import AddressLib "../lib/address";
import AdminLib "../lib/admin";
import CampaignLib "../lib/campaign";
import Fulfilment "../lib/fulfilment";
import Http "../lib/http";
import Json "../lib/json";
import Limits "../lib/limits";
import Secrets "../lib/secrets";
import Inputs "../lib/inputs";
import PrintFile "../lib/printfile";
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
import Order "mo:core/Order";

mixin (
  campaigns : Map.Map<Text, Types.CampaignRecord>,
  campaignRecipients : Map.Map<Text, [Common.VerifiedAddress]>,
  printBatches : Map.Map<Text, [Types.PrintBatch]>,
  printEnvironments : Map.Map<Text, Common.FulfilmentEnvironment>,
  trackingEvents : List.List<Types.TrackingEvent>,
  documentUploads : Map.Map<Text, Types.DocumentUpload>,
  state : Common.Counters,
  adminKeysState : Common.AdminState,
  transformFn : Http.TransformFn,
) {
  transient let maxChunkBytes : Nat = 1_900_000;
  transient let maxChunks : Nat = 8;
  /// The whole print file, not just a chunk: dispatch posts it to the print partner
  /// in one HTTPS outcall, and an outcall request (URL, headers, multipart
  /// framing and body) may not exceed 2 MB. Checked at upload, before the
  /// customer pays, so a file that cannot be sent is never charged for.
  transient let maxDocumentBytes : Nat = 1_900_000;
  transient let allowedMimeTypes : [Text] = ["application/pdf", "image/png", "image/jpeg"];
  /// Print jobs one tracking poll looks up (the job, then its tracking page
  /// by page: usually two outcalls, at most `Fulfilment.maxTrackingPages` + 1),
  /// however many campaigns or batches they belong to.
  transient let maxPollJobsPerTick : Nat = 10;
  /// How long the automatic poll keeps looking up a campaign whose timeline
  /// has not moved: 45 days (Marketing Mail lands within about three weeks).
  transient let trackingQuietNs : Int = 45 * 24 * 3_600 * 1_000_000_000;

  /// Campaigns with a print dispatch running. Taken before the first
  /// outcall and released in `finally`, so it survives a trap in any
  /// continuation. Deliberately transient: a canister cannot be upgraded with
  /// calls in flight, so the set is always empty across an upgrade and can
  /// never strand a campaign behind a stale lock.
  transient let dispatchInFlight = Set.empty<Text>();

  /// A new print file for a campaign that already has a complete one, held
  /// here until it is complete and passes the print-file check: replacing the
  /// staged file chunk by chunk let a re-upload that stopped (or failed the
  /// check) take away the file an open checkout was created for, and the
  /// campaign could be paid with nothing to print. Transient: an upload cut
  /// off by an upgrade is simply sent again, and the staged file stays.
  transient let pendingUploads = Map.empty<Text, Types.DocumentUpload>();

  /// Set while a tracking poll runs, so the timer and a manual trigger never
  /// pay for the same outcalls twice.
  transient var pollRunning : Bool = false;

  /// Owners may trigger a live tracking lookup at most once per campaign in
  /// this window, the same interval as the automatic poll; one lookup is two
  /// outcalls and about 24.6 B cycles.
  transient let syncCooldownNanos : Int = 6 * 3_600 * 1_000_000_000;

  // Owner dispatch retries: each one can re-post a 1.9 MB file (about 16 B
  // cycles), so a campaign gets at most 5 runs a day, 5 minutes apart.
  // Controllers and the admin are not limited.
  transient let dispatchRunsPerDay : Nat = 5;
  transient let dispatchGapNs : Int = 5 * 60 * 1_000_000_000;
  transient let dispatchWindowNs : Int = 24 * 3_600 * 1_000_000_000;
  transient let dispatchRuns = Map.empty<Text, Limits.Window>();

  /// Time of the last live print lookup per campaign, from any path
  /// (owner, admin or the timer). Transient: it only rate-limits, so losing it
  /// on upgrade costs at most one extra lookup per campaign.
  transient let syncCooldowns = Map.empty<Text, Int>();

  /// Owner or admin. Unowned legacy records are admin-only.
  private func isOwner(record : Types.CampaignRecord, caller : Principal) : Bool {
    CampaignLib.isOwnedBy(record, caller) or AdminLib.isAdmin(adminKeysState, caller);
  };

  /// Where a campaign's print job lives: the environment its first dispatch
  /// used (`printEnvironments`), so a later switch of the admin's setting
  /// cannot send its tracking or a retried batch to the other one. Before
  /// that, a test-mode campaign (paid through sandbox checkout) always goes
  /// to Staging, so it can never print or bill on Production, and any other
  /// campaign to the admin's current setting.
  private func environmentFor(record : Types.CampaignRecord) : Common.FulfilmentEnvironment {
    switch (printEnvironments.get(record.id)) {
      case (?pinned) pinned;
      case null { if (CampaignLib.isTestMode(record)) #Staging else adminKeysState.fulfilmentEnvironment };
    };
  };

  /// Whether the print partner already holds something of this campaign (its
  /// document, or a batch's address list or job): from then on its
  /// environment stays the one those were created in.
  private func partnerHoldsAny(record : Types.CampaignRecord) : Bool {
    if (record.printDocumentId != null or record.printAddressListId != null or record.printJobId != null) return true;
    switch (printBatches.get(record.id)) {
      case (?plan) plan.any(func(b : Types.PrintBatch) : Bool { b.addressListId != null or b.jobId != null });
      case null false;
    };
  };

  /// A file name that cannot break out of its multipart header.
  private func safeFileName(name : Text) : Text {
    Limits.clip(AddressLib.sanitizeText(name).map(func(c : Char) : Char = if (c == '\22' or c == '\r' or c == '\n' or c == '\\') '_' else c), 120);
  };

  // ─── Document staging ────────────────────────────────────────────────────

  /// Stages one chunk of the print-ready PDF/PNG for a campaign (≤ 1.9 MB per chunk, ≤ 8 chunks).
  public shared ({ caller }) func uploadDocumentChunk(campaignId : Text, chunkIndex : Nat, totalChunks : Nat, mimeType : Text, fileName : Text, data : Blob) : async Common.ApiResult {
    let record = switch (campaigns.get(campaignId)) { case (?r) r; case null { return { ok = false; error = ?"Campaign not found" } } };
    if (not isOwner(record, caller)) { return { ok = false; error = ?"Unauthorized" } };
    if (dispatchInFlight.contains(campaignId)) { return { ok = false; error = ?"A dispatch is running for this campaign; upload again once it finishes" } };
    // Once the print partner holds the document (the campaign was dispatched, or a
    // dispatch failed after that step) a new upload could never be used.
    if (record.printDocumentId != null or record.productionStatus == #Submitted) {
      return { ok = false; error = ?"This campaign's print file is already in production and can no longer be replaced" };
    };
    // Checkout needs the file staged, so a paid campaign always has the one
    // it was paid for; a later upload could only swap in another design.
    if (record.paymentStatus == #Paid or record.paymentStatus == #Waived) {
      return { ok = false; error = ?"This campaign is paid, so its print file can no longer be replaced" };
    };
    if (not allowedMimeTypes.any(func(m : Text) : Bool { m == mimeType })) { return { ok = false; error = ?"The print file must be a PDF, PNG or JPEG" } };
    if (totalChunks == 0 or totalChunks > maxChunks) { return { ok = false; error = ?"totalChunks must be between 1 and 8" } };
    if (chunkIndex >= totalChunks) { return { ok = false; error = ?"chunkIndex out of range" } };
    if (data.size() == 0 or data.size() > maxChunkBytes) { return { ok = false; error = ?"Chunk must be between 1 byte and 1.9 MB" } };
    // A file that replaces a complete one is staged beside it and swapped in
    // only once complete and checked (`pendingUploads`).
    let replacing = switch (documentUploads.get(campaignId)) { case (?u) u.receivedChunks == u.totalChunks; case null false };
    let slot = if (replacing) pendingUploads else documentUploads;
    // Chunk 0, or any chunk after a complete file, begins a new file: a
    // re-upload with the same chunk count must not mix with the old one (new
    // chunk 0 + old chunk 1 still counted as complete, and could be paid).
    let existing : ?Types.DocumentUpload = switch (slot.get(campaignId)) {
      case (?u) {
        if (u.totalChunks == totalChunks and u.mimeType == mimeType and chunkIndex != 0 and u.receivedChunks < u.totalChunks) ?u else null;
      };
      case null null;
    };
    // The staged file with this chunk in place must still fit one outcall.
    let staged = switch (existing) { case (?u) Limits.stagedBytes(u.chunks, chunkIndex, data.size()); case null data.size() };
    if (staged > maxDocumentBytes) {
      return { ok = false; error = ?"The print file must be 1.9 MB or smaller so it can be sent to print. Export it at a lower image quality and upload again." };
    };
    let upload : Types.DocumentUpload = switch (existing) {
      case (?u) u;
      case null {
        let fresh : Types.DocumentUpload = { campaignId; mimeType; fileName = safeFileName(fileName); totalChunks; var chunks = Array.repeat<Blob>(Blob.empty(), totalChunks); var receivedChunks = 0; createdAt = Time.now() };
        if (replacing) { sweepPendingUploads() };
        slot.add(campaignId, fresh);
        fresh;
      };
    };
    let wasEmpty = upload.chunks[chunkIndex].size() == 0;
    upload.chunks := Array.tabulate<Blob>(totalChunks, func(i) = if (i == chunkIndex) data else upload.chunks[i]);
    if (wasEmpty) { upload.receivedChunks += 1 };
    // The order is priced for one front-and-back piece, and the print
    // partner bills by the file's pages: a complete file is checked now, and
    // one that fails is dropped so it can never be paid for.
    if (upload.receivedChunks == totalChunks) {
      switch (PrintFile.stagedError(upload)) {
        case (?e) { slot.remove(campaignId); return { ok = false; error = ?e } };
        case null {
          if (replacing) {
            documentUploads.add(campaignId, upload);
            pendingUploads.remove(campaignId);
          };
        };
      };
    };
    { ok = true; error = null };
  };

  /// Drops replacement uploads that can no longer be used: their campaign is
  /// gone, paid, or its file is already with the print partner.
  private func sweepPendingUploads() {
    let stale = List.empty<Text>();
    for ((id, _) in pendingUploads.entries()) {
      switch (campaigns.get(id)) {
        case (?c) { if (c.paymentStatus == #Paid or c.paymentStatus == #Waived or c.printDocumentId != null) stale.add(id) };
        case null { stale.add(id) };
      };
    };
    for (id in stale.values()) { pendingUploads.remove(id) };
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
    { ok; error; documentId = record.printDocumentId; addressListId = record.printAddressListId; jobId = record.printJobId; productionStatus = ?record.productionStatus };
  };

  private func markFailed(record : Types.CampaignRecord, msg : Text) : Types.DispatchResult {
    ignore CampaignLib.moveProduction(record, #Failed);
    record.lastError := ?msg;
    record.updatedAt := Time.now();
    dispatchResult(record, false, ?msg);
  };

  private func responseError(prefix : Text, resp : Http.Response) : Text {
    if (resp.status == 0) { prefix # ": " # Fulfilment.scrub(resp.body) } else { prefix # " (HTTP " # resp.status.toText() # "): " # Fulfilment.parseDescription(resp.body) };
  };

  /// Uploads the document, submits the address list, creates and submits the print job.
  /// Safe to re-run: completed steps are skipped.
  public shared ({ caller }) func dispatchPrintJob(campaignId : Text) : async Types.DispatchResult {
    let record = switch (campaigns.get(campaignId)) {
      case (?r) r;
      case null { return { ok = false; error = ?"Campaign not found"; documentId = null; addressListId = null; jobId = null; productionStatus = null } };
    };
    if (not isOwner(record, caller)) { return dispatchResult(record, false, ?"Unauthorized") };
    if (record.paymentStatus != #Paid and record.paymentStatus != #Waived) { return dispatchResult(record, false, ?"Payment required before dispatch") };
    if (record.productionStatus == #Submitted) { return dispatchResult(record, true, null) };
    // Paid records from before payment opened dispatch may still read as
    // awaiting payment; payment was checked just above.
    if (record.productionStatus == #Draft or record.productionStatus == #AwaitingPayment) {
      ignore CampaignLib.moveProduction(record, #ReadyToDispatch);
    };
    if (not CampaignLib.productionMoveAllowed(record.productionStatus, #Processing)) {
      return dispatchResult(record, false, ?"This campaign cannot be dispatched from its current production state");
    };
    // Checked and taken in the same message as the checks above, before the
    // first await, so no interleaving call can get past it.
    if (dispatchInFlight.contains(campaignId)) { return dispatchResult(record, false, ?"Dispatch already in flight for this campaign") };
    let auth = switch (AdminLib.fulfilmentAuth(adminKeysState)) { case (?a) a; case null { return dispatchResult(record, false, ?AdminLib.providerError(adminKeysState, caller, "Print fulfilment credentials not configured (Admin → Print fulfilment)", "Printing isn't available right now. Your payment is recorded; send it to print again a little later.")) } };
    // A real-money order prints only in Production: Staging takes the job
    // but never mails it, and a submitted job cannot be sent again.
    if (record.paymentStatus == #Paid and environmentFor(record) == #Staging) {
      return dispatchResult(record, false, ?AdminLib.providerError(adminKeysState, caller, "Paid orders print only in Production, and the fulfilment environment is Staging (Admin → Print fulfilment). Test-mode orders use Staging.", "Printing isn't available right now. Your payment is recorded; send it to print again a little later."));
    };
    let recipients = switch (campaignRecipients.get(campaignId)) { case (?r) r; case null [] };
    if (recipients.size() == 0) { return dispatchResult(record, false, ?"Campaign has no verified recipients") };
    if (recipients.size() != record.recipientCount) {
      return dispatchResult(record, false, ?("The campaign's recipient list is incomplete (" # recipients.size().toText() # " of " # record.recipientCount.toText() # " stored)"));
    };
    let returnAddress = switch (record.returnAddress) { case (?r) r; case null { return dispatchResult(record, false, ?"A return address is required") } };
    if (record.printDocumentId == null) {
      switch (documentUploads.get(campaignId)) {
        case null { return dispatchResult(record, false, ?"Print document has not been uploaded") };
        case (?u) {
          if (u.receivedChunks != u.totalChunks) { return dispatchResult(record, false, ?"Print document upload is incomplete") };
          // Files staged before the upload limit existed may still be too big.
          if (Limits.stagedBytes(u.chunks, u.totalChunks, 0) > maxDocumentBytes) { return dispatchResult(record, false, ?"The print file is larger than 1.9 MB and cannot be sent to print; upload a smaller export") };
          // A file staged (and paid for) before uploads were checked must
          // still be one front-and-back piece before it reaches the press.
          switch (PrintFile.stagedError(u)) {
            case (?e) { return dispatchResult(record, false, ?(e # " This order is paid, so contact support to have it corrected or refunded.")) };
            case null {};
          };
        };
      };
    };

    // Charged only now, once the run will reach the print partner.
    if (not AdminLib.isAdmin(adminKeysState, caller)) {
      switch (Limits.admit(dispatchRuns, [{ key = campaignId; limit = dispatchRunsPerDay; minGapNs = dispatchGapNs }], Time.now(), dispatchWindowNs)) {
        case (#ok) {};
        case (#wait secs) { return dispatchResult(record, false, ?("Wait " # (secs / 60 + 1).toText() # " minutes before retrying this dispatch")) };
        case (#full) { return dispatchResult(record, false, ?"This campaign has used today's 5 dispatch attempts; try again tomorrow or contact support") };
      };
    };

    dispatchInFlight.add(campaignId);
    ignore CampaignLib.moveProduction(record, #Processing);
    record.lastError := null;
    record.updatedAt := Time.now();
    try {
      let result = await* runDispatch(record, campaignId, auth, recipients, returnAddress);
      switch (result.error) {
        case (?e) { { result with error = ?AdminLib.providerError(adminKeysState, caller, e, Fulfilment.customerError(e)) } };
        case null result;
      };
    } finally {
      dispatchInFlight.remove(campaignId);
      // Every normal exit ends in #Submitted or #Failed. Anything else means a
      // continuation trapped mid-run; the ids of completed steps are kept, so
      // a retry resumes where this run stopped.
      switch (record.productionStatus) {
        case (#Submitted or #Failed) {};
        case (_) {
          ignore CampaignLib.moveProduction(record, #Failed);
          record.lastError := ?"Dispatch was interrupted before the print job was confirmed; completed steps are kept and it is safe to retry";
          record.updatedAt := Time.now();
        };
      };
    };
  };

  /// The four print steps. Runs under `dispatchInFlight`; every return is
  /// `markFailed` or the final `#Submitted` result.
  private func runDispatch(
    record : Types.CampaignRecord,
    campaignId : Text,
    auth : Text,
    recipients : [Common.VerifiedAddress],
    returnAddress : Common.ReturnAddress,
  ) : async* Types.DispatchResult {
    // Fixed by the run that first reaches the print partner; until it holds
    // anything, the current setting applies (and is recorded again).
    if (not partnerHoldsAny(record)) {
      printEnvironments.remove(campaignId);
      printEnvironments.add(campaignId, environmentFor(record));
    };
    let base = Fulfilment.baseUrl(environmentFor(record));
    let opts = AdminLib.outcallOptions(adminKeysState, 256_000);
    // The batches are planned before the first await: a plan that could not
    // be made then fails only this call, never after the document is sent.
    let plan = batchPlan(record, campaignId, recipients);
    // 1. Document
    if (record.printDocumentId == null) {
      let upload = switch (documentUploads.get(campaignId)) { case (?u) u; case null { return markFailed(record, "Print document has not been uploaded") } };
      let bytes = Blob.fromArray(upload.chunks.map(func(b : Blob) : [Nat8] = b.toArray()).flatten());
      let boundary = "----EZmailoutBoundary" # Time.now().toText();
      let fileName = if (upload.fileName == "") { campaignId # ".pdf" } else { upload.fileName };
      let body = Fulfilment.buildDocumentMultipart(boundary, [
        ("documentName", record.name # " (" # campaignId # ")"),
        ("documentClass", record.printSpec.documentClass),
        ("documentFormat", Fulfilment.documentFormat(upload.mimeType)),
      ], fileName, upload.mimeType, bytes);
      let resp = await* Http.postBlob(base # "/documents", Fulfilment.jsonHeaders(auth, "multipart/form-data; boundary=" # boundary), body, opts, transformFn);
      if (not Http.isSuccess(resp) or Fulfilment.reportedFailure(resp.body)) { return markFailed(record, responseError("Document upload failed", resp)) };
      switch (Fulfilment.parseId(resp.body)) {
        case (?id) { record.printDocumentId := ?id; ignore CampaignLib.moveProduction(record, #DocumentUploaded); record.updatedAt := Time.now(); documentUploads.remove(campaignId) };
        case null { return markFailed(record, "Document upload returned no id") };
      };
    };

    // 2–4. One address list and print job per batch (`batchPlan`), each
    // listed, created and submitted in turn; a batch already submitted is
    // skipped, so a retry resumes at the first unfinished one.
    let documentId = switch (record.printDocumentId) { case (?d) d; case null "" };
    let batches = plan.size();
    var alreadySubmitted = 0;
    for (i in plan.keys()) {
      var b = batchAt(campaignId, i);
      if (not b.submitted) {
        let which = if (batches == 1) "" else " (batch " # (i + 1).toText() # " of " # batches.toText() # ")";
        // A job from an earlier run may have been submitted even though that
        // run never heard back (a timed-out submit), so it is checked first.
        let jobFromEarlierRun = b.jobId != null;

        if (b.addressListId == null) {
          let listName = record.name # " " # campaignId # (if (batches == 1) "" else " " # (i + 1).toText() # "/" # batches.toText());
          let xml = Fulfilment.buildAddressListXml(listName, recipients.sliceToArray(b.first, b.first + b.count));
          let resp = await* Http.postText(base # "/addressLists", Fulfilment.jsonHeaders(auth, "application/xml"), xml, opts, transformFn);
          if (not Http.isSuccess(resp) or Fulfilment.reportedFailure(resp.body)) { return markBatchFailed(record, campaignId, batches, responseError("Address list submission failed" # which, resp)) };
          switch (Fulfilment.parseId(resp.body)) {
            case (?id) {
              b := { b with addressListId = ?id };
              saveBatch(campaignId, i, b);
              if (i == 0) { record.printAddressListId := ?id };
              ignore CampaignLib.moveProduction(record, #AddressListReady);
              record.updatedAt := Time.now();
            };
            case null { return markBatchFailed(record, campaignId, batches, "Address list returned no id" # which) };
          };
        };

        if (b.jobId == null) {
          let addressListId = switch (b.addressListId) { case (?a) a; case null "" };
          let form = Fulfilment.buildJobForm(record.printSpec, documentId, addressListId, returnAddress);
          let resp = await* Http.postText(base # "/jobs", Fulfilment.jsonHeaders(auth, "application/x-www-form-urlencoded"), form, opts, transformFn);
          if (not Http.isSuccess(resp) or Fulfilment.reportedFailure(resp.body)) { return markBatchFailed(record, campaignId, batches, responseError("Job creation failed" # which, resp)) };
          switch (Fulfilment.parseId(resp.body)) {
            case (?id) {
              b := { b with jobId = ?id };
              saveBatch(campaignId, i, b);
              if (i == 0) { record.printJobId := ?id };
              ignore CampaignLib.moveProduction(record, #JobCreated);
              record.updatedAt := Time.now();
            };
            case null { return markBatchFailed(record, campaignId, batches, "Job creation returned no id" # which) };
          };
        };

        // Submit, unless an earlier run's submit already went through.
        let jobId = switch (b.jobId) { case (?j) j; case null "" };
        var done = false;
        if (jobFromEarlierRun) {
          let probe = await* Http.get(base # "/jobs/" # jobId, Fulfilment.jsonHeaders(auth, "application/json"), AdminLib.outcallOptions(adminKeysState, 64_000), transformFn);
          if (Http.isSuccess(probe) and Fulfilment.jobSubmitted(probe.body) == ?true) { done := true; alreadySubmitted += 1 };
        };
        // A refund can land while the run waits on the print partner: a
        // refunded order must not be submitted (submitting is what prints
        // and bills it).
        if (not done and record.paymentStatus != #Paid and record.paymentStatus != #Waived) {
          return markBatchFailed(record, campaignId, batches, "This order was refunded while it was being sent to print, so it was not submitted");
        };
        if (not done) {
          let submit = await* Http.postText(base # "/jobs/" # jobId # "/submit", Fulfilment.jsonHeaders(auth, "application/x-www-form-urlencoded"), Fulfilment.formEncode([("billingType", "User Credit")]), opts, transformFn);
          if (not Http.isSuccess(submit) or Fulfilment.reportedFailure(submit.body)) {
            if (jobFromEarlierRun and Fulfilment.submittedAlready(submit.body)) {
              alreadySubmitted += 1;
            } else {
              return markBatchFailed(record, campaignId, batches, responseError("Job submission failed" # which, submit));
            };
          };
        };
        b := { b with submitted = true };
        saveBatch(campaignId, i, b);
      };
    };
    let firstJob = switch (record.printJobId) { case (?j) j; case null "" };
    let detail = if (batches == 1) {
      if (alreadySubmitted == 1) "This print job was already submitted; it was not submitted again" else "Print job submitted for production";
    } else {
      batches.toText() # " print jobs submitted for production (" # recipients.size().toText() # " pieces)" # (if (alreadySubmitted > 0) "; " # alreadySubmitted.toText() # " had already been submitted and were not submitted again" else "");
    };
    markSubmitted(record, campaignId, firstJob, detail);
  };

  /// `markFailed` for a batch step: once earlier batches are in production
  /// the error says so (`Fulfilment.partialFailure`).
  private func markBatchFailed(record : Types.CampaignRecord, campaignId : Text, batches : Nat, msg : Text) : Types.DispatchResult {
    var submitted = 0;
    switch (printBatches.get(campaignId)) {
      case (?p) { for (b in p.vals()) { if (b.submitted) { submitted += 1 } } };
      case null {};
    };
    markFailed(record, if (submitted == 0) msg else Fulfilment.partialFailure(submitted, batches, msg));
  };

  /// The print batches of a campaign: the stored plan, or a new one from its
  /// recipients. A campaign whose address list was already uploaded whole
  /// (by a run from before batching) keeps that one list as its only batch.
  private func batchPlan(record : Types.CampaignRecord, campaignId : Text, recipients : [Common.VerifiedAddress]) : [Types.PrintBatch] {
    switch (printBatches.get(campaignId)) {
      case (?plan) { if (plan.size() > 0) { return plan } };
      case null {};
    };
    let slices = if (record.printAddressListId != null) [(0, recipients.size())] else Fulfilment.addressListBatches(recipients, Fulfilment.maxAddressListBytes);
    let plan = Array.tabulate(slices.size(), func(i : Nat) : Types.PrintBatch {
      let (first, count) = slices[i];
      if (i == 0) {
        { first; count; addressListId = record.printAddressListId; jobId = record.printJobId; submitted = false };
      } else {
        { first; count; addressListId = null; jobId = null; submitted = false };
      };
    });
    printBatches.add(campaignId, plan);
    plan;
  };

  private func batchAt(campaignId : Text, i : Nat) : Types.PrintBatch {
    switch (printBatches.get(campaignId)) {
      case (?plan) plan[i];
      case null Runtime.trap("print batches missing for " # campaignId);
    };
  };

  private func saveBatch(campaignId : Text, i : Nat, b : Types.PrintBatch) {
    switch (printBatches.get(campaignId)) {
      case (?plan) { printBatches.add(campaignId, Array.tabulate<Types.PrintBatch>(plan.size(), func(j) = if (j == i) b else plan[j])) };
      case null {};
    };
  };

  /// Every print job of a campaign: its batches' jobs, or the record's one
  /// job for a campaign dispatched before batching.
  private func jobIdsOf(record : Types.CampaignRecord) : [Text] {
    switch (printBatches.get(record.id)) {
      case (?plan) {
        let ids = List.empty<Text>();
        for (b in plan.vals()) { switch (b.jobId) { case (?j) ids.add(j); case null {} } };
        if (ids.size() > 0) { return ids.toArray() };
      };
      case null {};
    };
    switch (record.printJobId) { case (?j) [j]; case null [] };
  };

  private func markSubmitted(record : Types.CampaignRecord, campaignId : Text, jobId : Text, detail : Text) : Types.DispatchResult {
    ignore CampaignLib.moveProduction(record, #Submitted);
    record.lastError := null;
    record.updatedAt := Time.now();
    if (CampaignLib.advanceStatus(record, #InProduction)) {
      CampaignLib.appendEvent(trackingEvents, state, campaignId, #InProduction, "job.submitted", jobId, #System, ?detail);
    };
    dispatchResult(record, true, null);
  };

  // ─── Tracking ────────────────────────────────────────────────────────────

  /// Reads every print job of the campaign and advances its timeline by the
  /// scans of all its pieces together.
  private func syncOne(record : Types.CampaignRecord) : async* Types.SyncResult {
    let jobIds = jobIdsOf(record);
    if (jobIds.size() == 0) { return { ok = false; error = ?"Campaign has not been dispatched"; status = ?record.status; newEvents = 0; cached = false } };
    let jobId = jobIds[0];
    let auth = switch (AdminLib.fulfilmentAuth(adminKeysState)) { case (?a) a; case null { return { ok = false; error = ?"Print fulfilment credentials not configured"; status = ?record.status; newEvents = 0; cached = false } } };
    let base = Fulfilment.baseUrl(environmentFor(record));
    let headers = Fulfilment.jsonHeaders(auth, "application/json");
    let statuses = List.empty<Text>();
    let pieces = List.empty<Text>();
    var answered = false;
    var unanswered = 0;
    var firstFailure : ?Http.Response = null;
    for (job in jobIds.vals()) {
      let jobResp = await* Http.get(base # "/jobs/" # job, headers, AdminLib.outcallOptions(adminKeysState, 64_000), transformFn);
      if (Http.isSuccess(jobResp)) {
        answered := true;
        switch (Json.getString(jobResp.body, "status")) { case (?s) statuses.add(s); case null {} };
        switch (Json.xmlTag(jobResp.body, "status")) { case (?s) statuses.add(s); case null {} };
        statuses.add(Fulfilment.parseDescription(jobResp.body));
      } else if (firstFailure == null) { firstFailure := ?jobResp };
      // A job's tracking is read page by page (a large batch's scans outgrow
      // one reply) and counts only when every page was read: judging a job
      // on some of its pieces could settle the campaign wrongly.
      let jobPieces = Fulfilment.newTally();
      var page = 1;
      var pageCount = 1;
      var firstPage = "";
      var complete = false;
      label pages loop {
        let trackResp = await* Http.get(base # Fulfilment.trackingPath(job, page), headers, AdminLib.outcallOptions(adminKeysState, Fulfilment.maxTrackingPageBytes), transformFn);
        if (not Http.isSuccess(trackResp)) break pages;
        if (page == 1) {
          firstPage := trackResp.body;
          pageCount := switch (Fulfilment.trackingPageCount(trackResp.body)) { case (?n) n; case null 1 };
          if (pageCount > Fulfilment.maxTrackingPages) break pages;
        } else if (trackResp.body == firstPage) {
          // The page was not served (the same reply again): the rest of the
          // job's pieces cannot be read.
          break pages;
        };
        Fulfilment.addTrackingPage(jobPieces, trackResp.body);
        if (page >= pageCount) { complete := true; break pages };
        page += 1;
      };
      if (complete) {
        answered := true;
        for (p in Fulfilment.tallyStatuses(jobPieces).vals()) { pieces.add(p) };
      } else { unanswered += 1 };
    };
    if (not answered) {
      let failed = switch (firstFailure) { case (?r) r; case null { { status = 0; body = "no answer" } } };
      return { ok = false; error = ?responseError("Tracking lookup failed", failed); status = ?record.status; newEvents = 0; cached = false };
    };
    // A campaign sent as several jobs moves only on the scans of all of
    // them: a stage read from the jobs that answered could mark the whole
    // campaign delivered (or returned) from a few of its pieces, and the
    // timeline never moves back.
    if (jobIds.size() > 1 and unanswered > 0) {
      return { ok = true; error = null; status = ?record.status; newEvents = 0; cached = false };
    };
    let pieceStatuses = pieces.toArray();
    let stage = if (pieceStatuses.size() > 0) {
      Fulfilment.aggregateStage(pieceStatuses, record.recipientCount);
    } else {
      Fulfilment.aggregateStage(statuses.toArray(), 0);
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

  /// Polls the print partner for IMb scan events and advances the timeline.
  /// Owners get the stored state instead of a new lookup once tracking is
  /// finished (`CampaignLib.trackingFinished`) or within 6 hours of the last
  /// lookup; controllers and the admin can still force one.
  public shared ({ caller }) func syncPrintTracking(campaignId : Text) : async Types.SyncResult {
    switch (campaigns.get(campaignId)) {
      case null { { ok = false; error = ?"Campaign not found"; status = null; newEvents = 0; cached = false } };
      case (?record) {
        if (not isOwner(record, caller)) { return { ok = false; error = ?"Unauthorized"; status = null; newEvents = 0; cached = false } };
        // Only a call that will reach the print partner is rate-limited; the early
        // returns in `syncOne` cost nothing. Checked and stamped before the
        // first await, so concurrent calls cannot both get through.
        if (record.printJobId != null and AdminLib.hasFulfilment(adminKeysState)) {
          let now = Time.now();
          if (not AdminLib.isAdmin(adminKeysState, caller)) {
            if (CampaignLib.trackingFinished(record)) {
              return { ok = true; error = null; status = ?record.status; newEvents = 0; cached = true };
            };
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
        let result = await* syncOne(record);
        switch (result.error) {
          case (?e) { { result with error = ?AdminLib.providerError(adminKeysState, caller, e, Fulfilment.customerError(e)) } };
          case null result;
        };
      };
    };
  };

  /// Syncs in-flight campaigns, up to 10 print jobs in all (a campaign
  /// split into several jobs counts each), and returns how many campaigns
  /// were synced: the ones whose last lookup is oldest (never looked up
  /// first), so every campaign is reached in turn instead of the same first
  /// ones by id on every run.
  /// Private: the 6-hourly timer in `main.mo` calls it directly, so it is not
  /// reachable as a canister method.
  private func pollActiveCampaigns() : async* Nat {
    if (pollRunning or not AdminLib.hasFulfilment(adminKeysState)) { return 0 };
    let inFlight = List.empty<(Int, Types.CampaignRecord)>();
    for ((_, r) in campaigns.entries()) {
      // A campaign whose timeline has not moved for `trackingQuietNs` is
      // left to its owner's lookups and webhooks: mail with no IMb scans
      // (EDDM) would otherwise be polled forever, crowding out live ones.
      if (r.printJobId != null and not CampaignLib.trackingFinished(r) and Time.now() - r.updatedAt <= trackingQuietNs) {
        inFlight.add((switch (syncCooldowns.get(r.id)) { case (?t) t; case null 0 }, r));
      };
    };
    let pending = inFlight.toArray().sort(func(a : (Int, Types.CampaignRecord), b : (Int, Types.CampaignRecord)) : Order.Order = Int.compare(a.0, b.0));
    pollRunning := true;
    var synced = 0;
    var jobs = 0;
    try {
      for ((_, r) in pending.vals()) {
        // The first campaign is always looked up, however many jobs it has.
        let cost = jobIdsOf(r).size();
        if (synced == 0 or jobs + cost <= maxPollJobsPerTick) {
          syncCooldowns.add(r.id, Time.now());
          ignore await* syncOne(r);
          synced += 1;
          jobs += cost;
        };
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
    await* pollActiveCampaigns();
  };

  // ─── Webhooks ────────────────────────────────────────────────────────────

  /// The campaign holding print job `jobId`, or null when none does or when
  /// several do: Staging and Production number jobs separately, so a test
  /// campaign and a live one can hold the same id, and an event for one must
  /// never move the other (the partner can send `campaignId` instead).
  private func findByJobId(jobId : Text) : ?Types.CampaignRecord {
    let found = Set.empty<Text>();
    for ((id, r) in campaigns.entries()) {
      if (r.printJobId == ?jobId) { found.add(id) };
    };
    // Jobs of a campaign's later batches.
    for ((id, plan) in printBatches.entries()) {
      for (b in plan.vals()) {
        if (b.jobId == ?jobId) { found.add(id) };
      };
    };
    if (found.size() != 1) return null;
    switch (found.values().next()) { case (?id) campaigns.get(id); case null null };
  };

  /// How far back a redelivered webhook is looked for. Redeliveries come
  /// within hours, so the newest events are enough, and the check stays a
  /// bounded scan however long the log grows.
  transient let webhookDedupWindow : Nat = 5_000;

  private func recentEventRecorded(campaignId : Text, providerEventId : Text) : Bool {
    var seen = 0;
    for (e in trackingEvents.reverseValues()) {
      if (seen >= webhookDedupWindow) { return false };
      if (e.campaignId == campaignId and e.providerEventId == providerEventId) { return true };
      seen += 1;
    };
    false;
  };

  private func processWebhook(secret : Text, payload : Text) : Types.WebhookResult {
    let expected = switch (adminKeysState.webhookSecret) { case (?s) s; case null { return { ok = false; error = ?"Webhook secret not configured; rejecting"; campaignId = null; status = null } } };
    if (not Secrets.equal(secret, expected)) { return { ok = false; error = ?"Unauthorized"; campaignId = null; status = null } };
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
    // Nothing at the print partner can report on a campaign it never received.
    if (record.printJobId == null) { return { ok = false; error = ?"Campaign has not been sent to print"; campaignId = ?record.id; status = ?record.status } };
    var eventText = "";
    for (k in ["event", "status", "scanEvent", "scanDescription", "eventType"].vals()) {
      if (eventText == "") {
        switch (Json.getString(payload, k)) { case (?v) { eventText := Limits.clip(Fulfilment.scrub(AddressLib.sanitizeText(v)), Inputs.maxEventTextChars) }; case null {} };
      };
    };
    let status = switch (CampaignLib.statusFromText(eventText)) {
      case (?s) s;
      case null { return { ok = false; error = ?("Unrecognized event: " # eventText); campaignId = ?record.id; status = ?record.status } };
    };
    let givenEventId : ?Text = switch (Json.getString(payload, "eventId")) {
      case (?e) ?Limits.clip(e, Inputs.maxEventIdChars);
      case null { switch (Json.getString(payload, "id")) { case (?e) ?Limits.clip(e, Inputs.maxEventIdChars); case null null } };
    };
    // Webhook senders retry until they get a 2xx, so one event can arrive
    // several times: an event id already recorded for this campaign among the
    // recent events is acknowledged without being recorded again.
    switch (givenEventId) {
      case (?eid) {
        if (recentEventRecorded(record.id, eid)) {
          return { ok = true; error = null; campaignId = ?record.id; status = ?record.status };
        };
      };
      case null {};
    };
    let providerEventId = switch (givenEventId) { case (?e) e; case null ("webhook:" # Time.now().toText()) };
    let ts : Int = switch (Json.getNumber(payload, "timestamp")) {
      case (?t) { if (t > 100_000_000_000_000) t else if (t > 100_000_000_000) t * 1_000_000 else if (t > 0) t * 1_000_000_000 else Time.now() };
      case null Time.now();
    };
    // One webhook speaks for one piece (or one job). An outcome (delivered,
    // undeliverable, returned) settles the campaign and ends its tracking,
    // so for more than one piece or print job it is left to tracking, which
    // weighs every piece's scans (`aggregateStage`) across every job.
    let outcome = CampaignLib.stageIndex(status) >= CampaignLib.stageIndex(#Delivered);
    let onePiece = record.recipientCount <= 1 and (switch (printBatches.get(record.id)) { case (?b) b.size() <= 1; case null true });
    let deferred = outcome and not onePiece;
    let advanced = if (deferred) false else CampaignLib.advanceStatus(record, status);
    let evtId = state.nextEventId;
    state.nextEventId += 1;
    // A job whose submission was never confirmed keeps the event as evidence
    // (a retried dispatch checks the job itself) without moving the timeline.
    let note = if (advanced) "" else if (record.productionStatus != #Submitted) " (not applied: submission not confirmed)" else if (deferred) " (recorded; the campaign's outcome follows its tracking across every piece)" else " (no stage change)";
    trackingEvents.add({ id = evtId; campaignId = record.id; status; eventType = "webhook." # CampaignLib.stageName(status); timestamp = ts; providerEventId; source = #Webhook; detail = ?(eventText # note) });
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
    if (req.method == "POST" and AdminLib.isWebhookPath(p)) {
      return { status_code = 200; headers = []; body = Blob.empty(); upgrade = ?true };
    };
    Http.textResponse(404, "application/json", "{\"error\":\"not found\"}");
  };

  public shared func http_request_update(req : Http.HttpRequest) : async Http.HttpResponse {
    let p = Http.path(req.url);
    if (req.method != "POST" or not AdminLib.isWebhookPath(p)) {
      return Http.textResponse(404, "application/json", "{\"error\":\"not found\"}");
    };
    // Header only: a secret in the URL (`?secret=`) would be written to the
    // access logs of every proxy and gateway on the way, so it is ignored and
    // such a request is refused like one without a secret.
    let secret = switch (Http.headerValue(req, "x-ezmailout-secret")) { case (?s) s; case null "" };
    let payload = switch (req.body.decodeUtf8()) { case (?t) t; case null "" };
    let result = processWebhook(secret, payload);
    let body = "{\"ok\":" # (if (result.ok) "true" else "false") # ",\"error\":" # (switch (result.error) { case (?e) Json.str(e); case null "null" }) # ",\"campaignId\":" # (switch (result.campaignId) { case (?c) Json.str(c); case null "null" }) # "}";
    let code : Nat16 = if (result.ok) 200 else if (result.error == ?"Unauthorized" or result.error == ?"Webhook secret not configured; rejecting") 401 else 400;
    Http.textResponse(code, "application/json", body);
  };
};
