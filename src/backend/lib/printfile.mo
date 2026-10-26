/// Checks a staged print file before it can be paid for and sent to print.
/// An order is priced for one piece printed from the studio's front and back
/// (`buildPrintPdf`: at most two JPEG pages), and the print partner bills by
/// the pages of the document it is given, so a longer file uploaded straight
/// to the canister would print at a loss. Pure, so the interpreter can run it
/// (test/printfile.test.mo).
///
/// The studio writes plain, uncompressed PDF structure: one page tree whose
/// single `/Kids` array lists every page, one direct `/Count`, and a
/// `/Type /Page` object per page. A file must have exactly that shape, and
/// anything that could hold pages outside it is refused rather than guessed
/// (fail-closed): escaped `#xx` structural names, cross-reference and object
/// streams (`XRef`, `First`, `ObjStm`), incremental updates (`Prev`),
/// encryption, an indirect `/Type`/`/Count`/`/Kids`, anything but `N G R`
/// references in `/Kids`, or a second page tree.
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
  let structural : [Text] = ["Type", "Page", "Pages", "Kids", "Count", "Parent", "ObjStm", "XRef", "Encrypt", "Prev", "First"];

  // Names the studio's files never use, each of which can carry page
  // structure outside the plain text this check reads.
  let forbidden : [Text] = ["ObjStm", "XRef", "Prev", "First", "Encrypt"];

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
    var kidRefs = 0;
    var counts = 0;
    var countValue = 0;
    var i = 0;
    while (i < n) {
      if (b[i] != 0x2F) { i += 1 } else {
        let (name, escaped, end) = readName(i);
        if (escaped and structural.any(func(s : Text) : Bool { s == name })) return ?unreadable;
        // Cross-reference streams, object streams (whose `/Type /ObjStm` is
        // optional, but `/First` is not), incremental updates and encryption
        // can all hold page structure this byte scan cannot see.
        if (forbidden.any(func(s : Text) : Bool { s == name })) return ?unreadable;
        if (name == "Type") {
          let j = skipGap(end);
          if (j >= n or b[j] != 0x2F) return ?unreadable;
          let (value, _, _) = readName(j);
          if (value == "Page") { pageObjects += 1 } else if (value == "Pages") { pageTrees += 1 };
        } else if (name == "Count") {
          // Exactly one, written as a plain number ("/Count 2 0 R" would
          // point at the count elsewhere).
          var j = skipGap(end);
          if (j >= n or not isDigit(b[j])) return ?unreadable;
          var value = 0;
          while (j < n and isDigit(b[j])) {
            value := value * 10 + (b[j].toNat() - 0x30);
            if (value > 1_000_000) return ?unreadable;
            j += 1;
          };
          let k = skipGap(j);
          if (k < n and isDigit(b[k])) return ?unreadable;
          counts += 1;
          countValue := value;
        } else if (name == "Kids") {
          // Only "N G R" references, separated by whitespace: a comment,
          // string, nested array or "0R" could hide a reference from a
          // looser count.
          var k = skipGap(end);
          if (k >= n or b[k] != 0x5B) return ?unreadable;
          k += 1;
          var refs = 0;
          label kids loop {
            while (k < n and isSpace(b[k])) { k += 1 };
            if (k >= n) return ?unreadable;
            if (b[k] == 0x5D) break kids;
            // object number, generation, then "R"
            for (part in [0, 1].vals()) {
              if (k >= n or not isDigit(b[k])) return ?unreadable;
              while (k < n and isDigit(b[k])) { k += 1 };
              if (k >= n or not isSpace(b[k])) return ?unreadable;
              while (k < n and isSpace(b[k])) { k += 1 };
            };
            if (k >= n or b[k] != 0x52) return ?unreadable;
            k += 1;
            if (k >= n or not (isSpace(b[k]) or b[k] == 0x5D)) return ?unreadable;
            refs += 1;
          };
          kidsArrays += 1;
          kidRefs := refs;
        };
        i := end;
      };
    };
    // One page tree, as the studio writes it: one /Kids array, one /Count,
    // and as many page objects as both say.
    if (pageTrees != 1 or kidsArrays != 1 or counts != 1) return ?unreadable;
    if (pageObjects != kidRefs or countValue != kidRefs or kidRefs == 0) return ?unreadable;
    if (kidRefs > maxPages) {
      return ?("The print file has " # kidRefs.toText() # " pages, and a piece prints from at most " # maxPages.toText() # " (its front and back). Export it again from the studio and upload it.");
    };
    null;
  };
};
