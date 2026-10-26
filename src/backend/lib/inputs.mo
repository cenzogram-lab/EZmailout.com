/// Bounds and formats enforced where text enters the canister. Pure (no
/// system imports), so the interpreter's tests run exactly this code. The
/// frontend mirrors these limits (`src/frontend/src/lib/inputLimits.ts`);
/// change both.
import Common "../types/common";
import Types "../types/campaign";
import Char "mo:core/Char";
import Nat32 "mo:core/Nat32";
import Text "mo:core/Text";

module {
  public let maxCampaignNameChars : Nat = 100;
  public let maxPresetNameChars : Nat = 100;
  /// Every line of a recipient or return address, the name included.
  public let maxAddressFieldChars : Nat = 100;
  /// Template, preset and campaign ids the client echoes back, and the
  /// product's colour option.
  public let maxIdChars : Nat = 64;
  public let maxRedirectUrlChars : Nat = 2_048;

  // The stored canvas is a preview of the design (the print file is uploaded
  // on its own), so every bound but the image budget is a ceiling no real
  // design reaches. The frontend's `canvasForStorage` output always fits.
  public let maxCanvasLayersPerSide : Nat = 200;
  public let maxCanvasTextChars : Nat = 5_000;
  /// Layer ids, colours, font family, alignment.
  public let maxCanvasShortChars : Nat = 100;
  public let maxCanvasCaptionChars : Nat = 200;
  /// Every image URL on both sides together. Leaves room for 5,000
  /// recipients in the same `createCampaign` message (2 MB ingress cap).
  public let maxCanvasImageChars : Nat = 1_000_000;
  /// The largest print sheet is 17 in; anything past 24 in is not a design.
  public let maxCanvasInches : Float = 24.0;

  /// Admin credentials and usernames. Every one is sent with its outcalls.
  public let maxAdminValueChars : Nat = 512;
  /// Free text a webhook or an admin override stores on a tracking event.
  public let maxEventTextChars : Nat = 200;
  public let maxEventIdChars : Nat = 128;

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

  func blank(t : Text) : Bool {
    for (c in t.chars()) { if (not c.isWhitespace()) return false };
    true;
  };

  func digits(t : Text, n : Nat) : Bool {
    var count = 0;
    for (c in t.chars()) { if (not c.isDigit()) return false; count += 1 };
    count == n;
  };

  /// Why a return address cannot go on a print job, if anything: the rules of
  /// the review step's form (`validateReturnAddress`) — name, street and city
  /// filled in, a 2-letter state, a 5-digit ZIP (or ZIP+4). The print partner
  /// refuses a job without one, and a paid order's address cannot be changed.
  public func returnAddressError(a : Common.ReturnAddress) : ?Text {
    if (blank(a.name) or blank(a.address_line1) or blank(a.city)) return ?"The return address needs a sender name, street address and city";
    let state = a.state.trim(#predicate(Char.isWhitespace));
    var letters = 0;
    for (c in state.chars()) { if (c < 'A' or c > 'Z') return ?"The return address needs a 2-letter state code"; letters += 1 };
    if (letters != 2) return ?"The return address needs a 2-letter state code";
    let zip = a.zip_code.trim(#predicate(Char.isWhitespace));
    let parts = zip.split(#char '-').toArray();
    let zipOk = switch (parts.size()) {
      case 1 digits(parts[0], 5);
      case 2 digits(parts[0], 5) and digits(parts[1], 4);
      case _ false;
    };
    if (not zipOk) return ?"The return address needs a 5-digit ZIP code (or ZIP+4)";
    null;
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

  /// The admin's outcall proxy: every outcall, credentials included, goes to
  /// it, so only an `https://` address that passes `redirectUrl` is taken.
  public func proxyUrl(raw : Text) : ?Text {
    switch (redirectUrl(raw)) {
      case (?u) { if (u.toLower().startsWith(#text "https://")) ?u else null };
      case null null;
    };
  };

  /// An image layer's source: none, a browser-local `blob:` URL, an inline
  /// `data:image/` URL (shapes, QR codes, cleaned-up AI logos) or `https://`.
  public func imageUrlAllowed(u : Text) : Bool {
    if (u == "") { return true };
    let l = u.toLower();
    l.startsWith(#text "data:image/") or l.startsWith(#text "blob:") or l.startsWith(#text "https://");
  };

  func sideError(side : Types.CanvasSide, name : Text, images : { var chars : Nat }) : ?Text {
    let layers = side.textBlocks.size() + side.logos.size() + side.qrCodes.size();
    if (layers > maxCanvasLayersPerSide) {
      return ?("The " # name # " has more than " # maxCanvasLayersPerSide.toText() # " layers");
    };
    let short = maxCanvasShortChars;
    if (tooLong(side.backgroundColor, short)) { return ?("The " # name # " background colour is not valid") };
    switch (side.backgroundImageUrl) {
      case (?u) {
        if (not imageUrlAllowed(u)) { return ?("The " # name # " background image has an unsupported address") };
        images.chars += u.size();
      };
      case null {};
    };
    for (b in side.textBlocks.vals()) {
      if (tooLong(b.text, maxCanvasTextChars)) {
        return ?("A text box on the " # name # " is longer than " # maxCanvasTextChars.toText() # " characters");
      };
      if (tooLong(b.id, short) or tooLong(b.color, short) or tooLong(b.fontFamily, short) or tooLong(b.align, short)) {
        return ?("A text box on the " # name # " has an invalid style");
      };
    };
    for (l in side.logos.vals()) {
      if (tooLong(l.id, short)) { return ?("An image on the " # name # " has an invalid id") };
      if (not imageUrlAllowed(l.url)) { return ?("An image on the " # name # " has an unsupported address") };
      images.chars += l.url.size();
    };
    for (q in side.qrCodes.vals()) {
      if (tooLong(q.id, short) or tooLong(q.foreground, short) or tooLong(q.background, short)) {
        return ?("A QR code on the " # name # " has an invalid style");
      };
      if (tooLong(q.url, maxRedirectUrlChars)) { return ?("A QR code on the " # name # " points to an address longer than 2,048 characters") };
      if (optTooLong(q.caption, maxCanvasCaptionChars)) { return ?("A QR caption on the " # name # " is too long") };
    };
    null;
  };

  /// Why a canvas cannot be stored, or null when it can.
  public func canvasError(c : Types.CanvasState) : ?Text {
    // Written so that NaN fails too.
    let inRange = func(v : Float) : Bool { v > 0.0 and v <= maxCanvasInches };
    if (not inRange(c.widthInches) or not inRange(c.heightInches)) { return ?"The design's size is not valid" };
    if (c.designPpi == 0 or c.designPpi > 1_200) { return ?"The design's resolution is not valid" };
    let images = { var chars = 0 };
    switch (sideError(c.front, "front", images)) { case (?e) { return ?e }; case null {} };
    switch (sideError(c.back, "back", images)) { case (?e) { return ?e }; case null {} };
    if (images.chars > maxCanvasImageChars) {
      return ?"The design's images are too large to save with the campaign";
    };
    null;
  };
};
