/// Shared value types used across the EZmailout canister.
module {
  public type Timestamp = Int;

  // ─── Addresses ───────────────────────────────────────────────────────────

  /// Raw address as received from a CSV row (whitespace is trimmed on intake).
  public type AddressInput = {
    name : Text;
    address_line1 : Text;
    address_line2 : ?Text;
    city : Text;
    state : Text;
    zip_code : Text;
  };

  /// CASS-scrubbed address with ZIP+4 appended when available.
  public type VerifiedAddress = {
    name : Text;
    address_line1 : Text;
    address_line2 : ?Text;
    city : Text;
    state : Text;
    zip_code : Text;
    zip_plus4 : ?Text;
  };

  public type AddressVerificationResult = {
    input : AddressInput;
    verified : ?VerifiedAddress;
    isValid : Bool;
    errorMessage : ?Text;
  };

  /// Result of a Click2Mail address-list verification batch.
  public type VerificationBatchResult = {
    ok : Bool;
    error : ?Text;
    results : [AddressVerificationResult];
    addressListId : ?Text;
    validCount : Nat;
    invalidCount : Nat;
  };

  /// Sender / return address printed on every piece (required by Click2Mail jobs).
  public type ReturnAddress = {
    name : Text;
    organization : ?Text;
    address_line1 : Text;
    address_line2 : ?Text;
    city : Text;
    state : Text;
    zip_code : Text;
  };

  // ─── Admin configuration ─────────────────────────────────────────────────

  public type Click2MailEnvironment = { #Production; #Staging };

  /// Mutable stable admin credential state (owned by main.mo).
  public type AdminState = {
    var click2mailUsername : ?Text;
    var click2mailPassword : ?Text;
    var click2mailEnvironment : Click2MailEnvironment;
    var stripeSecretKey : ?Text;
    var stripePublishableKey : ?Text;
    var resendKey : ?Text;
    var openAiKey : ?Text;
    var webhookSecret : ?Text;
    var outcallProxyUrl : ?Text;
    var sandboxCheckout : Bool;
    var adminPrincipal : ?Text;
    /// Where new support tickets are emailed through Resend; null = don't email.
    var supportEmailAddress : ?Text;
  };

  /// Input for `saveAdminKeys`. Per field: `null` = leave unchanged, `?""` = clear, `?value` = set.
  public type AdminKeysInput = {
    click2mailUsername : ?Text;
    click2mailPassword : ?Text;
    click2mailEnvironment : ?Click2MailEnvironment;
    stripeSecretKey : ?Text;
    stripePublishableKey : ?Text;
    resendKey : ?Text;
    openAiKey : ?Text;
    webhookSecret : ?Text;
    outcallProxyUrl : ?Text;
    sandboxCheckout : ?Bool;
    supportEmailAddress : ?Text;
  };

  /// Masked view returned by `getAdminKeys` (secrets expose only their last 4 characters).
  public type AdminKeysView = {
    click2mailUsername : ?Text;
    click2mailPasswordMasked : ?Text;
    click2mailEnvironment : Click2MailEnvironment;
    stripeSecretKeyMasked : ?Text;
    stripePublishableKey : ?Text;
    resendKeyMasked : ?Text;
    openAiKeyMasked : ?Text;
    webhookSecretMasked : ?Text;
    outcallProxyUrl : ?Text;
    sandboxCheckout : Bool;
    adminPrincipal : ?Text;
    callerIsAdmin : Bool;
    webhookPath : Text;
    supportEmailAddress : ?Text;
  };

  /// Non-secret configuration the frontend needs to gate features.
  public type PublicConfig = {
    stripePublishableKey : ?Text;
    stripeConfigured : Bool;
    click2mailConfigured : Bool;
    click2mailEnvironment : Click2MailEnvironment;
    openAiConfigured : Bool;
    resendConfigured : Bool;
    sandboxCheckout : Bool;
    trackingBaseUrl : Text;
    referralBaseUrl : Text;
  };

  /// Monotonic id counters (stable).
  public type Counters = {
    var nextCampaignId : Nat;
    var nextPresetId : Nat;
    var nextLedgerId : Nat;
    var nextRewardId : Nat;
    var nextEventId : Nat;
    var nextPaymentId : Nat;
  };

  // ─── Generic result records (kept bindgen-friendly: no variant payloads) ──

  public type ApiResult = { ok : Bool; error : ?Text };
  public type TextResult = { ok : Bool; error : ?Text; value : ?Text };
  public type NatResult = { ok : Bool; error : ?Text; value : ?Nat };
};
