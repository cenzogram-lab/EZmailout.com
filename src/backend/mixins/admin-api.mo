/// Admin credential management (Click2Mail, Stripe, Resend, OpenAI, webhook secret).
import Common "../types/common";
import AdminLib "../lib/admin";

mixin (adminKeysState : Common.AdminState) {
  private func applyText(current : ?Text, input : ?Text) : ?Text {
    switch (input) {
      case null current;
      case (?v) AdminLib.sanitizeKey(v);
    };
  };

  /// Store admin credentials. Per field: null = unchanged, "" = clear, value = set.
  public shared ({ caller }) func saveAdminKeys(keys : Common.AdminKeysInput) : async Common.ApiResult {
    if (not AdminLib.authorizeAdmin(adminKeysState, caller)) {
      return { ok = false; error = ?"Unauthorized: only the admin principal or a canister controller may update keys" };
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
    { ok = true; error = null };
  };

  /// Masked view of the stored credentials (last 4 characters only).
  public shared query ({ caller }) func getAdminKeys() : async Common.AdminKeysView {
    let isAdmin = AdminLib.isAdmin(adminKeysState, caller);
    let visible = isAdmin or adminKeysState.adminPrincipal == null;
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
      webhookPath = AdminLib.webhookPath;
    };
  };

  /// Non-secret configuration flags for the frontend.
  public query func getPublicConfig() : async Common.PublicConfig {
    AdminLib.publicConfig(adminKeysState);
  };
};
