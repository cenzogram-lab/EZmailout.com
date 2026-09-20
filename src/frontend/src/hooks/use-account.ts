import { useEnsureAccount, useMyAccount } from "@/hooks/use-backend";
import { useAccountStore } from "@/store/account";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
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

  useEffect(() => {
    if (!isAuthenticated) {
      ensuredFor.current = null;
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
    if (ensuredFor.current === principal) return;
    if (accountQuery.data) {
      ensuredFor.current = principal;
      return;
    }
    ensuredFor.current = principal;
    ensureAccount
      .mutateAsync({ referralCode: pendingReferralCode, email: null })
      .then((result) => {
        if (result.ok && result.account) {
          setAccount(result.account);
          if (pendingReferralCode) setPendingReferralCode(null);
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
    ensureAccount,
    pendingReferralCode,
    setAccount,
    setPendingReferralCode,
  ]);

  return {
    account,
    creditBalance,
    subscriptionActive,
    isAuthenticated,
    isInitializing,
    isLoggingIn,
    principal,
    login,
    logout: clear,
    refresh: accountQuery.refetch,
  };
}
