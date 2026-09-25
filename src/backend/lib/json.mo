/// Tolerant JSON + XML text helpers (no full parser; the canister only needs
/// to pull a handful of scalar fields out of third-party responses).
import Text "mo:core/Text";
import Char "mo:core/Char";
import Nat32 "mo:core/Nat32";
import List "mo:core/List";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Iter "mo:core/Iter";

module {
  /// Escapes a text value for embedding inside a JSON string literal.
  public func escape(s : Text) : Text {
    var out = "";
    for (c in s.chars()) {
      if (c == '\22') { out #= "\\\"" } else if (c == '\\') { out #= "\\\\" } else if (c == '\n') { out #= "\\n" } else if (c == '\r') { out #= "\\r" } else if (c == '\t') { out #= "\\t" } else if (c.toNat32() < 32) { out #= " " } else { out #= Text.fromChar(c) };
    };
    out;
  };

  public func str(s : Text) : Text { "\"" # escape(s) # "\"" };

  private func hexVal(c : Char) : ?Nat32 {
    let n = c.toNat32();
    if (n >= 48 and n <= 57) { ?(n - 48) } else if (n >= 97 and n <= 102) { ?(n - 87) } else if (n >= 65 and n <= 70) { ?(n - 55) } else { null };
  };

  /// Reads a JSON string literal starting at index `start` (which must point at
  /// the opening quote). Returns the decoded text and the index after the
  /// closing quote.
  private func readString(chars : [Char], start : Nat) : ?(Text, Nat) {
    if (start >= chars.size() or chars[start] != '\22') { return null };
    var i = start + 1;
    let buf = List.empty<Char>();
    while (i < chars.size()) {
      let c = chars[i];
      if (c == '\22') { return ?(Text.fromArray(buf.toArray()), i + 1) };
      if (c == '\\' and i + 1 < chars.size()) {
        let n = chars[i + 1];
        if (n == 'n') { buf.add('\n'); i += 2 } else if (n == 't') { buf.add('\t'); i += 2 } else if (n == 'r') { buf.add('\r'); i += 2 } else if (n == 'b' or n == 'f') { buf.add(' '); i += 2 } else if (n == 'u' and i + 5 < chars.size()) {
          var code : Nat32 = 0;
          var ok = true;
          var k = 0;
          while (k < 4) {
            switch (hexVal(chars[i + 2 + k])) {
              case (?v) { code := code * 16 + v };
              case null { ok := false };
            };
            k += 1;
          };
          if (ok and (code < 0xD800 or code > 0xDFFF)) { buf.add(Char.fromNat32(code)) } else { buf.add('?') };
          i += 6;
        } else { buf.add(n); i += 2 };
      } else {
        buf.add(c);
        i += 1;
      };
    };
    null;
  };

  private func skipWs(chars : [Char], start : Nat) : Nat {
    var i = start;
    while (i < chars.size() and (chars[i] == ' ' or chars[i] == '\n' or chars[i] == '\r' or chars[i] == '\t')) { i += 1 };
    i;
  };

  /// Finds the index just after `"key":` for the first occurrence of the key
  /// (searched at any depth, so pick unambiguous keys).
  private func findKey(chars : [Char], key : Text) : ?Nat {
    let pattern = ("\"" # key # "\"").toArray();
    let n = pattern.size();
    if (n == 0 or chars.size() < n) { return null };
    var i = 0;
    while (i + n <= chars.size()) {
      var match = true;
      var k = 0;
      while (match and k < n) {
        if (chars[i + k] != pattern[k]) { match := false };
        k += 1;
      };
      if (match) {
        let j = skipWs(chars, i + n);
        if (j < chars.size() and chars[j] == ':') {
          return ?skipWs(chars, j + 1);
        };
      };
      i += 1;
    };
    null;
  };

  /// Index just after the JSON value starting at `start`: a string, an object
  /// or array (nested, string-aware), or a scalar. Null when malformed.
  private func skipValue(chars : [Char], start : Nat) : ?Nat {
    if (start >= chars.size()) { return null };
    let c = chars[start];
    if (c == '\22') {
      return switch (readString(chars, start)) { case (?(_, e)) ?e; case null null };
    };
    if (c == '{' or c == '[') {
      var depth = 0;
      var i = start;
      while (i < chars.size()) {
        let d = chars[i];
        if (d == '\22') {
          switch (readString(chars, i)) { case (?(_, e)) { i := e }; case null { return null } };
        } else {
          if (d == '{' or d == '[') { depth += 1 } else if (d == '}' or d == ']') {
            depth -= 1;
            if (depth == 0) { return ?(i + 1) };
          };
          i += 1;
        };
      };
      return null;
    };
    var i = start;
    while (i < chars.size() and chars[i] != ',' and chars[i] != '}' and chars[i] != ']' and chars[i] != ' ' and chars[i] != '\n' and chars[i] != '\r' and chars[i] != '\t') { i += 1 };
    if (i == start) null else ?i;
  };

  /// The members of the outermost JSON object as (key, raw value text), in
  /// document order. Values nested inside other objects or arrays are never
  /// returned, so a key buried in them cannot shadow a top-level one — unlike
  /// the any-depth getters below. Empty for anything that is not an object.
  public func topLevel(json : Text) : [(Text, Text)] {
    let chars = json.toArray();
    let out = List.empty<(Text, Text)>();
    var i = skipWs(chars, 0);
    if (i >= chars.size() or chars[i] != '{') { return [] };
    i := skipWs(chars, i + 1);
    label members while (i < chars.size() and chars[i] != '}') {
      let (key, afterKey) = switch (readString(chars, i)) { case (?r) r; case null { return out.toArray() } };
      let colon = skipWs(chars, afterKey);
      if (colon >= chars.size() or chars[colon] != ':') { return out.toArray() };
      let start = skipWs(chars, colon + 1);
      let end = switch (skipValue(chars, start)) { case (?e) e; case null { return out.toArray() } };
      out.add((key, Text.fromArray(chars.sliceToArray(start, end))));
      i := skipWs(chars, end);
      if (i < chars.size() and chars[i] == ',') { i := skipWs(chars, i + 1) } else { break members };
    };
    out.toArray();
  };

  /// Top-level `"key": "value"` → value, escapes decoded.
  public func topLevelString(json : Text, key : Text) : ?Text {
    for ((k, raw) in topLevel(json).vals()) {
      if (k == key) {
        return switch (readString(raw.toArray(), 0)) { case (?(v, _)) ?v; case null null };
      };
    };
    null;
  };

  /// Top-level integer member, e.g. `"amount": 2000`.
  public func topLevelNumber(json : Text, key : Text) : ?Int {
    for ((k, raw) in topLevel(json).vals()) {
      if (k == key) { return getNumber("{\"v\":" # raw # "}", "v") };
    };
    null;
  };

  /// `{"k1":v1,"k2":v2}` holding only the listed top-level scalar members, in
  /// the order of `keys`, strings re-encoded canonically. Two responses that
  /// differ only in whitespace, member order or unlisted fields produce the
  /// same text, which is what replicated outcalls need to reach consensus.
  public func canonicalSummary(json : Text, keys : [Text]) : Text {
    let members = topLevel(json);
    var out = "";
    for (key in keys.vals()) {
      label find for ((k, raw) in members.vals()) {
        if (k == key) {
          let chars = raw.toArray();
          let value = if (chars.size() > 0 and chars[0] == '\22') {
            switch (readString(chars, 0)) { case (?(v, _)) str(v); case null "null" };
          } else if (chars.size() > 0 and (chars[0] == '{' or chars[0] == '[')) {
            "null";
          } else { raw };
          out := (if (out == "") "" else out # ",") # str(key) # ":" # value;
          break find;
        };
      };
    };
    "{" # out # "}";
  };

  /// `"key": "value"` → value (with escapes decoded).
  public func getString(json : Text, key : Text) : ?Text {
    let chars = json.toArray();
    switch (findKey(chars, key)) {
      case null { null };
      case (?pos) {
        switch (readString(chars, pos)) {
          case (?(s, _)) { ?s };
          case null { null };
        };
      };
    };
  };

  /// Every `"key": "value"` occurrence at any depth, in document order.
  public func getAllStrings(json : Text, key : Text) : [Text] {
    let chars = json.toArray();
    let pattern = ("\"" # key # "\"").toArray();
    let n = pattern.size();
    let out = List.empty<Text>();
    if (n == 0 or chars.size() < n) { return [] };
    var i = 0;
    while (i + n <= chars.size()) {
      var match = true;
      var k = 0;
      while (match and k < n) {
        if (chars[i + k] != pattern[k]) { match := false };
        k += 1;
      };
      if (match) {
        let j = skipWs(chars, i + n);
        if (j < chars.size() and chars[j] == ':') {
          let v = skipWs(chars, j + 1);
          switch (readString(chars, v)) {
            case (?(str, next)) { out.add(str); i := next };
            case null { i += n };
          };
        } else { i += n };
      } else { i += 1 };
    };
    out.toArray();
  };

  /// `"key": 123` (or `"123"`) → integer part of the number.
  public func getNumber(json : Text, key : Text) : ?Int {
    let chars = json.toArray();
    switch (findKey(chars, key)) {
      case null { null };
      case (?pos0) {
        var pos = pos0;
        if (pos < chars.size() and chars[pos] == '\22') { pos += 1 };
        var neg = false;
        if (pos < chars.size() and chars[pos] == '-') { neg := true; pos += 1 };
        var value : Int = 0;
        var digits = 0;
        while (pos < chars.size() and chars[pos].isDigit()) {
          value := value * 10 + (chars[pos].toNat32() - 48).toNat();
          digits += 1;
          pos += 1;
        };
        if (digits == 0) { null } else { ?(if (neg) -value else value) };
      };
    };
  };

  public func getBool(json : Text, key : Text) : ?Bool {
    let chars = json.toArray();
    switch (findKey(chars, key)) {
      case null { null };
      case (?pos) {
        if (pos + 4 <= chars.size() and chars[pos] == 't' and chars[pos + 1] == 'r' and chars[pos + 2] == 'u' and chars[pos + 3] == 'e') { ?true } else if (pos + 5 <= chars.size() and chars[pos] == 'f' and chars[pos + 1] == 'a') { ?false } else { null };
      };
    };
  };

  /// `"key": ["a", "b"]` → ["a", "b"] (non-string items are skipped).
  public func getStringArray(json : Text, key : Text) : [Text] {
    let chars = json.toArray();
    switch (findKey(chars, key)) {
      case null { [] };
      case (?pos) {
        if (pos >= chars.size() or chars[pos] != '[') { return [] };
        let out = List.empty<Text>();
        var i = pos + 1;
        var depth = 0;
        while (i < chars.size()) {
          let c = chars[i];
          if (c == '\22') {
            switch (readString(chars, i)) {
              case (?(s, next)) { if (depth == 0) { out.add(s) }; i := next };
              case null { return out.toArray() };
            };
          } else if (c == '[' or c == '{') { depth += 1; i += 1 } else if (c == ']' or c == '}') {
            if (depth == 0) { return out.toArray() };
            depth -= 1;
            i += 1;
          } else { i += 1 };
        };
        out.toArray();
      };
    };
  };

  /// Returns the raw text of the first JSON array value under `key`
  /// (including brackets), so callers can split it into objects.
  public func getRawArray(json : Text, key : Text) : ?Text {
    let chars = json.toArray();
    switch (findKey(chars, key)) {
      case null { null };
      case (?pos) {
        if (pos >= chars.size() or chars[pos] != '[') { return null };
        var i = pos;
        var depth = 0;
        var inStr = false;
        while (i < chars.size()) {
          let c = chars[i];
          if (inStr) {
            if (c == '\\') { i += 1 } else if (c == '\22') { inStr := false };
          } else if (c == '\22') { inStr := true } else if (c == '[' or c == '{') { depth += 1 } else if (c == ']' or c == '}') {
            depth -= 1;
            if (depth == 0) {
              return ?Text.fromArray(chars.sliceToArray(pos, i + 1));
            };
          };
          i += 1;
        };
        null;
      };
    };
  };

  /// Splits text into its top-level `{ ... }` object substrings (string-aware).
  public func splitTopLevelObjects(s : Text) : [Text] {
    let chars = s.toArray();
    let result = List.empty<Text>();
    var depth = 0;
    var start = 0;
    var i = 0;
    var inStr = false;
    while (i < chars.size()) {
      let c = chars[i];
      if (inStr) {
        if (c == '\\') { i += 1 } else if (c == '\22') { inStr := false };
      } else if (c == '\22') { inStr := true } else if (c == '{') {
        if (depth == 0) { start := i };
        depth += 1;
      } else if (c == '}') {
        if (depth > 0) {
          depth -= 1;
          if (depth == 0) { result.add(Text.fromArray(chars.sliceToArray(start, i + 1))) };
        };
      };
      i += 1;
    };
    result.toArray();
  };

  /// Decodes a JSON string literal (with surrounding quotes) into text.
  public func unescapeJsonString(literal : Text) : ?Text {
    switch (readString(literal.toArray(), 0)) {
      case (?(s, _)) { ?s };
      case null { null };
    };
  };

  public func natToText(n : Nat) : Text { n.toText() };
  public func intToText(i : Int) : Text { i.toText() };

  // ─── XML helpers ─────────────────────────────────────────────────────────

  public func xmlEscape(s : Text) : Text {
    var out = "";
    for (c in s.chars()) {
      if (c == '&') { out #= "&amp;" } else if (c == '<') { out #= "&lt;" } else if (c == '>') { out #= "&gt;" } else if (c == '\22') { out #= "&quot;" } else if (c == '\'') { out #= "&apos;" } else { out #= Text.fromChar(c) };
    };
    out;
  };

  public func xmlUnescape(s : Text) : Text {
    s.replace(#text "&lt;", "<").replace(#text "&gt;", ">").replace(#text "&quot;", "\"").replace(#text "&apos;", "'").replace(#text "&amp;", "&");
  };

  /// Content of the first `<tag>…</tag>` element (attributes on the open tag are tolerated).
  public func xmlTag(xml : Text, tag : Text) : ?Text {
    let all = xmlTags(xml, tag);
    if (all.size() == 0) { null } else { ?all[0] };
  };

  /// Contents of every `<tag>…</tag>` element, in order.
  public func xmlTags(xml : Text, tag : Text) : [Text] {
    let out = List.empty<Text>();
    let openParts = xml.split(#text ("<" # tag)).toArray();
    var idx = 1;
    while (idx < openParts.size()) {
      let chunk = openParts[idx];
      // Must be followed by '>' or whitespace/attribute, not a longer tag name.
      let chunkChars = chunk.toArray();
      if (chunkChars.size() > 0 and (chunkChars[0] == '>' or chunkChars[0] == ' ')) {
        let afterOpen = chunk.split(#char '>').toArray();
        if (afterOpen.size() >= 2) {
          // Rejoin everything after the first '>' then cut at the closing tag.
          var rest = "";
          var k = 1;
          while (k < afterOpen.size()) {
            rest #= (if (k > 1) ">" else "") # afterOpen[k];
            k += 1;
          };
          let closeParts = rest.split(#text ("</" # tag # ">")).toArray();
          if (closeParts.size() >= 1) { out.add(xmlUnescape(closeParts[0])) };
        };
      };
      idx += 1;
    };
    out.toArray();
  };
};
