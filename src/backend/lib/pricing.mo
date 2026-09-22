/// Retail pricing ledger: Click2Mail base cost vs EZmailout retail price
/// (100%–140% margin spread). Mirrored by src/frontend/src/lib/pricing.ts.
import Types "../types/campaign";
import Array "mo:core/Array";

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

  /// The authoritative Click2Mail price matrix: 14 product families, 29
  /// document classes. `documentClass` is the exact Click2Mail product name and
  /// `widthInches` / `heightInches` follow it (a "Postcard 4 x 9" is 4" wide by
  /// 9" tall). Costs and retail prices are the operator's rates.
  /// Mirrored by src/frontend/src/lib/pricing.ts — change both.
  public func rows() : [Types.PricingRow] {
    [
      row("3.5x5", "3.5 x 5 Mini Postcard", #Postcard, "Postcard 3.5 x 5", "Double Sided Postcard", #FirstClass, "White Matte with Gloss UV Finish", null, 53, 110, 3.5, 5.0),
      row("4.25x6", "4.25 x 6 Postcard", #Postcard, "Postcard 4.25 x 6", "Double Sided Postcard", #FirstClass, "White Matte with Gloss UV Finish", null, 55, 115, 4.25, 6.0),
      row("4x9", "4 x 9 Slim Postcard", #Postcard, "Postcard 4 x 9", "Double Sided Postcard", #FirstClass, "White Matte with Gloss UV Finish", null, 55, 120, 4.0, 9.0),
      row("5x8", "5 x 8 Postcard", #Postcard, "Postcard 5 x 8", "Double Sided Postcard", #FirstClass, "White Matte with Gloss UV Finish", null, 54, 125, 5.0, 8.0),
      row("6x9", "6 x 9 Postcard", #Postcard, "Postcard 6 x 9", "Double Sided Postcard", #MarketingMail, "White Matte with Gloss UV Finish", null, 57, 135, 6.0, 9.0),
      row("6x11", "6 x 11 Jumbo Postcard", #Postcard, "Postcard 6 x 11", "Double Sided Postcard", #MarketingMail, "White Matte with Gloss UV Finish", null, 73, 165, 6.0, 11.0),
      row("letter", "8.5 x 11 Letter", #Letter, "Letter 8.5 x 11", "Address on Separate Page", #FirstClass, "White 24#", ?"#10 Double Window", 59, 150, 8.5, 11.0),
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
      row("11x8.5_brochure", "11 x 8.5 Trifold Brochure", #Brochure, "Brochure 11 x 8.5", "Trifold Self-Mailer", #MarketingMail, "White Matte with Gloss UV Finish", null, 107, 225, 11.0, 8.5),
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

  /// Layout keys that shipped before the Click2Mail catalog audit map onto the
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

  /// Letter-style products that Click2Mail prints in black and white on request.
  public func supportsBlackAndWhite(productType : Types.ProductType) : Bool {
    switch (productType) {
      case (#Letter or #CertifiedMail or #PriorityMail or #PriorityMailExpress or #ReplyMail) true;
      case (_) false;
    };
  };

  /// USPS mail classes a product may be sent with (the ledger default first).
  public func supportedMailClasses(productType : Types.ProductType) : [Types.MailClass] {
    switch (productType) {
      case (#Postcard or #Flyer or #Brochure) [#MarketingMail, #FirstClass];
      case (#Eddm or #Booklet or #CardStock) [#MarketingMail];
      case (#PriorityMail) [#Priority];
      case (#PriorityMailExpress) [#PriorityExpress];
      case (_) [#FirstClass];
    };
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
            let allowed = supportedMailClasses(r.productType);
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
