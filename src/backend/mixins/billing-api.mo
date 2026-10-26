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
import Limits "../lib/limits";
import PricingLib "../lib/pricing";
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
  campaignRecipients : Map.Map<Text, [Common.VerifiedAddress]>,
  trackingEvents : List.List<Types.TrackingEvent>,
  documentUploads : Map.Map<Text, Types.DocumentUpload>,
  state : Common.Counters,
  adminKeysState : Common.AdminState,
  transformFn : Http.TransformFn,
) {
  private func signedIn(caller : Principal) : Bool { not caller.isAnonymous() };

  // Checkout and confirmation each make a Stripe outcall (confirmation a
  // replicated one, paid by every node), and identities are free to mint, so
  // both are budgeted per identity and for the whole canister. Real checkout
  // makes one intent and one confirmation, so the limits never touch it.
  transient let stripeWindowNs : Int = 3_600_000_000_000;
  transient let stripeWindows = Map.empty<Text, Limits.Window>();
  transient let intentsPerHour : Nat = 10;
  transient let intentsPerHourGlobal : Nat = 1_000;
  transient let intentGapNs : Int = 2_000_000_000;
  transient let confirmsPerHour : Nat = 30;
  transient let confirmsPerHourGlobal : Nat = 2_000;
  /// Between two live lookups of one payment.
  transient let confirmGapNs : Int = 5_000_000_000;

  private func stripeRefusal(check : Limits.Check, what : Text) : ?Text {
    switch (check) {
      case (#ok) null;
      case (#wait secs) ?("Please wait " # secs.toText() # " seconds before " # what # " again");
      case (#full) ?("Too many payment requests right now; please try again in a few minutes");
    };
  };

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
    // Optional hints: an email is kept only if it looks like one, and a
    // referral code only at a code's length; anything else is ignored.
    let cleanEmail : ?Text = switch (email) {
      case (?e) { let t = AddressLib.sanitizeText(e).toLower(); if (AdminLib.looksLikeEmail(t)) ?t else null };
      case null null;
    };
    let cleanCode : ?Text = switch (referralCode) {
      case (?c) { let t = AddressLib.sanitizeText(c); if (t.size() > 0 and t.size() <= 32) ?t else null };
      case null null;
    };
    let a = AccountLib.getOrCreate(accounts, referralCodes, caller.toText(), cleanEmail, cleanCode);
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

  /// Manual adjustment of the caller's own balance, for controllers and the
  /// admin only. Every AI endpoint charges its own cost server-side (debited
  /// before the outcall, refunded on failure), so no client ever calls this;
  /// kept as a gated method rather than removed so the candid interface stays
  /// compatible with the deployed canister.
  public shared ({ caller }) func deductAiCredits(costCredits : Nat, reason : Text) : async Account.CreditResult {
    if (not AdminLib.isAdmin(adminKeysState, caller)) { return { ok = false; error = ?"Only a controller or the admin can adjust credits directly"; balance = null } };
    let a = account(caller);
    if (a.creditBalance < costCredits) {
      return { ok = false; error = ?"Insufficient credits"; balance = ?a.creditBalance };
    };
    let balance = AccountLib.applyCredits(creditLedger, state, a, -costCredits, Limits.clip(AddressLib.sanitizeText(reason), 120), null);
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
            if (c.totalAmountChargedCents < PricingLib.minOrderCents and not adminKeysState.sandboxCheckout) {
              return intentFail("Card payments start at $0.50, and this order comes to less. Start a new campaign with a few more pieces.");
            };
            // The total is the stored per-piece price (its volume tier, fixed
            // when the campaign was created) times its pieces, nothing else.
            if (c.totalAmountChargedCents != c.unitPriceCents * c.recipientCount or c.totalAmountChargedCents > PricingLib.maxOrderCents) {
              return intentFail("This campaign's total doesn't add up; please contact support");
            };
            // A draft keeps the price it was created at, so a price change
            // (new postage, a surcharge, a cost, the card fee) or the end of
            // the owner's membership must not let it be paid for less than
            // the same order costs today. Today's price is never under cost
            // plus the card fee (`unitPriceFor` includes `orderFloorCents`).
            switch (PricingLib.find(c.product.layoutVariant)) {
              case (?row) {
                let ownerIsMember = switch (accounts.get(c.ownerId)) {
                  case (?owner) AccountLib.isSubscriptionLive(owner, Time.now());
                  case null false;
                };
                let today = PricingLib.unitPriceFor(row, c.recipientCount, ownerIsMember, c.printSpec.mailClass);
                if (c.unitPriceCents < today) {
                  let memberPriced = PricingLib.unitPriceFor(row, c.recipientCount, true, c.printSpec.mailClass);
                  return intentFail(
                    if (not ownerIsMember and c.unitPriceCents >= memberPriced) "This draft was priced at the member rate, and the membership has since ended. Renew it from the Dashboard, or re-run the campaign from Campaigns at today's price, then delete this draft." else "Prices for this format have changed since this draft was created. Re-run it from Campaigns to launch it again at today's price, then delete this draft."
                  );
                };
              };
              case null { return intentFail("This format is no longer offered. Re-run the campaign from Campaigns in another size, then delete this draft.") };
            };
            // Every priced recipient must be stored (a large list is staged in
            // chunks by `addCampaignRecipients`), so the order paid for is
            // exactly the one that prints.
            let stored = switch (campaignRecipients.get(campaignId)) { case (?r) r.size(); case null 0 };
            if (stored != c.recipientCount) {
              return intentFail("This draft's recipient list was not fully uploaded (" # stored.toText() # " of " # c.recipientCount.toText() # "), so it can't be paid for. Re-run it from Campaigns to launch it again from the studio, then delete this draft.");
            };
            // Only an order that can go to print is paid for: its print file
            // must be fully staged (uploads close once the campaign is paid).
            let staged = switch (documentUploads.get(campaignId)) { case (?u) u.receivedChunks == u.totalChunks; case null false };
            if (not staged and c.printDocumentId == null) {
              return intentFail("This draft's print file was never uploaded, so it can't be paid for. Re-run it from Campaigns to launch it again from the studio, then delete this draft.");
            };
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
    // Test mode covers campaign orders only, and those print on the print
    // partner's Staging. Credit packs and memberships would hand out real value
    // (OpenAI spend, monthly allowances), so they need live checkout.
    if (adminKeysState.sandboxCheckout and purpose != #CampaignOrder) {
      return intentFail("Test-mode checkout covers campaign orders only; credit packs and memberships need live checkout");
    };
    let seq = state.nextPaymentId;
    state.nextPaymentId += 1;
    if (adminKeysState.sandboxCheckout) {
      let id = "sandbox_" # seq.toText();
      let sandboxRecord : Account.PaymentRecord = { paymentIntentId = id; userId = a.id; purpose; amountCents = amount; reference = ?refText; creditPack = pack; var state = #Created; createdAt = Time.now(); var confirmedAt = null; sandbox = true };
      payments.add(id, sandboxRecord);
      return { ok = true; error = null; paymentIntentId = ?id; clientSecret = null; amountCents = ?amount; publishableKey = adminKeysState.stripePublishableKey; waived = false; sandbox = true };
    };
    let secret = switch (adminKeysState.stripeSecretKey) { case (?s) s; case null { return intentFail("Checkout isn't set up yet; please try again later") } };
    // Charged only now, once the call will reach Stripe.
    switch (stripeRefusal(Limits.admit(stripeWindows, [
      { key = "intent:*"; limit = intentsPerHourGlobal; minGapNs = 0 },
      { key = "intent:" # a.id; limit = intentsPerHour; minGapNs = intentGapNs },
    ], Time.now(), stripeWindowNs), "starting checkout")) {
      case (?msg) { return intentFail(msg) };
      case null {};
    };
    let idem = "ez-" # purposeText(purpose) # "-" # refText # "-" # seq.toText();
    let body = Stripe.createPaymentIntentBody(amount, description, purposeText(purpose), refText, a.id);
    let resp = await* Http.postText(Stripe.apiBase # "/payment_intents", Stripe.headers(secret, ?idem), body, AdminLib.outcallOptions(adminKeysState, 64_000), transformFn);
    if (not Http.isSuccess(resp)) {
      return intentFail(AdminLib.providerError(adminKeysState, caller, if (resp.status == 0) resp.body else Stripe.errorMessage(resp.body), "Checkout is unavailable right now; please try again in a few minutes"));
    };
    switch (Stripe.parseIntent(resp.body)) {
      case null { intentFail("Unexpected response from the payment processor; please try again") };
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
      if (p.userId == userId and (p.state == #Succeeded or p.state == #Waived) and p.amountCents > 0 and not p.sandbox) {
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
    // Test-mode payments move no money, so they never earn a free month.
    if (record.sandbox) { return false };
    // One free month per referred customer, ever: whichever of their
    // payments is confirmed first. (Ordering by creation time alone let a
    // customer confirm several open checkouts newest first and earn one each.)
    for (r in referralRewards.values()) {
      if (r.paymentIntentId == record.paymentIntentId or r.refereeId == record.userId) { return false };
    };
    // A campaign payment counts only if it is the one that paid the campaign:
    // not a duplicate for an already paid campaign, nor a payment for a draft
    // removed before it arrived (both are refunded).
    if (record.purpose == #CampaignOrder) {
      let settled = switch (record.reference) {
        case (?id) switch (campaigns.get(id)) { case (?c) c.paymentIntentId == ?record.paymentIntentId; case null false };
        case null false;
      };
      if (not settled) { return false };
    };
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
    if (a.firstPaymentAt == null and record.amountCents > 0 and not record.sandbox) { a.firstPaymentAt := ?Time.now() };
    switch (record.purpose) {
      case (#CampaignOrder) {
        let campaignId = switch (record.reference) { case (?r) r; case null "" };
        switch (campaigns.get(campaignId)) {
          case (?c) {
            // Only the first confirmed payment settles the campaign. A second
            // intent paid for the same campaign (two checkouts opened) must not
            // reopen a dispatched campaign or turn a paid one into a test.
            if (c.paymentStatus == #Unpaid or c.paymentStatus == #Pending) {
              c.paymentStatus := if (record.sandbox) #Waived else #Paid;
              c.paymentIntentId := ?record.paymentIntentId;
              ignore CampaignLib.moveProduction(c, #ReadyToDispatch);
              c.updatedAt := Time.now();
              CampaignLib.appendEvent(trackingEvents, state, c.id, c.status, "payment.confirmed", record.paymentIntentId, #System, ?"Payment confirmed; ready for print dispatch");
            } else {
              CampaignLib.appendEvent(trackingEvents, state, c.id, c.status, "payment.duplicate", record.paymentIntentId, #System, ?"A second payment for an already paid campaign; flagged for a refund");
            };
          };
          case null {};
        };
        (?a.creditBalance, ?campaignId, null);
      };
      case (#CreditPack) {
        let info = Credits.packInfo(switch (record.creditPack) { case (?p) p; case null #Starter });
        let balance = AccountLib.applyCredits(creditLedger, state, a, info.credits, "credit_pack:" # Credits.packName(info.pack), ?record.paymentIntentId);
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
    if (record.sandbox) {
      // A test payment only stands while test mode is on, and only for a
      // campaign order (older test records for packs or memberships included).
      if (not adminKeysState.sandboxCheckout) { return fail("Test-mode checkout is off; this test payment can no longer be confirmed") };
      if (record.purpose != #CampaignOrder) { return fail("Test-mode checkout covers campaign orders only") };
    } else {
      let secret = switch (adminKeysState.stripeSecretKey) { case (?s) s; case null { return fail("Payments aren't set up yet; please try again later") } };
      // Every live lookup is a replicated outcall: budgeted per payment (a
      // short gap), per identity and for the canister, before the await.
      switch (stripeRefusal(Limits.admit(stripeWindows, [
        { key = "confirm:*"; limit = confirmsPerHourGlobal; minGapNs = 0 },
        { key = "confirm:" # callerId; limit = confirmsPerHour; minGapNs = 0 },
        { key = "confirm:" # record.paymentIntentId; limit = confirmsPerHour; minGapNs = confirmGapNs },
      ], Time.now(), stripeWindowNs), "checking this payment")) {
        case (?msg) { return fail(msg) };
        case null {};
      };
      // Replicated: every replica fetches the intent and they must agree on
      // the reduced response before any credit or paid status is granted, so
      // one faulty node cannot report a payment that did not happen. GET is
      // idempotent, so the subnet's parallel requests are harmless.
      let opts = {
        AdminLib.outcallOptions(adminKeysState, 32_000) with
        isReplicated = true;
        transformContext = Http.jsonSummary(Stripe.intentSummaryKeys);
      };
      let resp = await* Http.get(Stripe.apiBase # "/payment_intents/" # record.paymentIntentId, Stripe.headers(secret, null), opts, transformFn);
      if (not Http.isSuccess(resp)) {
        return fail(AdminLib.providerError(adminKeysState, caller, if (resp.status == 0) resp.body else Stripe.errorMessage(resp.body), "We couldn't reach the payment processor to confirm this payment; please try again shortly"));
      };
      switch (Stripe.parseIntent(resp.body)) {
        case null { return fail("Unexpected response from the payment processor; please try again") };
        case (?intent) {
          if (intent.id != record.paymentIntentId) { return fail("The payment processor returned a different payment") };
          if (intent.status != "succeeded") { return fail("Payment not completed yet (status: " # intent.status # ")") };
          if (intent.amount != record.amountCents or intent.currency != "usd") { return fail("Payment amount mismatch") };
        };
      };
      // Re-check after the await: another call may have confirmed meanwhile.
      if (record.state == #Succeeded) {
        return { ok = true; error = null; state = ?record.state; creditBalance = ?a.creditBalance; campaignId = record.reference; subscriptionActive = ?AccountLib.isSubscriptionLive(a, Time.now()); referralRewardApplied = false };
      };
    };
    // A draft removed after 14 unpaid days (or deleted by its owner) whose
    // old checkout was paid anyway: the payment is recorded as received, so
    // support can refund it, but it buys nothing and earns no referral.
    let orphaned = record.purpose == #CampaignOrder and (switch (record.reference) { case (?id) not campaigns.containsKey(id); case null true });
    let (balance, campaignId, subActive) = applyPaymentEffects(record, a);
    if (orphaned) {
      return { ok = false; error = ?"This draft was removed before the payment arrived (unpaid drafts expire after 14 days). The payment is recorded; contact support for a refund."; state = ?record.state; creditBalance = balance; campaignId = null; subscriptionActive = null; referralRewardApplied = false };
    };
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
