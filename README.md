# EZmailout.com

Direct mail campaigns without minimums: every price includes printing and postage, and volume prices drop from 1,000
pieces. An optional $9 membership (a 30-day pass, never renewed automatically) prices small batches at the 10,000-piece
rate and adds AI credits with each pass and referral rewards. Printing and mailing run through our
print partner's REST API; the whole backend is a single Motoko canister on the Internet Computer.

## Stack

| Layer | Tech |
| --- | --- |
| Backend | Motoko 1.8 persistent actor (`src/backend`), mo:core 2.5, enhanced-migration chain, IC HTTPS outcalls |
| Frontend | React 19 + TypeScript + Tailwind + shadcn/ui + Zustand + TanStack Router/Query + Vite (`src/frontend`) |
| Integrations | Print fulfilment (documents, address lists, jobs, IMb tracking), Stripe PaymentIntents + Elements, OpenAI (DALL·E 3, GPT-4o mini), Resend key slot |

## Product ledger — the print catalog

14 product families, 29 document classes. `documentClass` is the exact print product name and the trim size
follows it (`Postcard 4 x 9` is 4″ wide by 9″ tall).

| Family | Print document class | Trim | Cost | Rate (under 1,000) | Volume prices | Mail class |
| --- | --- | --- | ---: | ---: | --- | --- |
| Postcards | `Postcard 3.5 x 5` | 3.5″ × 5″ | $0.53 | **$1.10** | — | First-Class |
| Postcards | `Postcard 4.25 x 6` | 4.25″ × 6″ | $0.55 | **$0.79** | 1,000+: $0.71 · 10,000+: $0.62 · 50,000+: $0.58 | First-Class |
| Postcards | `Postcard 4 x 9` | 4″ × 9″ | $0.55 | **$1.20** | — | First-Class |
| Postcards | `Postcard 5 x 8` | 5″ × 8″ | $0.54 | **$1.25** | — | First-Class |
| Postcards | `Postcard 6 x 9` | 6″ × 9″ | $0.57 | **$0.98** | 1,000+: $0.72 · 10,000+: $0.68 · 50,000+: $0.65 | Marketing Mail / First-Class |
| Postcards | `Postcard 6 x 11` | 6″ × 11″ | $0.73 | **$0.92** | 1,000+: $0.83 · 10,000+: $0.77 | Marketing Mail / First-Class |
| Letters | `Letter 8.5 x 11` | 8.5″ × 11″ | $0.59 | **$0.93** | 1,000+: $0.81 · 10,000+: $0.74 · 50,000+: $0.69 | First-Class |
| Letters | `Letter 8.5 x 14` | 8.5″ × 14″ | $0.61 | **$1.65** | — | First-Class |
| Certified Mail™ | `Certified Self Mailer 8.5 x 11` | 8.5″ × 11″ | $6.45 | **$12.90** | — | First-Class |
| Certified Mail™ | `Certified Letter 8.5 x 11` | 8.5″ × 11″ | $6.66 | **$13.50** | — | First-Class |
| Certified Mail™ | `Certified Self Mailer With Green Card` | 8.5″ × 11″ | $11.04 | **$22.00** | — | First-Class |
| Every Door Direct Mail (EDDM®) | `EDDM® Mailer 6.5 x 9` | 6.5″ × 9″ | $0.15 | **$0.66** | — | Marketing Mail |
| Every Door Direct Mail (EDDM®) | `EDDM® Mailer 8.5 x 11` | 8.5″ × 11″ | $0.16 | **$0.68** | — | Marketing Mail |
| Every Door Direct Mail (EDDM®) | `EDDM® Mailer 6.25 x 11` | 6.25″ × 11″ | $0.17 | **$0.71** | — | Marketing Mail |
| Every Door Direct Mail (EDDM®) | `EDDM® Mailer 8.5 x 12` | 8.5″ × 12″ | $0.22 | **$0.81** | — | Marketing Mail |
| Priority Mail® Plus | `Priority Letter 8.5 x 11` | 8.5″ × 11″ | $11.66 | **$22.50** | — | Priority |
| Priority Mail® Express | `Priority Mail® Express Letters 8.5 x 11` | 8.5″ × 11″ | $32.06 | **$55.00** | — | Priority Express |
| Flyers | `Flyer 8.5 x 11` | 8.5″ × 11″ | $0.57 | **$1.45** | — | Marketing Mail / First-Class |
| Brochures | `Brochure 11 x 8.5` | 11″ × 8.5″ | $1.07 | **$1.32** | 1,000+: $1.12 | Marketing Mail / First-Class |
| Secure Mailers | `Secure Self Mailer 8.5 x 11` | 8.5″ × 11″ | $0.58 | **$1.95** | — | First-Class |
| Notecards | `Notecard 4.25 x 5.5` | 4.25″ × 5.5″ | $0.87 | **$1.85** | — | First-Class |
| Notecards | `Folded Notecard 4.25 x 5.5` | 4.25″ × 5.5″ | $1.04 | **$2.25** | — | First-Class |
| Rack Cards | `Rack Card 4 x 9` | 4″ × 9″ | $0.55 | **$1.25** | — | First-Class |
| Reply Mail | `Reply Postcard 4.25 x 6` | 4.25″ × 6″ | $0.64 | **$1.50** | — | First-Class |
| Reply Mail | `Reply Letter 8.5 x 11` | 8.5″ × 11″ | $0.65 | **$1.60** | — | First-Class |
| Booklets | `Booklet Self Mailer 8.5 x 11` | 8.5″ × 11″ | $0.74 | **$2.10** | — | Marketing Mail |
| Booklets | `Booklet Address Front Page 8.5 x 11` | 8.5″ × 11″ | $1.62 | **$3.60** | — | Marketing Mail |
| Booklets | `Booklet Address Back Page 8.5 x 11` | 8.5″ × 11″ | $1.62 | **$3.60** | — | Marketing Mail |
| Card Stock | `Card Stock Paper 12 x 4.5` | 12″ × 4.5″ | $0.65 | **$1.65** | — | Marketing Mail |

