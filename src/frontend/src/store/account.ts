import type { UserAccountShared } from "@/backend";
import { create } from "zustand";

const REF_KEY = "ez_ref";

function readStoredReferral(): string | null {
  try {
    return window.localStorage.getItem(REF_KEY);
  } catch {
    return null;
  }
}

interface AccountStore {
  account: UserAccountShared | null;
  creditBalance: number;
  subscriptionActive: boolean;
  topUpOpen: boolean;
  pendingReferralCode: string | null;
  setAccount: (account: UserAccountShared | null) => void;
  setCreditBalance: (balance: number | bigint) => void;
  setTopUpOpen: (open: boolean) => void;
  setPendingReferralCode: (code: string | null) => void;
}

export const useAccountStore = create<AccountStore>()((set) => ({
  account: null,
  creditBalance: 0,
  subscriptionActive: false,
  topUpOpen: false,
  pendingReferralCode: readStoredReferral(),
  setAccount: (account) =>
    set({
      account,
      creditBalance: account ? Number(account.creditBalance) : 0,
      subscriptionActive: account ? account.subscriptionActive : false,
    }),
  setCreditBalance: (balance) => set({ creditBalance: Number(balance) }),
  setTopUpOpen: (topUpOpen) => set({ topUpOpen }),
  setPendingReferralCode: (code) => {
    try {
      if (code) window.localStorage.setItem(REF_KEY, code);
      else window.localStorage.removeItem(REF_KEY);
    } catch {
      // storage unavailable (private mode); keep in memory only
    }
    set({ pendingReferralCode: code });
  },
}));
