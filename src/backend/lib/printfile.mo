/// Checks a staged print file before it can be paid for and sent to print.
/// An order is priced for one piece printed from the studio's front and back
/// (`buildPrintPdf`: at most two JPEG pages), and the print partner bills by
/// the pages of the document it is given, so a longer file uploaded straight
/// to the canister would print at a loss. Pure, so the interpreter can run it
/// (test/printfile.test.mo).
///
/// The studio writes plain, uncompressed PDF structure. Anything this cannot
/// count without doubt (escaped `#xx` structural names, object streams,
/// encryption, an indirect `/Type`, `/Count` or `/Kids`, a second page tree)
/// is refused rather than guessed: fail-closed.
import Types "../types/campaign";
import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Nat "mo:core/Nat";
import Nat8 "mo:core/Nat8";
import Nat32 "mo:core/Nat32";
import Char "mo:core/Char";

module {
  /// Pages a print file may hold: the piece's front and back.
  public let maxPages : Nat = 2;

  public let unreadable = "The print file's page structure could not be read. Export it again from the studio and upload it.";

  // Names whose escaped spelling would hide page structure from this count.
  let structural : [Text] = ["Type", "Page", "Pages", "Kids", "Count", "Parent", "ObjStm", "XRef", "Encrypt"];

  func isSpace(c : Nat8) : Bool {
    c == 0x20 or c == 0x0A or c == 0x0D or c == 0x09 or c == 0x0C or c == 0x00;
  };

  func isDelimiter(c : Nat8) : Bool {
    c == 0x28 or c == 0x29 or c == 0x3C or c == 0x3E or c == 0x5B or c == 0x5D or c == 0x7B or c == 0x7D or c == 0x2F or c == 0x25;
  };

  func isDigit(c : Nat8) : Bool { c >= 0x30 and c <= 0x39 };

  func hexValue(c : Nat8) : ?Nat {
    if (c >= 0x30 and c <= 0x39) ?(c.toNat() - 0x30) else if (c >= 0x41 and c <= 0x46) ?(c.toNat() - 0x41 + 10) else if (c >= 0x61 and c <= 0x66) ?(c.toNat() - 0x61 + 10) else null;
  };

  func startsWith(b : [Nat8], prefix : [Nat8]) : Bool {
    if (b.size() < prefix.size()) return false;
    for (k in prefix.keys()) { if (b[k] != prefix[k]) return false };
    true;
  };

  /// Null when the bytes are what `mimeType` says (a PDF, PNG or JPEG by its
  /// signature), otherwise why not: the print partner reads the bytes, not
  /// the label, so a PDF sent as an image must not skip the page count.
  public func typeError(mimeType : Text, b : [Nat8]) : ?Text {
    let ok = switch (mimeType) {
      case ("application/pdf") startsWith(b, [0x25, 0x50, 0x44, 0x46, 0x2D]);
      case ("image/png") startsWith(b, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      case ("image/jpeg") startsWith(b, [0xFF, 0xD8, 0xFF]);
      case _ false;
    };
    if (ok) null else ?"The print file's contents do not match its type. Export it again from the studio and upload it.";
  };

  /// Null when a complete staged upload may be paid for and printed: its
  /// bytes match its type, and a PDF holds at most `maxPages` pages.
  public func stagedError(u : Types.DocumentUpload) : ?Text {
    let b = u.chunks.map(func(c : Blob) : [Nat8] = c.toArray()).flatten();
    switch (typeError(u.mimeType, b)) {
      case (?e) ?e;
      case null { if (u.mimeType == "application/pdf") pdfError(b) else null };
    };
  };

  /// Null when `b` is a PDF of 1 to `maxPages` pages whose page structure this
  /// can count, otherwise why it cannot be printed.
  public func pdfError(b : [Nat8]) : ?Text {
    let n = b.size();
    if (not startsWith(b, [0x25, 0x50, 0x44, 0x46, 0x2D])) return ?"The print file is not a PDF.";

    // Whitespace and comments between two tokens.
    func skipGap(from : Nat) : Nat {
      var j = from;
      label gap loop {
        if (j >= n) break gap;
        if (isSpace(b[j])) { j += 1 } else if (b[j] == 0x25) {
          while (j < n and b[j] != 0x0A and b[j] != 0x0D) { j += 1 };
        } else break gap;
      };
      j;
    };

    // The name starting at `b[at] == '/'`: its decoded text (first 64
    // characters), whether it used a `#xx` escape, and where it ends.
    func readName(at : Nat) : (Text, Bool, Nat) {
      var j = at + 1;
      var text = "";
      var length = 0;
      var escaped = false;
      while (j < n and not isSpace(b[j]) and not isDelimiter(b[j])) {
        var c = b[j];
        if (c == 0x23 and j + 2 < n) {
          switch (hexValue(b[j + 1]), hexValue(b[j + 2])) {
            case (?hi, ?lo) { escaped := true; c := Nat8.fromNat(hi * 16 + lo); j += 2 };
            case _ {};
          };
        };
        if (length < 64) {
          text #= Char.fromNat32(Nat32.fromNat(c.toNat())).toText();
          length += 1;
        };
        j += 1;
      };
      (text, escaped, j);
    };

    var pageObjects = 0;
    var pageTrees = 0;
    var kidsArrays = 0;
    var mostListed = 0;
    var i = 0;
    while (i < n) {
      if (b[i] != 0x2F) { i += 1 } else {
        let (name, escaped, end) = readName(i);
        if (escaped and structural.any(func(s : Text) : Bool { s == name })) return ?unreadable;
        if (name == "ObjStm" or name == "Encrypt") return ?unreadable;
        if (name == "Type") {
          let j = skipGap(end);
          if (j >= n or b[j] != 0x2F) return ?unreadable;
          let (value, _, _) = readName(j);
          if (value == "Page") { pageObjects += 1 } else if (value == "Pages") { pageTrees += 1 };
        } else if (name == "Count") {
          var j = skipGap(end);
          if (j < n and (b[j] == 0x2D or b[j] == 0x2B)) { j += 1 };
          if (j >= n or not isDigit(b[j])) return ?unreadable;
          var value = 0;
          let negative = b[skipGap(end)] == 0x2D;
          while (j < n and isDigit(b[j])) {
            value := value * 10 + (b[j].toNat() - 0x30);
            if (value > 1_000_000) return ?unreadable;
            j += 1;
          };
          // "/Count 2 0 R" would point at the count elsewhere.
          let k = skipGap(j);
          if (k < n and isDigit(b[k])) return ?unreadable;
          if (not negative) { mostListed := Nat.max(mostListed, value) };
        } else if (name == "Kids") {
          let j = skipGap(end);
          if (j >= n or b[j] != 0x5B) return ?unreadable;
          var k = j + 1;
          var refs = 0;
          while (k < n and b[k] != 0x5D) {
            if (b[k] == 0x52 and isSpace(b[k - 1]) and (k + 1 >= n or isSpace(b[k + 1]) or isDelimiter(b[k + 1]))) { refs += 1 };
            k += 1;
          };
          if (k >= n) return ?unreadable;
          kidsArrays += 1;
          mostListed := Nat.max(mostListed, refs);
        };
        i := end;
      };
    };
    if (pageObjects == 0) return ?unreadable;
    if (pageTrees > 1 or kidsArrays > 1) return ?"The print file has more than one page tree. Export it again from the studio and upload it.";
    let pages = Nat.max(pageObjects, mostListed);
    if (pages > maxPages) {
      return ?("The print file has " # pages.toText() # " pages, and a piece prints from at most " # maxPages.toText() # " (its front and back). Export it again from the studio and upload it.");
    };
    null;
  };
};
