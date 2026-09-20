/// Accounts, AI credit ledger, Stripe payments, subscriptions and referral rewards.
import Types "../types/campaign";
import Common "../types/common";
import Account "../types/account";
import AccountLib "../lib/account";
import AddressLib "../lib/address";
import AdminLib "../lib/admin";
import CampaignLib "../lib/campaign";
import Credits "../lib/credits";
import Http "../lib/http";
import Stripe "../lib/stripe";
import Map "mo:core/Map";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";

mixin (
  accounts : Map.Map<Text, Account.UserAccount>,
  referralCodes : Map.Map<Text, Text>,
  creditLedger : List.List<Account.CreditLedgerEntry>,
  payments : Map.Map<Text, Account.PaymentRecord>,
  referralRewards : List.List<Account.ReferralReward>,
  campaigns : Map.Map<Text, Types.CampaignRecord>,
  trackingEvents : List.List<Types.TrackingEvent>,
  state : Common.Counters,
  adminKeysState : Common.AdminState,
  transformFn : Http.TransformFn,
) {
  private func signedIn(caller : Principal) : Bool { not caller.isAnonymous() };

  private func account(caller : Principal) : Account.UserAccount {
    AccountLib.getOrCreate(accounts, referralCodes, caller.toText(), null, null);
  };

  private func purposeText(p : Account.PaymentPurpose) : Text {
    switch (p) { case (#CampaignOrder) "campaign_order"; case (#CreditPack) "credit_pack"; case (#Subscription) "subscription" };
  };

  // ─── Accounts ────────────────────────────────────────────────────────────

  /// Creates the caller's account on first use (capturing a referral code) and returns it.
  public shared ({ caller }) func ensureAccount(referralCode : ?Text, email : ?Text) : async Account.AccountResult {
    if (not signedIn(caller)) { return { ok = false; error = ?"Sign in with Internet Identity to create an account"; account = null } };
    let a = AccountLib.getOrCreate(accounts, referralCodes, caller.toText(), email, referralCode);
    { ok = true; error = null; account = ?AccountLib.toShared(a, Time.now()) };
  };

  public shared query ({ caller }) func getMyAccount() : async ?Account.UserAccountShared {
    if (not signedIn(caller)) { return null };
    switch (accounts.get(caller.toText())) {
      case null null;
      case (?a) ?AccountLib.toShared(a, Time.now());
    };
  };

  public shared ({ caller }) func updateAccountEmail(email : Text) : async Common.ApiResult {
    if (not signedIn(caller)) { return { ok = false; error = ?"Sign in required" } };
    let clean = AddressLib.sanitizeText(email);
    if (clean.size() > 200 or not clean.contains(#char '@')) { return { ok = false; error = ?"Enter a valid email address" } };
    let a = account(caller);
    a.email := clean;
    a.updatedAt := Time.now();
    { ok = true; error = null };
  };

  public shared query ({ caller }) func getReferralStats() : async ?Account.ReferralStats {
    if (not signedIn(caller)) { return null };
    switch (accounts.get(caller.toText())) {
      case null null;
      case (?a) {
        let rewards = List.empty<Account.ReferralReward>();
        for (r in referralRewards.values()) { if (r.referrerId == a.id) { rewards.add(r) } };
        ?{
          referralCode = a.referralCode;
          referralLink = AccountLib.referralBase # a.referralCode;
          referralCount = a.referralCount;
          referralCreditsEarned = a.referralCreditsEarned;
          referralCreditsRedeemed = a.referralCreditsRedeemed;
          freeMonthsAvailable = AccountLib.freeMonths(a);
          subscriptionActive = AccountLib.isSubscriptionLive(a, Time.now());
          rewards = rewards.toArray();
        };
      };
    };
  };

  // ─── Credits ─────────────────────────────────────────────────────────────

  /// Atomically deducts AI credits (fails when the balance is insufficient).
  public shared ({ caller }) func deductAiCredits(costCredits : Nat, reason : Text) : async Account.CreditResult {
    if (not signedIn(caller)) { return { ok = false; error = ?"Sign in required"; balance = null } };
    let a = account(caller);
    if (a.creditBalance < costCredits) {
      return { ok = false; error = ?"Insufficient credits"; balance = ?a.creditBalance };
    };
    let balance = AccountLib.applyCredits(creditLedger, state, a, -costCredits, AddressLib.sanitizeText(reason), null);
    { ok = true; error = null; balance = ?balance };
  };

  public shared query ({ caller }) func getCreditLedger() : async [Account.CreditLedgerEntry] {
    let id = caller.toText();
    let out = List.empty<Account.CreditLedgerEntry>();
    for (e in creditLedger.reverseValues()) {
      if (e.userId == id and out.size() < 200) { out.add(e) };
    };
    out.toArray();
  };

  public query func getAiPricing() : async Account.AiPricing {
    Credits.aiPricing();
  };

  // ─── Payments ────────────────────────────────────────────────────────────

  private func intentFail(msg : Text) : Account.PaymentIntentResult {
    { ok = false; error = ?msg; paymentIntentId = null; clientSecret = null; amountCents = null; publishableKey = adminKeysState.stripePublishableKey; waived = false; sandbox = false };
  };

  /// Creates a Stripe PaymentIntent (or a sandbox/waived record) for an order, credit pack or subscription.
  public shared ({ caller }) func createPaymentIntent(purpose : Account.PaymentPurpose, reference : ?Text, pack : ?Account.CreditPack) : async Account.PaymentIntentResult {
    if (not signedIn(caller)) { return intentFail("Sign in with Internet Identity before checking out") };
    let a = account(caller);
    var amount : Nat = 0;
    var description = "";
    var refText = "";
    switch (purpose) {
      case (#CampaignOrder) {
        let campaignId = switch (reference) { case (?r) r; case null { return intentFail("Campaign id is required") } };
        switch (campaigns.get(campaignId)) {
          case null { return intentFail("Campaign not found") };
          case (?c) {
            if (c.ownerId != a.id and not AdminLib.isAdmin(adminKeysState, caller)) { return intentFail("You do not own this campaign") };
            if (c.paymentStatus == #Paid or c.paymentStatus == #Waived) { return intentFail("Campaign is already paid") };
            if (c.totalAmountChargedCents == 0) { return intentFail("Campaign total is zero") };
            amount := c.totalAmountChargedCents;
            description := "EZmailout campaign " # c.id # " (" # c.recipientCount.toText() # " pieces)";
            refText := campaignId;
          };
        };
      };
      case (#CreditPack) {
        let p = switch (pack) { case (?p) p; case null { return intentFail("Credit pack is required") } };
        let info = Credits.packInfo(p);
        amount := info.priceCents;
        description := "EZmailout AI credits: " # info.name;
        refText := Credits.packName(p);
      };
      case (#Subscription) {
        if (AccountLib.freeMonths(a) > 0) {
          a.referralCreditsRedeemed += 1;
          let paymentId = "waived_" # state.nextPaymentId.toText();
          state.nextPaymentId += 1;
          ignore AccountLib.activateSubscription(creditLedger, state, a, ?paymentId);
          let waivedRecord : Account.PaymentRecord = { paymentIntentId = paymentId; userId = a.id; purpose = #Subscription; amountCents = 0; reference = ?"referral_free_month"; creditPack = null; var state = #Waived; createdAt = Time.now(); var confirmedAt = ?Time.now(); sandbox = false };
          payments.add(paymentId, waivedRecord);
          return { ok = true; error = null; paymentIntentId = ?paymentId; clientSecret = null; amountCents = ?0; publishableKey = adminKeysState.stripePublishableKey; waived = true; sandbox = false };
        };
        amount := Credits.subscriptionPriceCents;
        description := "EZmailout monthly membership";
        refText := "subscription";
      };
    };
    let seq = state.nextPaymentId;
    state.nextPaymentId += 1;
    if (adminKeysState.sandboxCheckout) {
      let id = "sandbox_" # seq.toText();
      let sandboxRecord : Account.PaymentRecord = { paymentIntentId = id; userId = a.id; purpose; amountCents = amount; reference = ?refText; creditPack = pack; var state = #Created; createdAt = Time.now(); var confirmedAt = null; sandbox = true };
      payments.add(id, sandboxRecord);
      return { ok = true; error = null; paymentIntentId = ?id; clientSecret = null; amountCents = ?amount; publishableKey = adminKeysState.stripePublishableKey; waived = false; sandbox = true };
    };
    let secret = switch (adminKeysState.stripeSecretKey) { case (?s) s; case null { return intentFail("Stripe secret key not configured (Admin → Stripe Secret Key)") } };
    let idem = "ez-" # purposeText(purpose) # "-" # refText # "-" # seq.toText();
    let body = Stripe.createPaymentIntentBody(amount, description, purposeText(purpose), refText, a.id);
    let resp = await Http.postText(Stripe.apiBase # "/payment_intents", Stripe.headers(secret, ?idem), body, AdminLib.outcallOptions(adminKeysState, 64_000), transformFn);
    if (not Http.isSuccess(resp)) {
      return intentFail(if (resp.status == 0) resp.body else Stripe.errorMessage(resp.body));
    };
    switch (Stripe.parseIntent(resp.body)) {
      case null { intentFail("Unexpected Stripe response") };
      case (?intent) {
        let stripeRecord : Account.PaymentRecord = { paymentIntentId = intent.id; userId = a.id; purpose; amountCents = amount; reference = ?refText; creditPack = pack; var state = #Created; createdAt = Time.now(); var confirmedAt = null; sandbox = false };
        payments.add(intent.id, stripeRecord);
        { ok = true; error = null; paymentIntentId = ?intent.id; clientSecret = intent.clientSecret; amountCents = ?amount; publishableKey = adminKeysState.stripePublishableKey; waived = false; sandbox = false };
      };
    };
  };

  private func isFirstPayment(userId : Text, paymentIntentId : Text) : Bool {
    var earliest : ?Account.PaymentRecord = null;
    for ((_, p) in payments.entries()) {
      if (p.userId == userId and (p.state == #Succeeded or p.state == #Waived) and p.amountCents > 0) {
        switch (earliest) {
          case null { earliest := ?p };
          case (?e) { if (p.createdAt < e.createdAt) { earliest := ?p } };
        };
      };
    };
    switch (earliest) {
      case null true;
      case (?e) e.paymentIntentId == paymentIntentId;
    };
  };

  /// Grants the referrer one free month when a referred user's first payment succeeds.
  private func tryReferralReward(record : Account.PaymentRecord) : Bool {
    if (record.state != #Succeeded and record.state != #Waived) { return false };
    if (record.amountCents == 0) { return false };
    for (r in referralRewards.values()) { if (r.paymentIntentId == record.paymentIntentId) { return false } };
    let payer = switch (accounts.get(record.userId)) { case (?p) p; case null { return false } };
    if (not isFirstPayment(payer.id, record.paymentIntentId)) { return false };
    let referrerId = switch (payer.referredBy) { case (?r) r; case null { return false } };
    let referrer = switch (accounts.get(referrerId)) { case (?r) r; case null { return false } };
    if (not AccountLib.isSubscriptionLive(referrer, Time.now())) { return false };
    referrer.referralCreditsEarned += 1;
    referrer.referralCount += 1;
    referrer.updatedAt := Time.now();
    let id = state.nextRewardId;
    state.nextRewardId += 1;
    referralRewards.add({ id; referrerId; refereeId = payer.id; paymentIntentId = record.paymentIntentId; amountCents = Credits.referralRewardCents; timestamp = Time.now() });
    true;
  };

  private func applyPaymentEffects(record : Account.PaymentRecord, a : Account.UserAccount) : (?Nat, ?Text, ?Bool) {
    record.state := #Succeeded;
    record.confirmedAt := ?Time.now();
    if (a.firstPaymentAt == null and record.amountCents > 0) { a.firstPaymentAt := ?Time.now() };
    switch (record.purpose) {
      case (#CampaignOrder) {
        let campaignId = switch (record.reference) { case (?r) r; case null "" };
        switch (campaigns.get(campaignId)) {
          case (?c) {
            c.paymentStatus := if (record.sandbox) #Waived else #Paid;
            c.paymentIntentId := ?record.paymentIntentId;
            c.productionStatus := #ReadyToDispatch;
            c.updatedAt := Time.now();
            CampaignLib.appendEvent(trackingEvents, state, c.id, c.status, "payment.confirmed", record.paymentIntentId, #System, ?"Payment confirmed; ready for print dispatch");
          };
          case null {};
        };
        (?a.creditBalance, ?campaignId, null);
      };
      case (#CreditPack) {
        let info = Credits.packInfo(switch (record.creditPack) { case (?p) p; case null #Starter });
        let balance = AccountLib.applyCredits(creditLedger, state, a, info.credits + info.bonusCredits, "credit_pack:" # Credits.packName(info.pack), ?record.paymentIntentId);
        (?balance, null, null);
      };
      case (#Subscription) {
        let balance = AccountLib.activateSubscription(creditLedger, state, a, ?record.paymentIntentId);
        (?balance, null, ?true);
      };
    };
  };

  /// Verifies a PaymentIntent with Stripe (or sandbox) and applies its effects exactly once.
  public shared ({ caller }) func confirmPayment(paymentIntentId : Text) : async Account.ConfirmPaymentResult {
    let fail = func(msg : Text) : Account.ConfirmPaymentResult {
      { ok = false; error = ?msg; state = null; creditBalance = null; campaignId = null; subscriptionActive = null; referralRewardApplied = false };
    };
    if (not signedIn(caller)) { return fail("Sign in required") };
    let record = switch (payments.get(AddressLib.sanitizeText(paymentIntentId))) { case (?r) r; case null { return fail("Unknown payment") } };
    let callerId = caller.toText();
    if (record.userId != callerId and not AdminLib.isAdmin(adminKeysState, caller)) { return fail("This payment belongs to another account") };
    let a = switch (accounts.get(record.userId)) { case (?x) x; case null { return fail("Account not found") } };
    if (record.state == #Succeeded or record.state == #Waived) {
      return { ok = true; error = null; state = ?record.state; creditBalance = ?a.creditBalance; campaignId = record.reference; subscriptionActive = ?AccountLib.isSubscriptionLive(a, Time.now()); referralRewardApplied = false };
    };
    if (not record.sandbox) {
      let secret = switch (adminKeysState.stripeSecretKey) { case (?s) s; case null { return fail("Stripe secret key not configured") } };
      let resp = await Http.get(Stripe.apiBase # "/payment_intents/" # record.paymentIntentId, Stripe.headers(secret, null), AdminLib.outcallOptions(adminKeysState, 64_000), transformFn);
      if (not Http.isSuccess(resp)) { return fail(if (resp.status == 0) resp.body else Stripe.errorMessage(resp.body)) };
      switch (Stripe.parseIntent(resp.body)) {
        case null { return fail("Unexpected Stripe response") };
        case (?intent) {
          if (intent.status != "succeeded") { return fail("Payment not completed yet (status: " # intent.status # ")") };
          if (intent.amount != record.amountCents) { return fail("Payment amount mismatch") };
        };
      };
      // Re-check after the await: another call may have confirmed meanwhile.
      if (record.state == #Succeeded) {
        return { ok = true; error = null; state = ?record.state; creditBalance = ?a.creditBalance; campaignId = record.reference; subscriptionActive = ?AccountLib.isSubscriptionLive(a, Time.now()); referralRewardApplied = false };
      };
    };
    let (balance, campaignId, subActive) = applyPaymentEffects(record, a);
    let rewarded = tryReferralReward(record);
    { ok = true; error = null; state = ?record.state; creditBalance = balance; campaignId; subscriptionActive = switch (subActive) { case (?s) ?s; case null ?AccountLib.isSubscriptionLive(a, Time.now()) }; referralRewardApplied = rewarded };
  };

  /// Applies the referral reward for a completed payment (idempotent).
  public shared ({ caller }) func applyReferralReward(paymentIntentId : Text) : async Common.ApiResult {
    if (not signedIn(caller)) { return { ok = false; error = ?"Sign in required" } };
    switch (payments.get(AddressLib.sanitizeText(paymentIntentId))) {
      case null { { ok = false; error = ?"Unknown payment" } };
      case (?record) {
        if (record.userId != caller.toText() and not AdminLib.isAdmin(adminKeysState, caller)) { return { ok = false; error = ?"This payment belongs to another account" } };
        if (record.state != #Succeeded and record.state != #Waived) { return { ok = false; error = ?"Payment has not completed" } };
        if (tryReferralReward(record)) { { ok = true; error = null } } else { { ok = false; error = ?"No referral reward applies (already granted, no referrer, not the first payment, or referrer's subscription inactive)" } };
      };
    };
  };
};
