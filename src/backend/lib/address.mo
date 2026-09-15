import Common "../types/common";
import Text "mo:core/Text";
import Array "mo:core/Array";
import List "mo:core/List";
module {
  /// Sanitize a single text field: trim leading/trailing whitespace
  public func sanitizeText(s : Text) : Text {
    s.trim(#predicate (func(c) { c == ' ' or c == '\t' or c == '\n' or c == '\r' }));
  };

  /// Sanitize all text fields in an AddressInput
  public func sanitize(addr : Common.AddressInput) : Common.AddressInput {
    {
      name = sanitizeText(addr.name);
      address_line1 = sanitizeText(addr.address_line1);
      address_line2 = switch (addr.address_line2) {
        case (?v) {
          let t = sanitizeText(v);
          if (t == "") { null } else { ?t };
        };
        case null { null };
      };
      city = sanitizeText(addr.city);
      state = sanitizeText(addr.state);
      zip_code = sanitizeText(addr.zip_code);
    };
  };

  /// Parse a Lob webhook JSON payload and extract (campaignId, eventType, lobEventId, timestamp).
  /// Lob event shape: {"id":"evt_xxx","reference_id":"cmp_xxx","event_type":{"id":"letter.created"},...}
  public func parseLobWebhook(payload : Text) : ?(Text, Text, Text, Int) {
    let eventId = extractJsonStr(payload, "\"id\":");
    let referenceId = extractJsonStr(payload, "\"reference_id\":");
    let eventTypeId = extractEventTypeId(payload);
    switch (eventId, referenceId, eventTypeId) {
      case (?eid, ?rid, ?etype) { ?(rid, etype, eid, 0) };
      case _ { null };
    };
  };

  /// Map Lob event type string to CampaignStatus variant
  public func lobEventToCampaignStatus(eventType : Text) : ?{ #Created; #InProduction; #InTransit; #SortedAtLocalHub; #Delivered } {
    if (eventType == "letter.created" or eventType == "postcard.created") {
      ?#Created;
    } else if (eventType == "letter.rendered_pdf" or eventType == "letter.rendered_thumbnails") {
      ?#InProduction;
    } else if (eventType == "letter.in_transit") {
      ?#InTransit;
    } else if (eventType == "letter.in_local_area" or eventType == "letter.processed_for_delivery") {
      ?#SortedAtLocalHub;
    } else if (
      eventType == "letter.delivered" or
      eventType == "postcard.delivered" or
      eventType == "letter.re-routed" or
      eventType == "letter.returned_to_sender"
    ) {
      ?#Delivered;
    } else {
      null;
    };
  };

  // ─── Private helpers ─────────────────────────────────────────────────────

  /// Extract a JSON string value by splitting on a key prefix.
  public func extractJsonStr(json : Text, keyPrefix : Text) : ?Text {
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

  private func extractEventTypeId(json : Text) : ?Text {
    let nestedMarker = "\"event_type\":{\"id\":\"";
    let parts = json.split(#text nestedMarker).toArray();
    if (parts.size() >= 2) {
      let after = parts[1];
      let chars = after.toArray();
      let buf = List.empty<Char>();
      var i = 0;
      while (i < chars.size() and chars[i] != '\22') {
        buf.add(chars[i]);
        i += 1;
      };
      let result = buf.toArray();
      if (result.size() > 0) {
        return ?Text.fromArray(result);
      };
    };
    extractJsonStr(json, "\"event_type\":");
  };
};
