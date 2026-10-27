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
import Nat "mo:core/Nat";
import Map "mo:core/Map";

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

  // ─── Tracking pages ───────────────────────────────────────────────────────

  /// Bytes one tracking reply may take (an outcall's response cap).
  public let maxTrackingPageBytes : Nat64 = 1_900_000;

  /// Pages of one print job's tracking a lookup reads. A batch holds up to
  /// 1.8 MB of address XML, and its per-piece scans can outgrow one reply, so
  /// tracking is read page by page; a job with more pages than this counts
  /// as unanswered rather than being judged on part of its pieces.
  public let maxTrackingPages : Nat = 25;

  /// The names a tracking reply may give its page count under (a top-level
  /// JSON number or an XML element).
  let trackingPageKeys : [Text] = ["totalPages", "numberOfPages", "totalNumberOfPages", "pageCount", "pages"];

  /// Path of page `page` (from 1) of a job's IMb tracking: page 1 is the
  /// plain request; later pages add `page=`.
  public func trackingPath(jobId : Text, page : Nat) : Text {
    "/jobs/" # jobId # "/tracking?trackingType=IMB" # (if (page > 1) "&page=" # page.toText() else "");
  };

  /// How many pages a tracking reply says the job's tracking has, or null when
  /// it does not say (the reply is then the whole of it).
  public func trackingPageCount(body : Text) : ?Nat {
    for (key in trackingPageKeys.vals()) {
      switch (Json.topLevelNumber(body, key)) {
        case (?n) { if (n >= 1) return ?n.toNat() };
        case null {};
      };
      switch (Json.xmlTag(body, key)) {
        case (?t) {
          switch (Nat.fromText(t.trim(#predicate(func(c : Char) : Bool { c.isWhitespace() })))) {
            case (?n) { if (n >= 1) return ?n };
            case null {};
          };
        };
        case null {};
      };
    };
    null;
  };

  /// Collects the scan text of a tracking response (JSON or XML), at any
  /// nesting depth (per-piece scan records are usually nested arrays). Only
  /// the first key that carries text is read: a scan record holding both a
  /// `scanDescription` and a `status` must count once, not twice.
  public func parseTrackingStatuses(body : Text) : [Text] {
    let out = List.empty<Text>();
    let keys = ["scanDescription", "scan_description", "statusDescription", "trackingStatus", "scanEvent", "event", "status"];
    label byKey for (k in keys.vals()) {
      for (v in Json.getAllStrings(body, k).vals()) {
        if (v != "" and not v.toArray().all(func(c : Char) : Bool { c.isDigit() })) { out.add(v) };
      };
      if (out.size() > 0) break byKey;
    };
    if (out.size() == 0) {
      label byTag for (tag in ["scanDescription", "status", "description", "event"].vals()) {
        for (v in Json.xmlTags(body, tag).vals()) {
          if (v != "" and not v.toArray().all(func(c : Char) : Bool { c.isDigit() })) { out.add(v) };
        };
        if (out.size() > 0) break byTag;
      };
    };
    out.toArray();
  };

  // ─── Per-piece tracking ──────────────────────────────────────────────────

  /// Arrays a tracking reply may list its scan or piece records under.
  let trackingListKeys : [Text] = ["tracking", "statuses", "scans", "pieces", "mailPieces", "trackingDetails", "trackingResults", "items", "results", "data"];

  /// Members naming the mail piece a record belongs to (its IMb barcode).
  let pieceIdKeys : [Text] = ["barCode", "barcode", "barCodeNumber", "imb", "IMB", "imbBarcode", "imbCode", "pieceId", "mailPieceId", "trackingNumber"];

  /// One job's tracking, read page by page. Where records name their piece,
  /// each piece keeps only its furthest scan, so a piece's history (several
  /// scans past a stage) counts once; otherwise every scan is kept as before.
  public type PieceTally = {
    pieces : Map.Map<Text, (Nat, Text)>;
    scans : List.List<Text>;
    var named : Bool;
    var unnamed : Nat;
  };

  public func newTally() : PieceTally {
    { pieces = Map.empty<Text, (Nat, Text)>(); scans = List.empty<Text>(); var named = false; var unnamed = 0 };
  };

  func pieceIdOf(record : Text) : ?Text {
    for (k in pieceIdKeys.vals()) {
      switch (Json.topLevelString(record, k)) { case (?v) { if (v != "") return ?v }; case null {} };
      switch (Json.topLevelNumber(record, k)) { case (?n) { return ?n.toText() }; case null {} };
    };
    null;
  };

  /// Adds one page of a job's tracking to `t`.
  public func addTrackingPage(t : PieceTally, body : Text) {
    for (s in parseTrackingStatuses(body).vals()) { t.scans.add(s) };
    label lists for (listKey in trackingListKeys.vals()) {
      let raw = switch (Json.getRawArray(body, listKey)) { case (?r) r; case null { continue lists } };
      let records = Json.splitTopLevelObjects(raw);
      // Records are alike: the first few show whether they name their piece.
      if (not records.sliceToArray(0, Nat.min(records.size(), 20)).any(func(r : Text) : Bool { pieceIdOf(r) != null })) continue lists;
      t.named := true;
      for (r in records.vals()) {
        var furthest : ?(Nat, Text) = null;
        for (s in parseTrackingStatuses(r).vals()) {
          switch (CampaignLib.statusFromText(s)) {
            case (?st) {
              let i = CampaignLib.stageIndex(st);
              switch (furthest) { case (?(j, _)) { if (i > j) furthest := ?(i, s) }; case null { furthest := ?(i, s) } };
            };
            case null {};
          };
        };
        switch (furthest) {
          case (?(i, s)) {
            let id = switch (pieceIdOf(r)) {
              case (?x) x;
              case null { t.unnamed += 1; "#" # t.unnamed.toText() };
            };
            switch (t.pieces.get(id)) { case (?(j, _)) { if (i > j) t.pieces.add(id, (i, s)) }; case null { t.pieces.add(id, (i, s)) } };
          };
          case null {};
        };
      };
      return;
    };
  };

  /// What a job's tracking says, one status per piece where the records name
  /// their pieces, else every scan (for `aggregateStage`).
  public func tallyStatuses(t : PieceTally) : [Text] {
    if (t.named) t.pieces.values().map(func((_, s) : (Nat, Text)) : Text = s).toArray() else t.scans.toArray();
  };

  /// Highest stage reached by at least half of the pieces, on the ranking of
  /// `CampaignLib.stageIndex`: a campaign turns Delivered, Undeliverable or
  /// Returned only when at least half of its `pieces` have a scan that says
  /// so, never for one bad address or the first few deliveries. Each scan at
  /// or past a stage counts once toward it, so a piece's earlier scans (its
  /// history) never dilute its latest one, and pieces with no scan yet count
  /// against every stage. `pieces` 0 weighs the scans among themselves (the
  /// job-level status fallback).
  public func aggregateStage(statuses : [Text], pieces : Nat) : ?Types.CampaignStatus {
    let stages = List.empty<Nat>();
    for (s in statuses.vals()) {
      switch (CampaignLib.statusFromText(s)) {
        case (?status) { stages.add(CampaignLib.stageIndex(status)) };
        case null {};
      };
    };
    if (stages.size() == 0) { return null };
    let total = if (pieces == 0) stages.size() else pieces;
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
    label reading for (raw in texts.values()) {
      let t = raw.toLower();
      let has = func(p : Text) : Bool { t.contains(#text p) };
      // "Not submitted", "unsubmitted", "submission failed": never a yes.
      if (has("not ") or has("n't") or has("unsubmit") or has("never") or has("fail") or has("cancel") or has("error") or has("pending")) continue reading;
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
