/// Address sanitization, local validation and recipient id helpers.
import Common "../types/common";
import Text "mo:core/Text";
import Char "mo:core/Char";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";

module {
  private func isWs(c : Char) : Bool { c == ' ' or c == '\t' or c == '\n' or c == '\r' };

  /// Trim leading/trailing whitespace.
  public func sanitizeText(s : Text) : Text {
    s.trim(#predicate isWs);
  };

  private func optText(v : ?Text) : ?Text {
    switch (v) {
      case (?t) { let s = sanitizeText(t); if (s == "") { null } else { ?s } };
      case null { null };
    };
  };

  public func sanitize(addr : Common.AddressInput) : Common.AddressInput {
    {
      name = sanitizeText(addr.name);
      address_line1 = sanitizeText(addr.address_line1);
      address_line2 = optText(addr.address_line2);
      city = sanitizeText(addr.city);
      state = sanitizeText(addr.state).toUpper();
      zip_code = sanitizeText(addr.zip_code);
    };
  };

  public func sanitizeVerified(addr : Common.VerifiedAddress) : Common.VerifiedAddress {
    {
      name = sanitizeText(addr.name);
      address_line1 = sanitizeText(addr.address_line1);
      address_line2 = optText(addr.address_line2);
      city = sanitizeText(addr.city);
      state = sanitizeText(addr.state).toUpper();
      zip_code = sanitizeText(addr.zip_code);
      zip_plus4 = optText(addr.zip_plus4);
    };
  };

  private func allDigits(chars : [Char]) : Bool {
    chars.all(func(c : Char) : Bool { c.isDigit() });
  };

  /// `12345` or `12345-6789`.
  public func isValidZip(zip : Text) : Bool {
    let chars = zip.toArray();
    if (chars.size() == 5) { return allDigits(chars) };
    if (chars.size() == 10 and chars[5] == '-') {
      return allDigits(chars.sliceToArray(0, 5)) and allDigits(chars.sliceToArray(6, 10));
    };
    false;
  };

  /// Two alphabetic characters (USPS state / territory code).
  public func isValidState(state : Text) : Bool {
    let chars = state.toArray();
    chars.size() == 2 and chars.all(func(c : Char) : Bool { c.isAlphabetic() });
  };

  /// First five digits of a ZIP.
  public func zip5(zip : Text) : Text {
    let chars = zip.toArray();
    if (chars.size() >= 5) { Text.fromArray(chars.sliceToArray(0, 5)) } else { zip };
  };

  /// `12345-6789` → `?"6789"`.
  public func zipPlus4Of(zip : Text) : ?Text {
    let chars = zip.toArray();
    if (chars.size() == 10 and chars[5] == '-') { ?Text.fromArray(chars.sliceToArray(6, 10)) } else { null };
  };

  /// Returns an error message when the address fails local (pre-CASS) checks.
  public func validateLocal(addr : Common.AddressInput) : ?Text {
    if (addr.name == "") { return ?"Recipient name is required" };
    if (addr.address_line1 == "") { return ?"Street address is required" };
    if (addr.city == "") { return ?"City is required" };
    if (not isValidState(addr.state)) { return ?"State must be a 2-letter code" };
    if (not isValidZip(addr.zip_code)) { return ?"ZIP must be 5 digits or ZIP+4" };
    null;
  };

  public func toVerified(addr : Common.AddressInput, zipPlus4 : ?Text) : Common.VerifiedAddress {
    {
      name = addr.name;
      address_line1 = addr.address_line1;
      address_line2 = addr.address_line2;
      city = addr.city;
      state = addr.state;
      zip_code = zip5(addr.zip_code);
      zip_plus4 = switch (zipPlus4) { case (?z) ?z; case null zipPlus4Of(addr.zip_code) };
    };
  };

  /// Splits "Jane Q Public" into ("Jane", "Q Public"); single token → (token, "").
  public func splitName(name : Text) : (Text, Text) {
    let parts = sanitizeText(name).split(#char ' ').toArray();
    if (parts.size() == 0) { return ("", "") };
    if (parts.size() == 1) { return (parts[0], "") };
    var last = "";
    var i = 1;
    while (i < parts.size()) {
      if (parts[i] != "") { last #= (if (last == "") "" else " ") # parts[i] };
      i += 1;
    };
    (parts[0], last);
  };

  /// Recipient id used in tracking URLs and CSV exports: `<campaignId>_<index>`.
  public func recipientId(campaignId : Text, idx : Nat) : Text {
    campaignId # "_" # idx.toText();
  };

  /// Reverse of `recipientId`: `cmp_12_7` → `cmp_12`; `cmp_12` → `cmp_12`.
  public func campaignIdOf(code : Text) : Text {
    let parts = code.split(#char '_').toArray();
    if (parts.size() >= 3 and parts[0] == "cmp") { parts[0] # "_" # parts[1] } else { code };
  };
};
