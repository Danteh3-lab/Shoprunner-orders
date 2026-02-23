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
