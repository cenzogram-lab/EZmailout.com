/// Address-list sizing (src/backend/lib/fulfilment.mo), run in the interpreter:
///   moc -r --package core <motoko-core>/src test/fulfilment.test.mo
import Fulfilment "../src/backend/lib/fulfilment";
import Runtime "mo:core/Runtime";
import Debug "mo:core/Debug";
import Nat "mo:core/Nat";

func expect(what : Text, actual : Nat, expected : Nat) {
  if (actual != expected) {
    Runtime.trap(what # ": expected " # debug_show expected # ", got " # debug_show actual);
  };
};

let empty = { name = ""; address_line1 = ""; address_line2 = null; city = ""; state = ""; zip_code = ""; zip_plus4 = null };
let xmlOf = func(a : { name : Text; address_line1 : Text; address_line2 : ?Text; city : Text; state : Text; zip_code : Text; zip_plus4 : ?Text }) : Nat {
  Nat.sub(Fulfilment.buildAddressListXml("", [a]).size(), Fulfilment.buildAddressListXml("", []).size());
};

// The counted size equals the built XML, escapes and non-ASCII included.
expect("empty address", Fulfilment.addressXmlBytes(empty), xmlOf(empty));
expect("tag bytes", Fulfilment.addressTagBytes, xmlOf(empty));
for (a in [
  { name = "Ada Lovelace"; address_line1 = "1600 Pennsylvania Ave NW"; address_line2 = ?"Suite 300"; city = "Washington"; state = "DC"; zip_code = "20500"; zip_plus4 = ?"0005" },
  { name = "O'Brien & Sons <HQ>"; address_line1 = "12 \"Main\" St"; address_line2 = null; city = "Zürich"; state = "ZH"; zip_code = "8001"; zip_plus4 = null },
  { name = "Señora José Núñez"; address_line1 = "5 Calle Ñandú"; address_line2 = ?"Piso 2º"; city = "San José"; state = "CA"; zip_code = "95110"; zip_plus4 = null },
  // Controls XML forbids (a stray CSV byte) are left out, counted the same way.
  { name = "Bad\u{01}Byte\u{1F}Name"; address_line1 = "7 Tab\tSt"; address_line2 = null; city = "Reno\u{0B}"; state = "NV"; zip_code = "89501"; zip_plus4 = null },
].vals()) {
  // buildAddressListXml sizes are characters; compare bytes of the UTF-8 text.
  let built = Nat.sub(Fulfilment.buildAddressListXml("", [a]).encodeUtf8().size(), Fulfilment.buildAddressListXml("", []).encodeUtf8().size());
  expect("address " # a.name, Fulfilment.addressXmlBytes(a), built);
};

assert not Fulfilment.buildAddressListXml("", [{ name = "A\u{01}B"; address_line1 = "1 St"; address_line2 = null; city = "C"; state = "NV"; zip_code = "89501"; zip_plus4 = null }]).contains(#char '\u{01}');

// Batches cover every address once, in order, and each list fits the budget.
let many = [
  { name = "A B"; address_line1 = "1 St"; address_line2 = null; city = "C"; state = "OR"; zip_code = "97201"; zip_plus4 = null },
  { name = "C D"; address_line1 = "2 St"; address_line2 = null; city = "C"; state = "OR"; zip_code = "97201"; zip_plus4 = null },
  { name = "E F"; address_line1 = "3 St"; address_line2 = null; city = "C"; state = "OR"; zip_code = "97201"; zip_plus4 = null },
];
// The list frame plus room for a 200-character name, then two addresses.
let frame = Fulfilment.buildAddressListXml("", []).size() + 200 * 6;
let budget = frame + 2 * Fulfilment.addressXmlBytes(many[0]) + 1;
let batches = Fulfilment.addressListBatches(many, budget);
expect("batch count", batches.size(), 2);
expect("first batch", batches[0].1, 2);
expect("second batch start", batches[1].0, 2);
expect("second batch size", batches[1].1, 1);

// Tracking pages: page 1 is the plain request, the count is read from JSON or XML.
assert Fulfilment.trackingPath("j1", 1) == "/jobs/j1/tracking?trackingType=IMB";
assert Fulfilment.trackingPath("j1", 3) == "/jobs/j1/tracking?trackingType=IMB&page=3";
assert Fulfilment.trackingPageCount("{\"totalPages\":4,\"tracking\":[]}") == ?4;
assert Fulfilment.trackingPageCount("<tracking><numberOfPages> 2 </numberOfPages></tracking>") == ?2;
assert Fulfilment.trackingPageCount("{\"tracking\":[{\"pageCount\":9}]}") == null;
assert Fulfilment.trackingPageCount("{\"totalPages\":0}") == null;
assert Fulfilment.trackingPageCount("{\"tracking\":[]}") == null;

Debug.print("fulfilment: all checks passed");
