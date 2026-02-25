# Shoprunner Orders

## Auth setup (Supabase + Netlify)

This project now uses Supabase Auth in `auth.html` and a session guard in `index.html`.

### 1. Supabase Auth URL Configuration
Add these URLs in **Authentication -> URL Configuration**:

- `http://localhost:5500/auth.html`
- `http://localhost:5500/index.html`
- `https://<your-netlify-site>.netlify.app/auth.html`
- `https://<your-netlify-site>.netlify.app/app`

If you use Netlify rewrites locally (or Netlify Dev), you can also add:

- `http://localhost:5500/auth`
- `http://localhost:5500/app`

### 2. Email confirmation
Keep email confirmation enabled in Supabase (required for this flow).

### 3. Google SSO
Google SSO is feature-flagged and currently disabled:

- `SHOPRUNNER_AUTH_CONFIG.googleEnabled = false` in `scripts/shared/supabase-config.js`

Enable the provider in Supabase first, then set it to `true`.

### 4. Production redirect base
`scripts/shared/supabase-config.js` includes:

- `AUTH_REDIRECT_BASE_PLACEHOLDER = "https://<your-netlify-site>.netlify.app"`

For deployed environments the app uses the current runtime origin by default.

## Project structure

The app keeps `auth.html` and `index.html` at root for stable URLs, with feature-based assets/scripts:

- `assets/images/logo.png`
- `styles/auth.css`
- `styles/styles.css`
- `scripts/auth/auth.js`
- `scripts/dashboard/app.js`
- `scripts/dashboard/dashboard-auth.js`
- `scripts/shared/supabase-config.js`
- `scripts/shared/supabase-client.js`
- `scripts/shared/ui-text.js`
- `scripts/shared/invoice-config.js`
- `scripts/dashboard/data-service.js`
- `scripts/dashboard/invoice-renderer.js`

## Changelog automation

The in-app changelog is generated automatically from git commits during Netlify builds.

- Generator script: `scripts/changelog/generate-changelog.js`
- Generated artifact: `scripts/shared/changelog-data.js`
- Netlify build command runs the generator before publish.

### Run locally

```bash
node scripts/changelog/generate-changelog.js
```

Notes:

- Commits are grouped by date and sorted newest first.
- Commits that only touch changelog artifacts are skipped to avoid noisy self-updates.
- Each entry includes a `version` (latest commit hash for that day) used by the unread badge logic.

## Data storage (Step 3)

Orders and team members are now stored in Supabase per authenticated account:

- `public.orders`
- `public.team_members`

`localStorage` is no longer used for order/team CRUD.

### Apply migration

Run the migration to create tables, indexes, and RLS policies:

- `supabase/migrations/20260223100000_orders_team_per_account.sql`
- `supabase/migrations/20260223113000_add_invoice_identity.sql`
- `supabase/migrations/20260224103000_add_special_notes_to_orders.sql`
- `supabase/migrations/20260224120000_add_shipping_type_and_dimensions.sql`

With Supabase CLI:

1. `supabase link --project-ref ahnhbmmcrfpvkclkkmuh`
2. `supabase db push`

RLS is enabled for both tables and scoped by `auth.uid() = user_id`.

## Invoices (Step 4)

Invoices can be generated from the **Edit Order** modal using **Generate Invoice**.

- Output uses browser print dialog (save as PDF supported by browser).
- Invoice identity is persisted per order using `orders.invoice_id` and `orders.invoice_issued_at`.
- Invoice line items:
  - `Item` = purchase price
  - `Shipping` = shipping cost
  - `Handling rate` = selected margin factor (`x1.10`, `x1.15`, `x1.20`)
- Margin factor is shown in the `Handling rate` row as `x1.10`, `x1.15`, or `x1.20`.
- Orders support `Special notes` (max 500 chars) in create/edit modal.
- If provided, `Special notes` is shown on the invoice under `Bill To`.

Branding config is in:

- `scripts/shared/invoice-config.js`

Owner logo mapping can be set via:

- `SHOPRUNNER_INVOICE_CONFIG.ownerLogoByName` (fallback is `defaultLogoPath`).

## UI text configuration

Header profile/sign-out text and auth-flow feedback labels are centralized in:

- `scripts/shared/ui-text.js`

Use `window.SHOPRUNNER_UI_TEXT` to update wording without touching auth/order logic.  
Both entry pages (`auth.html`, `index.html`) load this script before feature scripts.

## Netlify routing

`netlify.toml` rewrites:

- `/` -> `auth.html`
- `/auth` -> `auth.html`
- `/app` -> `index.html`

## Shipping types (V1.4)

Orders support two shipping types:

- **Air**: `shippingCost = weightLbs * 4.5`
- **Sea**: `shippingCost = round((L * B * H / 1728) * 15)`

Sea dimensions use **inches** (L, B, H).

