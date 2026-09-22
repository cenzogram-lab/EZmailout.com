/// Address verification via Click2Mail address lists and saved audience presets.
import Types "../types/campaign";
import Common "../types/common";
import AddressLib "../lib/address";
import AdminLib "../lib/admin";
import Click2Mail "../lib/click2mail";
import Http "../lib/http";
import Json "../lib/json";
import Map "mo:core/Map";
import List "mo:core/List";
import Array "mo:core/Array";
import VarArray "mo:core/VarArray";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
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
  transient let maxAddresses : Nat = 5_000;
  /// Rolling per-account verification quota (transient: a fresh window after upgrades).
  transient let verifyWindowNs : Int = 3_600_000_000_000;
  transient let verifyAddressesPerWindow : Nat = 25_000;
  transient let verifyUsage = Map.empty<Text, { var windowStart : Int; var addresses : Nat }>();

  /// Charges `count` addresses against the caller's hourly quota; false when exceeded.
  private func chargeVerifyQuota(userId : Text, count : Nat) : Bool {
    let now = Time.now();
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

  /// CASS-scrubs a batch through Click2Mail's address-list API (fail-closed).
  public shared ({ caller }) func executeClick2MailVerification(addresses : [Common.AddressInput]) : async Common.VerificationBatchResult {
    if (caller.isAnonymous()) { return batch(false, ?"Sign in with Internet Identity to verify addresses", [], null) };
    if (addresses.size() == 0) { return batch(false, ?"No addresses supplied", [], null) };
    if (addresses.size() > maxAddresses) { return batch(false, ?"Verify at most 5,000 addresses per batch", [], null) };
    if (not chargeVerifyQuota(caller.toText(), addresses.size())) {
      return batch(false, ?"Hourly address-verification limit reached for this account; try again later", [], null);
    };
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
    let auth = switch (AdminLib.click2mailAuth(adminKeysState)) {
      case (?a) a;
      case null {
        markAll("Click2Mail credentials not configured");
        return batch(false, ?"Click2Mail credentials not configured", results.toArray(), null);
      };
    };
    let candidates = candidateIdx.toArray().map(func(idx : Nat) : Common.AddressInput = sanitized[idx]);
    let base = Click2Mail.baseUrl(adminKeysState.click2mailEnvironment);
    let listName = "EZmailout verify " # Time.now().toText();
    let xml = Click2Mail.buildVerificationXml(listName, candidates);
    let opts = AdminLib.outcallOptions(adminKeysState, 1_500_000);
    let resp = await Http.postText(base # "/addressLists", Click2Mail.jsonHeaders(auth, "application/xml"), xml, opts, transformFn);
    if (not Http.isSuccess(resp) or Click2Mail.reportedFailure(resp.body)) {
      let msg = if (resp.status == 0) resp.body else "Click2Mail rejected the address list: " # Click2Mail.parseDescription(resp.body);
      markAll(msg);
      return batch(false, ?msg, results.toArray(), null);
    };
    let listId = switch (Click2Mail.parseId(resp.body)) {
      case (?id) id;
      case null {
        markAll("Click2Mail response did not include an address list id");
        return batch(false, ?"Unexpected Click2Mail response", results.toArray(), null);
      };
    };
    let detail = await Http.get(base # "/addressLists/" # listId, Click2Mail.jsonHeaders(auth, "application/json"), opts, transformFn);
    let objects = if (Http.isSuccess(detail)) addressDetailRecords(detail.body) else [];
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

  private func cleanName(name : Text) : Text {
    let t = AddressLib.sanitizeText(name);
    if (t == "") "Audience preset" else t;
  };

  /// Save an address list as a reusable named preset for the caller.
  public shared ({ caller }) func savePreset(name : Text, addresses : [Common.VerifiedAddress], sourceCampaignId : ?Text) : async Types.PresetResult {
    if (caller.isAnonymous()) { return { ok = false; error = ?signInRequired; presetId = null } };
    if (addresses.size() == 0) { return { ok = false; error = ?"A preset needs at least one address"; presetId = null } };
    if (addresses.size() > maxAddresses) { return { ok = false; error = ?"A preset may hold at most 5,000 addresses"; presetId = null } };
    let owner = caller.toText();
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
        if (addresses.size() > maxAddresses) { return { ok = false; error = ?"A preset may hold at most 5,000 addresses" } };
        let clean = addresses.map(AddressLib.sanitizeVerified);
        savedAudiencePresets.add(key(owner, presetId), clean);
        let updated : Types.AudiencePreset = { id = meta.id; ownerId = meta.ownerId; name = cleanName(name); sourceCampaignId = meta.sourceCampaignId; recipientCount = clean.size(); createdAt = meta.createdAt; var updatedAt = Time.now() };
        presetMeta.add(key(owner, presetId), updated);
        { ok = true; error = null };
      };
    };
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

  public shared query ({ caller }) func getPresetAddresses(presetId : Text) : async [Common.VerifiedAddress] {
    if (caller.isAnonymous()) { return [] };
    switch (savedAudiencePresets.get(key(caller.toText(), presetId))) {
      case null [];
      case (?addrs) addrs;
    };
  };
};
