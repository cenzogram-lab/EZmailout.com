/// Retail pricing ledger: Click2Mail base cost vs EZmailout retail price
/// (100%–140% margin spread). Mirrored by src/frontend/src/lib/pricing.ts.
import Types "../types/campaign";
import Array "mo:core/Array";

module {
  let gloss = "White Matte with Gloss UV Finish";
  let bond = "White 24#";
  let window10 = "#10 Double Window";
  let bothSides = "Printing both sides";
  let postcardLayout = "Double Sided Postcard";
  let letterLayout = "Address on Separate Page";
  let eddmLayout = "EDDM Self Mailer";

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

  /// Click2Mail catalog: documentClass is the exact Click2Mail product name,
  /// one row per size on the Click2Mail product sheet. Base costs for formats
  /// without a published EZmailout tier reuse the closest priced format; every
  /// row keeps the 100%–140% retail spread.
  public func rows() : [Types.PricingRow] {
    [
      // Postcards
      row("3.5x5", "3.5×5 Mini Postcard", #Postcard, "Postcard 3.5 x 5", postcardLayout, #FirstClass, gloss, null, 55, 115, 5.0, 3.5),
      row("4.25x6", "4.25×6 Postcard", #Postcard, "Postcard 4.25 x 6", postcardLayout, #FirstClass, gloss, null, 55, 115, 6.0, 4.25),
      row("4x9", "4×9 Slim Postcard", #Postcard, "Postcard 4 x 9", postcardLayout, #MarketingMail, gloss, null, 57, 135, 9.0, 4.0),
      row("5x8", "5×8 Postcard", #Postcard, "Postcard 5 x 8", postcardLayout, #MarketingMail, gloss, null, 57, 135, 8.0, 5.0),
      row("6x9", "6×9 Postcard", #Postcard, "Postcard 6 x 9", postcardLayout, #MarketingMail, gloss, null, 57, 135, 9.0, 6.0),
      row("6x11", "6×11 Jumbo Postcard", #Postcard, "Postcard 6 x 11", postcardLayout, #MarketingMail, gloss, null, 73, 165, 11.0, 6.0),
      // Letters
      row("letter", "8.5×11 Letter", #Letter, "Letter 8.5 x 11", letterLayout, #FirstClass, bond, ?window10, 70, 150, 8.5, 11.0),
      row("letter_legal", "8.5×14 Legal Letter", #Letter, "Letter 8.5 x 14", letterLayout, #FirstClass, bond, ?window10, 80, 170, 8.5, 14.0),
      // Certified Mail
      row("certified_self_mailer", "Certified Self Mailer 8.5×11", #CertifiedMail, "Certified Self Mailer 8.5 x 11", "Certified Self Mailer", #FirstClass, bond, null, 895, 1795, 8.5, 11.0),
      row("certified_green_card", "Certified Self Mailer with Green Card", #CertifiedMail, "Certified Self Mailer With Green Card", "Certified Self Mailer", #FirstClass, bond, null, 1295, 2595, 8.5, 11.0),
      row("certified_letter", "Certified Letter 8.5×11", #CertifiedMail, "Certified Letter 8.5 x 11", letterLayout, #FirstClass, bond, ?window10, 925, 1850, 8.5, 11.0),
      // Every Door Direct Mail
      row("eddm_6.25x11", "EDDM® Mailer 6.25×11", #Eddm, "EDDM® Mailer 6.25 x 11", eddmLayout, #MarketingMail, gloss, null, 45, 95, 11.0, 6.25),
      row("eddm_6.5x9", "EDDM® Mailer 6.5×9", #Eddm, "EDDM® Mailer 6.5 x 9", eddmLayout, #MarketingMail, gloss, null, 43, 90, 9.0, 6.5),
      row("eddm_8.5x11", "EDDM® Mailer 8.5×11", #Eddm, "EDDM® Mailer 8.5 x 11", eddmLayout, #MarketingMail, gloss, null, 48, 99, 11.0, 8.5),
      row("eddm_8.5x12", "EDDM® Mailer 8.5×12", #Eddm, "EDDM® Mailer 8.5 x 12", eddmLayout, #MarketingMail, gloss, null, 52, 109, 12.0, 8.5),
      // Priority Mail
      row("priority_letter", "Priority Letter 8.5×11", #PriorityMail, "Priority Letter 8.5 x 11", letterLayout, #Priority, bond, null, 995, 1995, 8.5, 11.0),
      row("priority_express_letter", "Priority Mail® Express Letter 8.5×11", #PriorityMailExpress, "Priority Mail® Express Letters 8.5 x 11", letterLayout, #PriorityExpress, bond, null, 2995, 5995, 8.5, 11.0),
      // Flyers, secure mailers, brochures
      row("8.5x11_flyer", "8.5×11 Flyer (bifold self-mailer)", #Flyer, "Flyer 8.5 x 11", "Bifold Self-Mailer", #MarketingMail, gloss, null, 95, 210, 8.5, 11.0),
      row("8.5x11_secure", "8.5×11 Secure Self Mailer", #SnapPack, "Secure Self Mailer 8.5 x 11", "Pressure Seal Snap Pack", #FirstClass, "White 28#", null, 85, 195, 8.5, 11.0),
      row("11x8.5_brochure", "11×8.5 Brochure (trifold self-mailer)", #Brochure, "Brochure 11 x 8.5", "Trifold Self-Mailer", #MarketingMail, gloss, null, 95, 210, 11.0, 8.5),
      // Notecards & rack cards
      row("notecard_4.25x5.5", "4.25×5.5 Notecard", #Notecard, "Notecard 4.25 x 5.5", "Flat Notecard", #FirstClass, gloss, null, 62, 130, 5.5, 4.25),
      row("folded_notecard_4.25x5.5", "4.25×5.5 Folded Notecard", #Notecard, "Folded Notecard 4.25 x 5.5", "Folded Notecard", #FirstClass, gloss, null, 85, 180, 5.5, 4.25),
      row("rack_card_4x9", "4×9 Rack Card", #RackCard, "Rack Card 4 x 9", postcardLayout, #MarketingMail, gloss, null, 57, 135, 4.0, 9.0),
      // Reply mail
      row("reply_postcard_4.25x6", "4.25×6 Reply Postcard", #ReplyMail, "Reply Postcard 4.25 x 6", "Business Reply Postcard", #FirstClass, gloss, null, 75, 160, 6.0, 4.25),
      row("reply_letter", "8.5×11 Reply Letter", #ReplyMail, "Reply Letter 8.5 x 11", letterLayout, #FirstClass, bond, ?window10, 95, 200, 8.5, 11.0),
      // Booklets
      row("8.5x11_booklet", "8.5×11 Booklet Self Mailer", #Booklet, "Booklet Self Mailer 8.5 x 11", "Saddle Stitched Booklet", #MarketingMail, gloss, null, 160, 360, 8.5, 11.0),
      row("booklet_address_back", "8.5×11 Booklet · Address Back Page", #Booklet, "Booklet Address Back Page 8.5 x 11", "Address on Back Page", #MarketingMail, gloss, null, 175, 385, 8.5, 11.0),
      row("booklet_address_front", "8.5×11 Booklet · Address Front Page", #Booklet, "Booklet Address Front Page 8.5 x 11", "Address on Front Page", #MarketingMail, gloss, null, 175, 385, 8.5, 11.0),
      // Card stock
      row("card_stock_12x4.5", "12×4.5 Card Stock", #CardStock, "Card Stock Paper 12 x 4.5", postcardLayout, #MarketingMail, gloss, null, 60, 130, 12.0, 4.5),
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

  /// Print spec for a product selection (letters switch to B&W when requested).
  public func printSpecFor(product : Types.ProductSelection) : ?Types.PrintSpec {
    switch (find(product.layoutVariant)) {
      case null { null };
      case (?r) {
        let bw = supportsBlackAndWhite(r.productType) and product.colorOption == ?"bw";
        ?{
          documentClass = r.printSpec.documentClass;
          layout = r.printSpec.layout;
          mailClass = r.printSpec.mailClass;
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
