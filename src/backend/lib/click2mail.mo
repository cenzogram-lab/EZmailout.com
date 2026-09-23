/// Click2Mail Developer REST API request builders and response parsers.
import Types "../types/campaign";
import Common "../types/common";
import Json "json";
import AddressLib "address";
import PricingLib "pricing";
import Text "mo:core/Text";
import Blob "mo:core/Blob";
import Array "mo:core/Array";
import Base64 "mo:core/Base64";
import Char "mo:core/Char";
import Nat8 "mo:core/Nat8";
import Nat32 "mo:core/Nat32";
import List "mo:core/List";

module {
  public let addressMappingId : Text = "1";

  public func baseUrl(env : Common.Click2MailEnvironment) : Text {
    switch (env) {
      case (#Production) "https://rest.click2mail.com/molpro";
      case (#Staging) "https://stage-rest.click2mail.com/molpro";
    };
  };

  public func basicAuth(username : Text, password : Text) : Text {
    "Basic " # Base64.encode((username # ":" # password).encodeUtf8());
  };

  public func jsonHeaders(auth : Text, contentType : Text) : [{ name : Text; value : Text }] {
    [
      { name = "Authorization"; value = auth },
      { name = "Accept"; value = "application/json" },
      { name = "Content-Type"; value = contentType },
      { name = "User-Agent"; value = "EZmailout/1.0 (+https://ezmailout.com)" },
    ];
  };

  /// RFC 3986 percent-encoding for form values.
  public func urlEncode(s : Text) : Text {
    let hex = "0123456789ABCDEF".toArray();
    var out = "";
    for (b in s.encodeUtf8().toArray().vals()) {
      let n = b.toNat();
      let c = Char.fromNat32(Nat32.fromNat(n));
      let unreserved = (n >= 48 and n <= 57) or (n >= 65 and n <= 90) or (n >= 97 and n <= 122) or c == '-' or c == '_' or c == '.' or c == '~';
      if (unreserved) { out #= Text.fromChar(c) } else if (c == ' ') { out #= "+" } else {
        out #= "%" # Text.fromChar(hex[n / 16]) # Text.fromChar(hex[n % 16]);
      };
    };
    out;
  };

  public func formEncode(pairs : [(Text, Text)]) : Text {
    var out = "";
    var first = true;
    for ((k, v) in pairs.vals()) {
      if (not first) { out #= "&" };
      first := false;
      out #= urlEncode(k) # "=" # urlEncode(v);
    };
    out;
  };

  public func documentFormat(mimeType : Text) : Text {
    let m = mimeType.toLower();
    if (m.contains(#text "pdf")) { "PDF" } else if (m.contains(#text "png")) { "PNG" } else if (m.contains(#text "jpeg") or m.contains(#text "jpg")) { "JPG" } else { "PDF" };
  };

  /// multipart/form-data body with text fields plus one file part.
  public func buildDocumentMultipart(
    boundary : Text,
    fields : [(Text, Text)],
    fileName : Text,
    mimeType : Text,
    bytes : Blob,
  ) : Blob {
    var head = "";
    for ((k, v) in fields.vals()) {
      head #= "--" # boundary # "\r\nContent-Disposition: form-data; name=\"" # k # "\"\r\n\r\n" # v # "\r\n";
    };
    head #= "--" # boundary # "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"" # fileName # "\"\r\nContent-Type: " # mimeType # "\r\n\r\n";
    let tail = "\r\n--" # boundary # "--\r\n";
    let parts : [[Nat8]] = [head.encodeUtf8().toArray(), bytes.toArray(), tail.encodeUtf8().toArray()];
    Blob.fromArray(parts.flatten());
  };

  /// Address list XML for POST /addressLists (mapping id 1: Firstname, Lastname,
  /// Organization, Address1, Address2, City, State, Postalcode).
  public func buildAddressListXml(name : Text, addresses : [Common.VerifiedAddress]) : Text {
    var body = "<addressList><addressListName>" # Json.xmlEscape(name) # "</addressListName><addressMappingId>" # addressMappingId # "</addressMappingId><addresses>";
    for (a in addresses.vals()) {
      let (first, last) = AddressLib.splitName(a.name);
      let line2 = switch (a.address_line2) { case (?v) v; case null "" };
      let zip = switch (a.zip_plus4) { case (?p) a.zip_code # "-" # p; case null a.zip_code };
      body #= "<address><Firstname>" # Json.xmlEscape(first) # "</Firstname><Lastname>" # Json.xmlEscape(last) # "</Lastname><Organization></Organization><Address1>" # Json.xmlEscape(a.address_line1) # "</Address1><Address2>" # Json.xmlEscape(line2) # "</Address2><City>" # Json.xmlEscape(a.city) # "</City><State>" # Json.xmlEscape(a.state) # "</State><Postalcode>" # Json.xmlEscape(zip) # "</Postalcode></address>";
    };
    body # "</addresses></addressList>";
  };

  /// Address list XML for CASS verification of raw inputs.
  public func buildVerificationXml(name : Text, addresses : [Common.AddressInput]) : Text {
    buildAddressListXml(name, addresses.map(func(a) { AddressLib.toVerified(a, null) }));
  };

  /// application/x-www-form-urlencoded body for POST /jobs.
  public func buildJobForm(
    spec : Types.PrintSpec,
    documentId : Text,
    addressListId : Text,
    ret : Common.ReturnAddress,
  ) : Text {
    let base : [(Text, Text)] = [
      ("documentClass", spec.documentClass),
      ("layout", spec.layout),
      ("productionTime", spec.productionTime),
      ("color", spec.color),
      ("paperType", spec.paperType),
      ("printOption", spec.printOption),
      ("documentId", documentId),
      ("addressId", addressListId),
      ("mailClass", PricingLib.mailClassText(spec.mailClass)),
      ("rtnName", ret.name),
      ("rtnOrganization", switch (ret.organization) { case (?o) o; case null "" }),
      ("rtnAddress1", ret.address_line1),
      ("rtnAddress2", switch (ret.address_line2) { case (?l) l; case null "" }),
      ("rtnCity", ret.city),
      ("rtnState", ret.state),
      ("rtnZip", ret.zip_code),
    ];
    let withEnvelope = switch (spec.envelope) {
      case (?e) base.concat([("envelope", e)]);
      case null base;
    };
    formEncode(withEnvelope);
  };

  /// Extracts the resource id from a JSON (`"id": 123`) or XML (`<id>123</id>`) response.
  public func parseId(body : Text) : ?Text {
    switch (Json.getString(body, "id")) {
      case (?s) { if (s != "") { return ?s } };
      case null {};
    };
    switch (Json.getNumber(body, "id")) {
      case (?n) { return ?Json.intToText(n) };
      case null {};
    };
    switch (Json.xmlTag(body, "id")) {
      case (?s) { let t = AddressLib.sanitizeText(s); if (t != "") { ?t } else { null } };
      case null { null };
    };
  };

  /// Description/status text of a Click2Mail response (for error messages).
  public func parseDescription(body : Text) : Text {
    switch (Json.getString(body, "description")) {
      case (?d) d;
      case null {
        switch (Json.xmlTag(body, "description")) {
          case (?d) d;
          case null {
            let trimmed = AddressLib.sanitizeText(body);
            if (trimmed.size() > 240) { Text.fromArray(trimmed.toArray().sliceToArray(0, 240)) } else { trimmed };
          };
        };
      };
    };
  };

  /// Whether the API reported success (status 0 / description "Success" / HTTP 2xx handled by caller).
  public func reportedFailure(body : Text) : Bool {
    switch (Json.getNumber(body, "status")) {
      case (?n) { n != 0 and n != 200 and n != 201 };
      case null {
        switch (Json.xmlTag(body, "status")) {
          case (?s) { let t = AddressLib.sanitizeText(s); t != "0" and t != "200" and t != "201" and t.toLower() != "success" };
          case null false;
        };
      };
    };
  };

  /// Collects every status-like string from a tracking response (JSON or XML),
  /// at any nesting depth (per-piece scan records are usually nested arrays).
  public func parseTrackingStatuses(body : Text) : [Text] {
    let out = List.empty<Text>();
    let keys = ["scanDescription", "scan_description", "statusDescription", "trackingStatus", "scanEvent", "event", "status"];
    for (k in keys.vals()) {
      for (v in Json.getAllStrings(body, k).vals()) {
        if (v != "" and not v.toArray().all(func(c : Char) : Bool { c.isDigit() })) { out.add(v) };
      };
    };
    if (out.size() == 0) {
      for (tag in ["scanDescription", "status", "description", "event"].vals()) {
        for (v in Json.xmlTags(body, tag).vals()) {
          if (v != "" and not v.toArray().all(func(c : Char) : Bool { c.isDigit() })) { out.add(v) };
        };
      };
    };
    out.toArray();
  };

  /// Highest stage reached by at least half of the pieces (fallback: highest seen).
  public func aggregateStage(statuses : [Text]) : ?Types.CampaignStatus {
    let stages = List.empty<Nat>();
    for (s in statuses.vals()) {
      switch (stageFromText(s)) {
        case (?idx) { stages.add(idx) };
        case null {};
      };
    };
    let total = stages.size();
    if (total == 0) { return null };
    var best : Nat = 0;
    var stage : Nat = 4;
    var chosen : ?Nat = null;
    while (chosen == null) {
      var count = 0;
      for (idx in stages.values()) { if (idx >= stage) { count += 1 } };
      if (count * 2 >= total) { chosen := ?stage } else if (stage == 0) { chosen := ?0 } else { stage -= 1 };
      if (count > 0 and stage > best) { best := stage };
    };
    switch (chosen) {
      case (?c) ?indexToStage(c);
      case null null;
    };
  };

  private func stageFromText(s : Text) : ?Nat {
    let t = s.toLower();
    let has = func(p : Text) : Bool { t.contains(#text p) };
    if (has("out for") or has("sorted") or has("local") or has("destination") or has("arrived") or has("processed for") or has("processed_for")) { ?3 } else if (has("deliver") or has("returned") or has("re-routed")) { ?4 } else if (has("transit") or has("mailed") or has("accepted") or has("en route") or has("usps") or has("processed")) { ?2 } else if (has("production") or has("print") or has("processing") or has("submitted") or has("imposition")) { ?1 } else if (has("created") or has("received") or has("queued") or has("pending")) { ?0 } else { null };
  };

  private func indexToStage(i : Nat) : Types.CampaignStatus {
    if (i >= 4) { #Delivered } else if (i == 3) { #SortedAtLocalHub } else if (i == 2) { #InTransit } else if (i == 1) { #InProduction } else { #Created };
  };
};