Rates are per piece and include printing and postage, generated from `PRICING_LEDGER` (`src/frontend/src/lib/pricing.ts`,
mirrored in `src/backend/lib/pricing.mo`). Volume prices apply from the quantity shown; a live member pays at most the
10,000-piece rate on those five formats, and no price sells under cost + 1¢ a piece once the card fee (2.9% + 30¢)
is paid: the percentage sets the per-piece floor, and an order of only a few pieces of a thin-margin format is priced a
little higher so it also covers the fixed 30¢ (a single 4.25x6 postcard is $0.89, members included; the lift reaches a
few hundred pieces only for a member's First-Class 6x11 or brochure, at 1¢ a piece). EDDM® prices include USPS EDDM Retail
saturation postage ($0.26 a piece; the Cost column is print only). The 6x9 and 6x11 postcards and the brochure are priced
for Marketing Mail; First-Class adds $0.24 a piece. An order is at most $999,999.99 (and at least $0.50, the smallest card charge,
which the floor already keeps every order above).

Costs and member prices are final. The spread is deliberate retail positioning — standardised letter pricing,
carrier cost absorbed on Priority Mail® Express to stay competitive, and higher margin on self-mailers — so nothing
in the app derives a price from a target band or warns about one. `marginPercent` and `marginOutliers()` in
`src/frontend/src/lib/pricing.ts` exist for internal analytics only.

Products supporting more than one mail class expose it as a chip in the size accordion; the choice rides through
`CreateCampaignInput.mailClass` and lands in the stored `printSpec`. Legacy layout keys (`4x6`, `6x18_bifold`,
`11x17_trifold`, `8.5x11_perforated`, `multi_page`) resolve to the current rows in both the canister and the
frontend, and `LEGACY_DOCUMENT_CLASSES` records the three renamed product strings for auditing older campaigns.

## AI credits

1 credit = $0.01. Copy assistant 1 credit · square art 7 · widescreen 14 · HD widescreen 20.
Packs: Starter $5 → 500, Growth $15 → 1,600 (+100 bonus), Agency $35 → 4,000 (+500 bonus).
Members receive 50 credits each time they activate or renew the 30-day membership. See `src/backend/lib/credits.mo`.

## Referral program

Every account gets `https://ezmailout.com/ref/{code}`. When a referred user makes their first payment
(membership or campaign) the referrer earns one free month, used the next time they renew (the 30-day pass at no charge),
as long as the referrer's membership is active when the referred payment is confirmed.

## Campaign flow

1. **Product** – pick a format (all prices from the ledger).
2. **Audience** – radius map (EDDM-style estimate), CSV upload with CASS verification, or a saved preset (re-run / prune / save as new).
3. **Design** – Canva-style studio: tool rail (Templates · Elements · Text · Uploads · Brand · QR · AI Studio · Layers), true-to-scale artboard with cut / ⅛″ bleed / ¼″ safe guides and the USPS IMb zone, floating align/depth toolbar, live 3D proof, dynamic QR codes (`https://ezmailout.com/t/{recipientId}`).
4. **Review & Pay** – pre-flight checks, Stripe Elements checkout, then `dispatchPrintJob` uploads the 300 DPI PDF, submits the address list and job. Tracking is polled every 6 hours and can be pushed via the webhook.

## Admin

`/admin` (canister controllers are always admins and assign the one admin principal):
print fulfilment API username/password + environment, Stripe secret + publishable key, Resend key, OpenAI key,
webhook secret, optional https outcall proxy, sandbox checkout toggle. Keys are stored in the canister and only
ever shown masked (last 4 characters) to the admin and controllers.

Webhook: `POST https://<backend-canister>.icp0.io/webhooks/fulfilment` with header `x-ezmailout-secret`
(header only: a `?secret=` in the URL is refused, since URLs end up in proxy and gateway logs)
(the original `/webhooks/click2mail` path is still accepted for webhooks configured before the rename).
Payload JSON: `{ "campaignId" | "jobId", "event" | "status", "eventId"?, "timestamp"? }`.

## Development

```bash
# frontend
cd src/frontend && pnpm install --prefer-offline && pnpm typecheck && pnpm check && pnpm build
# backend
cd src/backend && mops install && mops check && mops build
# bindings (root)
pnpm bindgen
# backend integration tests in PocketIC: keys, every HTTPS outcall, queues, load, upgrade (root)
scripts/test-backend.sh            # or: scripts/test-backend.sh keys dispatch upgrade
```

Generated files (`src/frontend/src/backend.ts`, `backend.d.ts`, `declarations/`) are regenerated from the compiled
candid; do not hand-edit them.
