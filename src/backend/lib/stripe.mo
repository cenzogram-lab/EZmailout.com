/// Stripe PaymentIntents request builders and parsers (form-encoded API).
import Click2Mail "click2mail";
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
    Click2Mail.formEncode([
      ("amount", amountCents.toText()),
      ("currency", "usd"),
      ("automatic_payment_methods[enabled]", "true"),
      ("description", description),
      ("metadata[purpose]", purpose),
      ("metadata[reference]", reference),
      ("metadata[userId]", userId),
      ("metadata[platform]", "ezmailout"),
    ]);
  };

  public type IntentInfo = { id : Text; clientSecret : ?Text; status : Text; amount : Nat };

  public func parseIntent(body : Text) : ?IntentInfo {
    switch (Json.getString(body, "id")) {
      case null null;
      case (?id) {
        let amount : Nat = switch (Json.getNumber(body, "amount")) {
          case (?a) { if (a < 0) 0 else a.toNat() };
          case null 0;
        };
        ?{
          id;
          clientSecret = Json.getString(body, "client_secret");
          status = switch (Json.getString(body, "status")) { case (?s) s; case null "" };
          amount;
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
