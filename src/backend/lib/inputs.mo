/// Bounds and formats enforced where text enters the canister. Pure (no
/// system imports), so the interpreter's tests run exactly this code. The
/// frontend mirrors these limits (`src/frontend/src/lib/inputLimits.ts`);
/// change both.
import Common "../types/common";
import Char "mo:core/Char";
import Nat32 "mo:core/Nat32";
import Text "mo:core/Text";

module {
  public let maxCampaignNameChars : Nat = 100;
  public let maxPresetNameChars : Nat = 100;
  /// Every line of a recipient or return address, the name included.
  public let maxAddressFieldChars : Nat = 100;
  /// Template and preset ids the client echoes back.
  public let maxIdChars : Nat = 64;
  public let maxRedirectUrlChars : Nat = 2_048;

  func tooLong(t : Text, max : Nat) : Bool { t.size() > max };

  func optTooLong(t : ?Text, max : Nat) : Bool {
    switch (t) { case (?v) tooLong(v, max); case null false };
  };

  /// A line of a recipient address is longer than `maxAddressFieldChars`.
  public func verifiedAddressTooLong(a : Common.VerifiedAddress) : Bool {
    let m = maxAddressFieldChars;
    tooLong(a.name, m) or tooLong(a.address_line1, m) or optTooLong(a.address_line2, m) or tooLong(a.city, m) or tooLong(a.state, m) or tooLong(a.zip_code, m) or optTooLong(a.zip_plus4, m);
  };

  public func addressInputTooLong(a : Common.AddressInput) : Bool {
    let m = maxAddressFieldChars;
    tooLong(a.name, m) or tooLong(a.address_line1, m) or optTooLong(a.address_line2, m) or tooLong(a.city, m) or tooLong(a.state, m) or tooLong(a.zip_code, m);
  };

  public func returnAddressTooLong(a : Common.ReturnAddress) : Bool {
    let m = maxAddressFieldChars;
    tooLong(a.name, m) or optTooLong(a.organization, m) or tooLong(a.address_line1, m) or optTooLong(a.address_line2, m) or tooLong(a.city, m) or tooLong(a.state, m) or tooLong(a.zip_code, m);
  };

  /// Index of the first recipient with an over-long line, if any.
  public func firstLongRecipient(list : [Common.VerifiedAddress]) : ?Nat {
    var i = 0;
    for (a in list.vals()) {
      if (verifiedAddressTooLong(a)) { return ?i };
      i += 1;
    };
    null;
  };

  /// A tracked QR code's redirect target, or null when it is not a safe
  /// absolute web address: `http://` or `https://` (any case), then a host
  /// that has a dot and holds only letters, digits, `.`, `-` and a `:port`
  /// (no `user@` part, which hides the real host), and only printable ASCII
  /// without backslashes anywhere. Anything else — `javascript:`, `data:`,
  /// `tel:`, a relative path, `//host` — is refused.
  public func redirectUrl(raw : Text) : ?Text {
    let url = raw.trim(#predicate(func(c : Char) : Bool { c == ' ' or c == '\t' or c == '\n' or c == '\r' }));
    if (url.size() == 0 or url.size() > maxRedirectUrlChars) { return null };
    for (c in url.chars()) {
      let code = c.toNat32();
      if (code < 0x21 or code > 0x7e or c == '\\') { return null };
    };
    let lower = url.toLower();
    let rest = switch (lower.stripStart(#text "https://")) {
      case (?r) r;
      case null { switch (lower.stripStart(#text "http://")) { case (?r) r; case null { return null } } };
    };
    // The authority runs to the first `/`, `?` or `#`.
    var authority = "";
    label scan for (c in rest.chars()) {
      if (c == '/' or c == '?' or c == '#') { break scan };
      authority #= Text.fromChar(c);
    };
    if (authority.size() == 0 or not authority.contains(#char '.')) { return null };
    for (c in authority.chars()) {
      if (not (c.isAlphabetic() or c.isDigit() or c == '.' or c == '-' or c == ':')) { return null };
    };
    if (authority.startsWith(#char '.') or authority.startsWith(#char '-') or authority.startsWith(#char ':')) { return null };
    ?url;
  };
};
