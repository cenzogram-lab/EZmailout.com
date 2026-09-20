import { CreditPack } from "@/backend";

/** 1 AI credit = 1 cent. Mirrors `src/backend/lib/credits.mo`. */
export const CREDIT_VALUE_CENTS = 1;

/** Credit cost of each AI action. */
export const AI_COSTS = {
  copy: 1,
  squareImage: 7,
  wideImage: 14,
  hdImage: 20,
} as const;

export interface CreditPackUi {
  id: CreditPack;
  name: string;
  priceCents: number;
  credits: number;
  bonus: number;
}

export const CREDIT_PACKS: CreditPackUi[] = [
  {
    id: CreditPack.Starter,
    name: "Starter Pack",
    priceCents: 500,
    credits: 500,
    bonus: 0,
  },
  {
    id: CreditPack.Growth,
    name: "Growth Pack",
    priceCents: 1500,
    credits: 1600,
    bonus: 100,
  },
  {
    id: CreditPack.Agency,
    name: "Agency Pack",
    priceCents: 3500,
    credits: 4000,
    bonus: 500,
  },
];

/** Credits granted on every subscription activation / renewal. */
export const MONTHLY_ALLOWANCE = 50;

/** Converts a credit amount to its USD value (e.g. 500 → 5). */
export function creditsToUsd(credits: number | bigint): number {
  return (Number(credits) * CREDIT_VALUE_CENTS) / 100;
}

/** Finds a pack by id. */
export function getCreditPack(id: CreditPack): CreditPackUi | undefined {
  return CREDIT_PACKS.find((pack) => pack.id === id);
}
