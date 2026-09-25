import Random "mo:core/Random";

/// The endpoints the frontend's Internet Identity provider
/// (`InternetIdentityProvider` in @caffeineai/core-infrastructure) calls on
/// this canister while signing a user in. Their Candid types are fixed by
/// that package's inline IDL — any other signature fails to decode and the
/// sign-in errors out:
///
///   _internet_identity_sign_in_start  : () -> (vec nat8)
///   _internet_identity_sign_in_finish : () -> (variant { ok; err : record {} })
///   _initialize_access_control        : () -> ()
///
/// No state: nothing here is stable, so upgrades are unaffected.
mixin () {

  /// Issues the nonce Internet Identity binds into the signed attribute
  /// bundle it returns to the frontend. Called anonymously, before the II
  /// window opens: 32 bytes from the management canister's `raw_rand`.
  public shared func _internet_identity_sign_in_start() : async Blob {
    await Random.blob();
  };

  /// Completes the attribute handshake. EZmailout reads no II attributes —
  /// no email or other claim gates anything — so nothing is verified or
  /// stored; a signed-in caller gets `#ok`, the anonymous principal `#err`.
  public shared ({ caller }) func _internet_identity_sign_in_finish() : async { #ok; #err : {} } {
    if (caller.isAnonymous()) #err({}) else #ok;
  };

  /// Called after every sign-in. Roles need no setup here: controllers are
  /// admins, the admin slot is claimed only by an explicit first
  /// `saveAdminKeys` (never by signing in) and accounts are created on first
  /// use. So this is deliberately a no-op, and therefore idempotent.
  public shared func _initialize_access_control() : async () {};
};
