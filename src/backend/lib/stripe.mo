/// Stripe PaymentIntents request builders and parsers (form-encoded API).
import Fulfilment "fulfilment";
import Json "json";
import Nat "mo:core/Nat";

module {
  public let apiBase : Text = "https://api.stripe.com/v1";

  public func headers(secretKey : Text, idempotencyKey : ?Text) : [{ name : Text; value : Text }] {
    let base = [
      { name = "Authorization"; value = "Bearer " # secretKey },
      { name = "Content-Type"; value = "application/x-www-form-urlencoded" },
      { name = "Accept"; value = "application/json" },
    ];
    switch (idempotencyKey) {
      case (?k) { [base[0], base[1], base[2], { name = "Idempotency-Key"; value = k }] };
      case null base;
    };
  };

  public func createPaymentIntentBody(
    amountCents : Nat,
    description : Text,
    purpose : Text,
    reference : Text,
    userId : Text,
  ) : Text {
    Fulfilment.formEncode([
      ("amount", amountCents.toText()),
      ("currency", "usd"),
      // Cards only (wallets that pay by card included): they succeed or fail
      // while the customer is on the page (3-D Secure runs in a modal), so a
      // payment is always confirmed by the checkout that took it. Methods
      // that clear days later or leave the page would need a webhook to be
      // credited, and there is none.
      ("payment_method_types[]", "card"),
      ("description", description),
      ("metadata[purpose]", purpose),
      ("metadata[reference]", reference),
      ("metadata[userId]", userId),
      ("metadata[platform]", "ezmailout"),
    ]);
  };

  public type IntentInfo = { id : Text; clientSecret : ?Text; status : Text; amount : Nat; currency : Text; livemode : Bool };

  /// Members payment verification reads; the replicated verification call
  /// reduces Stripe's response to exactly these (`Http.jsonSummary`).
  public let intentSummaryKeys : [Text] = ["id", "status", "amount", "currency", "livemode"];

  /// Reads the PaymentIntent's own top-level members. The any-depth getters
  /// would pick up a nested `status` or `amount` first — on older API versions
  /// the embedded `charges` list sorts before the intent's own `status`, so a
  /// declined earlier attempt could be read as the intent's state.
  public func parseIntent(body : Text) : ?IntentInfo {
    switch (Json.topLevelString(body, "id")) {
      case null null;
      case (?id) {
        let amount : Nat = switch (Json.topLevelNumber(body, "amount")) {
          case (?a) { if (a < 0) 0 else a.toNat() };
          case null 0;
        };
        ?{
          id;
          clientSecret = Json.topLevelString(body, "client_secret");
          status = switch (Json.topLevelString(body, "status")) { case (?s) s; case null "" };
          amount;
          currency = switch (Json.topLevelString(body, "currency")) { case (?c) c; case null "" };
          // Only an explicit `true` is live money: a test key's intents
          // (`false`) or an answer without the field never are.
          livemode = Json.topLevel(body).any(func((k, raw) : (Text, Text)) : Bool { k == "livemode" and raw == "true" });
        };
      };
    };
  };

  /// A refund of `amountCents` of a PaymentIntent, back to the card it was
  /// paid with.
  public func refundBody(paymentIntentId : Text, amountCents : Nat, reason : Text, by : Text) : Text {
    Fulfilment.formEncode([
      ("payment_intent", paymentIntentId),
      ("amount", amountCents.toText()),
      ("metadata[reason]", reason),
      ("metadata[issuedBy]", by),
      ("metadata[platform]", "ezmailout"),
    ]);
  };

  public type RefundInfo = { id : Text; status : Text; amount : Nat };

  public func parseRefund(body : Text) : ?RefundInfo {
    switch (Json.topLevelString(body, "id")) {
      case null null;
      case (?id) {
        ?{
          id;
          status = switch (Json.topLevelString(body, "status")) { case (?s) s; case null "" };
          amount = switch (Json.topLevelNumber(body, "amount")) { case (?a) { if (a < 0) 0 else a.toNat() }; case null 0 };
        };
      };
    };
  };

  public func errorMessage(body : Text) : Text {
    switch (Json.getString(body, "message")) {
      case (?m) m;
      case null "Stripe request failed";
    };
  };
};
