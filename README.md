# EZmailout.com

Direct mail campaigns without minimums. A $9/month platform membership unlocks wholesale per-piece print rates,
an AI design studio, saved audience presets and referral rewards. Fulfilment runs through the
**Click2Mail Developer REST API**; the whole backend is a single Motoko canister on the Internet Computer.

## Stack

| Layer | Tech |
| --- | --- |
| Backend | Motoko 1.8 persistent actor (`src/backend`), mo:core 2.5, enhanced-migration chain, IC HTTPS outcalls |
| Frontend | React 19 + TypeScript + Tailwind + shadcn/ui + Zustand + TanStack Router/Query + Vite (`src/frontend`) |
| Integrations | Click2Mail (documents, address lists, jobs, IMb tracking), Stripe PaymentIntents + Elements, OpenAI (DALL·E 3, GPT-4o mini), Resend key slot |

## Product ledger (Click2Mail catalog, 100%–140% margin spread)

| Layout (Click2Mail document class) | Click2Mail base | EZmailout retail | Margin |
| --- | --- | --- | --- |
| Postcard 3.5 x 5 / 4.25 x 6 (First-Class) | $0.55 | **$1.15** | 109% |
| Postcard 4 x 9 / 5 x 8 / 6 x 9 (Marketing Mail) | $0.57 | **$1.35** | 136% |
| Postcard 6 x 11 | $0.73 | **$1.65** | 126% |
| Letter 8.5 x 11 (#10 double window) | $0.70 | **$1.50** | 114% |
| Letter 8.5 x 14 (#10 double window) | $0.80 | **$1.70** | 112% |
| Flyer 8.5 x 11 (bifold) / Brochure 11 x 8.5 (trifold) | $0.95 | **$2.10** | 121% |
| Secure Self Mailer 8.5 x 11 | $0.85 | **$1.95** | 129% |
| Booklet Self Mailer 8.5 x 11 | $1.60 | **$3.60** | 125% |

Legacy layout keys (`4x6`, `6x18_bifold`, `11x17_trifold`, `8.5x11_perforated`, `multi_page`) resolve to the
current rows in both the canister and the frontend.

Authoritative copy: `src/backend/lib/pricing.mo` (mirrored in `src/frontend/src/lib/pricing.ts`).

## AI credits

1 credit = $0.01. Copy assistant 1 credit · square art 7 · widescreen 14 · HD widescreen 20.
Packs: Starter $5 → 500, Growth $15 → 1,600 (+100 bonus), Agency $35 → 4,000 (+500 bonus).
Active members receive 50 credits on every activation/renewal. See `src/backend/lib/credits.mo`.

## Referral program

Every account gets `https://ezmailout.com/ref/{code}`. When a referred user makes their first payment
(membership or campaign) the referrer earns one free month ($9 credit), redeemable at the next renewal,
as long as the referrer's membership is active.

## Campaign flow

1. **Product** – pick a format (all prices from the ledger).
2. **Audience** – radius map (EDDM-style estimate), CSV upload with Click2Mail CASS verification, or a saved preset (re-run / prune / save as new).
3. **Design** – side-by-side 2D editor + live 3D preview, AI Studio (backgrounds + copywriter), dynamic QR codes (`https://ezmailout.com/t/{recipientId}`).
4. **Review & Pay** – pre-flight checks, Stripe Elements checkout, then `dispatchClick2MailJob` uploads the 300 DPI PDF, submits the address list and job. Tracking is polled every 6 hours and can be pushed via the webhook.

## Admin

`/admin` (first signed-in caller claims the admin slot; canister controllers are always admins):
Click2Mail username/password + environment, Stripe secret + publishable key, Resend key, OpenAI key,
webhook secret, optional IPv6 outcall proxy, sandbox checkout toggle.

Webhook: `POST https://<backend-canister>.icp0.io/webhooks/click2mail` with header `x-ezmailout-secret`.
Payload JSON: `{ "campaignId" | "jobId", "event" | "status", "eventId"?, "timestamp"? }`.

## Development

```bash
# frontend
cd src/frontend && pnpm install --prefer-offline && pnpm typecheck && pnpm check && pnpm build
# backend
cd src/backend && mops install && mops check && mops build
# bindings (root)
pnpm bindgen
```

Generated files (`src/frontend/src/backend.ts`, `backend.d.ts`, `declarations/`) are regenerated from the compiled
candid; do not hand-edit them.
