/// AI credit economics: 1 credit = $0.01, 70% markup over OpenAI cost.
import Account "../types/account";

module {
  public let creditValueCents : Nat = 1;
  public let copyCredits : Nat = 1;
  public let squareImageCredits : Nat = 7;
  public let wideImageCredits : Nat = 14;
  public let hdImageCredits : Nat = 20;
  public let monthlyAllowance : Nat = 50;
  public let subscriptionPriceCents : Nat = 900;
  public let referralRewardCents : Nat = 900;
  public let thirtyDaysNs : Int = 2_592_000_000_000_000;

  public func packInfo(pack : Account.CreditPack) : Account.CreditPackInfo {
    switch (pack) {
      case (#Starter) { { pack = #Starter; name = "Starter Pack"; priceCents = 500; credits = 500; bonusCredits = 0 } };
      case (#Growth) { { pack = #Growth; name = "Growth Pack"; priceCents = 1500; credits = 1600; bonusCredits = 100 } };
      case (#Agency) { { pack = #Agency; name = "Agency Pack"; priceCents = 3500; credits = 4000; bonusCredits = 500 } };
    };
  };

  public func packName(pack : Account.CreditPack) : Text {
    switch (pack) { case (#Starter) "starter"; case (#Growth) "growth"; case (#Agency) "agency" };
  };

  public func imageCredits(size : Account.AiImageSize) : Nat {
    switch (size) {
      case (#Square1024) squareImageCredits;
      case (#Wide1792) wideImageCredits;
      case (#WideHd1792) hdImageCredits;
    };
  };

  public func aiPricing() : Account.AiPricing {
    {
      creditValueCents;
      copyCredits;
      squareImageCredits;
      wideImageCredits;
      hdImageCredits;
      monthlyAllowance;
      packs = [packInfo(#Starter), packInfo(#Growth), packInfo(#Agency)];
    };
  };
};
