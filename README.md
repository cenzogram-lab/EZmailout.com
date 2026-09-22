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

Fourteen Click2Mail product families, 29 sizes. `documentClass` is the exact Click2Mail product name; base costs marked
† reuse the closest priced tier until the Click2Mail rate card confirms them.

| Family | Click2Mail document classes | Base → retail |
| --- | --- | --- |
| Postcards | Postcard 3.5 x 5†, 4.25 x 6 · 4 x 9†, 5 x 8†, 6 x 9 · 6 x 11 | $0.55 → **$1.15** · $0.57 → **$1.35** · $0.73 → **$1.65** |
| Letters | Letter 8.5 x 11 · Letter 8.5 x 14† | $0.70 → **$1.50** · $0.80 → **$1.70** |
| Certified Mail™ | Certified Self Mailer 8.5 x 11† · With Green Card† · Certified Letter 8.5 x 11† | $8.95 → **$17.95** · $12.95 → **$25.95** · $9.25 → **$18.50** |
| EDDM® | EDDM® Mailer 6.25 x 11† · 6.5 x 9† · 8.5 x 11† · 8.5 x 12† | $0.45 → **$0.95** · $0.43 → **$0.90** · $0.48 → **$0.99** · $0.52 → **$1.09** |
| Priority Mail® Plus / Express | Priority Letter 8.5 x 11† · Priority Mail® Express Letters 8.5 x 11† | $9.95 → **$19.95** · $29.95 → **$59.95** |
| Flyers / Brochures | Flyer 8.5 x 11 · Brochure 11 x 8.5 | $0.95 → **$2.10** |
| Secure Mailers | Secure Self Mailer 8.5 x 11 | $0.85 → **$1.95** |
| Notecards | Notecard 4.25 x 5.5† · Folded Notecard 4.25 x 5.5† | $0.62 → **$1.30** · $0.85 → **$1.80** |
| Rack Cards | Rack Card 4 x 9† | $0.57 → **$1.35** |
| Reply Mail | Reply Postcard 4.25 x 6† · Reply Letter 8.5 x 11† | $0.75 → **$1.60** · $0.95 → **$2.00** |
| Booklets | Booklet Self Mailer 8.5 x 11 · Address Back Page† · Address Front Page† | $1.60 → **$3.60** · $1.75 → **$3.85** |
| Card Stock | Card Stock Paper 12 x 4.5† | $0.60 → **$1.30** |

Legacy layout keys (`4x6`, `6x18_bifold`, `11x17_trifold`, `8.5x11_perforated`, `multi_page`) resolve to the
current rows in both the canister and the frontend. `ProductType` keeps `#SelfMailer` / `#SnapPack` for records
created before flyers, brochures and secure mailers became their own families.

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
3. **Design** – Canva-style studio: tool rail (Templates · Elements · Text · Uploads · Brand · QR · AI Studio · Layers), true-to-scale artboard with cut / ⅛″ bleed / ¼″ safe guides and the USPS IMb zone, floating align/depth toolbar, live 3D proof, dynamic QR codes (`https://ezmailout.com/t/{recipientId}`).
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
