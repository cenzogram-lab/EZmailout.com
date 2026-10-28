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

  /// A refund the admin issued through the payment processor.
  /// What a refund still pending with the processor will take back once it
  /// succeeds (nothing is taken back before: a refund that later fails must
  /// leave the customer as they were). Keyed by refund id.
  public type PendingRefundEffects = {
    paymentIntentId : Text;
    amountCents : Nat;
    revokeEffects : Bool;
    /// The campaign held (marked refunded) when the refund was made.
    heldCampaign : ?Text;
    createdAt : Int;
  };

  public type RefundRecord = {
    refundId : Text;
    amountCents : Nat;
    reason : Text;
    /// The processor's refund status ("succeeded", "pending", …).
    status : Text;
    createdAt : Int;
    /// Who issued it (principal text).
    by : Text;
  };

  public type RefundView = {
    refundId : Text;
    amountCents : Nat;
    reason : Text;
    status : Text;
    createdAt : Int;
  };

  /// A payment as its owner (payment history, the invoice number is
  /// `paymentIntentId`) and the admin (search, refunds) see it.
  public type PaymentView = {
    paymentIntentId : Text;
    userId : Text;
    purpose : PaymentPurpose;
    amountCents : Nat;
    refundedCents : Nat;
    state : PaymentState;
    createdAt : Int;
    confirmedAt : ?Int;
    testMode : Bool;
    creditPack : ?CreditPack;
    campaignId : ?Text;
    campaignName : ?Text;
    /// This payment is the one that paid its campaign (not a duplicate).
    settledCampaign : Bool;
    /// The campaign's print file is already with the print partner.
    campaignInProduction : Bool;
    refunds : [RefundView];
  };

  public type RefundInput = {
    paymentIntentId : Text;
    amountCents : Nat;
    reason : Text;
    /// Also take back what the payment granted (its campaign, credits or
    /// membership days) where that is still possible.
    revokeEffects : Bool;
  };

  public type RefundResult = {
    ok : Bool;
    error : ?Text;
    refundId : ?Text;
    refundedCents : Nat;
    creditBalance : ?Nat;
  };

  public type CreditAdjustResult = {
    ok : Bool;
    error : ?Text;
    creditBalance : ?Nat;
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
