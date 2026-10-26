/// Print file checks (src/backend/lib/printfile.mo), run in the interpreter:
///   moc -r --implicit-package=core --package core <motoko-core>/src test/printfile.test.mo
import PrintFile "../src/backend/lib/printfile";
import Runtime "mo:core/Runtime";
import Debug "mo:core/Debug";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Nat8 "mo:core/Nat8";

func bytes(t : Text) : [Nat8] = t.encodeUtf8().toArray();

// Image data as the studio writes it: binary bytes, '/' and '#' included.
let jpeg : [Nat8] = Array.tabulate<Nat8>(4_000, func(i) = Nat8.fromNat((i * 37 + 11) % 256));

/// A PDF laid out like `buildPdfFromJpegs`: catalog, page tree, then image,
/// content and page objects per page. `extraKids` lists more kids than pages,
/// `pageType` spells the page objects' type.
func pdf(pages : Nat, extraKids : Nat, pageType : Text, count : Text) : [Nat8] {
  var kids = "";
  for (p in Nat.range(0, pages + extraKids)) { kids #= " " # (5 + 3 * p).toText() # " 0 R" };
  var out = bytes("%PDF-1.4\n%\u{e2}\u{e3}\u{cf}\u{d3}\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [" # kids # " ] /Count " # count # " >>\nendobj\n");
  for (p in Nat.range(0, pages)) {
    let image = 3 + 3 * p;
    out := [out, bytes(image.toText() # " 0 obj\n<< /Type /XObject /Subtype /Image /Width 10 /Height 10 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length 4000 >>\nstream\n"), jpeg, bytes("\nendstream\nendobj\n" # (image + 1).toText() # " 0 obj\n<< /Length 30 >>\nstream\nq 432 0 0 288 0 0 cm /Im3 Do Q\nendstream\nendobj\n" # (image + 2).toText() # " 0 obj\n<< /Type " # pageType # " /Parent 2 0 R /MediaBox [0 0 432 288] /Contents " # (image + 1).toText() # " 0 R >>\nendobj\n")].flatten();
  };
  [out, bytes("xref\n0 1\n0000000000 65535 f \ntrailer\n<< /Size 1 /Root 1 0 R >>\nstartxref\n0\n%%EOF\n")].flatten();
};

func ok(what : Text, b : [Nat8]) {
  switch (PrintFile.pdfError(b)) { case null {}; case (?e) Runtime.trap(what # ": refused: " # e) };
};
func refused(what : Text, b : [Nat8]) {
  if (PrintFile.pdfError(b) == null) Runtime.trap(what # ": accepted");
};

ok("one page", pdf(1, 0, "/Page", "1"));
ok("front and back", pdf(2, 0, "/Page", "2"));
refused("three pages", pdf(3, 0, "/Page", "3"));
refused("three pages counted as two", pdf(3, 0, "/Page", "2"));
refused("two pages listing five kids", pdf(2, 3, "/Page", "2"));
refused("a count above the pages", pdf(2, 0, "/Page", "20"));
refused("an indirect count", pdf(2, 0, "/Page", "9 0 R"));
refused("an escaped page type", pdf(2, 0, "/P#61ge", "2"));
refused("a comment between /Type and three pages", pdf(3, 0, "%x\n/Page", "1"));
refused("no page objects", pdf(2, 0, "/Pagex", "2"));
refused("an object stream", [pdf(1, 0, "/Page", "1"), bytes("9 0 obj\n<< /Type /ObjStm /N 5 >>\nendobj\n")].flatten());
refused("an encrypted file", [pdf(1, 0, "/Page", "1"), bytes("trailer\n<< /Encrypt 9 0 R >>\n")].flatten());
refused("a second page tree", [pdf(2, 0, "/Page", "2"), bytes("9 0 obj\n<< /Type /Pages /Kids [5 0 R] /Count 1 >>\nendobj\n")].flatten());
refused("not a PDF", bytes("GIF89a"));

// Structure a reader follows but a byte scan cannot see (or could misread)
// is refused outright.
refused("an object stream without its /Type", [pdf(1, 0, "/Page", "1"), bytes("9 0 obj\n<< /N 4 /First 20 /Length 5 /Filter /FlateDecode >>\nstream\nxxxxx\nendstream\nendobj\n")].flatten());
refused("a cross-reference stream", [pdf(1, 0, "/Page", "1"), bytes("9 0 obj\n<< /Type /XRef /W [1 2 1] /Size 10 /Length 0 >>\nstream\n\nendstream\nendobj\n")].flatten());
refused("an incremental update", [pdf(1, 0, "/Page", "1"), bytes("trailer\n<< /Size 10 /Root 1 0 R /Prev 500 >>\n")].flatten());
refused("a comment inside /Kids", bytes("%PDF-1.4\n2 0 obj\n<< /Type /Pages /Kids [4 0 R %]\n 5 0 R 6 0 R] /Count 1 >>\nendobj\n4 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\n"));
refused("a reference written 0R", bytes("%PDF-1.4\n2 0 obj\n<< /Type /Pages /Kids [4 0R] /Count 1 >>\nendobj\n4 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\n"));
refused("a nested array inside /Kids", bytes("%PDF-1.4\n2 0 obj\n<< /Type /Pages /Kids [4 0 R [5 0 R]] /Count 1 >>\nendobj\n4 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\n"));
refused("untyped pages and no count", bytes("%PDF-1.4\n2 0 obj\n<< /Type /Pages /Kids [4 0 R] >>\nendobj\n4 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\n"));
refused("a stray page object beside the tree", [pdf(1, 0, "/Page", "1"), bytes("9 0 obj\n<< /Type /Page >>\nendobj\n")].flatten());
refused("two counts", [pdf(1, 0, "/Page", "1"), bytes("9 0 obj\n<< /Count 1 >>\nendobj\n")].flatten());

// The bytes must be what the label says.
assert PrintFile.typeError("application/pdf", pdf(1, 0, "/Page", "1")) == null;
assert PrintFile.typeError("image/png", pdf(1, 0, "/Page", "1")) != null;
assert PrintFile.typeError("image/jpeg", [0xFF, 0xD8, 0xFF, 0xE0]) == null;
assert PrintFile.typeError("image/png", [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0]) == null;
assert PrintFile.typeError("image/jpeg", [0x25, 0x50, 0x44, 0x46, 0x2D]) != null;

Debug.print("printfile: all checks passed");
