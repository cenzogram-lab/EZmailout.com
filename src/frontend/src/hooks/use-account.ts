import { RETURN_ADDRESS_STORAGE_KEY } from "@/components/wizard/ReturnAddressForm";
import { useEnsureAccount, useMyAccount } from "@/hooks/use-backend";
import { useAccountStore } from "@/store/account";
import { discardWizardDraft, useWizardStore } from "@/store/wizard";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

/**
 * Keeps the Zustand account store in sync with the canister for the signed-in
 * principal, creating the account (and capturing a pending referral code)
 * the first time a principal shows up.
 */
export function useAccountSync() {
  const {
    identity,
    isAuthenticated,
    login,
    clear,
    isInitializing,
    isLoggingIn,
  } = useInternetIdentity();
  const principal = identity?.getPrincipal().toString() ?? null;
  const queryClient = useQueryClient();
  const accountQuery = useMyAccount(isAuthenticated);
  const ensureAccount = useEnsureAccount();
  const setAccount = useAccountStore((s) => s.setAccount);
  const pendingReferralCode = useAccountStore((s) => s.pendingReferralCode);
  const setPendingReferralCode = useAccountStore(
    (s) => s.setPendingReferralCode,
  );
  const account = useAccountStore((s) => s.account);
  const creditBalance = useAccountStore((s) => s.creditBalance);
  const subscriptionActive = useAccountStore((s) => s.subscriptionActive);
  const ensuredFor = useRef<string | null>(null);
  const ensureTries = useRef(0);

  useEffect(() => {
    if (!isAuthenticated) {
      ensuredFor.current = null;
      ensureTries.current = 0;
      setAccount(null);
    }
  }, [isAuthenticated, setAccount]);

  useEffect(() => {
    if (accountQuery.data !== undefined && isAuthenticated) {
      setAccount(accountQuery.data);
    }
  }, [accountQuery.data, isAuthenticated, setAccount]);

  useEffect(() => {
    if (!isAuthenticated || !principal) return;
    if (accountQuery.isLoading) return;
    if (accountQuery.data) {
      ensuredFor.current = principal;
      ensureTries.current = 0;
      return;
    }
    // No account yet, or it was forgotten as idle (the canister keeps unused
    // accounts only up to a limit): open it again whenever a read comes back
    // empty, a few times at most per sign-in.
    const key = `${principal}:${accountQuery.dataUpdatedAt}`;
    if (ensuredFor.current === key || ensureTries.current >= 3) return;
    ensuredFor.current = key;
    ensureTries.current += 1;
    ensureAccount
      .mutateAsync({ referralCode: pendingReferralCode, email: null })
      .then((result) => {
        if (result.ok && result.account) {
          setAccount(result.account);
          // Kept until it links: an account opened without it (forgotten and
          // reopened) still takes it on the next opening.
          if (pendingReferralCode && result.account.referredBy) {
            setPendingReferralCode(null);
          }
        }
      })
      .catch(() => {
        ensuredFor.current = null;
      });
  }, [
    isAuthenticated,
    principal,
    accountQuery.isLoading,
    accountQuery.data,
    accountQuery.dataUpdatedAt,
    ensureAccount,
    pendingReferralCode,
    setAccount,
    setPendingReferralCode,
  ]);

  return {
    account,
    // False until the canister's account record arrives: show a placeholder,
    // not the store's default 0 credits.
    accountReady: account !== null,
    creditBalance,
    subscriptionActive,
    isAuthenticated,
    isInitializing,
    isLoggingIn,
    principal,
    login,
    logout: () => {
      // The next person on this browser must not inherit this draft, the
      // return address remembered for it, or anything cached for this
      // account (its record, campaigns, presets, admin view): a cached
      // account let the next sign-in skip creating its own.
      discardWizardDraft();
      useWizardStore.getState().reset();
      try {
        window.localStorage.removeItem(RETURN_ADDRESS_STORAGE_KEY);
      } catch {
        // Storage may be unavailable (private mode); nothing was kept then.
      }
      queryClient.removeQueries({
        predicate: (q) => q.queryKey[0] !== "actor",
      });
      clear();
    },
    refresh: accountQuery.refetch,
  };
}
