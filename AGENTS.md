# Project Guidance

## User Preferences

[No preferences yet]

## Verified Commands

**Frontend** (run from `src/frontend/`):

- **install**: `pnpm install --prefer-offline`
- **typecheck**: `pnpm typecheck`
- **lint fix**: `pnpm fix`
- **build**: `pnpm build`

**Backend** (run from `src/backend/`):

- **install**: `mops install`
- **typecheck**: `mops check --fix`
- **build**: `mops build`

**Backend and frontend integration** (run from root):

- **generate bindings**: `pnpm bindgen` This step is necessary to ensure the frontend can call the backend methods.

## Learnings

- Product name is **EZmailout** (EZmailout.com). Fulfilment runs exclusively through the Click2Mail REST API; the previous print vendor integration was removed.
- Backend stable state is initialised only by the migration chain in `src/backend/migrations` (moc `--enhanced-migration`). Every new stable field needs a new dated migration whose `OldActor` equals the previous `NewActor`; module-level constants inside mixins must be `transient`.
- moc flags promote dot-notation (M0236) and redundant type args (M0223) to errors: call `caller.toText()`, `text.toLower()`, `r.toShared()` etc.; `Int.compare(a, b)` stays explicit.
- Public API stays bindgen-friendly: records with optional fields, payload-less variants, result records `{ ok; error }` — no `Result`, tuples (except the HTTP gateway types) or variants with payloads.
- `src/frontend/src/backend.ts`, `backend.d.ts` and `declarations/` are generated from the compiled candid — never hand-edit.
- Pricing/credit constants live in `src/backend/lib/pricing.mo` + `lib/credits.mo` and are mirrored in `src/frontend/src/lib/pricing.ts` + `lib/credits.ts`; change both.
- Catalog: `src/frontend/src/lib/catalog.ts` lists the 14 Click2Mail families; `lib/pricing.ts` (`ProductSpec`, dollars) and `src/backend/lib/pricing.mo` (cents) hold the 29 authoritative rows and must be changed together. `documentClass` is the exact Click2Mail product name and `widthInches`/`heightInches` follow that name's order. Legacy keys (`4x6`, `6x18_bifold`, `11x17_trifold`, `8.5x11_perforated`, `multi_page`) are aliased in `PricingLib.normalizeVariant` and `lib/pricing.ts` — never remove the aliases, older campaign records still carry them. `ProductType` keeps `#SelfMailer`/`#SnapPack` for old records; widening a variant used inside a stable `Map` needs an explicit migration (see `migrations/20260922_000000_Click2MailCatalog.mo`) because mutable fields are invariant.
- `ProductSpec.hasAddressBlock` drives the studio's USPS IMb clear zone: true only where the address is printed on the artwork the customer designs, false for envelope-inserted formats (letters, certified letter, priority, reply letter, notecards) where Click2Mail generates the address page or envelope.
- Mail class: products with several supported classes expose chips in the Step 1 accordion; the pick is stored in `wizard.selectedSpec.mailClass` and sent as the optional `CreateCampaignInput.mailClass`, which `PricingLib.printSpecFor` validates against `supportedMailClasses` before it reaches the Click2Mail job. `StandardMarketing` in the catalog is the wire enum's `#MarketingMail`.
- Brand system (DESIGN.md): Geist / Geist Mono self-hosted in `public/assets/fonts`, indigo `--primary` (#6366f1) is the only CTA colour, `--accent` is the pale ice tint (never use `bg-accent` for a CTA), buttons and badges are pills. Print guides are inch-based (`lib/printSpec.ts`: cut 0″, bleed ⅛″ outside the artboard, safe ¼″).
- Layout presets (`src/frontend/src/lib/layouts.ts`) size every band through `lib/textFit.ts`, never by hand. `textBlockStyle` renders at `line-height: 1.2` with 2px padding on a border-box element, and Geist's glyph content area is taller than 1.2em, so a band budgeted as `fontSize * n` overflows: use `bandHeight(lines, spec)` (it adds the measured glyph spill) and `fitFontSize` to cap a headline at a line count. Blocks stack from the measured height of the block above, so a preset never depends on the artboard's aspect.
- Physical behaviour of each format lives in `src/frontend/src/lib/physical.ts`, keyed off `ProductSpec.layout` (the Click2Mail production layout) rather than the category, and is drawn by `components/canvas/PhysicalOverlay.tsx` in both the 2D artboard and the 3D proof: creases, pressure-seal tear strips, saddle-stitch spine, #10 window cuts and card-vs-paper stock. It is frontend-only presentation — no ledger or candid change, so no migration.
- Campaign access goes through `CampaignLib.isOwnedBy` (+ `AdminLib.isAdmin`, which includes controllers). Records migrated from the pre-EZmailout ledger have `ownerId == ""` and are admin-only — never treat an empty owner as "anyone". Every per-campaign query binds `({ caller })` and traps with `CampaignLib.accessDenied`, the same message for an unknown and a foreign id, so ids (sequential `cmp_N`) cannot be probed. `({ caller })` does not change candid.
- `dispatchClick2MailJob` is guarded by the transient `dispatchInFlight` set, taken before the first `await` and released in `finally` (which also runs when a continuation traps). It is transient on purpose: nothing is in flight across an upgrade, so a persisted flag could only ever strand a campaign. The run sets `#Processing` before suspending and must end in `#Submitted` or `#Failed`; `finally` turns any other end state into `#Failed`.
- Outcall-spending jobs must not be public. The 6-hourly timer in `main.mo` calls the production mixin's *private* `pollActiveCampaigns()` directly — a mixin's private functions are callable from the actor body — while the public `pollActiveTracking` is a controller/admin-only manual trigger. Timers cannot be registered inside a mixin (no `system` capability), so they stay in `main.mo`.
- Stampy mascot: `src/frontend/src/components/stampy/` holds seven components generated from the source SVGs (C2PA metadata stripped, attributes camel-cased, pixel-identical to the source at 4x). Clip-path/gradient ids are prefixed per instance with `useStampyId()`; pass `title` for an accessible name, omit it for decoration (`aria-hidden`). The thinking avatar's dots sit alone in `.stampy-dots` so the `:nth-of-type` delays in `index.css` count them 1–3.
- Studio shapes are SVG data-URL logo layers (`lib/shapes.ts`, `data-ez-shape` marker) — no new canvas schema; templates live in `lib/templates.ts` and are shared by the gallery page and the studio Templates drawer.
