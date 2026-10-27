/// Account opening and the payment index (src/backend/lib/account.mo,
/// src/backend/lib/paymentIndex.mo), run in the interpreter:
///   moc -r --implicit-package=core --package core <motoko-core>/src test/accounts.test.mo
import AccountLib "../src/backend/lib/account";
import PaymentIndex "../src/backend/lib/paymentIndex";
import Account "../src/backend/types/account";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Debug "mo:core/Debug";

func expect(what : Text, ok : Bool) { if (not ok) Runtime.trap("FAILED: " # what) };

// ─── Idle accounts: never refused, the oldest idle one forgotten ───────────
let accounts = Map.empty<Text, Account.UserAccount>();
let codes = Map.empty<Text, Text>();
let isIdle = func(a : Account.UserAccount) : Bool { a.updatedAt == a.createdAt and a.email == "" };
let idle = AccountLib.idleQueue(accounts, isIdle);
let open = func(id : Text, email : ?Text, code : ?Text) : Account.UserAccount = AccountLib.openKeepingIdle(accounts, codes, idle, 2, isIdle, id, email, code);

let a = open("alice", null, null);
let aliceCode = a.referralCode;
ignore open("bob", ?"bob@example.com", null);
ignore open("carol", null, ?aliceCode);
expect("carol is referred by alice", (switch (accounts.get("carol")) { case (?c) c.referredBy; case null null }) == ?"alice");
ignore open("dave", null, null);
expect("opening past the pool forgets the oldest idle account (alice)", not accounts.containsKey("alice") and not codes.containsKey(aliceCode));
expect("an account with an email is never forgotten (bob)", accounts.containsKey("bob"));
expect("newer idle accounts stay (carol, dave)", accounts.containsKey("carol") and accounts.containsKey("dave"));
let again = open("alice", null, null);
expect("a forgotten account opens again with the same referral code", again.referralCode == aliceCode and codes.get(aliceCode) == ?"alice");
expect("the pool stays at its size", idle.size() <= 2);
// An account used since it opened (credits, here) is skipped, not forgotten.
switch (accounts.get("dave")) { case (?d) { d.updatedAt := d.createdAt + 1 }; case null {} };
ignore open("erin", null, null);
ignore open("frank", null, null);
expect("a used account is kept", accounts.containsKey("dave"));
expect("an existing account is returned as is", open("bob", null, null).email == "bob@example.com");
let rebuilt = AccountLib.idleQueue(accounts, isIdle);
expect("the queue rebuilt after an upgrade lists only idle accounts (erin, frank)", rebuilt.size() == 2 and accounts.containsKey("erin") and accounts.containsKey("frank"));

// ─── Payment index ─────────────────────────────────────────────────────────
func pay(id : Text, user : Text, purpose : Account.PaymentPurpose, reference : ?Text, state : Account.PaymentState, at : Int) : Account.PaymentRecord {
  { paymentIntentId = id; userId = user; purpose; amountCents = 900; reference; creditPack = null; var state = state; createdAt = at; var confirmedAt = if (state == #Succeeded) ?at else null; sandbox = false };
};
let payments = Map.empty<Text, Account.PaymentRecord>();
for (p in [
  pay("pi_1", "u1", #CampaignOrder, ?"cmp_1", #Succeeded, 30),
  pay("pi_2", "u1", #CreditPack, ?"Starter", #Created, 10),
  pay("pi_3", "u2", #CampaignOrder, ?"cmp_1", #Failed, 20),
  pay("pi_4", "u2", #Subscription, ?"subscription", #Succeeded, 5),
].vals()) { payments.add(p.paymentIntentId, p) };
let idx = PaymentIndex.build(payments);
expect("a customer's payments", PaymentIndex.forUser(idx, payments, "u1").size() == 2);
expect("a campaign's payments (campaign orders only)", PaymentIndex.forCampaign(idx, payments, "cmp_1").size() == 2 and PaymentIndex.forCampaign(idx, payments, "Starter").size() == 0);
let newest = PaymentIndex.newestCompleted(idx, payments, 10);
expect("completed payments, newest confirmation first", newest.size() == 2 and newest[0].paymentIntentId == "pi_1" and newest[1].paymentIntentId == "pi_4");
// A checkout that completes later is the newest.
switch (payments.get("pi_2")) { case (?p) { p.state := #Succeeded; p.confirmedAt := ?40 }; case null {} };
PaymentIndex.markCompleted(idx, "pi_2");
PaymentIndex.markCompleted(idx, "pi_2");
expect("a payment completed later comes first, once", PaymentIndex.newestCompleted(idx, payments, 10).size() == 3 and PaymentIndex.newestCompleted(idx, payments, 1)[0].paymentIntentId == "pi_2");
let added = pay("pi_5", "u3", #CampaignOrder, ?"cmp_2", #Created, 50);
payments.add("pi_5", added);
PaymentIndex.add(idx, added);
expect("a new payment is found", PaymentIndex.hasPayments(idx, "u3") and PaymentIndex.forCampaign(idx, payments, "cmp_2").size() == 1);
switch (payments.get("pi_3")) {
  case (?p) { payments.remove("pi_3"); PaymentIndex.remove(idx, p) };
  case null {};
};
expect("a forgotten payment leaves the index", PaymentIndex.forCampaign(idx, payments, "cmp_1").size() == 1 and PaymentIndex.forUser(idx, payments, "u2").size() == 1);
payments.remove("pi_5");
PaymentIndex.remove(idx, added);
expect("a customer with no payments left has no entry", not PaymentIndex.hasPayments(idx, "u3"));

Debug.print("accounts: all checks passed");
