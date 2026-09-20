/// Admin authorization and credential helpers shared by the mixins.
import Common "../types/common";
import Http "http";
import Click2Mail "click2mail";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Array "mo:core/Array";

module {
  public let webhookPath : Text = "/webhooks/click2mail";
  public let trackingBaseUrl : Text = "https://ezmailout.com/t/";
  public let referralBaseUrl : Text = "https://ezmailout.com/ref/";

  public func callerText(caller : Principal) : Text { caller.toText() };

  public func isAdmin(state : Common.AdminState, caller : Principal) : Bool {
    if (caller.isController()) { return true };
    switch (state.adminPrincipal) {
      case (?p) { p == caller.toText() };
      case null { false };
    };
  };

  /// Whether the caller may perform admin actions; claims the admin slot on first use.
  public func authorizeAdmin(state : Common.AdminState, caller : Principal) : Bool {
    if (caller.isController()) { return true };
    if (caller.isAnonymous()) { return false };
    switch (state.adminPrincipal) {
      case (?p) { p == caller.toText() };
      case null { state.adminPrincipal := ?caller.toText(); true };
    };
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

  public func hasClick2Mail(state : Common.AdminState) : Bool {
    state.click2mailUsername != null and state.click2mailPassword != null;
  };

  public func click2mailAuth(state : Common.AdminState) : ?Text {
    switch (state.click2mailUsername, state.click2mailPassword) {
      case (?u, ?p) { ?Click2Mail.basicAuth(u, p) };
      case _ { null };
    };
  };

  public func outcallOptions(state : Common.AdminState, maxResponseBytes : Nat64) : Http.RequestOptions {
    { maxResponseBytes; isReplicated = false; proxyUrl = state.outcallProxyUrl };
  };

  public func publicConfig(state : Common.AdminState) : Common.PublicConfig {
    {
      stripePublishableKey = state.stripePublishableKey;
      stripeConfigured = state.stripeSecretKey != null;
      click2mailConfigured = hasClick2Mail(state);
      click2mailEnvironment = state.click2mailEnvironment;
      openAiConfigured = state.openAiKey != null;
      resendConfigured = state.resendKey != null;
      sandboxCheckout = state.sandboxCheckout;
      trackingBaseUrl;
      referralBaseUrl;
    };
  };
};
