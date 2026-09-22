/// Retail pricing ledger: Click2Mail base cost vs EZmailout retail price
/// (100%–140% margin spread). Mirrored by src/frontend/src/lib/pricing.ts.
import Types "../types/campaign";
import Array "mo:core/Array";

module {
  let gloss = "White Matte with Gloss UV Finish";
  let bothSides = "Printing both sides";
  let postcardLayout = "Double Sided Postcard";

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

  /// Click2Mail catalog: documentClass is the exact Click2Mail product name.
  /// Rows sharing a ledger tier reuse the base/retail of the closest priced format.
  public func rows() : [Types.PricingRow] {
    [
      row("3.5x5", "3.5×5 Mini Postcard", #Postcard, "Postcard 3.5 x 5", postcardLayout, #FirstClass, gloss, null, 55, 115, 5.0, 3.5),
      row("4.25x6", "4.25×6 Postcard", #Postcard, "Postcard 4.25 x 6", postcardLayout, #FirstClass, gloss, null, 55, 115, 6.0, 4.25),
      row("4x9", "4×9 Slim Postcard", #Postcard, "Postcard 4 x 9", postcardLayout, #MarketingMail, gloss, null, 57, 135, 9.0, 4.0),
      row("5x8", "5×8 Postcard", #Postcard, "Postcard 5 x 8", postcardLayout, #MarketingMail, gloss, null, 57, 135, 8.0, 5.0),
      row("6x9", "6×9 Postcard", #Postcard, "Postcard 6 x 9", postcardLayout, #MarketingMail, gloss, null, 57, 135, 9.0, 6.0),
      row("6x11", "6×11 Jumbo Postcard", #Postcard, "Postcard 6 x 11", postcardLayout, #MarketingMail, gloss, null, 73, 165, 11.0, 6.0),
      row("letter", "8.5×11 Letter", #Letter, "Letter 8.5 x 11", "Address on Separate Page", #FirstClass, "White 24#", ?"#10 Double Window", 70, 150, 8.5, 11.0),
      row("letter_legal", "8.5×14 Legal Letter", #Letter, "Letter 8.5 x 14", "Address on Separate Page", #FirstClass, "White 24#", ?"#10 Double Window", 80, 170, 8.5, 14.0),
      row("8.5x11_flyer", "8.5×11 Flyer (bifold self-mailer)", #SelfMailer, "Flyer 8.5 x 11", "Bifold Self-Mailer", #MarketingMail, gloss, null, 95, 210, 8.5, 11.0),
      row("11x8.5_brochure", "11×8.5 Brochure (trifold self-mailer)", #SelfMailer, "Brochure 11 x 8.5", "Trifold Self-Mailer", #MarketingMail, gloss, null, 95, 210, 11.0, 8.5),
      row("8.5x11_secure", "8.5×11 Secure Self Mailer", #SnapPack, "Secure Self Mailer 8.5 x 11", "Pressure Seal Snap Pack", #FirstClass, "White 28#", null, 85, 195, 8.5, 11.0),
      row("8.5x11_booklet", "8.5×11 Booklet Self Mailer", #Booklet, "Booklet Self Mailer 8.5 x 11", "Saddle Stitched Booklet", #MarketingMail, gloss, null, 160, 360, 8.5, 11.0),
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

  /// Print spec for a product selection (letters switch to B&W when requested).
  public func printSpecFor(product : Types.ProductSelection) : ?Types.PrintSpec {
    switch (find(product.layoutVariant)) {
      case null { null };
      case (?r) {
        let bw = product.productType == #Letter and product.colorOption == ?"bw";
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
    };
  };
};
