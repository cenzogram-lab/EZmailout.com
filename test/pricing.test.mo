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
// it is lifted to cost + 1¢: $0.56 each, $30,800.00.
expect("4x6 × 55,000 unit", unit(55_000, false), 56);
assert total(55_000, false) == ?3_080_000;
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
expect("member 4x6 × 50,000", unit(50_000, true), 56);

// Every tiered format, every tier, never below cost.
for ((variant, schedule) in [
  ("4.25x6", [79, 71, 62, 56]),
  ("6x9", [98, 72, 68, 65]),
  ("6x11", [92, 83, 74, 74]),
  ("letter", [93, 81, 74, 69]),
  ("11x8.5_brochure", [132, 108, 108, 108]),
].vals()) {
  let r = row(variant);
  for (i in schedule.keys()) {
    let price = PricingLib.calculateUnitPrice(r, PricingLib.tierMinimums[i], false);
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
expect("EDDM 6.5 x 9, print 40¢ + postage 26¢", PricingLib.calculateUnitPrice(row("eddm_6.5x9"), 1, false), 66);
expect("EDDM 8.5 x 12, print 55¢ + postage 26¢", PricingLib.calculateUnitPrice(row("eddm_8.5x12"), 5_000, true), 81);
expect("no postage on top for a postcard", PricingLib.postageCents(row("6x9")), 0);

// Card payments start at $0.50 (checked by createCampaign and checkout).
expect("minimum order", PricingLib.minOrderCents, 50);

// An empty order or one over the checkout limit has no total.
assert PricingLib.campaignCostCents(79, 0) == null;
assert PricingLib.campaignCostCents(100_000_000, 1) == null;

Debug.print("pricing: all checks passed");
