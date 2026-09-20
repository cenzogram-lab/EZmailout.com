/// Retail pricing ledger: Click2Mail base cost vs EZmailout retail price
/// (100%–140% margin spread). Mirrored by src/frontend/src/lib/pricing.ts.
import Types "../types/campaign";
import Array "mo:core/Array";

module {
  let gloss = "White Matte with Gloss UV Finish";
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

  public func rows() : [Types.PricingRow] {
    [
      row("4x6", "4×6 Postcard", #Postcard, "Postcard 4 x 6", "Double Sided Postcard", #FirstClass, gloss, null, 55, 115, 6.0, 4.0),
      row("6x9", "6×9 Postcard", #Postcard, "Postcard 6 x 9", "Double Sided Postcard", #MarketingMail, gloss, null, 57, 135, 9.0, 6.0),
      row("6x11", "6×11 Jumbo Postcard", #Postcard, "Postcard 6 x 11", "Double Sided Postcard", #MarketingMail, gloss, null, 73, 165, 11.0, 6.0),
      row("letter", "8.5×11 Letter", #Letter, "Letter 8.5 x 11", "Address on Separate Page", #FirstClass, "White 24#", ?"#10 Double Window", 70, 150, 8.5, 11.0),
      row("6x18_bifold", "6×18 Bifold Self-Mailer", #SelfMailer, "Self-Mailer 6 x 18", "Bifold Self-Mailer", #MarketingMail, gloss, null, 95, 210, 18.0, 6.0),
      row("11x17_trifold", "11×17 Trifold Self-Mailer", #SelfMailer, "Self-Mailer 11 x 17", "Trifold Self-Mailer", #MarketingMail, gloss, null, 95, 210, 17.0, 11.0),
      row("8.5x11_perforated", "Snap Pack Security Mailer", #SnapPack, "Secure Mailer 8.5 x 11", "Pressure Seal Snap Pack", #FirstClass, "White 28#", null, 85, 195, 8.5, 11.0),
      row("multi_page", "Booklet", #Booklet, "Booklet", "Saddle Stitched Booklet", #MarketingMail, gloss, null, 160, 360, 8.5, 11.0),
    ];
  };

  public func find(layoutVariant : Text) : ?Types.PricingRow {
    rows().find(func(r : Types.PricingRow) : Bool { r.layoutVariant == layoutVariant });
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
