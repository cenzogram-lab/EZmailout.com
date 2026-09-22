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
- Catalog layout keys follow the Click2Mail document classes: `3.5x5`, `4.25x6`, `4x9`, `5x8`, `6x9`, `6x11`, `letter`, `letter_legal`, `8.5x11_flyer`, `11x8.5_brochure`, `8.5x11_secure`, `8.5x11_booklet`. Legacy keys (`4x6`, `6x18_bifold`, `11x17_trifold`, `8.5x11_perforated`, `multi_page`) are aliased in `PricingLib.normalizeVariant` and `lib/pricing.ts` — never remove the aliases, older campaign records still carry them.
- Brand system (DESIGN.md): Geist / Geist Mono self-hosted in `public/assets/fonts`, indigo `--primary` (#6366f1) is the only CTA colour, `--accent` is the pale ice tint (never use `bg-accent` for a CTA), buttons and badges are pills. Print guides are inch-based (`lib/printSpec.ts`: cut 0″, bleed ⅛″, safe ¼″).

