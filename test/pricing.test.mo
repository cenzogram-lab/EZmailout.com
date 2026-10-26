/// Volume-tier pricing (src/backend/lib/pricing.mo), run in the interpreter:
///   moc -r --package core <motoko-core>/src test/pricing.test.mo
/// The frontend mirror (src/frontend/src/lib/pricing.ts) is checked against
/// the canister by `scripts/test-backend.sh pricing`.
import PricingLib "../src/backend/lib/pricing";
import Types "../src/backend/types/campaign";
import Runtime "mo:core/Runtime";
import Debug "mo:core/Debug";

func row(variant : Text) : Types.PricingRow {
  switch (PricingLib.find(variant)) {
    case (?r) r;
    case null Runtime.trap("no pricing row " # variant);
  };
};

func expect(what : Text, actual : Nat, expected : Nat) {
  if (actual != expected) {
    Runtime.trap(what # ": expected " # debug_show expected # ", got " # debug_show actual);
  };
};

let postcard = row("4.25x6");
let unit = func(qty : Nat, member : Bool) : Nat = PricingLib.calculateUnitPrice(postcard, qty, member);
let total = func(qty : Nat, member : Bool) : ?Nat = PricingLib.campaignCostCents(unit(qty, member), qty);

// 4×6 at 500 pieces: $0.79 each, $395.00.
expect("4x6 × 500 unit", unit(500, false), 79);
assert total(500, false) == ?39_500;
// 4×6 at 2,000 pieces: $0.71 each, $1,420.00.
expect("4x6 × 2,000 unit", unit(2_000, false), 71);
assert total(2_000, false) == ?142_000;
// 4×6 at 55,000 pieces: the schedule's 52¢ is under the 55¢ print cost, so
// it is lifted to cost + 1¢ after the card fee's 2.9%: $0.58 each, $31,900.00.
expect("4x6 × 55,000 unit", unit(55_000, false), 58);
assert total(55_000, false) == ?3_190_000;
// A member ordering 10 pieces pays the 10,000-piece rate: $0.62 each.
expect("member 4x6 × 10 unit", unit(10, true), 62);
assert total(10, true) == ?620;
// The legacy "4x6" key prices the same row.
expect("legacy 4x6 key", PricingLib.calculateUnitPrice(row("4x6"), 500, false), 79);

// Tier edges.
expect("4x6 × 999", unit(999, false), 79);
expect("4x6 × 1,000", unit(1_000, false), 71);
expect("4x6 × 9,999", unit(9_999, false), 71);
expect("4x6 × 10,000", unit(10_000, false), 62);
expect("4x6 × 49,999", unit(49_999, false), 62);
expect("member 4x6 × 50,000", unit(50_000, true), 58);

// Every tiered format, every tier (the per-piece rate price lists show),
// never below cost.
for ((variant, schedule) in [
  ("4.25x6", [79, 71, 62, 58]),
  ("6x9", [98, 72, 68, 65]),
  ("6x11", [92, 83, 77, 77]),
  ("letter", [93, 81, 74, 69]),
  ("11x8.5_brochure", [132, 112, 112, 112]),
].vals()) {
  let r = row(variant);
  for (i in schedule.keys()) {
    let price = PricingLib.pieceRateCents(r, PricingLib.tierMinimums[i], false, r.printSpec.mailClass);
    expect(variant # " tier " # debug_show i, price, schedule[i]);
    assert price > r.baseCostCents;
  };
  // The list price is the first tier.
  expect(variant # " list price", r.retailPriceCents, schedule[0]);
};

// Formats competitors do not sell keep their flat price at any volume;
// EDDM adds USPS saturation postage to its print-only ledger price.
for (variant in ["certified_letter", "priority_express_letter", "8.5x11_secure", "eddm_6.5x9", "3.5x5", "8.5x11_flyer"].vals()) {
  let r = row(variant);
  expect(variant # " flat", PricingLib.calculateUnitPrice(r, 50_000, true), r.retailPriceCents + PricingLib.postageCents(r));
};
expect("EDDM postage", PricingLib.eddmPostageCents, 26);
expect("EDDM 6.5 x 9, print 40¢ + postage 26¢", PricingLib.pieceRateCents(row("eddm_6.5x9"), 1, false, #MarketingMail), 66);
// One piece alone is lifted to cover the card fee's fixed 30¢.
expect("EDDM 6.5 x 9, a single piece", PricingLib.calculateUnitPrice(row("eddm_6.5x9"), 1, false), 75);
expect("EDDM 6.5 x 9 × 2", PricingLib.calculateUnitPrice(row("eddm_6.5x9"), 2, false), 66);
expect("EDDM 8.5 x 12, print 55¢ + postage 26¢", PricingLib.calculateUnitPrice(row("eddm_8.5x12"), 5_000, true), 81);
expect("no postage on top for a postcard", PricingLib.postageCents(row("6x9")), 0);

// Card payments start at $0.50 (checked by createCampaign and checkout).
expect("minimum order", PricingLib.minOrderCents, 50);

// First-Class on a format priced for Marketing Mail that cannot absorb the
// dearer postage adds 24¢ a piece; nothing else changes with the class.
expect("first-class surcharge", PricingLib.firstClassSurchargeCents, 24);
expect("6x9 first-class x 500", PricingLib.unitPriceFor(row("6x9"), 500, false, #FirstClass), 122);
expect("6x9 marketing mail x 500", PricingLib.unitPriceFor(row("6x9"), 500, false, #MarketingMail), 98);
expect("6x11 first-class member rate", PricingLib.pieceRateCents(row("6x11"), 10, true, #FirstClass), 101);
expect("6x11 first-class member x 10", PricingLib.unitPriceFor(row("6x11"), 10, true, #FirstClass), 105);
expect("6x11 first-class member x 1,000", PricingLib.unitPriceFor(row("6x11"), 1_000, true, #FirstClass), 101);
expect("brochure first-class x 1,000", PricingLib.unitPriceFor(row("11x8.5_brochure"), 1_000, false, #FirstClass), 136);
expect("flyer first-class, no surcharge", PricingLib.unitPriceFor(row("8.5x11_flyer"), 1, false, #FirstClass), 145);
expect("4.25x6 is First-Class already", PricingLib.unitPriceFor(row("4.25x6"), 500, false, #FirstClass), 79);
for (variant in ["6x9", "6x11", "11x8.5_brochure"].vals()) {
  let r = row(variant);
  for (min in PricingLib.tierMinimums.vals()) {
    // First-Class never sells below the Marketing Mail cost plus the extra postage.
    assert PricingLib.unitPriceFor(r, min, false, #FirstClass) > r.baseCostCents + PricingLib.firstClassSurchargeCents;
  };
};

// The card fee (2.9% + 30¢) is covered on every order: whatever the format,
// class, quantity or membership, the total less the fee keeps at least 1¢ a
// piece over cost.
expect("card fee on $100", PricingLib.cardFeeCents(10_000), 320);
expect("4.25x6, one piece", PricingLib.orderFloorCents(55, 1), 89);
for (r in PricingLib.rows().vals()) {
  for (mailClass in PricingLib.rowMailClasses(r).vals()) {
    let cost = PricingLib.pieceCostCents(r, mailClass);
    for (qty in [1, 2, 3, 5, 7, 10, 39, 50, 100, 422, 999, 1_000, 9_999, 10_000, 50_000, 1_000_000].vals()) {
      for (member in [false, true].vals()) {
        let t = PricingLib.unitPriceFor(r, qty, member, mailClass) * qty;
        if (t < (cost + 1) * qty + PricingLib.cardFeeCents(t)) {
          Runtime.trap(r.layoutVariant # " × " # debug_show qty # " does not cover the card fee");
        };
      };
    };
  };
};

// An empty order or one over the checkout limit has no total.
assert PricingLib.campaignCostCents(79, 0) == null;
assert PricingLib.campaignCostCents(100_000_000, 1) == null;

Debug.print("pricing: all checks passed");
