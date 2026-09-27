/// Admin credential management (Click2Mail, Stripe, Resend, OpenAI, webhook secret).
import Common "../types/common";
import AdminLib "../lib/admin";
import Inputs "../lib/inputs";
import Principal "mo:core/Principal";

mixin (adminKeysState : Common.AdminState) {
  private func applyText(current : ?Text, input : ?Text) : ?Text {
    switch (input) {
      case null current;
      case (?v) AdminLib.sanitizeKey(v);
    };
  };

  /// Store admin credentials. Per field: null = unchanged, "" = clear, value = set.
  /// The admin (assigned by a controller) or a controller only: saving never
  /// claims the admin role.
  public shared ({ caller }) func saveAdminKeys(keys : Common.AdminKeysInput) : async Common.ApiResult {
    if (not AdminLib.isAdmin(adminKeysState, caller)) {
      return { ok = false; error = ?"Unauthorized: only the admin principal or a canister controller may update keys" };
    };
    // Validated before anything is written, so a bad value saves nothing.
    // Every key is sent with its outcalls, so each one is bounded.
    let values = [keys.click2mailUsername, keys.click2mailPassword, keys.stripeSecretKey, keys.stripePublishableKey, keys.resendKey, keys.openAiKey, keys.webhookSecret, keys.outcallProxyUrl, keys.supportEmailAddress];
    for (v in values.vals()) {
      switch (v) {
        case (?t) {
          if (t.size() > Inputs.maxAdminValueChars) {
            return { ok = false; error = ?("Keys and addresses are limited to " # Inputs.maxAdminValueChars.toText() # " characters") };
          };
        };
        case null {};
      };
    };
    // Every outcall and its credentials go through the proxy: https only.
    switch (keys.outcallProxyUrl) {
      case (?raw) {
        if (AdminLib.sanitizeKey(raw) != null and Inputs.proxyUrl(raw) == null) {
          return { ok = false; error = ?"The outcall proxy must be an https:// address" };
        };
      };
      case null {};
    };
    let supportEmail : ?(?Text) = switch (keys.supportEmailAddress) {
      case null null;
      case (?raw) {
        switch (AdminLib.sanitizeKey(raw)) {
          case null { ?null };
          case (?e) {
            let lower = e.toLower();
            if (not AdminLib.looksLikeEmail(lower)) {
              return { ok = false; error = ?"Support notification email is not a valid address" };
            };
            ??lower;
          };
        };
      };
    };
    adminKeysState.click2mailUsername := applyText(adminKeysState.click2mailUsername, keys.click2mailUsername);
    adminKeysState.click2mailPassword := applyText(adminKeysState.click2mailPassword, keys.click2mailPassword);
    adminKeysState.stripeSecretKey := applyText(adminKeysState.stripeSecretKey, keys.stripeSecretKey);
    adminKeysState.stripePublishableKey := applyText(adminKeysState.stripePublishableKey, keys.stripePublishableKey);
    adminKeysState.resendKey := applyText(adminKeysState.resendKey, keys.resendKey);
    adminKeysState.openAiKey := applyText(adminKeysState.openAiKey, keys.openAiKey);
    adminKeysState.webhookSecret := applyText(adminKeysState.webhookSecret, keys.webhookSecret);
    adminKeysState.outcallProxyUrl := applyText(adminKeysState.outcallProxyUrl, keys.outcallProxyUrl);
    switch (keys.click2mailEnvironment) {
      case (?env) { adminKeysState.click2mailEnvironment := env };
      case null {};
    };
    switch (keys.sandboxCheckout) {
      case (?b) { adminKeysState.sandboxCheckout := b };
      case null {};
    };
    switch (supportEmail) {
      case (?email) { adminKeysState.supportEmailAddress := email };
      case null {};
    };
    { ok = true; error = null };
  };

  /// Assigns or replaces the admin principal. Controllers only: this is the
  /// one way the admin slot is ever written.
  public shared ({ caller }) func assignAdmin(newAdmin : Principal) : async Common.ApiResult {
    AdminLib.assignAdmin(adminKeysState, caller, newAdmin);
  };

  /// Masked view of the stored credentials (last 4 characters only), shown to
  /// the admin and controllers only.
  public shared query ({ caller }) func getAdminKeys() : async Common.AdminKeysView {
    let isAdmin = AdminLib.isAdmin(adminKeysState, caller);
    let visible = isAdmin;
    {
      click2mailUsername = if (visible) adminKeysState.click2mailUsername else null;
      click2mailPasswordMasked = if (visible) AdminLib.maskKey(adminKeysState.click2mailPassword) else null;
      click2mailEnvironment = adminKeysState.click2mailEnvironment;
      stripeSecretKeyMasked = if (visible) AdminLib.maskKey(adminKeysState.stripeSecretKey) else null;
      stripePublishableKey = adminKeysState.stripePublishableKey;
      resendKeyMasked = if (visible) AdminLib.maskKey(adminKeysState.resendKey) else null;
      openAiKeyMasked = if (visible) AdminLib.maskKey(adminKeysState.openAiKey) else null;
      webhookSecretMasked = if (visible) AdminLib.maskKey(adminKeysState.webhookSecret) else null;
      outcallProxyUrl = if (visible) adminKeysState.outcallProxyUrl else null;
      sandboxCheckout = adminKeysState.sandboxCheckout;
      adminPrincipal = adminKeysState.adminPrincipal;
      callerIsAdmin = isAdmin;
      callerIsController = caller.isController();
      webhookPath = AdminLib.webhookPath;
      supportEmailAddress = if (visible) adminKeysState.supportEmailAddress else null;
    };
  };

  /// Non-secret configuration flags for the frontend.
  public query func getPublicConfig() : async Common.PublicConfig {
    AdminLib.publicConfig(adminKeysState);
  };
};
