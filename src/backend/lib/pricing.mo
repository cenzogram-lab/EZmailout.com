/// Retail pricing ledger: print base cost vs EZmailout retail price, with
/// volume tiers for the formats competitors sell (`calculateUnitPrice`).
/// Mirrored by src/frontend/src/lib/pricing.ts.
import Types "../types/campaign";
import Array "mo:core/Array";
import Nat "mo:core/Nat";

module {
  let bothSides = "Printing both sides";

  private func row(
    variant : Text,
    name : Text,
    product : Types.ProductType,
    documentClass : Text,
    layout : Text,
    mailClass : Types.MailClass,
    paperType : Text,
    envelope : ?Text,
    base : Nat,
    retail : Nat,
    w : Float,
    h : Float,
  ) : Types.PricingRow {
    let margin : Nat = if (retail > base) { retail - base } else { 0 };
    {
      layoutVariant = variant;
      displayName = name;
      productType = product;
      baseCostCents = base;
      retailPriceCents = retail;
      marginCents = margin;
      marginPercent = if (base == 0) { 0 } else { (margin * 100) / base };
      widthInches = w;
      heightInches = h;
      printSpec = {
        documentClass;
        layout;
        mailClass;
        paperType;
        productionTime = "Next Day";
        color = "Full Color";
        printOption = bothSides;
        envelope;
      };
    };
  };

  /// The authoritative print price matrix: 14 product families, 29
  /// document classes. `documentClass` is the exact print product name and
  /// `widthInches` / `heightInches` follow it (a "Postcard 4 x 9" is 4" wide by
  /// 9" tall). Costs and retail prices are the operator's rates.
  /// Mirrored by src/frontend/src/lib/pricing.ts — change both.
  public func rows() : [Types.PricingRow] {
    [
      row("3.5x5", "3.5 x 5 Mini Postcard", #Postcard, "Postcard 3.5 x 5", "Double Sided Postcard", #FirstClass, "White Matte with Gloss UV Finish", null, 53, 110, 3.5, 5.0),
      row("4.25x6", "4.25 x 6 Postcard", #Postcard, "Postcard 4.25 x 6", "Double Sided Postcard", #FirstClass, "White Matte with Gloss UV Finish", null, 55, 79, 4.25, 6.0),
      row("4x9", "4 x 9 Slim Postcard", #Postcard, "Postcard 4 x 9", "Double Sided Postcard", #FirstClass, "White Matte with Gloss UV Finish", null, 55, 120, 4.0, 9.0),
      row("5x8", "5 x 8 Postcard", #Postcard, "Postcard 5 x 8", "Double Sided Postcard", #FirstClass, "White Matte with Gloss UV Finish", null, 54, 125, 5.0, 8.0),
      row("6x9", "6 x 9 Postcard", #Postcard, "Postcard 6 x 9", "Double Sided Postcard", #MarketingMail, "White Matte with Gloss UV Finish", null, 57, 98, 6.0, 9.0),
      row("6x11", "6 x 11 Jumbo Postcard", #Postcard, "Postcard 6 x 11", "Double Sided Postcard", #MarketingMail, "White Matte with Gloss UV Finish", null, 73, 92, 6.0, 11.0),
      row("letter", "8.5 x 11 Letter", #Letter, "Letter 8.5 x 11", "Address on Separate Page", #FirstClass, "White 24#", ?"#10 Double Window", 59, 93, 8.5, 11.0),
      row("letter_legal", "8.5 x 14 Legal Letter", #Letter, "Letter 8.5 x 14", "Address on Separate Page", #FirstClass, "White 24#", ?"#10 Double Window", 61, 165, 8.5, 14.0),
      row("certified_self_mailer", "Certified Self Mailer 8.5 x 11", #CertifiedMail, "Certified Self Mailer 8.5 x 11", "Certified Self Mailer", #FirstClass, "White 24#", null, 645, 1290, 8.5, 11.0),
      row("certified_letter", "Certified Letter 8.5 x 11", #CertifiedMail, "Certified Letter 8.5 x 11", "Address on Separate Page", #FirstClass, "White 24#", ?"#10 Double Window", 666, 1350, 8.5, 11.0),
      row("certified_green_card", "Certified Self Mailer with Green Card", #CertifiedMail, "Certified Self Mailer With Green Card", "Certified Self Mailer", #FirstClass, "White 24#", null, 1104, 2200, 8.5, 11.0),
      row("eddm_6.5x9", "EDDM® Mailer 6.5 x 9", #Eddm, "EDDM® Mailer 6.5 x 9", "EDDM Self Mailer", #MarketingMail, "White Matte with Gloss UV Finish", null, 15, 40, 6.5, 9.0),
      row("eddm_8.5x11", "EDDM® Mailer 8.5 x 11", #Eddm, "EDDM® Mailer 8.5 x 11", "EDDM Self Mailer", #MarketingMail, "White Matte with Gloss UV Finish", null, 16, 42, 8.5, 11.0),
      row("eddm_6.25x11", "EDDM® Mailer 6.25 x 11", #Eddm, "EDDM® Mailer 6.25 x 11", "EDDM Self Mailer", #MarketingMail, "White Matte with Gloss UV Finish", null, 17, 45, 6.25, 11.0),
      row("eddm_8.5x12", "EDDM® Mailer 8.5 x 12", #Eddm, "EDDM® Mailer 8.5 x 12", "EDDM Self Mailer", #MarketingMail, "White Matte with Gloss UV Finish", null, 22, 55, 8.5, 12.0),
      row("priority_letter", "Priority Letter 8.5 x 11", #PriorityMail, "Priority Letter 8.5 x 11", "Address on Separate Page", #Priority, "White 24#", null, 1166, 2250, 8.5, 11.0),
      row("priority_express_letter", "Priority Mail® Express Letter 8.5 x 11", #PriorityMailExpress, "Priority Mail® Express Letters 8.5 x 11", "Address on Separate Page", #PriorityExpress, "White 24#", null, 3206, 5500, 8.5, 11.0),
      row("8.5x11_flyer", "8.5 x 11 Flyer", #Flyer, "Flyer 8.5 x 11", "Unfolded Flyer", #MarketingMail, "White Matte with Gloss UV Finish", null, 57, 145, 8.5, 11.0),
      row("11x8.5_brochure", "11 x 8.5 Trifold Brochure", #Brochure, "Brochure 11 x 8.5", "Trifold Self-Mailer", #MarketingMail, "White Matte with Gloss UV Finish", null, 107, 132, 11.0, 8.5),
      row("8.5x11_secure", "8.5 x 11 Secure Self Mailer", #SnapPack, "Secure Self Mailer 8.5 x 11", "Pressure Seal Snap Pack", #FirstClass, "White 28#", null, 58, 195, 8.5, 11.0),
      row("notecard_4.25x5.5", "4.25 x 5.5 Notecard", #Notecard, "Notecard 4.25 x 5.5", "Flat Notecard", #FirstClass, "White Matte with Gloss UV Finish", null, 87, 185, 4.25, 5.5),
      row("folded_notecard_4.25x5.5", "4.25 x 5.5 Folded Notecard", #Notecard, "Folded Notecard 4.25 x 5.5", "Folded Notecard", #FirstClass, "White Matte with Gloss UV Finish", null, 104, 225, 4.25, 5.5),
      row("rack_card_4x9", "4 x 9 Rack Card", #RackCard, "Rack Card 4 x 9", "Double Sided Postcard", #FirstClass, "Heavy Cardstock", null, 55, 125, 4.0, 9.0),
      row("reply_postcard_4.25x6", "4.25 x 6 Reply Postcard", #ReplyMail, "Reply Postcard 4.25 x 6", "Business Reply Postcard", #FirstClass, "White Matte with Gloss UV Finish", null, 64, 150, 4.25, 6.0),
      row("reply_letter", "8.5 x 11 Reply Letter", #ReplyMail, "Reply Letter 8.5 x 11", "Address on Separate Page", #FirstClass, "White 24#", ?"#10 Double Window", 65, 160, 8.5, 11.0),
      row("8.5x11_booklet", "8.5 x 11 Booklet Self Mailer", #Booklet, "Booklet Self Mailer 8.5 x 11", "Saddle Stitched Booklet", #MarketingMail, "White Matte with Gloss UV Finish", null, 74, 210, 8.5, 11.0),
      row("booklet_address_front", "8.5 x 11 Booklet · Address Front Page", #Booklet, "Booklet Address Front Page 8.5 x 11", "Address on Front Page", #MarketingMail, "White Matte with Gloss UV Finish", null, 162, 360, 8.5, 11.0),
      row("booklet_address_back", "8.5 x 11 Booklet · Address Back Page", #Booklet, "Booklet Address Back Page 8.5 x 11", "Address on Back Page", #MarketingMail, "White Matte with Gloss UV Finish", null, 162, 360, 8.5, 11.0),
      row("card_stock_12x4.5", "12 x 4.5 Card Stock", #CardStock, "Card Stock Paper 12 x 4.5", "Double Sided Postcard", #MarketingMail, "Heavy Cardstock", null, 65, 165, 12.0, 4.5),
    ];
  };

  // ─── Volume tiers ────────────────────────────────────────────────────────

  /// Fewest pieces for each tier: under 1,000, from 1,000, 10,000, 50,000.
  public let tierMinimums : [Nat] = [0, 1_000, 10_000, 50_000];

  /// Members are priced as an order of at least this many pieces (the
  /// 10,000 tier), whatever the batch size.
  public let memberTierQuantity : Nat = 10_000;

  /// Per-piece prices in cents, one per `tierMinimums` entry, for the
  /// formats competitors sell (the competitor's published price less 1¢).
  /// Formats only EZmailout offers (certified, Priority, secure mailers,
  /// EDDM®, booklets…) keep their flat `retailPriceCents`. The first tier is
  /// the row's `retailPriceCents`. Mirrored by `VOLUME_TIERS` in
  /// src/frontend/src/lib/pricing.ts — change both.
  public func volumeTiers(layoutVariant : Text) : ?[Nat] {
    switch (normalizeVariant(layoutVariant)) {
      case ("4.25x6") ?[79, 71, 62, 52];
      case ("6x9") ?[98, 72, 68, 65];
      case ("6x11") ?[92, 83, 74, 70];
      case ("letter") ?[93, 81, 74, 69];
      case ("11x8.5_brochure") ?[132, 98, 82, 78];
      case (_) null;
    };
  };

  /// USPS EDDM® Retail saturation postage per piece (the rate from 12 July
  /// 2026). An EDDM row's ledger price is print only, so every EDDM piece is
  /// charged this on top. Mirrored by `EDDM_POSTAGE_CENTS` in
  /// `src/frontend/src/lib/pricing.ts`.
  public let eddmPostageCents : Nat = 26;

  /// Postage charged per piece on top of the ledger price: EDDM's saturation
  /// postage; every other row's price already includes postage.
  public func postageCents(row : Types.PricingRow) : Nat {
    switch (row.productType) { case (#Eddm) eddmPostageCents; case _ 0 };
  };

  /// `unitPriceFor` at the row's own mail class: cents per piece for an
  /// order of `qty` pieces of `row`, as checkout charges it.
  public func calculateUnitPrice(row : Types.PricingRow, qty : Nat, isMember : Bool) : Nat {
    unitPriceFor(row, qty, isMember, row.printSpec.mailClass);
  };

  /// The card fee the payment processor keeps from every charge: 2.9% + 30¢
  /// (its standard US card rate). Prices never fall below what covers it.
  /// Mirrored by `CARD_FEE_BASIS_POINTS` / `CARD_FEE_FIXED_CENTS` in
  /// `src/frontend/src/lib/pricing.ts`.
  public let cardFeeBasisPoints : Nat = 290;
  public let cardFeeFixedCents : Nat = 30;

  func ceilDiv(a : Nat, b : Nat) : Nat { (a + b - 1) / b };

  /// What the processor keeps from a charge of `totalCents` (its percentage
  /// rounded up).
  public func cardFeeCents(totalCents : Nat) : Nat {
    ceilDiv(totalCents * cardFeeBasisPoints, 10_000) + cardFeeFixedCents;
  };

  /// What one piece of `row` mailed at `mailClass` costs: print (postage
  /// included, except EDDM), EDDM saturation postage and the First-Class
  /// surcharge.
  public func pieceCostCents(row : Types.PricingRow, mailClass : Types.MailClass) : Nat {
    row.baseCostCents + postageCents(row) + classSurchargeCents(row, mailClass);
  };

  /// The lowest per-piece rate that keeps 1¢ a piece over `cost` once the
  /// card fee's percentage is taken.
  public func rateFloorCents(cost : Nat) : Nat {
    ceilDiv((cost + 1) * 10_000, 10_000 - cardFeeBasisPoints);
  };

  /// The lowest unit price at which an order of `qty` pieces keeps 1¢ a piece
  /// over `cost` after the whole card fee, its fixed part included (which
  /// only a small order notices).
  public func orderFloorCents(cost : Nat, qty : Nat) : Nat {
    let n = Nat.max(qty, 1);
    let need = (cost + 1) * n;
    var unit = ceilDiv((need + cardFeeFixedCents) * 10_000, (10_000 - cardFeeBasisPoints) * n);
    while (unit * n < need + cardFeeCents(unit * n)) { unit += 1 };
    unit;
  };

  /// Extra postage per piece when a format priced for Marketing Mail is sent
  /// First-Class: USPS First-Class presort letters less Marketing Mail letters
  /// at mixed sort (70.7¢ − 46.7¢, prices from 12 July 2026). Charged only on
  /// the formats whose volume prices cannot absorb it (`firstClassSurcharged`);
  /// the flyer's flat price can. Mirrored by `FIRST_CLASS_SURCHARGE_CENTS` in
  /// `src/frontend/src/lib/pricing.ts`.
  public let firstClassSurchargeCents : Nat = 24;

  /// Rows that pay `firstClassSurchargeCents` when sent First-Class.
  public func firstClassSurcharged(layoutVariant : Text) : Bool {
    switch (normalizeVariant(layoutVariant)) {
      case ("6x9" or "6x11" or "11x8.5_brochure") true;
      case _ false;
    };
  };

  /// The surcharge `mailClass` adds to a piece of `row`: First-Class on a
  /// row priced for Marketing Mail that `firstClassSurcharged` lists.
  public func classSurchargeCents(row : Types.PricingRow, mailClass : Types.MailClass) : Nat {
    if (mailClass == #FirstClass and row.printSpec.mailClass == #MarketingMail and firstClassSurcharged(row.layoutVariant)) firstClassSurchargeCents else 0;
  };

  /// The per-piece rate for `qty` pieces mailed at `mailClass`, as price
  /// lists show it: the volume tier (a member is priced as at least
  /// `memberTierQuantity` pieces) plus EDDM postage and the class surcharge,
  /// never below `rateFloorCents` of the piece's cost (4.25 × 6 at 50,000,
  /// 6 × 11 from 10,000, the brochure from 1,000).
  public func pieceRateCents(row : Types.PricingRow, qty : Nat, isMember : Bool, mailClass : Types.MailClass) : Nat {
    let listed = tierPrice(row, qty, isMember) + postageCents(row) + classSurchargeCents(row, mailClass);
    Nat.max(listed, rateFloorCents(pieceCostCents(row, mailClass)));
  };

  /// What `createCampaign` stores and checkout charges per piece for an order
  /// of `qty` pieces mailed at `mailClass` (the class the print job uses,
  /// from `printSpecFor`): `pieceRateCents`, lifted on a small order to
  /// `orderFloorCents` so the order also covers the card fee's fixed part.
  public func unitPriceFor(row : Types.PricingRow, qty : Nat, isMember : Bool, mailClass : Types.MailClass) : Nat {
    Nat.max(pieceRateCents(row, qty, isMember, mailClass), orderFloorCents(pieceCostCents(row, mailClass), qty));
  };

  func tierPrice(row : Types.PricingRow, qty : Nat, isMember : Bool) : Nat {
    switch (volumeTiers(row.layoutVariant)) {
      case null row.retailPriceCents;
      case (?tiers) {
        let effective = if (isMember and qty < memberTierQuantity) memberTierQuantity else qty;
        var price = tiers[0];
        for (i in tiers.keys()) {
          if (effective >= tierMinimums[i]) { price := tiers[i] };
        };
        price;
      };
    };
  };

  /// The most a single checkout may charge (the payment processor's limit).
  public let maxOrderCents : Nat = 99_999_999;

  /// The smallest order a card payment can take: the payment processor
  /// refuses charges under $0.50. Mirrored by `MIN_ORDER_CENTS` in
  /// `src/frontend/src/lib/pricing.ts`.
  public let minOrderCents : Nat = 50;

  /// What `count` pieces at `unitCents` cost, or null when the order is empty
  /// or over `maxOrderCents`. Nat is unbounded, so the product cannot wrap.
  public func campaignCostCents(unitCents : Nat, count : Nat) : ?Nat {
    let total = unitCents * count;
    if (count == 0 or total == 0 or total > maxOrderCents) null else ?total;
  };

  /// Layout keys that shipped before the print catalog audit map onto the
  /// current rows so older drafts and templates keep resolving.
  public func normalizeVariant(layoutVariant : Text) : Text {
    switch (layoutVariant) {
      case ("4x6") "4.25x6";
      case ("6x18_bifold") "8.5x11_flyer";
      case ("11x17_trifold") "11x8.5_brochure";
      case ("8.5x11_perforated") "8.5x11_secure";
      case ("multi_page") "8.5x11_booklet";
      case (other) other;
    };
  };

  public func find(layoutVariant : Text) : ?Types.PricingRow {
    let key = normalizeVariant(layoutVariant);
    rows().find(func(r : Types.PricingRow) : Bool { r.layoutVariant == key });
  };

  /// Letter-style products that the print partner prints in black and white on request.
  public func supportsBlackAndWhite(productType : Types.ProductType) : Bool {
    switch (productType) {
      case (#Letter or #CertifiedMail or #PriorityMail or #PriorityMailExpress or #ReplyMail) true;
      case (_) false;
    };
  };

  /// USPS mail classes a product type may be sent with (the ledger default first).
  public func supportedMailClasses(productType : Types.ProductType) : [Types.MailClass] {
    switch (productType) {
      case (#Postcard or #Flyer or #Brochure) [#MarketingMail, #FirstClass];
      case (#Eddm or #Booklet or #CardStock) [#MarketingMail];
      case (#PriorityMail) [#Priority];
      case (#PriorityMailExpress) [#PriorityExpress];
      case (_) [#FirstClass];
    };
  };

  /// The classes one ledger row offers, as the Step 1 chips do
  /// (`supportedMailClasses` in lib/pricing.ts): a row that defaults to
  /// Marketing Mail may also go First-Class when its type allows it; a row
  /// that defaults to anything else (the small postcards, rack cards) is
  /// mailed only at its own class.
  public func rowMailClasses(r : Types.PricingRow) : [Types.MailClass] {
    if (r.printSpec.mailClass == #MarketingMail) supportedMailClasses(r.productType) else [r.printSpec.mailClass];
  };

  /// Print spec for a product selection (letters switch to B&W when requested).
  /// `mailClass` overrides the ledger default when the product supports it.
  public func printSpecFor(product : Types.ProductSelection, mailClass : ?Types.MailClass) : ?Types.PrintSpec {
    switch (find(product.layoutVariant)) {
      case null { null };
      case (?r) {
        let bw = supportsBlackAndWhite(r.productType) and product.colorOption == ?"bw";
        // A row's own default is always allowed; anything else must be listed
        // for the product, otherwise the ledger default stands.
        let chosen : Types.MailClass = switch (mailClass) {
          case (?requested) {
            let allowed = rowMailClasses(r);
            if (allowed.any(func(m : Types.MailClass) : Bool { m == requested })) {
              requested;
            } else { r.printSpec.mailClass };
          };
          case null { r.printSpec.mailClass };
        };
        ?{
          documentClass = r.printSpec.documentClass;
          layout = r.printSpec.layout;
          mailClass = chosen;
          paperType = r.printSpec.paperType;
          productionTime = r.printSpec.productionTime;
          color = if (bw) { "Black and White" } else { r.printSpec.color };
          printOption = r.printSpec.printOption;
          envelope = r.printSpec.envelope;
        };
      };
    };
  };

  public func mailClassText(mc : Types.MailClass) : Text {
    switch (mc) {
      case (#FirstClass) "First Class";
      case (#MarketingMail) "Standard";
      case (#Priority) "Priority Mail";
      case (#PriorityExpress) "Priority Mail Express";
    };
  };
};
