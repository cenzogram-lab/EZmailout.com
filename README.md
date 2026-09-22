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

## Product ledger — the Click2Mail catalog

14 product families, 29 document classes. `documentClass` is the exact Click2Mail product name and the trim size
follows it (`Postcard 4 x 9` is 4″ wide by 9″ tall).

| Family | Click2Mail document class | Trim | Cost | Retail | Margin | Mail class |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Postcards | `Postcard 3.5 x 5` | 3.5″ × 5″ | $0.53 | **$1.10** | 108% | First-Class |
| Postcards | `Postcard 4.25 x 6` | 4.25″ × 6″ | $0.55 | **$1.15** | 109% | First-Class |
| Postcards | `Postcard 4 x 9` | 4″ × 9″ | $0.55 | **$1.20** | 118% | First-Class |
| Postcards | `Postcard 5 x 8` | 5″ × 8″ | $0.54 | **$1.25** | 131% | First-Class |
| Postcards | `Postcard 6 x 9` | 6″ × 9″ | $0.57 | **$1.35** | 137% | Standard / First-Class |
| Postcards | `Postcard 6 x 11` | 6″ × 11″ | $0.73 | **$1.65** | 126% | Standard / First-Class |
| Letters | `Letter 8.5 x 11` | 8.5″ × 11″ | $0.59 | **$1.50** | 154% | First-Class |
| Letters | `Letter 8.5 x 14` | 8.5″ × 14″ | $0.61 | **$1.65** | 170% | First-Class |
| Certified Mail™ | `Certified Self Mailer 8.5 x 11` | 8.5″ × 11″ | $6.45 | **$12.90** | 100% | First-Class |
| Certified Mail™ | `Certified Letter 8.5 x 11` | 8.5″ × 11″ | $6.66 | **$13.50** | 103% | First-Class |
| Certified Mail™ | `Certified Self Mailer With Green Card` | 8.5″ × 11″ | $11.04 | **$22.00** | 99% | First-Class |
| EDDM® | `EDDM® Mailer 6.5 x 9` | 6.5″ × 9″ | $0.15 | **$0.40** | 167% | Standard |
| EDDM® | `EDDM® Mailer 8.5 x 11` | 8.5″ × 11″ | $0.16 | **$0.42** | 162% | Standard |
| EDDM® | `EDDM® Mailer 6.25 x 11` | 6.25″ × 11″ | $0.17 | **$0.45** | 165% | Standard |
| EDDM® | `EDDM® Mailer 8.5 x 12` | 8.5″ × 12″ | $0.22 | **$0.55** | 150% | Standard |
| Priority Mail® Plus | `Priority Letter 8.5 x 11` | 8.5″ × 11″ | $11.66 | **$22.50** | 93% | Priority |
| Priority Mail® Express | `Priority Mail® Express Letters 8.5 x 11` | 8.5″ × 11″ | $32.06 | **$55.00** | 72% | Priority Express |
| Flyers | `Flyer 8.5 x 11` | 8.5″ × 11″ | $0.57 | **$1.45** | 154% | Standard / First-Class |
| Brochures | `Brochure 11 x 8.5` | 11″ × 8.5″ | $1.07 | **$2.25** | 110% | Standard / First-Class |
| Secure Mailers | `Secure Self Mailer 8.5 x 11` | 8.5″ × 11″ | $0.58 | **$1.95** | 236% | First-Class |
| Notecards | `Notecard 4.25 x 5.5` | 4.25″ × 5.5″ | $0.87 | **$1.85** | 113% | First-Class |
| Notecards | `Folded Notecard 4.25 x 5.5` | 4.25″ × 5.5″ | $1.04 | **$2.25** | 116% | First-Class |
| Rack Cards | `Rack Card 4 x 9` | 4″ × 9″ | $0.55 | **$1.25** | 127% | First-Class |
| Reply Mail | `Reply Postcard 4.25 x 6` | 4.25″ × 6″ | $0.64 | **$1.50** | 134% | First-Class |
| Reply Mail | `Reply Letter 8.5 x 11` | 8.5″ × 11″ | $0.65 | **$1.60** | 146% | First-Class |
| Booklets | `Booklet Self Mailer 8.5 x 11` | 8.5″ × 11″ | $0.74 | **$2.10** | 184% | Standard |
| Booklets | `Booklet Address Front Page 8.5 x 11` | 8.5″ × 11″ | $1.62 | **$3.60** | 122% | Standard |
| Booklets | `Booklet Address Back Page 8.5 x 11` | 8.5″ × 11″ | $1.62 | **$3.60** | 122% | Standard |
| Card Stock | `Card Stock Paper 12 x 4.5` | 12″ × 4.5″ | $0.65 | **$1.65** | 154% | Standard |

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
