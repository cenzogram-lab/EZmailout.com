/// User accounts, AI credit ledger, Stripe payments and referral rewards.
module {
  // ─── Accounts ────────────────────────────────────────────────────────────

  public type UserAccount = {
    id : Text;
    var email : Text;
    var creditBalance : Nat;
    var subscriptionActive : Bool;
    var subscriptionRenewsAt : Int;
    var referralCode : Text;
    var referredBy : ?Text;
    var referralCreditsEarned : Nat;
    var referralCreditsRedeemed : Nat;
    var referralCount : Nat;
    var firstPaymentAt : ?Int;
    var lastMonthlyGrantAt : Int;
    createdAt : Int;
    var updatedAt : Int;
  };

  public type UserAccountShared = {
    id : Text;
    email : Text;
    creditBalance : Nat;
    subscriptionActive : Bool;
    subscriptionRenewsAt : Int;
    referralCode : Text;
    referralLink : Text;
    referredBy : ?Text;
    referralCreditsEarned : Nat;
    referralCreditsRedeemed : Nat;
    freeMonthsAvailable : Nat;
    referralCount : Nat;
    firstPaymentAt : ?Int;
    createdAt : Int;
    updatedAt : Int;
  };

  public type AccountResult = {
    ok : Bool;
    error : ?Text;
    account : ?UserAccountShared;
  };

  // ─── Credits ─────────────────────────────────────────────────────────────

  public type CreditLedgerEntry = {
    id : Nat;
    userId : Text;
    delta : Int;
    balanceAfter : Nat;
    reason : Text;
    reference : ?Text;
    timestamp : Int;
  };

  public type CreditResult = {
    ok : Bool;
    error : ?Text;
    balance : ?Nat;
  };

  public type CreditPack = {
    #Starter;
    #Growth;
    #Agency;
  };

  public type CreditPackInfo = {
    pack : CreditPack;
    name : Text;
    priceCents : Nat;
    credits : Nat;
    bonusCredits : Nat;
  };

  public type AiImageSize = {
    #Square1024;
    #Wide1792;
    #WideHd1792;
  };

  public type AiPricing = {
    creditValueCents : Nat;
    copyCredits : Nat;
    squareImageCredits : Nat;
    wideImageCredits : Nat;
    hdImageCredits : Nat;
    monthlyAllowance : Nat;
    packs : [CreditPackInfo];
  };

  public type AiImageResult = {
    ok : Bool;
    error : ?Text;
    imageUrl : ?Text;
    revisedPrompt : ?Text;
    creditsCharged : Nat;
    creditBalance : ?Nat;
  };

  public type AiCopyInput = {
    businessName : Text;
    industry : Text;
    offer : Text;
    callToAction : Text;
    tone : ?Text;
  };

  public type AiCopyResult = {
    ok : Bool;
    error : ?Text;
    headlines : [Text];
    bullets : [Text];
    ctas : [Text];
    creditsCharged : Nat;
    creditBalance : ?Nat;
  };

  // ─── Payments ────────────────────────────────────────────────────────────

  public type PaymentPurpose = {
    #CampaignOrder;
    #CreditPack;
    #Subscription;
  };

  public type PaymentState = {
    #Created;
    #Succeeded;
    #Failed;
    #Waived;
  };

  public type PaymentRecord = {
    paymentIntentId : Text;
    userId : Text;
    purpose : PaymentPurpose;
    amountCents : Nat;
    reference : ?Text;
    creditPack : ?CreditPack;
    var state : PaymentState;
    createdAt : Int;
    var confirmedAt : ?Int;
    sandbox : Bool;
  };

  public type PaymentIntentResult = {
    ok : Bool;
    error : ?Text;
    paymentIntentId : ?Text;
    clientSecret : ?Text;
    amountCents : ?Nat;
    publishableKey : ?Text;
    waived : Bool;
    sandbox : Bool;
  };

  public type ConfirmPaymentResult = {
    ok : Bool;
    error : ?Text;
    state : ?PaymentState;
    creditBalance : ?Nat;
    campaignId : ?Text;
    subscriptionActive : ?Bool;
    referralRewardApplied : Bool;
  };

  // ─── Referrals ───────────────────────────────────────────────────────────

  public type ReferralReward = {
    id : Nat;
    referrerId : Text;
    refereeId : Text;
    paymentIntentId : Text;
    amountCents : Nat;
    timestamp : Int;
  };

  public type ReferralStats = {
    referralCode : Text;
    referralLink : Text;
    referralCount : Nat;
    referralCreditsEarned : Nat;
    referralCreditsRedeemed : Nat;
    freeMonthsAvailable : Nat;
    subscriptionActive : Bool;
    rewards : [ReferralReward];
  };
};
