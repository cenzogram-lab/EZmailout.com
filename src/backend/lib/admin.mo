/// Admin authorization and credential helpers shared by the mixins.
import Common "../types/common";
import Http "http";
import Fulfilment "fulfilment";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Array "mo:core/Array";

module {
  public let webhookPath : Text = "/webhooks/fulfilment";
  /// The path delivery webhooks were first configured with at the print
  /// partner. Still accepted, so an existing webhook keeps working until it is
  /// re-pointed at `webhookPath`.
  public let legacyWebhookPath : Text = "/webhooks/click2mail";

  public func isWebhookPath(p : Text) : Bool { p == webhookPath or p == legacyWebhookPath };
  public let trackingBaseUrl : Text = "https://ezmailout.com/t/";
  public let referralBaseUrl : Text = "https://ezmailout.com/ref/";

  public func callerText(caller : Principal) : Text { caller.toText() };

  /// What a failed provider call tells its caller. Provider messages name the
  /// provider and can quote part of a key ("Invalid API key provided:
  /// sk_live_****1234"), so only the admin and controllers get the detail;
  /// everyone else gets `generic`, which names no provider.
  public func providerError(state : Common.AdminState, caller : Principal, detail : Text, generic : Text) : Text {
    if (isAdmin(state, caller)) detail else generic;
  };

  public func isAdmin(state : Common.AdminState, caller : Principal) : Bool {
    if (caller.isController()) { return true };
    switch (state.adminPrincipal) {
      case (?p) { p == caller.toText() };
      case null { false };
    };
  };

  /// Assigns (or replaces) the admin principal. Only controllers may call
  /// this; nothing else ever writes the slot, so it cannot be claimed.
  public func assignAdmin(state : Common.AdminState, caller : Principal, admin : Principal) : Common.ApiResult {
    if (not caller.isController()) {
      return { ok = false; error = ?"Only a canister controller can assign the admin" };
    };
    if (admin.isAnonymous()) {
      return { ok = false; error = ?"The anonymous principal cannot be the admin" };
    };
    state.adminPrincipal := ?admin.toText();
    { ok = true; error = null };
  };

  public func maskKey(key : ?Text) : ?Text {
    switch (key) {
      case null { null };
      case (?k) {
        let chars = k.toArray();
        if (chars.size() <= 4) { ?"****" } else {
          let start : Nat = chars.size() - 4;
          ?("***" # Text.fromArray(Array.tabulate<Char>(4, func(i) = chars[start + i])));
        };
      };
    };
  };

  public func sanitizeKey(key : Text) : ?Text {
    let t = key.trim(#predicate (func(c : Char) : Bool { c == ' ' or c == '\t' or c == '\n' or c == '\r' }));
    if (t == "") { null } else { ?t };
  };

  /// Minimal shape check for an address we will send mail to or reply to.
  public func looksLikeEmail(e : Text) : Bool {
    if (e.size() < 6 or e.size() > 254 or e.contains(#char ' ')) { return false };
    let parts = e.split(#char '@').toArray();
    parts.size() == 2 and parts[0].size() > 0 and parts[1].contains(#char '.') and not parts[1].startsWith(#char '.') and not parts[1].endsWith(#char '.');
  };

  /// Resend key and a support address are both set, so tickets can be emailed.
  public func canEmailSupport(state : Common.AdminState) : Bool {
    state.resendKey != null and state.supportEmailAddress != null;
  };

  public func hasFulfilment(state : Common.AdminState) : Bool {
    state.fulfilmentUsername != null and state.fulfilmentPassword != null;
  };

  public func fulfilmentAuth(state : Common.AdminState) : ?Text {
    switch (state.fulfilmentUsername, state.fulfilmentPassword) {
      case (?u, ?p) { ?Fulfilment.basicAuth(u, p) };
      case _ { null };
    };
  };

  public func outcallOptions(state : Common.AdminState, maxResponseBytes : Nat64) : Http.RequestOptions {
    { maxResponseBytes; isReplicated = false; proxyUrl = state.outcallProxyUrl; transformContext = "" : Blob };
  };

  public func publicConfig(state : Common.AdminState) : Common.PublicConfig {
    {
      stripePublishableKey = state.stripePublishableKey;
      stripeConfigured = state.stripeSecretKey != null;
      fulfilmentConfigured = hasFulfilment(state);
      fulfilmentEnvironment = state.fulfilmentEnvironment;
      openAiConfigured = state.openAiKey != null;
      resendConfigured = state.resendKey != null;
      sandboxCheckout = state.sandboxCheckout;
      trackingBaseUrl;
      referralBaseUrl;
    };
  };
};
