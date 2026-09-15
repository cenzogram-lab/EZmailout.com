import Common "../types/common";
import AddressLib "../lib/address";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import Text "mo:core/Text";
import Array "mo:core/Array";
import List "mo:core/List";
import Blob "mo:core/Blob";
import Nat8 "mo:core/Nat8";

mixin (
  adminKeysState : { var stripeKey : ?Text; var lobKey : ?Text; var resendKey : ?Text },
) {
  /// Transform callback required by IC for HTTP outcalls
  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  /// Save all three admin API keys with sanitization (trim, reject empty)
  public shared ({ caller }) func saveAdminKeys(keys : Common.AdminKeys) : async Bool {
    ignore caller;
    adminKeysState.stripeKey := sanitizeKey(keys.stripeKey);
    adminKeysState.lobKey := sanitizeKey(keys.lobKey);
    adminKeysState.resendKey := sanitizeKey(keys.resendKey);
    true;
  };

  /// Return masked admin key metadata (last 4 chars visible, rest masked)
  public shared ({ caller }) func getAdminKeys() : async Common.AdminKeys {
    ignore caller;
    {
      stripeKey = maskKey(adminKeysState.stripeKey);
      lobKey = maskKey(adminKeysState.lobKey);
      resendKey = maskKey(adminKeysState.resendKey);
    };
  };

  /// Verify a list of addresses using Lob's bulk Address Verification API
  public shared ({ caller }) func verifyAddresses(addresses : [Common.AddressInput]) : async [Common.AddressVerificationResult] {
    ignore caller;
    let lobKey = switch (adminKeysState.lobKey) {
      case null {
        return addresses.map<Common.AddressInput, Common.AddressVerificationResult>(
          func(addr) : Common.AddressVerificationResult {
            { input = addr; verified = null; isValid = false; errorMessage = ?"Lob API key not configured" };
          }
        );
      };
      case (?key) { key };
    };

    let sanitized = addresses.map(AddressLib.sanitize);
    let bodyText = buildBulkVerifyJson(sanitized);
    let authHeader = "Basic " # base64Encode(lobKey # ":");
    let headers : [OutCall.Header] = [
      { name = "Authorization"; value = authHeader },
      { name = "Content-Type"; value = "application/json" },
    ];

    let responseText = try {
      await OutCall.httpPostRequest(
        "https://api.lob.com/v1/us_verifications/bulk",
        headers,
        bodyText,
        transform
      );
    } catch (_e) {
      return sanitized.map<Common.AddressInput, Common.AddressVerificationResult>(
        func(addr) : Common.AddressVerificationResult {
          { input = addr; verified = null; isValid = false; errorMessage = ?"Lob API request failed" };
        }
      );
    };

    parseBulkVerifyResponse(sanitized, responseText);
  };

  /// Fire a Lob postcards/letters API call for a single recipient, injecting
  /// the unique recipientId as merge_variables so Lob substitutes the QR URL
  /// per-piece at print time. Returns the raw Lob response body.
  public shared ({ caller }) func fireLobOutcall(
    campaignId : Text,
    recipientId : Text,
    lobKey : Text,
  ) : async Text {
    ignore caller;
    ignore campaignId;
    let authHeader = "Basic " # base64Encode(lobKey # ":");
    let headers : [OutCall.Header] = [
      { name = "Authorization"; value = authHeader },
      { name = "Content-Type"; value = "application/json" },
    ];
    let bodyText = "{" #
      "\"description\":\"MailCommand Campaign " # jsonEscape(campaignId) # "\"," #
      "\"merge_variables\":{" #
        "\"recipient_id\":\"" # jsonEscape(recipientId) # "\"," #
        "\"qr_url\":\"https://mailcommand.app/track/" # jsonEscape(recipientId) # "\"" #
      "}" #
    "}";
    try {
      await OutCall.httpPostRequest(
        "https://api.lob.com/v1/postcards",
        headers,
        bodyText,
        transform
      );
    } catch (_e) {
      "{\"error\":\"Lob API request failed\"}";
    };
  };

  // ─── Private helpers ─────────────────────────────────────────────────────

  private func sanitizeKey(key : ?Text) : ?Text {
    switch (key) {
      case null { null };
      case (?k) {
        let trimmed = k.trim(#predicate (func c { c == ' ' or c == '\t' or c == '\n' }));
        if (trimmed == "") { null } else { ?trimmed };
      };
    };
  };

  private func maskKey(key : ?Text) : ?Text {
    switch (key) {
      case null { null };
      case (?k) {
        let chars = k.toArray();
        if (chars.size() <= 4) {
          ?"****";
        } else {
          let last4Start = chars.size() - 4 : Nat;
          let suffix = Text.fromArray(Array.tabulate<Char>(4, func(i) = chars[last4Start + i]));
          ?("***" # suffix);
        };
      };
    };
  };

  private func buildBulkVerifyJson(addrs : [Common.AddressInput]) : Text {
    var items = "";
    var first = true;
    for (addr in addrs.vals()) {
      if (not first) { items #= "," };
      first := false;
      let line2Part = switch (addr.address_line2) {
        case null { "" };
        case (?v) { ",\"secondary_line\":\"" # jsonEscape(v) # "\"" };
      };
      items #= "{" #
        "\"primary_line\":\"" # jsonEscape(addr.address_line1) # "\"" #
        line2Part #
        ",\"city\":\"" # jsonEscape(addr.city) # "\"" #
        ",\"state\":\"" # jsonEscape(addr.state) # "\"" #
        ",\"zip_code\":\"" # jsonEscape(addr.zip_code) # "\"" #
        "}";
    };
    "{\"addresses\":[" # items # "]}";
  };

  private func parseBulkVerifyResponse(
    inputs : [Common.AddressInput],
    responseText : Text,
  ) : [Common.AddressVerificationResult] {
    let objects = splitJsonObjects(responseText);
    if (objects.size() == 0 or objects.size() != inputs.size()) {
      return fallbackInvalid(inputs, ?"Unexpected Lob response format");
    };
    Array.tabulate<Common.AddressVerificationResult>(inputs.size(), func(i) {
      let obj = objects[i];
      let deliverability = extractJsonStr(obj, "\"deliverability\":");
      let isValid = switch (deliverability) {
        case (?"deliverable") { true };
        case (?"deliverable_missing_unit") { true };
        case _ { false };
      };
      let primaryLine = extractJsonStr(obj, "\"primary_line\":");
      let city = extractJsonStr(obj, "\"city\":");
      let state = extractJsonStr(obj, "\"state\":");
      let zipCode = extractJsonStr(obj, "\"zip_code\":");
      let zipPlus4 = extractJsonStr(obj, "\"zip_plus_4\":");
      let input = inputs[i];
      {
        input;
        verified = if (isValid) {
          ?{
            name = input.name;
            address_line1 = switch (primaryLine) { case (?v) v; case null input.address_line1 };
            address_line2 = input.address_line2;
            city = switch (city) { case (?v) v; case null input.city };
            state = switch (state) { case (?v) v; case null input.state };
            zip_code = switch (zipCode) { case (?v) v; case null input.zip_code };
            zip_plus4 = zipPlus4;
          };
        } else { null };
        isValid;
        errorMessage = if (isValid) { null } else { ?"Address not deliverable" };
      };
    });
  };

  private func fallbackInvalid(inputs : [Common.AddressInput], msg : ?Text) : [Common.AddressVerificationResult] {
    inputs.map<Common.AddressInput, Common.AddressVerificationResult>(
      func(addr) : Common.AddressVerificationResult {
        { input = addr; verified = null; isValid = false; errorMessage = msg };
      }
    );
  };

  private func extractJsonStr(json : Text, keyPrefix : Text) : ?Text {
    let parts = json.split(#text keyPrefix).toArray();
    if (parts.size() < 2) { return null };
    let afterKey = parts[1];
    let chars = afterKey.toArray();
    var i = 0;
    while (i < chars.size() and chars[i] != '\22') { i += 1 };
    if (i >= chars.size()) { return null };
    i += 1;
    let buf = List.empty<Char>();
    while (i < chars.size() and chars[i] != '\22') {
      buf.add(chars[i]);
      i += 1;
    };
    ?Text.fromArray(buf.toArray());
  };

  /// Split a JSON string into all top-level { } object substrings
  private func splitJsonObjects(s : Text) : [Text] {
    let chars = s.toArray();
    var result = List.empty<Text>();
    var depth = 0;
    var start = 0;
    var i = 0;
    while (i < chars.size()) {
      let c = chars[i];
      if (c == '{') {
        if (depth == 0) { start := i };
        depth += 1;
      } else if (c == '}') {
        if (depth > 0) {
          depth -= 1;
          if (depth == 0) {
            result.add(Text.fromArray(Array.tabulate<Char>(i - start + 1, func(k) = chars[start + k])));
          };
        };
      };
      i += 1;
    };
    result.toArray();
  };

  private func jsonEscape(s : Text) : Text {
    var out = "";
    for (c in s.chars()) {
      if (c == '\22') { out #= "\\\"" }
      else if (c == '\\') { out #= "\\\\" }
      else if (c == '\n') { out #= "\\n" }
      else if (c == '\r') { out #= "\\r" }
      else if (c == '\t') { out #= "\\t" }
      else { out #= Text.fromChar(c) };
    };
    out;
  };

  /// Base64 encoder for Basic Auth header construction
  private func base64Encode(s : Text) : Text {
    let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let table = alphabet.toArray();
    let bytes = s.encodeUtf8().toArray();
    var out = "";
    var i = 0;
    while (i < bytes.size()) {
      let b0 = bytes[i].toNat();
      let b1 : Nat = if (i + 1 < bytes.size()) bytes[i + 1].toNat() else 0;
      let b2 : Nat = if (i + 2 < bytes.size()) bytes[i + 2].toNat() else 0;
      out #= Text.fromChar(table[b0 / 4]);
      out #= Text.fromChar(table[(b0 % 4) * 16 + b1 / 16]);
      out #= if (i + 1 < bytes.size()) Text.fromChar(table[(b1 % 16) * 4 + b2 / 64]) else "=";
      out #= if (i + 2 < bytes.size()) Text.fromChar(table[b2 % 64]) else "=";
      i += 3;
    };
    out;
  };
};

