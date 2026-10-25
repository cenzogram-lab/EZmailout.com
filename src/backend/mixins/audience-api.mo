/// Address verification via print address lists and saved audience presets.
import Types "../types/campaign";
import Common "../types/common";
import AddressLib "../lib/address";
import AdminLib "../lib/admin";
import Fulfilment "../lib/fulfilment";
import Http "../lib/http";
import Json "../lib/json";
import Limits "../lib/limits";
import Inputs "../lib/inputs";
import Map "mo:core/Map";
import List "mo:core/List";
import Array "mo:core/Array";
import VarArray "mo:core/VarArray";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Nat64 "mo:core/Nat64";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";

mixin (
  savedAudiencePresets : Map.Map<Text, [Common.VerifiedAddress]>,
  presetMeta : Map.Map<Text, Types.AudiencePreset>,
  state : Common.Counters,
  adminKeysState : Common.AdminState,
  transformFn : Http.TransformFn,
) {
  /// Addresses one message carries: a verification batch (its list goes to
  /// the print partner in one outcall), or a chunk of a saved audience (an
  /// ingress message is at most 2 MB). A saved audience itself has no size
  /// limit; a larger one is saved in chunks with `addPresetAddresses`.
  transient let maxAddresses : Nat = 5_000;
  // Presets cost nothing to save, so what one identity can keep is bounded
  // like its unpaid drafts are.
  transient let maxPresetsPerOwner : Nat = 20;
  transient let maxPresetAddressesPerOwner : Nat = 1_000_000;
  // Identities are free to mint, so the per-owner bounds need canister-wide
  // partners or stable memory could still grow without limit.
  transient let maxPresetsGlobal : Nat = 50_000;
  transient let maxPresetAddressesGlobal : Nat = 5_000_000;
  /// Rolling per-account verification quota (transient: a fresh window after upgrades).
  transient let verifyWindowNs : Int = 3_600_000_000_000;
  // Sized so one account can verify a 250,000-address list within the hour
  // (50 batches of 5,000); campaigns have no recipient limit.
  transient let verifyAddressesPerWindow : Nat = 250_000;
  transient let verifyUsage = Map.empty<Text, { var windowStart : Int; var addresses : Nat }>();

  // Every verification is two print outcalls whatever the batch size, so
  // calls are budgeted as well as addresses: per identity (identities are
  // free to mint), for the whole canister, and with a gap between one
  // identity's calls so one-address batches cannot be streamed.
  transient let verifyCallsPerHour : Nat = 60;
  transient let verifyCallsPerHourGlobal : Nat = 300;
  transient let verifyMinGapNs : Int = 5_000_000_000;
  transient let verifyCalls = Map.empty<Text, Limits.Window>();
  transient let verifyGlobalKey : Text = "*";

  /// Response budget for a batch: up to 1 KB of detail per address plus
  /// headroom, instead of a flat 1.5 MB (outcalls are charged on the budget,
  /// and an answer larger than it fails the call).
  private func verifyResponseBytes(addresses : Nat) : Nat64 {
    Nat64.fromNat(Nat.min(1_500_000, 32_000 + addresses * 1_000));
  };

  /// Why this caller's verification must wait, or null when it may go ahead.
  /// Only reads: the call is recorded once every budget has been checked.
  private func verifyCallBlocked(userId : Text, now : Int) : ?Text {
    switch (Limits.check(verifyCalls.get(verifyGlobalKey), now, verifyWindowNs, verifyCallsPerHourGlobal, 0)) {
      case (#ok) {};
      case _ { return ?"Address verification is busy right now; try again in a few minutes" };
    };
    switch (Limits.check(verifyCalls.get(userId), now, verifyWindowNs, verifyCallsPerHour, verifyMinGapNs)) {
      case (#ok) null;
      case (#wait secs) ?("Wait " # secs.toText() # " seconds before verifying another list");
      case (#full) ?"Hourly address-verification limit reached for this account; try again later";
    };
  };

  /// Charges `count` addresses against the caller's hourly quota; false when exceeded.
  private func chargeVerifyQuota(userId : Text, count : Nat) : Bool {
    let now = Time.now();
    // Keyed by caller, and identities are free: drop finished windows once
    // the map grows, like every other rate map.
    if (verifyUsage.size() > Limits.sweepAbove) {
      for ((k, u) in verifyUsage.entries().toArray().vals()) {
        if (now - u.windowStart > verifyWindowNs) { verifyUsage.remove(k) };
      };
    };
    if (verifyCalls.size() > Limits.sweepAbove) { Limits.sweep(verifyCalls, now, verifyWindowNs) };
    switch (verifyUsage.get(userId)) {
      case (?usage) {
        if (now - usage.windowStart > verifyWindowNs) {
          usage.windowStart := now;
          usage.addresses := 0;
        };
        if (usage.addresses + count > verifyAddressesPerWindow) { return false };
        usage.addresses += count;
        true;
      };
      case null {
        verifyUsage.add(userId, { var windowStart = now; var addresses = count });
        true;
      };
    };
  };

  transient let signInRequired : Text = "Sign in with Internet Identity to use saved audience presets";

  private func invalidResult(addr : Common.AddressInput, msg : Text) : Common.AddressVerificationResult {
    { input = addr; verified = null; isValid = false; errorMessage = ?msg };
  };

  private func batch(ok : Bool, error : ?Text, results : [Common.AddressVerificationResult], listId : ?Text) : Common.VerificationBatchResult {
    var valid = 0;
    for (r in results.vals()) { if (r.isValid) { valid += 1 } };
    { ok; error; results; addressListId = listId; validCount = valid; invalidCount = results.size() - valid };
  };

  /// Per-address detail objects from an address-list response, when the API returns them.
  private func addressDetailRecords(body : Text) : [Text] {
    Json.splitTopLevelObjects(body).filter(func(o : Text) : Bool {
      Json.getString(o, "Address1") != null or Json.getString(o, "address1") != null or Json.getString(o, "Postalcode") != null or Json.getString(o, "postalCode") != null;
    });
  };

  private func detailZip(obj : Text) : ?Text {
    switch (Json.getString(obj, "Postalcode")) {
      case (?z) ?z;
      case null {
        switch (Json.getString(obj, "postalCode")) { case (?z) ?z; case null Json.getString(obj, "zip") };
      };
    };
  };

  private func detailInvalid(obj : Text) : ?Text {
    for (key in ["status", "deliverability", "result", "error"].vals()) {
      switch (Json.getString(obj, key)) {
        case (?v) {
          let t = v.toLower();
          if (t.contains(#text "invalid") or t.contains(#text "undeliverable") or t.contains(#text "error") or t.contains(#text "fail")) { return ?v };
        };
        case null {};
      };
    };
    null;
  };

  /// CASS-scrubs a batch through the print partner's address-list API (fail-closed).
  public shared ({ caller }) func verifyAddresses(addresses : [Common.AddressInput]) : async Common.VerificationBatchResult {
    if (caller.isAnonymous()) { return batch(false, ?"Sign in with Internet Identity to verify addresses", [], null) };
    if (addresses.size() == 0) { return batch(false, ?"No addresses supplied", [], null) };
    if (addresses.size() > maxAddresses) { return batch(false, ?"Verify at most 5,000 addresses per batch", [], null) };
    let sanitized = addresses.map(AddressLib.sanitize);
    let results = VarArray.tabulate<Common.AddressVerificationResult>(sanitized.size(), func(i) {
      let a = sanitized[i];
      switch (AddressLib.validateLocal(a)) {
        case (?msg) invalidResult(a, msg);
        case null { { input = a; verified = null; isValid = false; errorMessage = ?"pending" } };
      };
    });
    let candidateIdx = List.empty<Nat>();
    var i = 0;
    while (i < sanitized.size()) {
      if (results[i].errorMessage == ?"pending") { candidateIdx.add(i) };
      i += 1;
    };
    let markAll = func(msg : Text) {
      for (idx in candidateIdx.values()) { results[idx] := invalidResult(sanitized[idx], msg) };
    };
    if (candidateIdx.size() == 0) { return batch(true, null, results.toArray(), null) };
    let auth = switch (AdminLib.fulfilmentAuth(adminKeysState)) {
      case (?a) a;
      case null {
        markAll("Address verification is not configured yet");
        return batch(false, ?"Address verification is not configured yet", results.toArray(), null);
      };
    };
    let candidates = candidateIdx.toArray().map(func(idx : Nat) : Common.AddressInput = sanitized[idx]);
    // Budgets are checked and charged together, in this message, before the
    // first await: only a batch that will reach the print partner counts.
    let userId = caller.toText();
    let now = Time.now();
    switch (verifyCallBlocked(userId, now)) {
      case (?msg) {
        markAll(msg);
        return batch(false, ?msg, results.toArray(), null);
      };
      case null {};
    };
    if (not chargeVerifyQuota(userId, candidates.size())) {
      let msg = "Hourly address-verification limit reached for this account; try again later";
      markAll(msg);
      return batch(false, ?msg, results.toArray(), null);
    };
    Limits.commit(verifyCalls, userId, now, verifyWindowNs);
    Limits.commit(verifyCalls, verifyGlobalKey, now, verifyWindowNs);
    let base = Fulfilment.baseUrl(adminKeysState.fulfilmentEnvironment);
    let listName = "EZmailout verify " # Time.now().toText();
    let xml = Fulfilment.buildVerificationXml(listName, candidates);
    let opts = AdminLib.outcallOptions(adminKeysState, verifyResponseBytes(candidates.size()));
    let resp = await* Http.postText(base # "/addressLists", Fulfilment.jsonHeaders(auth, "application/xml"), xml, opts, transformFn);
    if (not Http.isSuccess(resp) or Fulfilment.reportedFailure(resp.body)) {
      // The detail (a network error, the partner's own wording) is for the
      // admin; customers get plain advice.
      let msg = if (resp.status == 0) {
        AdminLib.providerError(adminKeysState, caller, Fulfilment.scrub(resp.body), "Address verification is unavailable right now; try again in a few minutes");
      } else {
        AdminLib.providerError(adminKeysState, caller, "The address list was rejected: " # Fulfilment.parseDescription(resp.body), "The address list was rejected. Check the addresses for typos and try again.");
      };
      markAll(msg);
      return batch(false, ?msg, results.toArray(), null);
    };
    let listId = switch (Fulfilment.parseId(resp.body)) {
      case (?id) id;
      case null {
        markAll("Address verification returned no address list id");
        return batch(false, ?"Unexpected address verification response", results.toArray(), null);
      };
    };
    let detail = await* Http.get(base # "/addressLists/" # listId, Fulfilment.jsonHeaders(auth, "application/json"), opts, transformFn);
    // Fail-closed: without the verification result nothing counts as checked.
    // (A result that lists no per-address detail is the list accepted as a
    // whole, handled below; an error or no answer is not.)
    if (not Http.isSuccess(detail) or Fulfilment.reportedFailure(detail.body)) {
      let msg = "Address verification did not finish; try again in a few minutes";
      markAll(msg);
      return batch(false, ?msg, results.toArray(), ?listId);
    };
    let objects = addressDetailRecords(detail.body);
    // Per-address detail that does not line up one-to-one with the batch
    // cannot say which address is which: nothing counts as checked.
    if (objects.size() > 0 and objects.size() != candidates.size()) {
      let msg = "Address verification returned an incomplete result; try again in a few minutes";
      markAll(msg);
      return batch(false, ?msg, results.toArray(), ?listId);
    };
    var k = 0;
    for (idx in candidateIdx.values()) {
      let a = sanitized[idx];
      if (objects.size() == candidates.size()) {
        let obj = objects[k];
        switch (detailInvalid(obj)) {
          case (?why) { results[idx] := invalidResult(a, "Address not deliverable (" # why # ")") };
          case null {
            let zip = switch (detailZip(obj)) { case (?z) z; case null a.zip_code };
            let verified = AddressLib.toVerified({ a with zip_code = zip }, AddressLib.zipPlus4Of(zip));
            results[idx] := { input = a; verified = ?verified; isValid = true; errorMessage = null };
          };
        };
      } else {
        // No per-address detail: the list was accepted as a whole.
        results[idx] := { input = a; verified = ?AddressLib.toVerified(a, null); isValid = true; errorMessage = null };
      };
      k += 1;
    };
    batch(true, null, results.toArray(), ?listId);
  };

  // ─── Saved audience presets ─────────────────────────────────────────────

  private func key(owner : Text, presetId : Text) : Text { owner # "/" # presetId };

  private func presetShared(p : Types.AudiencePreset) : Types.AudiencePresetShared {
    { id = p.id; ownerId = p.ownerId; name = p.name; sourceCampaignId = p.sourceCampaignId; recipientCount = p.recipientCount; createdAt = p.createdAt; updatedAt = p.updatedAt };
  };

  /// Name and address bounds for a preset (lib/inputs.mo).
  private func presetInputError(name : Text, addresses : [Common.VerifiedAddress]) : ?Text {
    if (AddressLib.sanitizeText(name).size() > Inputs.maxPresetNameChars) {
      return ?("Preset names are limited to " # Inputs.maxPresetNameChars.toText() # " characters");
    };
    switch (Inputs.firstLongRecipient(addresses.map(AddressLib.sanitizeVerified))) {
      case (?i) ?("Address " # (i + 1).toText() # " has a line longer than " # Inputs.maxAddressFieldChars.toText() # " characters");
      case null null;
    };
  };

  /// Presets other than `except`: the owner's count and addresses, and the
  /// canister's count and addresses.
  private func presetTotals(owner : Text, except : ?Text) : { presets : Nat; addresses : Nat; allPresets : Nat; allAddresses : Nat } {
    var presets = 0;
    var addresses = 0;
    var allPresets = 0;
    var allAddresses = 0;
    for ((_, p) in presetMeta.entries()) {
      let same = p.ownerId == owner and ?p.id == except;
      if (not same) {
        allPresets += 1;
        allAddresses += p.recipientCount;
        if (p.ownerId == owner) {
          presets += 1;
          addresses += p.recipientCount;
        };
      };
    };
    { presets; addresses; allPresets; allAddresses };
  };

  private func presetQuotaError(t : { presets : Nat; addresses : Nat; allPresets : Nat; allAddresses : Nat }, adding : Nat) : ?Text {
    if (t.addresses + adding > maxPresetAddressesPerOwner) {
      ?"Saved audiences may hold at most 1,000,000 addresses in total. Delete a preset you no longer need first.";
    } else if (t.allAddresses + adding > maxPresetAddressesGlobal) {
      ?"Saved audiences can't take more addresses right now. You can still mail this list; contact support if you need to keep it.";
    } else null;
  };

  private func cleanName(name : Text) : Text {
    let t = AddressLib.sanitizeText(name);
    if (t == "") "Audience preset" else t;
  };

  /// Save an address list as a reusable named preset for the caller.
  public shared ({ caller }) func savePreset(name : Text, addresses : [Common.VerifiedAddress], sourceCampaignId : ?Text) : async Types.PresetResult {
    if (caller.isAnonymous()) { return { ok = false; error = ?signInRequired; presetId = null } };
    if (addresses.size() == 0) { return { ok = false; error = ?"A preset needs at least one address"; presetId = null } };
    if (addresses.size() > maxAddresses) { return { ok = false; error = ?"Send at most 5,000 addresses with savePreset and add the rest with addPresetAddresses"; presetId = null } };
    switch (presetInputError(name, addresses)) { case (?e) { return { ok = false; error = ?e; presetId = null } }; case null {} };
    switch (sourceCampaignId) {
      case (?c) { if (c.size() > Inputs.maxIdChars) { return { ok = false; error = ?"The source campaign reference is too long"; presetId = null } } };
      case null {};
    };
    let owner = caller.toText();
    let totals = presetTotals(owner, null);
    if (totals.presets >= maxPresetsPerOwner) {
      return { ok = false; error = ?"You can keep up to 20 saved audiences. Delete one you no longer need first."; presetId = null };
    };
    if (totals.allPresets >= maxPresetsGlobal) {
      return { ok = false; error = ?"Saved audiences can't take new lists right now. You can still mail this list; contact support if you need to keep it."; presetId = null };
    };
    switch (presetQuotaError(totals, addresses.size())) { case (?e) { return { ok = false; error = ?e; presetId = null } }; case null {} };
    let id = "pre_" # state.nextPresetId.toText();
    state.nextPresetId += 1;
    let now = Time.now();
    let clean = addresses.map(AddressLib.sanitizeVerified);
    savedAudiencePresets.add(key(owner, id), clean);
    presetMeta.add(key(owner, id), { id; ownerId = owner; name = cleanName(name); sourceCampaignId; recipientCount = clean.size(); createdAt = now; var updatedAt = now });
    { ok = true; error = null; presetId = ?id };
  };

  /// Replace a preset's name and pruned/extended address list.
  public shared ({ caller }) func updatePreset(presetId : Text, name : Text, addresses : [Common.VerifiedAddress]) : async Common.ApiResult {
    if (caller.isAnonymous()) { return { ok = false; error = ?signInRequired } };
    let owner = caller.toText();
    switch (presetMeta.get(key(owner, presetId))) {
      case null { { ok = false; error = ?"Preset not found" } };
      case (?meta) {
        if (addresses.size() == 0) { return { ok = false; error = ?"A preset needs at least one address" } };
        if (addresses.size() > maxAddresses) { return { ok = false; error = ?"Send at most 5,000 addresses with updatePreset and add the rest with addPresetAddresses" } };
        switch (presetInputError(name, addresses)) { case (?e) { return { ok = false; error = ?e } }; case null {} };
        switch (presetQuotaError(presetTotals(owner, ?presetId), addresses.size())) { case (?e) { return { ok = false; error = ?e } }; case null {} };
        let clean = addresses.map(AddressLib.sanitizeVerified);
        savedAudiencePresets.add(key(owner, presetId), clean);
        let updated : Types.AudiencePreset = { id = meta.id; ownerId = meta.ownerId; name = cleanName(name); sourceCampaignId = meta.sourceCampaignId; recipientCount = clean.size(); createdAt = meta.createdAt; var updatedAt = Time.now() };
        presetMeta.add(key(owner, presetId), updated);
        { ok = true; error = null };
      };
    };
  };

  /// Appends more addresses to one of the caller's presets, in order:
  /// `offset` is where `addresses` start in the full list. A chunk already
  /// stored (a retried call) is acknowledged without being stored twice, and
  /// an empty chunk only reports how many are stored (`stored` and `total`
  /// are both that count).
  public shared ({ caller }) func addPresetAddresses(presetId : Text, offset : Nat, addresses : [Common.VerifiedAddress]) : async Types.RecipientStageResult {
    let notFound = { ok = false; error = ?"Preset not found"; stored = 0; total = 0 };
    if (caller.isAnonymous()) { return { notFound with error = ?signInRequired } };
    let owner = caller.toText();
    let k = key(owner, presetId);
    let meta = switch (presetMeta.get(k)) { case (?m) m; case null { return notFound } };
    let current = switch (savedAudiencePresets.get(k)) { case (?a) a; case null [] };
    let stored = current.size();
    let reply = func(ok : Bool, error : ?Text, now : Nat) : Types.RecipientStageResult { { ok; error; stored = now; total = now } };
    if (addresses.size() == 0 or offset + addresses.size() <= stored) { return reply(true, null, stored) };
    if (addresses.size() > maxAddresses) { return reply(false, ?"Send at most 5,000 addresses per call", stored) };
    if (offset > stored) { return reply(false, ?("Addresses are added in order; " # stored.toText() # " are stored"), stored) };
    let fresh = addresses.sliceToArray(Nat.sub(stored, offset), addresses.size()).map(AddressLib.sanitizeVerified);
    switch (Inputs.firstLongRecipient(fresh)) {
      case (?i) { return reply(false, ?("Address " # (stored + i + 1).toText() # " has a line longer than " # Inputs.maxAddressFieldChars.toText() # " characters"), stored) };
      case null {};
    };
    switch (presetQuotaError(presetTotals(owner, ?presetId), stored + fresh.size())) {
      case (?e) { return reply(false, ?e, stored) };
      case null {};
    };
    let all = current.concat(fresh);
    savedAudiencePresets.add(k, all);
    presetMeta.add(k, { id = meta.id; ownerId = meta.ownerId; name = meta.name; sourceCampaignId = meta.sourceCampaignId; recipientCount = all.size(); createdAt = meta.createdAt; var updatedAt = Time.now() });
    reply(true, null, all.size());
  };

  public shared ({ caller }) func deletePreset(presetId : Text) : async Common.ApiResult {
    if (caller.isAnonymous()) { return { ok = false; error = ?signInRequired } };
    let k = key(caller.toText(), presetId);
    if (not presetMeta.containsKey(k)) { return { ok = false; error = ?"Preset not found" } };
    presetMeta.remove(k);
    savedAudiencePresets.remove(k);
    { ok = true; error = null };
  };

  public shared query ({ caller }) func listPresets() : async [Types.AudiencePresetShared] {
    if (caller.isAnonymous()) { return [] };
    let owner = caller.toText();
    let out = List.empty<Types.AudiencePresetShared>();
    for ((_, p) in presetMeta.entries()) {
      if (p.ownerId == owner) { out.add(presetShared(p)) };
    };
    out.toArray().sort<Types.AudiencePresetShared>(func(a, b) = Int.compare(b.updatedAt, a.updatedAt));
  };

  /// One page (at most 2,000) of a preset's addresses from `offset`, and
  /// how many it holds: a saved audience of any size is read page by page.
  public shared query ({ caller }) func getPresetAddressesPage(presetId : Text, offset : Nat, limit : Nat) : async Types.RecipientPage {
    if (caller.isAnonymous()) { return { addresses = []; total = 0 } };
    AddressLib.page(switch (savedAudiencePresets.get(key(caller.toText(), presetId))) { case (?a) a; case null [] }, offset, limit);
  };

  public shared query ({ caller }) func getPresetAddresses(presetId : Text) : async [Common.VerifiedAddress] {
    if (caller.isAnonymous()) { return [] };
    switch (savedAudiencePresets.get(key(caller.toText(), presetId))) {
      case null [];
      case (?addrs) addrs;
    };
  };
};
