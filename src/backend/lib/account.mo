/// User account helpers: projections, referral codes and the credit ledger.
import Account "../types/account";
import Credits "credits";
import List "mo:core/List";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Nat32 "mo:core/Nat32";
import Nat "mo:core/Nat";
import Char "mo:core/Char";

module {
  public let referralBase : Text = "https://ezmailout.com/ref/";

  public func isSubscriptionLive(a : Account.UserAccount, now : Int) : Bool {
    a.subscriptionActive and a.subscriptionRenewsAt > now;
  };

  public func freeMonths(a : Account.UserAccount) : Nat {
    if (a.referralCreditsEarned > a.referralCreditsRedeemed) { a.referralCreditsEarned - a.referralCreditsRedeemed } else { 0 };
  };

  public func toShared(a : Account.UserAccount, now : Int) : Account.UserAccountShared {
    {
      id = a.id;
      email = a.email;
      creditBalance = a.creditBalance;
      subscriptionActive = isSubscriptionLive(a, now);
      subscriptionRenewsAt = a.subscriptionRenewsAt;
      referralCode = a.referralCode;
      referralLink = referralBase # a.referralCode;
      referredBy = a.referredBy;
      referralCreditsEarned = a.referralCreditsEarned;
      referralCreditsRedeemed = a.referralCreditsRedeemed;
      freeMonthsAvailable = freeMonths(a);
      referralCount = a.referralCount;
      firstPaymentAt = a.firstPaymentAt;
      createdAt = a.createdAt;
      updatedAt = a.updatedAt;
    };
  };

  public func newAccount(id : Text, email : Text, referralCode : Text, referredBy : ?Text) : Account.UserAccount {
    let now = Time.now();
    {
      id;
      var email = email;
      var creditBalance = 0;
      var subscriptionActive = false;
      var subscriptionRenewsAt = 0;
      var referralCode = referralCode;
      var referredBy = referredBy;
      var referralCreditsEarned = 0;
      var referralCreditsRedeemed = 0;
      var referralCount = 0;
      var firstPaymentAt = null;
      var lastMonthlyGrantAt = 0;
      createdAt = now;
      var updatedAt = now;
    };
  };

  /// Deterministic 6-character code from an FNV-1a hash of `seed # salt`.
  public func generateReferralCode(seed : Text, salt : Nat) : Text {
    let alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toArray();
    var h : Nat32 = 2166136261;
    for (c in (seed # "#" # salt.toText()).chars()) {
      h := (h ^ (c.toNat32() % 256)) *% 16777619;
    };
    var code = "EZ";
    var i = 0;
    var v : Nat = h.toNat();
    while (i < 6) {
      code #= Text.fromChar(alphabet[v % 32]);
      v := v / 32;
      if (v == 0) { v := (h *% Nat32.fromNat(i + 7)).toNat() };
      i += 1;
    };
    code;
  };

  public func normalizeCode(code : Text) : Text {
    code.trim(#char ' ').toUpper();
  };

  /// Appends a ledger entry and applies the delta to the balance. Returns the new balance.
  public func applyCredits(
    ledger : List.List<Account.CreditLedgerEntry>,
    state : { var nextLedgerId : Nat },
    a : Account.UserAccount,
    delta : Int,
    reason : Text,
    reference : ?Text,
  ) : Nat {
    let current : Int = a.creditBalance;
    let next : Int = current + delta;
    let balance : Nat = if (next < 0) { 0 } else { next.toNat() };
    a.creditBalance := balance;
    a.updatedAt := Time.now();
    let id = state.nextLedgerId;
    state.nextLedgerId += 1;
    ledger.add({ id; userId = a.id; delta; balanceAfter = balance; reason; reference; timestamp = Time.now() });
    balance;
  };

  /// Extends the subscription by 30 days from max(now, renewsAt) and grants the monthly allowance.
  public func activateSubscription(
    ledger : List.List<Account.CreditLedgerEntry>,
    state : { var nextLedgerId : Nat },
    a : Account.UserAccount,
    reference : ?Text,
  ) : Nat {
    let now = Time.now();
    let from = if (a.subscriptionRenewsAt > now) { a.subscriptionRenewsAt } else { now };
    a.subscriptionActive := true;
    a.subscriptionRenewsAt := from + Credits.thirtyDaysNs;
    a.lastMonthlyGrantAt := now;
    applyCredits(ledger, state, a, Credits.monthlyAllowance, "monthly_allowance", reference);
  };

  /// Returns the caller's account, creating it (with a unique referral code) when missing.
  public func getOrCreate(
    accounts : Map.Map<Text, Account.UserAccount>,
    referralCodes : Map.Map<Text, Text>,
    userId : Text,
    email : ?Text,
    referralCode : ?Text,
  ) : Account.UserAccount {
    switch (accounts.get(userId)) {
      case (?a) {
        switch (email) {
          case (?e) { if (e != "" and a.email == "") { a.email := e; a.updatedAt := Time.now() } };
          case null {};
        };
        a;
      };
      case null {
        var salt = 0;
        var code = generateReferralCode(userId, salt);
        while (referralCodes.containsKey(code)) {
          salt += 1;
          code := generateReferralCode(userId, salt);
        };
        let referredBy : ?Text = switch (referralCode) {
          case (?rc) {
            let norm = normalizeCode(rc);
            switch (referralCodes.get(norm)) {
              case (?referrer) { if (referrer == userId) { null } else { ?referrer } };
              case null { null };
            };
          };
          case null { null };
        };
        let account = newAccount(userId, switch (email) { case (?e) e; case null "" }, code, referredBy);
        accounts.add(userId, account);
        referralCodes.add(code, userId);
        account;
      };
    };
  };
};
