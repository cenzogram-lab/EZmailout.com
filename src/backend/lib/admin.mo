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
    { maxResponseBytes; isReplicated = false; proxyUrl = state.outcallProxyUrl; transformContext = "" : Blob };
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
