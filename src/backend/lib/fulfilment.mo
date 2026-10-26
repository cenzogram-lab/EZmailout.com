/// Print fulfilment REST API request builders and response parsers.
import Types "../types/campaign";
import Common "../types/common";
import Json "json";
import AddressLib "address";
import PricingLib "pricing";
import CampaignLib "campaign";
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

  public func baseUrl(env : Common.FulfilmentEnvironment) : Text {
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
    var body = addressListHead(name);
    for (a in addresses.vals()) { body #= addressXml(a) };
    body # addressListTail;
  };

  func addressListHead(name : Text) : Text {
    "<addressList><addressListName>" # Json.xmlEscape(name) # "</addressListName><addressMappingId>" # addressMappingId # "</addressMappingId><addresses>";
  };

  let addressListTail = "</addresses></addressList>";

  /// The fields of one `<address>` element, in order.
  func addressFields(a : Common.VerifiedAddress) : [Text] {
    let (first, last) = AddressLib.splitName(a.name);
    let line2 = switch (a.address_line2) { case (?v) v; case null "" };
    let zip = switch (a.zip_plus4) { case (?p) a.zip_code # "-" # p; case null a.zip_code };
    [first, last, a.address_line1, line2, a.city, a.state, zip];
  };

  /// One `<address>` element of an address list.
  func addressXml(a : Common.VerifiedAddress) : Text {
    let f = addressFields(a);
    "<address><Firstname>" # Json.xmlEscape(f[0]) # "</Firstname><Lastname>" # Json.xmlEscape(f[1]) # "</Lastname><Organization></Organization><Address1>" # Json.xmlEscape(f[2]) # "</Address1><Address2>" # Json.xmlEscape(f[3]) # "</Address2><City>" # Json.xmlEscape(f[4]) # "</City><State>" # Json.xmlEscape(f[5]) # "</State><Postalcode>" # Json.xmlEscape(f[6]) # "</Postalcode></address>";
  };

  /// The tags of one `<address>` element, without its field values (the
  /// length of `addressXml` for an empty address; `test/fulfilment.test.mo`
  /// checks it).
  public let addressTagBytes : Nat = 187;

  /// Bytes `addressXml(a)` takes, counted without building it, so planning
  /// the batches of a very large list stays far inside one message's
  /// instruction limit.
  public func addressXmlBytes(a : Common.VerifiedAddress) : Nat {
    var n = addressTagBytes;
    for (f in addressFields(a).vals()) { n += Json.xmlEscapedBytes(f) };
    n;
  };

  /// Largest address-list body one outcall sends: an outcall request (URL,
  /// headers and body) may not exceed 2 MB.
  public let maxAddressListBytes : Nat = 1_800_000;

  /// Splits `addresses` into contiguous `(first, count)` slices whose address
  /// list stays within `maxBytes`, so
  /// a campaign of any size is sent as several lists and print jobs. The same
  /// addresses always give the same slices, so a retried dispatch resumes
  /// the batches an earlier run planned.
  public func addressListBatches(addresses : [Common.VerifiedAddress], maxBytes : Nat) : [(Nat, Nat)] {
    // Room for the list's name: a campaign name (at most 100 characters),
    // its id and the batch number, each character escaping to at most 6 bytes.
    let frame = addressListHead("").size() + addressListTail.size() + 200 * 6;
    let out = List.empty<(Nat, Nat)>();
    var first = 0;
    var count = 0;
    var bytes = frame;
    for (a in addresses.vals()) {
      let size = addressXmlBytes(a);
      if (count > 0 and bytes + size > maxBytes) {
        out.add((first, count));
        first += count;
        count := 0;
        bytes := frame;
      };
      bytes += size;
      count += 1;
    };
    if (count > 0) { out.add((first, count)) };
    out.toArray();
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

  /// The print partner's own name, taken out of text it sent back (error
  /// descriptions, outcall failures naming its host) before that text is
  /// stored or shown, so customers never see who prints for EZmailout.
  public func scrub(t : Text) : Text {
    var out = t;
    for (name in ["click2mail", "Click2Mail", "Click2mail", "CLICK2MAIL", "click2Mail"].vals()) {
      out := out.replace(#text name, "print-partner");
    };
    out;
  };

  /// Description/status text of a print response (for error messages).
  public func parseDescription(body : Text) : Text {
    scrub(switch (Json.getString(body, "description")) {
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
    });
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

  /// Highest stage reached by at least half of the scans, on the ranking of
  /// `CampaignLib.stageIndex`: a campaign turns Undeliverable or Returned only
  /// when at least half of its scans say so, never for one bad address.
  public func aggregateStage(statuses : [Text]) : ?Types.CampaignStatus {
    let stages = List.empty<Nat>();
    for (s in statuses.vals()) {
      switch (CampaignLib.statusFromText(s)) {
        case (?status) { stages.add(CampaignLib.stageIndex(status)) };
        case null {};
      };
    };
    let total = stages.size();
    if (total == 0) { return null };
    var stage : Nat = CampaignLib.stageIndex(#Returned);
    loop {
      var count = 0;
      for (idx in stages.values()) { if (idx >= stage) { count += 1 } };
      if (count * 2 >= total or stage == 0) { return ?CampaignLib.stageFromIndex(stage) };
      stage -= 1;
    };
  };

  /// What a `GET /jobs/{id}` answer says about submission: `?true` once the
  /// job is submitted or further along, `?false` while it is still being
  /// edited, `null` when the answer does not say. Only the job's own
  /// top-level fields are read (a nested document or address list has a
  /// `status` of its own), and only unambiguous words count: a wrong "yes"
  /// would mark a job that never printed as submitted, while a wrong "no"
  /// only re-submits, which the print partner refuses (`submittedAlready`).
  public func jobSubmitted(body : Text) : ?Bool {
    let texts = List.empty<Text>();
    for (k in ["jobStatus", "job_status", "statusDescription", "status", "description", "state"].vals()) {
      switch (Json.topLevelString(body, k)) { case (?v) texts.add(v); case null {} };
      switch (Json.xmlTag(body, k)) { case (?v) texts.add(v); case null {} };
    };
    var editing = false;
    for (raw in texts.values()) {
      let t = raw.toLower();
      let has = func(p : Text) : Bool { t.contains(#text p) };
      if (has("submitted") or has("in production") or has("printing") or has("printed") or has("mailed") or has("completed") or has("shipped")) {
        return ?true;
      };
      if (has("edit") or has("draft")) { editing := true };
    };
    if (editing) ?false else null;
  };

  /// Steps whose failure message quotes the print partner's answer or the
  /// network error (host names, library errors, HTTP bodies).
  let partnerSteps : [Text] = [
    "Document upload failed",
    "Address list submission failed",
    "Job creation failed",
    "Job submission failed",
    "Tracking lookup failed",
  ];

  /// What a customer is told about a print-partner failure: the step that
  /// failed and what to do, never the partner's or the network's own text
  /// (the admin and controllers still get that, through `providerError`).
  /// Any other message is already written for customers and is returned as is.
  public func customerError(detail : Text) : Text {
    // A campaign sent as several print jobs can fail after some went out:
    // those are in production, so "nothing has been printed" would be wrong.
    if (detail.startsWith(#text partialPrefix)) {
      let rest = detail.trimStart(#text partialPrefix);
      let parts = rest.split(#text "): ").toArray();
      if (parts.size() >= 2) {
        return "Partly sent to print (" # parts[0] # "). The remaining print jobs were not accepted just now; send the campaign to print again to finish it.";
      };
    };
    for (step in partnerSteps.vals()) {
      if (detail.startsWith(#text step)) {
        return step # ": the print service did not accept the request just now, so nothing has been printed yet.";
      };
    };
    detail;
  };

  let partialPrefix = "Partly in production (";

  /// The error of a run that stopped after `submitted` of `total` print jobs
  /// had gone out: "Partly in production (2 of 5 print jobs in production): <detail>".
  public func partialFailure(submitted : Nat, total : Nat, detail : Text) : Text {
    partialPrefix # submitted.toText() # " of " # total.toText() # " print jobs in production): " # detail;
  };

  /// The print partner refused a submit because the job was submitted already.
  public func submittedAlready(body : Text) : Bool {
    let t = parseDescription(body).toLower();
    t.contains(#text "already") and (t.contains(#text "submit") or t.contains(#text "process"));
  };
};
