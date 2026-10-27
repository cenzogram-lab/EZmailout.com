/// Accounts, AI credit ledger, Stripe payments, subscriptions and referral rewards.
import Types "../types/campaign";
import Common "../types/common";
import Account "../types/account";
import AccountLib "../lib/account";
import PaymentIndex "../lib/paymentIndex";
import AddressLib "../lib/address";
import AdminLib "../lib/admin";
import CampaignLib "../lib/campaign";
import Credits "../lib/credits";
import Http "../lib/http";
import Limits "../lib/limits";
import PricingLib "../lib/pricing";
import PrintFile "../lib/printfile";
import Inputs "../lib/inputs";
import Stripe "../lib/stripe";
import Map "mo:core/Map";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Nat32 "mo:core/Nat32";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Set "mo:core/Set";
import Queue "mo:core/Queue";

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
  paymentRefunds : Map.Map<Text, [Account.RefundRecord]>,
  state : Common.Counters,
  adminKeysState : Common.AdminState,
  transformFn : Http.TransformFn,
) {
  private func signedIn(caller : Principal) : Bool { not caller.isAnonymous() };

  /// Lookups by customer and by campaign over `payments`, rebuilt from it on
  /// every install and upgrade (`lib/paymentIndex.mo`); every new record goes
  /// through `addPayment`.
  transient let paymentIndex = PaymentIndex.build(payments);

  /// A campaign's payments, for the campaign mixin (passed in by `main.mo`).
  private func campaignPaymentsOf(campaignId : Text) : [Account.PaymentRecord] {
    PaymentIndex.forCampaign(paymentIndex, payments, campaignId);
  };

  // Checkout and confirmation each make a Stripe outcall (confirmation a
  // replicated one, paid by every node), and identities are free to mint, so
  // both are budgeted per identity and for the whole canister. Real checkout
  // makes one intent and one confirmation, so the limits never touch it.
  transient let stripeWindowNs : Int = 3_600_000_000_000;
  transient let stripeWindows = Map.empty<Text, Limits.Window>();
  transient let intentsPerHour : Nat = 10;
  /// Credit-pack and membership checkouts the whole canister opens in an
  /// hour (campaign checkouts are budgeted per campaign). `sweepPayments`
  /// can close every one of them that is abandoned.
  transient let intentsPerHourGlobal : Nat = 200;
  transient let intentsPerCampaignPerHour : Nat = 5;
  /// Earlier checkouts looked up by one call for a lost charge.
  transient let lookupsPerHour : Nat = 20;
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
    openAccount(caller, null, null);
  };

  /// Identities are free to mint, so accounts nobody has used are not kept
  /// for ever: at most this many idle accounts (`isIdleAccount`), the oldest
  /// forgotten first when a new one opens. Opening an account is never
  /// refused (an hourly cap could be used up by fake sign-ups and keep real
  /// customers from signing up or paying); a forgotten account is opened
  /// again, with the same referral code, the next time its owner signs in.
  transient let maxIdleAccounts : Nat = 250_000;
  /// Accounts opened idle, oldest first; built from `accounts` on first use
  /// after an upgrade. Entries for accounts used since are dropped as they
  /// reach the front.
  transient var idleQueue : ?Queue.Queue<Text> = null;

  /// Untouched since it was opened: no email, no credits or membership, no
  /// referral activity (all of which update it) and no payment record. Its
  /// only possible content is the referrer it was opened with.
  private func isIdleAccount(a : Account.UserAccount) : Bool {
    a.updatedAt == a.createdAt and a.email == "" and not PaymentIndex.hasPayments(paymentIndex, a.id);
  };

  private func idleAccounts() : Queue.Queue<Text> {
    switch (idleQueue) {
      case (?q) q;
      case null { let q = AccountLib.idleQueue(accounts, isIdleAccount); idleQueue := ?q; q };
    };
  };

  /// The caller's account, opened now if it does not exist (never refused;
  /// may forget the oldest idle account, `AccountLib.openKeepingIdle`).
  private func openAccount(caller : Principal, email : ?Text, code : ?Text) : Account.UserAccount {
    AccountLib.openKeepingIdle(accounts, referralCodes, idleAccounts(), maxIdleAccounts, isIdleAccount, caller.toText(), email, code);
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
    // An existing account still takes the email hint it lacks.
    let a = openAccount(caller, cleanEmail, cleanCode);
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
    let a = openAccount(caller, null, null);
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

  /// A campaign checkout this customer opened earlier (any age: payment
  /// intents never expire) that the processor reports paid or paying: handed
  /// back without a client secret, so the checkout confirms it instead of
  /// charging again. Null when there is none. Looked up only when such a
  /// record exists, and budgeted per identity.
  private func recoverCharged(caller : Principal, userId : Text, campaignId : Text, amount : Nat, secret : Text) : async* ?Account.PaymentIntentResult {
    let open = List.empty<Account.PaymentRecord>();
    for (p in PaymentIndex.forCampaign(paymentIndex, payments, campaignId).vals()) {
      if (p.userId == userId and p.amountCents == amount and p.state == #Created and not p.sandbox) { open.add(p) };
    };
    if (open.size() == 0) return null;
    switch (stripeRefusal(Limits.admit(stripeWindows, [{ key = "lookup:" # userId; limit = lookupsPerHour; minGapNs = 0 }], Time.now(), stripeWindowNs), "checking your earlier checkout")) {
      case (?msg) { return ?intentFail(msg) };
      case null {};
    };
    let newest = open.toArray().sort(func(x : Account.PaymentRecord, y : Account.PaymentRecord) : Order.Order = Int.compare(y.createdAt, x.createdAt));
    for (p in newest.sliceToArray(0, Nat.min(newest.size(), 3)).vals()) {
      let resp = await* Http.get(Stripe.apiBase # "/payment_intents/" # p.paymentIntentId, Stripe.headers(secret, null), AdminLib.outcallOptions(adminKeysState, 32_000), transformFn);
      if (resp.status == 404) { p.state := #Failed } else if (not Http.isSuccess(resp)) {
        return ?intentFail(AdminLib.providerError(adminKeysState, caller, if (resp.status == 0) resp.body else Stripe.errorMessage(resp.body), "We couldn't check your earlier checkout for this order; please try again in a minute"));
      } else {
        switch (Stripe.parseIntent(resp.body)) {
          case (?intent) {
            if (intent.id == p.paymentIntentId) {
              if (intent.status == "succeeded" or intent.status == "processing" or intent.status == "requires_capture") {
                return ?{ ok = true; error = null; paymentIntentId = ?p.paymentIntentId; clientSecret = null; amountCents = ?amount; publishableKey = adminKeysState.stripePublishableKey; waived = false; sandbox = false };
              };
              if (intent.status == "canceled") { p.state := #Failed };
            };
          };
          case null {};
        };
      };
    };
    null;
  };

  /// Every new payment record goes through here, so the index stays complete.
  private func addPayment(record : Account.PaymentRecord) {
    payments.add(record.paymentIntentId, record);
    PaymentIndex.add(paymentIndex, record);
    // Its account may have been forgotten as idle during the processor call.
    if (not accounts.containsKey(record.userId)) {
      ignore AccountLib.openKeepingIdle(accounts, referralCodes, idleAccounts(), maxIdleAccounts, isIdleAccount, record.userId, null, null);
    };
  };

  private func intentFail(msg : Text) : Account.PaymentIntentResult {
    { ok = false; error = ?msg; paymentIntentId = null; clientSecret = null; amountCents = null; publishableKey = adminKeysState.stripePublishableKey; waived = false; sandbox = false };
  };

  /// Creates a Stripe PaymentIntent (or a sandbox/waived record) for an order, credit pack or subscription.
  public shared ({ caller }) func createPaymentIntent(purpose : Account.PaymentPurpose, reference : ?Text, pack : ?Account.CreditPack) : async Account.PaymentIntentResult {
    if (not signedIn(caller)) { return intentFail("Sign in with Internet Identity before checking out") };
    let a = openAccount(caller, null, null);
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
            if (c.paymentStatus == #Refunded) { return intentFail("This order was refunded. Re-run it from Campaigns to order it again.") };
            // A charge whose confirmation was lost is found before anything
            // below could refuse the order (a price or membership change
            // since): the card was charged at this price already.
            if (not adminKeysState.sandboxCheckout) {
              switch (adminKeysState.stripeSecretKey) {
                case (?secret) {
                  switch (await* recoverCharged(caller, a.id, campaignId, c.totalAmountChargedCents, secret)) {
                    case (?res) { return res };
                    case null {};
                  };
                };
                case null {};
              };
              if (c.paymentStatus == #Paid or c.paymentStatus == #Waived) { return intentFail("Campaign is already paid") };
            };
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
            // Dispatch refuses an order without a usable return address, and a
            // paid one can no longer be changed: never take payment for it.
            switch (c.returnAddress) {
              case null { return intentFail("This draft has no return address, so it can't be printed. Re-run it from Campaigns, add one in Step 4, then delete this draft.") };
              case (?r) {
                switch (Inputs.returnAddressError(r)) {
                  case (?e) { return intentFail(e # ". Re-run the campaign from Campaigns with a complete return address, then delete this draft.") };
                  case null {};
                };
              };
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
            // The price covers one front-and-back piece; a file staged before
            // uploads were checked is checked here (`PrintFile.stagedError`).
            switch (documentUploads.get(campaignId)) {
              case (?u) { switch (PrintFile.stagedError(u)) { case (?e) { return intentFail(e) }; case null {} } };
              case null {};
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
          addPayment(waivedRecord);
          return { ok = true; error = null; paymentIntentId = ?paymentId; clientSecret = null; amountCents = ?0; publishableKey = adminKeysState.stripePublishableKey; waived = true; sandbox = false };
        };
        amount := Credits.subscriptionPriceCents;
        description := "EZmailout 30-day membership";
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
      addPayment(sandboxRecord);
      return { ok = true; error = null; paymentIntentId = ?id; clientSecret = null; amountCents = ?amount; publishableKey = adminKeysState.stripePublishableKey; waived = false; sandbox = true };
    };
    let secret = switch (adminKeysState.stripeSecretKey) { case (?s) s; case null { return intentFail("Checkout isn't set up yet; please try again later") } };
    // Charged only now, once the call will reach Stripe.
    // A campaign order already needs a fully staged draft (the canister-wide
    // draft cap bounds them), so it is budgeted per campaign rather than
    // against the shared hourly cap, which free identities buying nothing
    // could otherwise use up and keep every customer from checking out.
    let perOrder : Limits.Budget = if (purpose == #CampaignOrder) ({ key = "intent:campaign:" # refText; limit = intentsPerCampaignPerHour; minGapNs = 0 }) else ({ key = "intent:*"; limit = intentsPerHourGlobal; minGapNs = 0 });
    switch (stripeRefusal(Limits.admit(stripeWindows, [
      perOrder,
      { key = "intent:" # a.id; limit = intentsPerHour; minGapNs = intentGapNs },
    ], Time.now(), stripeWindowNs), "starting checkout")) {
      case (?msg) { return intentFail(msg) };
      case null {};
    };
    // An earlier checkout for the same order comes first. There is no payment
    // webhook, so a card charged in a tab that closed before its confirmation
    // is known only to the processor: opening a new checkout would charge the
    // customer again. The newest few are looked up: one already paid (or
    // paying) is handed back for confirmation, one still awaiting a card is
    // reused, a cancelled one is closed, and only then is a new one opened.
    // A failed lookup refuses rather than risk a second charge.
    let now = Time.now();
    let earlier = List.empty<Account.PaymentRecord>();
    for (p in PaymentIndex.forUser(paymentIndex, payments, a.id).vals()) {
      if (p.purpose == purpose and p.reference == ?refText and p.amountCents == amount and p.state == #Created and not p.sandbox) {
        earlier.add(p);
      };
    };
    let newestFirst = earlier.toArray().sort(func(x : Account.PaymentRecord, y : Account.PaymentRecord) : Order.Order = Int.compare(y.createdAt, x.createdAt));
    var reusable : ?(Text, Text) = null;
    var looked = 0;
    label checking for (p in newestFirst.vals()) {
      if (looked >= 3) break checking;
      looked += 1;
      let resp = await* Http.get(Stripe.apiBase # "/payment_intents/" # p.paymentIntentId, Stripe.headers(secret, null), AdminLib.outcallOptions(adminKeysState, 32_000), transformFn);
      // Unknown to the processor (made with another key): it can never be
      // paid, so it is closed rather than blocking the order.
      if (resp.status == 404) { p.state := #Failed; continue checking };
      if (not Http.isSuccess(resp)) {
        return intentFail(AdminLib.providerError(adminKeysState, caller, if (resp.status == 0) resp.body else Stripe.errorMessage(resp.body), "We couldn't check your earlier checkout for this order; please try again in a minute"));
      };
      switch (Stripe.parseIntent(resp.body)) {
        case null {};
        case (?intent) {
          if (intent.id == p.paymentIntentId) {
            if (intent.status == "succeeded" or intent.status == "processing" or intent.status == "requires_capture") {
              // Already paid: the checkout confirms it (no client secret).
              return { ok = true; error = null; paymentIntentId = ?p.paymentIntentId; clientSecret = null; amountCents = ?amount; publishableKey = adminKeysState.stripePublishableKey; waived = false; sandbox = false };
            } else if (intent.status == "canceled") {
              p.state := #Failed;
            } else if (reusable == null and now - p.createdAt < reuseCheckoutNs) {
              // A checkout close to a week old is left for `sweepPayments` to
              // close, never handed out again: the sweep could cancel it
              // while the customer is entering their card.
              switch (intent.clientSecret) { case (?cs) { reusable := ?(p.paymentIntentId, cs) }; case null {} };
            };
          };
        };
      };
    };
    switch (reusable) {
      case (?(id, cs)) {
        if (purpose == #CampaignOrder) {
          switch (campaigns.get(refText)) {
            case (?c) { if (c.paymentStatus == #Paid or c.paymentStatus == #Waived) { return intentFail("Campaign is already paid") } };
            case null { return intentFail("This draft was removed while checkout was opening (unpaid drafts expire after 14 days). Re-run it from Campaigns to launch it again; nothing was charged.") };
          };
        };
        return { ok = true; error = null; paymentIntentId = ?id; clientSecret = ?cs; amountCents = ?amount; publishableKey = adminKeysState.stripePublishableKey; waived = false; sandbox = false };
      };
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
        // The draft could have been evicted or expired while the processor
        // answered: a checkout handed out now would take a payment for
        // nothing, so the customer is told to launch again instead.
        if (purpose == #CampaignOrder) {
          switch (campaigns.get(refText)) {
            case null { return intentFail("This draft was removed while checkout was opening (unpaid drafts expire after 14 days). Re-run it from Campaigns to launch it again; nothing was charged.") };
            // Paid from another tab or device while the processor answered:
            // a second checkout would only take a second payment.
            case (?c) { if (c.paymentStatus == #Paid or c.paymentStatus == #Waived) { return intentFail("Campaign is already paid") } };
          };
        };
        // The id comes from one node's reply (the create call is not
        // replicated), so it must never reset an existing record: a reused
        // id of a settled payment would be confirmed, and granted, twice.
        if (payments.containsKey(intent.id)) {
          return intentFail("Unexpected response from the payment processor; please try again");
        };
        let stripeRecord : Account.PaymentRecord = { paymentIntentId = intent.id; userId = a.id; purpose; amountCents = amount; reference = ?refText; creditPack = pack; var state = #Created; createdAt = Time.now(); var confirmedAt = null; sandbox = false };
        addPayment(stripeRecord);
        { ok = true; error = null; paymentIntentId = ?intent.id; clientSecret = intent.clientSecret; amountCents = ?amount; publishableKey = adminKeysState.stripePublishableKey; waived = false; sandbox = false };
      };
    };
  };

  /// A campaign payment counts as a payment (for the first-payment referral
  /// rule) only if it is the one that settled its campaign: a duplicate, or a
  /// payment for a draft removed before it arrived, is refunded, and must not
  /// stand in for the customer's real first payment.
  private func settledItsCampaign(p : Account.PaymentRecord) : Bool {
    if (p.purpose != #CampaignOrder) return true;
    switch (p.reference) {
      case (?id) switch (campaigns.get(id)) { case (?c) c.paymentIntentId == ?p.paymentIntentId; case null false };
      case null false;
    };
  };

  /// A payment that can earn its payer's referrer a free month: real money,
  /// at least the month it earns (identities are free, so a smaller payment
  /// from a fresh account would buy months below their price).
  private func referralQualifying(p : Account.PaymentRecord) : Bool {
    (p.state == #Succeeded or p.state == #Waived) and p.amountCents >= Credits.referralRewardCents and not p.sandbox and settledItsCampaign(p);
  };

  /// Whether this is the customer's first qualifying payment to be
  /// confirmed. Ordered by confirmation, not creation: an older checkout
  /// confirmed later must not reopen a referral already decided.
  private func isFirstPayment(userId : Text, paymentIntentId : Text) : Bool {
    var earliest : ?Account.PaymentRecord = null;
    let confirmed = func(p : Account.PaymentRecord) : Int = switch (p.confirmedAt) { case (?t) t; case null p.createdAt };
    for (p in PaymentIndex.forUser(paymentIndex, payments, userId).vals()) {
      if (referralQualifying(p)) {
        switch (earliest) {
          case null { earliest := ?p };
          case (?e) { if (confirmed(p) < confirmed(e)) { earliest := ?p } };
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
    // Test-mode payments move no money, and a payment under the month it
    // would earn could buy months below their price (`referralQualifying`).
    if (not referralQualifying(record)) { return false };
    // Refunded below the month's price: it earns nothing (a month already
    // earned was taken back with the refund, `revokeReferralMonth`).
    if (refundedCents(record.paymentIntentId) + Credits.referralRewardCents > record.amountCents) { return false };
    // One free month per referred customer, ever: whichever of their
    // payments is confirmed first. (Ordering by creation time alone let a
    // customer confirm several open checkouts newest first and earn one each.)
    for (r in referralRewards.values()) {
      if (r.paymentIntentId == record.paymentIntentId or r.refereeId == record.userId) { return false };
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
    PaymentIndex.markCompleted(paymentIndex, record.paymentIntentId);
    // A duplicate or orphaned campaign payment is refunded, so it is not the
    // customer's first payment.
    let settles = switch (record.purpose, record.reference) {
      case (#CampaignOrder, ?id) { switch (campaigns.get(id)) { case (?c) c.paymentStatus == #Unpaid or c.paymentStatus == #Pending; case null false } };
      case (#CampaignOrder, null) false;
      case _ true;
    };
    if (a.firstPaymentAt == null and settles and record.amountCents > 0 and not record.sandbox) { a.firstPaymentAt := ?Time.now() };
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

  /// Why a received campaign payment bought nothing, or null when it paid its
  /// campaign (or is not a campaign payment). A draft removed after 14 unpaid
  /// days (or deleted) whose old checkout was paid anyway, or a second
  /// payment for a campaign another payment already settled (two checkouts
  /// open at once): the payment is recorded so support can refund it, and the
  /// customer is told so, every time it is checked — never a plain success.
  private func unsettledNotice(record : Account.PaymentRecord) : ?Text {
    if (record.purpose != #CampaignOrder) return null;
    switch (record.reference) {
      case (?id) {
        switch (campaigns.get(id)) {
          case null ?("This draft was removed before the payment arrived (unpaid drafts expire after 14 days). The payment is recorded; contact support with your account ID and invoice " # record.paymentIntentId # " for a refund.");
          case (?c) { if (c.paymentIntentId == ?record.paymentIntentId) null else ?("This campaign was already paid by another checkout, so this second payment bought nothing. It is recorded; contact support with your account ID and invoice " # record.paymentIntentId # " for a refund.") };
        };
      };
      case null ?("This payment is not linked to a campaign. It is recorded; contact support with your account ID and invoice " # record.paymentIntentId # " for a refund.");
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
    // An account forgotten as idle while its checkout was being opened is
    // opened again: the payment is what it now holds.
    let a = switch (accounts.get(record.userId)) { case (?x) x; case null { AccountLib.openKeepingIdle(accounts, referralCodes, idleAccounts(), maxIdleAccounts, isIdleAccount, record.userId, null, null) } };
    if (record.state == #Succeeded or record.state == #Waived) {
      switch (unsettledNotice(record)) {
        case (?msg) { return { ok = false; error = ?msg; state = ?record.state; creditBalance = ?a.creditBalance; campaignId = null; subscriptionActive = null; referralRewardApplied = false } };
        case null {};
      };
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
      // A payment's first lookup in the window is never held by the shared
      // cap: a customer whose card was just charged must not be kept waiting
      // because other (free) identities used it up. Payment records are
      // bounded by the checkout budgets, so neither is this.
      // Only a payment opened within the hour: older records would let free
      // identities skip the shared cap once their windows were swept.
      let firstLookup = not stripeWindows.containsKey("confirm:" # record.paymentIntentId) and Time.now() - record.createdAt < stripeWindowNs;
      let budgets = [
        { key = "confirm:" # callerId; limit = confirmsPerHour; minGapNs = 0 },
        { key = "confirm:" # record.paymentIntentId; limit = confirmsPerHour; minGapNs = confirmGapNs },
      ];
      switch (stripeRefusal(Limits.admit(stripeWindows, if (firstLookup) budgets else budgets.concat([{ key = "confirm:*"; limit = confirmsPerHourGlobal; minGapNs = 0 }]), Time.now(), stripeWindowNs), "checking this payment")) {
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
          // A test key's payment moved no money: it must never print mail
          // for real or grant credits (test orders go through test mode).
          if (not intent.livemode) {
            return fail(AdminLib.providerError(adminKeysState, caller, "The payment processor reports a test-mode payment (livemode false) while live checkout is on: the secret key is a test key. Nothing was granted.", "This payment could not be accepted, and nothing was granted. Please contact support."));
          };
        };
      };
      // Re-check after the await: another call may have confirmed meanwhile.
      if (record.state == #Succeeded) {
        switch (unsettledNotice(record)) {
          case (?msg) { return { ok = false; error = ?msg; state = ?record.state; creditBalance = ?a.creditBalance; campaignId = null; subscriptionActive = null; referralRewardApplied = false } };
          case null {};
        };
        return { ok = true; error = null; state = ?record.state; creditBalance = ?a.creditBalance; campaignId = record.reference; subscriptionActive = ?AccountLib.isSubscriptionLive(a, Time.now()); referralRewardApplied = false };
      };
    };
    let (balance, campaignId, subActive) = applyPaymentEffects(record, a);
    switch (unsettledNotice(record)) {
      case (?msg) { return { ok = false; error = ?msg; state = ?record.state; creditBalance = balance; campaignId = null; subscriptionActive = null; referralRewardApplied = false } };
      case null {};
    };
    let rewarded = tryReferralReward(record);
    { ok = true; error = null; state = ?record.state; creditBalance = balance; campaignId; subscriptionActive = switch (subActive) { case (?s) ?s; case null ?AccountLib.isSubscriptionLive(a, Time.now()) }; referralRewardApplied = rewarded };
  };

  /// Applies the referral reward for a completed payment (idempotent). The
  /// reward is decided when the payment is confirmed (`confirmPayment`), with
  /// the referrer's membership as it is then; this manual retry is for the
  /// admin and controllers only, or a customer could claim it later, once the
  /// referrer had joined.
  public shared ({ caller }) func applyReferralReward(paymentIntentId : Text) : async Common.ApiResult {
    if (not AdminLib.isAdmin(adminKeysState, caller)) { return { ok = false; error = ?"Only the admin can apply a referral reward by hand" } };
    switch (payments.get(AddressLib.sanitizeText(paymentIntentId))) {
      case null { { ok = false; error = ?"Unknown payment" } };
      case (?record) {
        if (record.state != #Succeeded and record.state != #Waived) { return { ok = false; error = ?"Payment has not completed" } };
        if (tryReferralReward(record)) { { ok = true; error = null } } else { { ok = false; error = ?"No referral reward applies (already granted, no referrer, not the first payment, or referrer's subscription inactive)" } };
      };
    };
  };
  // ─── Payment history and refunds ─────────────────────────────────────────

  /// Payments with a refund running, so two clicks never refund twice.
  transient let refundsInFlight = Set.empty<Text>();
  transient let maxRefundReasonChars : Nat = 200;
  transient let maxCreditAdjustment : Nat = 1_000_000;

  private func refundDollars(cents : Nat) : Text {
    let c = cents % 100;
    "$" # (cents / 100).toText() # "." # (if (c < 10) "0" else "") # c.toText();
  };

  /// Whether a campaign is past "ready to dispatch" (a run under way, its
  /// file or a job with the print partner): a refund can no longer stop it.
  private func isPrinting(c : Types.CampaignRecord) : Bool {
    c.printDocumentId != null or c.printJobId != null or (c.productionStatus != #ReadyToDispatch and c.productionStatus != #Failed and c.productionStatus != #AwaitingPayment and c.productionStatus != #Draft);
  };

  private func refundsOf(paymentIntentId : Text) : [Account.RefundRecord] {
    switch (paymentRefunds.get(paymentIntentId)) { case (?r) r; case null [] };
  };

  /// What has been given back for a payment (refunds the processor did not
  /// refuse).
  private func refundedCents(paymentIntentId : Text) : Nat {
    var total = 0;
    for (r in refundsOf(paymentIntentId).vals()) {
      if (r.status != "failed" and r.status != "canceled") { total += r.amountCents };
    };
    total;
  };

  private func paymentView(p : Account.PaymentRecord, forAdmin : Bool) : Account.PaymentView {
    var campaignId : ?Text = null;
    var campaignName : ?Text = null;
    var settled = false;
    var inProduction = false;
    if (p.purpose == #CampaignOrder) {
      campaignId := p.reference;
      switch (p.reference) {
        case (?id) {
          switch (campaigns.get(id)) {
            case (?c) {
              campaignName := ?c.name;
              settled := c.paymentIntentId == ?p.paymentIntentId;
              inProduction := isPrinting(c);
            };
            case null {};
          };
        };
        case null {};
      };
    };
    {
      paymentIntentId = p.paymentIntentId;
      userId = p.userId;
      purpose = p.purpose;
      amountCents = p.amountCents;
      refundedCents = refundedCents(p.paymentIntentId);
      state = p.state;
      createdAt = p.createdAt;
      confirmedAt = p.confirmedAt;
      testMode = p.sandbox;
      creditPack = p.creditPack;
      campaignId;
      campaignName;
      settledCampaign = settled;
      campaignInProduction = inProduction;
      // The admin's reason is an internal note: customers see the refund only.
      refunds = refundsOf(p.paymentIntentId).map(func(r : Account.RefundRecord) : Account.RefundView = { refundId = r.refundId; amountCents = r.amountCents; reason = if (forAdmin) r.reason else ""; status = r.status; createdAt = r.createdAt });
    };
  };

  private func newestFirst(list : List.List<Account.PaymentRecord>, max : Nat, forAdmin : Bool) : [Account.PaymentView] {
    let at = func(p : Account.PaymentRecord) : Int = switch (p.confirmedAt) { case (?t) t; case null p.createdAt };
    let sorted = list.toArray().sort(func(a : Account.PaymentRecord, b : Account.PaymentRecord) : Order.Order = Int.compare(at(b), at(a)));
    sorted.sliceToArray(0, Nat.min(sorted.size(), max)).map(func(p : Account.PaymentRecord) : Account.PaymentView = paymentView(p, forAdmin));
  };

  /// The caller's completed payments, newest first (at most 100): the
  /// payment history, whose payment ids are the invoice numbers a customer
  /// quotes to support.
  public shared query ({ caller }) func getMyPayments() : async [Account.PaymentView] {
    if (not signedIn(caller)) { return [] };
    let id = caller.toText();
    let mine = List.empty<Account.PaymentRecord>();
    for (p in PaymentIndex.forUser(paymentIndex, payments, id).vals()) {
      if (PaymentIndex.isCompleted(p)) { mine.add(p) };
    };
    newestFirst(mine, 100, false);
  };

  /// Admin only: payments matching an invoice number (payment id), an
  /// account id, a campaign id or an account email, newest first (at most
  /// 50); an empty search lists the newest completed payments. Anyone else
  /// gets nothing.
  public shared query ({ caller }) func adminFindPayments(searchText : Text) : async [Account.PaymentView] {
    if (not AdminLib.isAdmin(adminKeysState, caller)) { return [] };
    let q = AddressLib.sanitizeText(searchText).trim(#predicate(func(c : Char) : Bool { c.isWhitespace() }));
    let email = q.toLower();
    let found = List.empty<Account.PaymentRecord>();
    if (q == "") {
      for (p in PaymentIndex.newestCompleted(paymentIndex, payments, 50).vals()) { found.add(p) };
      return newestFirst(found, 50, true);
    };
    let seen = Set.empty<Text>();
    let take = func(list : [Account.PaymentRecord]) {
      for (p in list.vals()) { if (not seen.contains(p.paymentIntentId)) { seen.add(p.paymentIntentId); found.add(p) } };
    };
    switch (payments.get(q)) { case (?p) { take([p]) }; case null {} };
    take(PaymentIndex.forUser(paymentIndex, payments, q));
    take(PaymentIndex.forCampaign(paymentIndex, payments, q));
    if (email.contains(#char '@')) {
      for ((_, a) in accounts.entries()) {
        if (a.email != "" and a.email.toLower() == email) { take(PaymentIndex.forUser(paymentIndex, payments, a.id)) };
      };
    };
    newestFirst(found, 50, true);
  };

  /// Admin only: refunds `amountCents` of a completed payment to the card it
  /// was paid with, through the payment processor, and records it. With
  /// `revokeEffects`, what the payment granted is taken back where it still
  /// can be: a fully refunded campaign that has not gone to print is marked
  /// refunded (it can no longer be sent to print or paid again), a credit
  /// pack's credits are deducted in proportion, and a fully refunded
  /// membership loses its 30 days and its monthly allowance.
  public shared ({ caller }) func adminRefundPayment(input : Account.RefundInput) : async Account.RefundResult {
    let fail = func(msg : Text) : Account.RefundResult { { ok = false; error = ?msg; refundId = null; refundedCents = 0; creditBalance = null } };
    if (not AdminLib.isAdmin(adminKeysState, caller)) { return fail("Only the admin can refund payments") };
    let id = AddressLib.sanitizeText(input.paymentIntentId);
    let p = switch (payments.get(id)) { case (?r) r; case null { return fail("Unknown payment") } };
    if (p.state != #Succeeded) { return fail("Only a completed payment can be refunded") };
    if (p.sandbox) { return fail("A test-mode payment charged nothing, so there is nothing to refund") };
    let reason = Limits.clip(AddressLib.sanitizeText(input.reason), maxRefundReasonChars);
    if (reason == "") { return fail("Give a reason for the refund") };
    if (input.amountCents == 0) { return fail("Enter an amount to refund") };
    let secret = switch (adminKeysState.stripeSecretKey) { case (?s) s; case null { return fail("The payment processor's secret key is not set") } };
    if (refundsInFlight.contains(id)) { return fail("A refund for this payment is already running") };
    refundsInFlight.add(id);
    try {
      // A refund still pending may since have failed (it then gives nothing
      // back) or gone through: read those again before counting what is left.
      for (r in refundsOf(id).vals()) {
        if (r.status == "pending" or r.status == "requires_action") {
          switch (await* readRefund(secret, r.refundId)) {
            case (?seen) { setRefundStatus(id, r.refundId, seen.status) };
            case null {};
          };
        };
      };
      let already = refundedCents(id);
      let remaining = Nat.sub(p.amountCents, Nat.min(already, p.amountCents));
      if (remaining == 0) { return fail("This payment has already been refunded in full") };
      if (input.amountCents > remaining) {
        return fail("Refund between $0.01 and " # refundDollars(remaining) # ", what is left of this payment");
      };
      // The same request (amount and reason) after the same recorded refunds
      // gets the same key, so a retry after a lost answer is answered with the
      // refund already made, never a second one; a different request is a
      // new refund.
      let key = "ez-refund-" # id # "-" # refundsOf(id).size().toText() # "-" # input.amountCents.toText() # "-" # textHash(reason);
      let by = caller.toText();
      // A campaign this refund will take back is marked refunded now, in the
      // same message as the check and before the first await, so a dispatch
      // started while the processor answers is refused (it checks the paid
      // status before its first await and again before submitting). It goes
      // back to paid if the processor refuses the refund.
      var held : ?Types.CampaignRecord = null;
      if (input.revokeEffects and p.purpose == #CampaignOrder and already + input.amountCents >= p.amountCents) {
        switch (p.reference) {
          case (?cid) {
            switch (campaigns.get(cid)) {
              case (?c) {
                if (c.paymentIntentId == ?id and c.paymentStatus == #Paid and not isPrinting(c)) {
                  c.paymentStatus := #Refunded;
                  held := ?c;
                };
              };
              case null {};
            };
          };
          case null {};
        };
      };
      let release = func(msg : Text) : Account.RefundResult {
        switch (held) { case (?c) { if (c.paymentStatus == #Refunded) { c.paymentStatus := #Paid } }; case null {} };
        fail(msg);
      };
      // The admin's id is recorded here, not sent: a retry by another admin
      // must send the same request, or the processor refuses the reused key.
      let resp = await* Http.postText(Stripe.apiBase # "/refunds", Stripe.headers(secret, ?key), Stripe.refundBody(id, input.amountCents, reason), AdminLib.outcallOptions(adminKeysState, 32_000), transformFn);
      if (resp.status == 0) {
        // Possibly refunded: the campaign stays held until a retry settles it.
        return fail("No answer from the payment processor, so the outcome is unknown. Check its dashboard, or retry with the same amount and reason: that cannot refund twice.");
      };
      if (not Http.isSuccess(resp)) {
        return release("The payment processor refused the refund: " # Stripe.errorMessage(resp.body));
      };
      let made = switch (Stripe.parseRefund(resp.body)) { case (?r) r; case null { return fail("Unexpected answer from the payment processor; check its dashboard before trying again") } };
      // The create call is answered by one node: the refund is read back by
      // the whole subnet before anything is recorded or taken back.
      let refund = switch (await* readRefund(secret, made.id)) {
        case (?r) { if (r.paymentIntent == id) r else { return release("The payment processor's refund is for another payment; check its dashboard") } };
        case null { return fail("The refund was sent but could not be confirmed. Check the processor's dashboard, or retry with the same amount and reason: that cannot refund twice.") };
      };
      if (refundsOf(id).any(func(r : Account.RefundRecord) : Bool { r.refundId == refund.id })) {
        return { ok = true; error = null; refundId = ?refund.id; refundedCents = refundedCents(id); creditBalance = null };
      };
      if (refund.status == "failed" or refund.status == "canceled") {
        return release("The payment processor reports the refund " # refund.status);
      };
      let amount = if (refund.amount > 0) refund.amount else input.amountCents;
      let now = Time.now();
      paymentRefunds.add(id, refundsOf(id).concat([{ refundId = refund.id; amountCents = amount; reason; status = refund.status; createdAt = now; by }]));
      let full = already + amount >= p.amountCents;
      // A free month this payment earned the customer's referrer goes once
      // what is kept of the payment no longer covers it (`referralQualifying`).
      if (input.revokeEffects and already + amount + Credits.referralRewardCents > p.amountCents) {
        ignore revokeReferralMonth(id, now);
      };
      var balance : ?Nat = null;
      switch (accounts.get(p.userId)) {
        case (?a) {
          switch (p.purpose) {
            case (#CampaignOrder) {
              switch (p.reference) {
                case (?cid) {
                  switch (campaigns.get(cid)) {
                    case (?c) {
                      // Held before the processor was called (`held`): taken
                      // back for good once the refund covers the payment.
                      switch (held) {
                        case (?h) {
                          if (h.id == c.id and full and c.paymentStatus == #Refunded) {
                            c.updatedAt := now;
                            // Nothing will print it: its staged file goes.
                            documentUploads.remove(cid);
                          } else if (c.paymentStatus == #Refunded) { c.paymentStatus := #Paid };
                        };
                        case null {};
                      };
                      // The customer sees this on the campaign's timeline: the
                      // amount only, never the admin's note.
                      CampaignLib.appendEvent(trackingEvents, state, c.id, c.status, "payment.refunded", refund.id, #System, ?("Refunded " # refundDollars(amount) # " to the card"));
                    };
                    case null {};
                  };
                };
                case null {};
              };
            };
            case (#CreditPack) {
              if (input.revokeEffects) {
                let info = Credits.packInfo(switch (p.creditPack) { case (?k) k; case null #Starter });
                let take = info.credits * amount / p.amountCents;
                if (take > 0) {
                  balance := ?AccountLib.applyCredits(creditLedger, state, a, -take, "refund:" # Credits.packName(info.pack), ?id);
                };
              };
            };
            case (#Subscription) {
              // Only what is left of this payment's own 30 days is taken back
              // (a pass refunded months later leaves today's membership as
              // it is), and its credits only while that window is open.
              let paidAt = switch (p.confirmedAt) { case (?t) t; case null p.createdAt };
              let unused = paidAt + Credits.thirtyDaysNs - now;
              if (input.revokeEffects and full and unused > 0) {
                a.subscriptionRenewsAt := Int.max(now, a.subscriptionRenewsAt - unused);
                if (a.subscriptionRenewsAt <= now) { a.subscriptionActive := false };
                balance := ?AccountLib.applyCredits(creditLedger, state, a, -Credits.monthlyAllowance, "refund:membership", ?id);
              };
            };
          };
          if (balance == null) { balance := ?a.creditBalance };
        };
        case null {};
      };
      { ok = true; error = null; refundId = ?refund.id; refundedCents = already + amount; creditBalance = balance };
    } finally {
      refundsInFlight.remove(id);
    };
  };

  /// A refund as the whole subnet reads it from the payment processor
  /// (replicated, reduced to the fields that decide anything), or null.
  private func readRefund(secret : Text, refundId : Text) : async* ?Stripe.RefundInfo {
    let opts = {
      AdminLib.outcallOptions(adminKeysState, 32_000) with
      isReplicated = true;
      transformContext = Http.jsonSummary(Stripe.refundSummaryKeys);
    };
    let resp = await* Http.get(Stripe.apiBase # "/refunds/" # refundId, Stripe.headers(secret, null), opts, transformFn);
    if (not Http.isSuccess(resp)) return null;
    switch (Stripe.parseRefund(resp.body)) {
      case (?r) { if (r.id == refundId) ?r else null };
      case null null;
    };
  };

  private func setRefundStatus(paymentIntentId : Text, refundId : Text, status : Text) {
    paymentRefunds.add(paymentIntentId, refundsOf(paymentIntentId).map(func(r : Account.RefundRecord) : Account.RefundRecord = if (r.refundId == refundId) { { r with status } } else r));
  };

  /// Takes back the free month a referred customer's payment earned their
  /// referrer: an unused month is removed, and one already used gives back
  /// what is left of its own 30 days (counted from when it was used, so
  /// membership the referrer paid for since is never cut; its credits stay).
  /// The reward record goes, so it is never taken back twice; the referral
  /// stays decided (the refunded payment is still the customer's first, so
  /// no later payment earns a month). False when the payment earned nothing.
  private func revokeReferralMonth(paymentIntentId : Text, now : Int) : Bool {
    let reward = switch (referralRewards.find(func(r : Account.ReferralReward) : Bool { r.paymentIntentId == paymentIntentId })) {
      case (?r) r;
      case null { return false };
    };
    referralRewards.retain(func(r : Account.ReferralReward) : Bool { r.id != reward.id });
    switch (accounts.get(reward.referrerId)) {
      case (?ref) {
        if (AccountLib.freeMonths(ref) == 0 and ref.referralCreditsRedeemed > 0) {
          ref.referralCreditsRedeemed := Nat.sub(ref.referralCreditsRedeemed, 1);
          // The newest free month used: what is left of its 30 days.
          var usedAt : ?Int = null;
          for (w in PaymentIndex.forUser(paymentIndex, payments, ref.id).vals()) {
            if (w.state == #Waived and w.reference == ?"referral_free_month") {
              let t = switch (w.confirmedAt) { case (?c) c; case null w.createdAt };
              switch (usedAt) { case (?u) { if (t > u) { usedAt := ?t } }; case null { usedAt := ?t } };
            };
          };
          let left = switch (usedAt) {
            case (?u) Int.min(u + Credits.thirtyDaysNs - now, ref.subscriptionRenewsAt - now);
            case null 0;
          };
          if (left > 0) {
            ref.subscriptionRenewsAt -= left;
            if (ref.subscriptionRenewsAt <= now) { ref.subscriptionActive := false };
          };
        };
        if (ref.referralCreditsEarned > 0) { ref.referralCreditsEarned := Nat.sub(ref.referralCreditsEarned, 1) };
        if (ref.referralCount > 0) { ref.referralCount := Nat.sub(ref.referralCount, 1) };
        ref.updatedAt := now;
      };
      case null {};
    };
    true;
  };

  // ─── Payment record upkeep ───────────────────────────────────────────────

  /// A checkout left open this long is closed with the processor by
  /// `sweepPayments`; one younger than `reuseCheckoutNs` may still be handed
  /// back to the customer, so the two never overlap.
  transient let staleCheckoutNs : Int = 7 * 86_400_000_000_000;
  transient let reuseCheckoutNs : Int = 6 * 86_400_000_000_000;
  /// Closed checkouts are forgotten this long after they were opened, once
  /// the processor has confirmed them cancelled.
  transient let forgetClosedNs : Int = 30 * 86_400_000_000_000;
  /// Processor lookups one sweep may make: at least two (look up, cancel)
  /// for every checkout the hourly intent caps let open (`intentsPerHourGlobal`
  /// beside the per-campaign caps, whose drafts reuse their open checkout).
  transient let maxSweepLookups : Nat = 500;
  /// When the sweep last looked each open checkout up.
  transient let sweepLooked = Map.empty<Text, Int>();
  /// When the processor first answered 404 for an open checkout: closed only
  /// if it still does a week later (a wrong key for an hour must not close a
  /// paid checkout, which would then be forgotten).
  transient let sweepNotFound = Map.empty<Text, Int>();
  /// Closed checkouts the processor confirmed cancelled, which may be
  /// forgotten without another lookup (after an upgrade they are looked up).
  transient let confirmedCancelled = Set.empty<Text>();
  transient var sweepRunning = false;

  /// How far along an open checkout is: a campaign order is looked up after
  /// an hour and a day (a charge whose confirmation was lost is settled
  /// before its draft can expire or be evicted), every checkout after a week
  /// (cancelled if it still waits for a card) and weekly after that.
  private func checkoutStage(p : Account.PaymentRecord, age : Int) : Nat {
    if (age >= staleCheckoutNs) 3 else if (p.purpose != #CampaignOrder) 0 else if (age >= 86_400_000_000_000) 2 else if (age >= 3_600_000_000_000) 1 else 0;
  };

  private func lookupDue(p : Account.PaymentRecord, now : Int) : Bool {
    let stage = checkoutStage(p, now - p.createdAt);
    if (stage == 0) return false;
    switch (sweepLooked.get(p.paymentIntentId)) {
      case null true;
      case (?t) { checkoutStage(p, t - p.createdAt) < stage or (stage == 3 and now - t >= staleCheckoutNs) };
    };
  };

  /// Settles an open checkout the processor reports paid, exactly as
  /// `confirmPayment` would (replicated lookup, same checks, same effects),
  /// for a customer who closed the tab before confirming. A campaign whose
  /// draft is gone records the payment as received, so the admin can refund it.
  private func settleLostCharge(p : Account.PaymentRecord, secret : Text) : async* Bool {
    let opts = {
      AdminLib.outcallOptions(adminKeysState, 32_000) with
      isReplicated = true;
      transformContext = Http.jsonSummary(Stripe.intentSummaryKeys);
    };
    let resp = await* Http.get(Stripe.apiBase # "/payment_intents/" # p.paymentIntentId, Stripe.headers(secret, null), opts, transformFn);
    if (not Http.isSuccess(resp)) return false;
    switch (Stripe.parseIntent(resp.body)) {
      case (?intent) {
        if (intent.id != p.paymentIntentId or intent.status != "succeeded" or intent.amount != p.amountCents or intent.currency != "usd" or not intent.livemode) return false;
      };
      case null { return false };
    };
    // Confirmed meanwhile by its customer: nothing left to do.
    if (p.state != #Created) return false;
    let a = switch (accounts.get(p.userId)) { case (?x) x; case null { AccountLib.openKeepingIdle(accounts, referralCodes, idleAccounts(), maxIdleAccounts, isIdleAccount, p.userId, null, null) } };
    ignore applyPaymentEffects(p, a);
    ignore tryReferralReward(p);
    true;
  };

  private func forgetPayment(p : Account.PaymentRecord) {
    payments.remove(p.paymentIntentId);
    PaymentIndex.remove(paymentIndex, p);
    sweepLooked.remove(p.paymentIntentId);
    sweepNotFound.remove(p.paymentIntentId);
    confirmedCancelled.remove(p.paymentIntentId);
    // An account left with no payment record may be idle again.
    switch (accounts.get(p.userId)) {
      case (?a) { if (isIdleAccount(a)) { idleAccounts().pushBack(a.id) } };
      case null {};
    };
  };

  /// Hourly upkeep (timer in `main.mo`), oldest first within
  /// `maxSweepLookups`: open checkouts are looked up as `checkoutStage`
  /// says — one the processor reports paid is settled (`settleLostCharge`),
  /// one a week old still waiting for a card is cancelled, test-mode ones
  /// are just closed — and closed records a month old are forgotten once
  /// the processor confirms them cancelled (never one with a refund; one it
  /// reports paid is reopened and settled). Payment records so grow with
  /// real payments, not with abandoned checkouts. Returns how many records
  /// it changed.
  private func sweepPayments() : async* Nat {
    if (sweepRunning) { return 0 };
    sweepRunning := true;
    try {
      let now = Time.now();
      var changed = 0;
      let due = List.empty<Account.PaymentRecord>();
      let closedOld = List.empty<Account.PaymentRecord>();
      for ((_, p) in payments.entries()) {
        if (p.state == #Failed and now - p.createdAt > forgetClosedNs and not paymentRefunds.containsKey(p.paymentIntentId)) {
          if (p.sandbox or confirmedCancelled.contains(p.paymentIntentId)) { forgetPayment(p); changed += 1 } else { closedOld.add(p) };
        } else if (p.state == #Created) {
          if (p.sandbox) {
            if (now - p.createdAt > staleCheckoutNs) { p.state := #Failed; changed += 1 };
          } else if (lookupDue(p, now)) { due.add(p) };
        };
      };
      let secret = switch (adminKeysState.stripeSecretKey) { case (?k) k; case null { return changed } };
      let byAge = func(x : Account.PaymentRecord, y : Account.PaymentRecord) : Order.Order = Int.compare(x.createdAt, y.createdAt);
      var lookups = 0;
      let look = func(p : Account.PaymentRecord) : async* (Nat, Text) {
        lookups += 1;
        let resp = await* Http.get(Stripe.apiBase # "/payment_intents/" # p.paymentIntentId, Stripe.headers(secret, null), AdminLib.outcallOptions(adminKeysState, 32_000), transformFn);
        let status = if (Http.isSuccess(resp)) {
          switch (Stripe.parseIntent(resp.body)) { case (?i) { if (i.id == p.paymentIntentId) i.status else "" }; case null "" };
        } else "";
        (resp.status, status);
      };
      label open for (p in due.toArray().sort(byAge).vals()) {
        if (lookups + 2 > maxSweepLookups) break open;
        let (code, status) = await* look(p);
        let at = Time.now();
        sweepLooked.add(p.paymentIntentId, at);
        if (p.state != #Created) continue open;
        if (code == 404) {
          // Unknown to the processor (another key): closed only once it has
          // stayed unknown for a week.
          switch (sweepNotFound.get(p.paymentIntentId)) {
            case (?first) { if (at - first >= staleCheckoutNs) { p.state := #Failed; changed += 1 } };
            case null { sweepNotFound.add(p.paymentIntentId, at) };
          };
          continue open;
        };
        sweepNotFound.remove(p.paymentIntentId);
        if (status == "canceled") {
          p.state := #Failed;
          confirmedCancelled.add(p.paymentIntentId);
          changed += 1;
        } else if (status == "succeeded") {
          lookups += 1;
          if (await* settleLostCharge(p, secret)) { changed += 1 };
        } else if (checkoutStage(p, at - p.createdAt) == 3 and (status == "requires_payment_method" or status == "requires_confirmation" or status == "requires_action")) {
          // Only a checkout still waiting for a card is cancelled: one paying
          // or authorised stays open until it settles.
          lookups += 1;
          let cancel = await* Http.postText(Stripe.apiBase # "/payment_intents/" # p.paymentIntentId # "/cancel", Stripe.headers(secret, null), "", AdminLib.outcallOptions(adminKeysState, 32_000), transformFn);
          if (Http.isSuccess(cancel) and p.state == #Created) {
            p.state := #Failed;
            confirmedCancelled.add(p.paymentIntentId);
            changed += 1;
          };
        };
      };
      // Closed records not known to be cancelled (closed before an upgrade,
      // or as unknown): forgotten only once the processor says cancelled. One
      // it reports paid was closed in error and is settled now.
      label closed for (p in closedOld.toArray().sort(byAge).vals()) {
        if (lookups + 2 > maxSweepLookups) break closed;
        let (_, status) = await* look(p);
        if (p.state != #Failed) continue closed;
        if (status == "canceled") {
          forgetPayment(p);
          changed += 1;
        } else if (status == "succeeded" or status == "processing" or status == "requires_capture") {
          p.state := #Created;
          if (status == "succeeded") { lookups += 1; ignore await* settleLostCharge(p, secret) };
          changed += 1;
        };
      };
      changed;
    } finally {
      sweepRunning := false;
    };
  };

  /// A short, stable hash of `t` (FNV-1a), for idempotency keys.
  private func textHash(t : Text) : Text {
    var h : Nat32 = 2166136261;
    for (c in t.chars()) { h := (h ^ c.toNat32()) *% 16777619 };
    h.toText();
  };

  /// Admin only: adds AI credits to an account (a goodwill credit) or takes
  /// them away (never below zero), with a note on the account's ledger.
  public shared ({ caller }) func adminAdjustCredits(userId : Text, delta : Int, note : Text) : async Account.CreditAdjustResult {
    let fail = func(msg : Text) : Account.CreditAdjustResult { { ok = false; error = ?msg; creditBalance = null } };
    if (not AdminLib.isAdmin(adminKeysState, caller)) { return fail("Only the admin can adjust credits") };
    let a = switch (accounts.get(AddressLib.sanitizeText(userId))) { case (?x) x; case null { return fail("Unknown account") } };
    if (delta == 0 or Int.abs(delta) > maxCreditAdjustment) { return fail("Adjust by between 1 and 1,000,000 credits") };
    let clean = Limits.clip(AddressLib.sanitizeText(note), maxRefundReasonChars);
    if (clean == "") { return fail("Add a note saying why") };
    let balance = AccountLib.applyCredits(creditLedger, state, a, delta, "admin_adjustment: " # clean, null);
    { ok = true; error = null; creditBalance = ?balance };
  };
};
