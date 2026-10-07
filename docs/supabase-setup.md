# First-time Supabase setup

## 1. Create your project

Open https://supabase.com/dashboard and sign in or create an account. Choose **New project**, select your organization (create one if prompted), name the project **Portfolio Studio**, and choose a nearby region. Set a strong database password and keep it in your password manager. Wait for provisioning to finish.

## 2. Get the two browser connection values

Open the project's **Connect** panel. Copy the **Project URL** and **publishable key** (usually starts with `sb_publishable_`). API keys are also available in the project's Settings → API Keys. These are the two values the React app needs. Never use a secret/service-role key or database password in the app.

You may provide the URL and publishable key in this chat for configuration, or copy `.env.example` to `.env.local` in the project folder and fill:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

The placeholders above do not work; use your project values. `.env.local` is ignored by Git. Restart development or rebuild the preview after changing it.

## 3. Install the database structure

In Supabase's SQL Editor, create a query and run the contents of each file separately, in this order:

1. `supabase/migrations/001_foundation.sql`
2. `supabase/migrations/002_personal_information.sql`
3. `supabase/migrations/003_portfolio_sections.sql`
4. `supabase/migrations/004_portfolio_deletion.sql`

Only run migrations that have not already succeeded. If one fails, keep its error message and stop before running the next. These migrations create the tables, owner/admin policies, private photo bucket, and atomic save functions. Do not disable row-level security or make the photo bucket public.

## 4. Configure sign-in

In Authentication settings, enable email/password login and email confirmation. Set the minimum password length to 12. For the local application, use `http://127.0.0.1:5173/` as Site URL and allow `http://127.0.0.1:5173/#dashboard` as a redirect URL. The production URL will be added when deploying.

## 5. Verify together

For password recovery, add `http://127.0.0.1:5173/?auth=recovery` to Authentication → URL Configuration → Redirect URLs. Keep the existing Google and account-confirmation redirects. See `milestone-7.md` for the recovery test steps.

Create and confirm two test accounts. Save a portfolio, refresh, and edit it. Verify the second account cannot read the first account's records. Run `supabase/tests/access-control.sql` in this development project; it rolls back its test fixtures. Then deliberately assign one confirmed test account as admin using the README instructions and verify its read-only portfolio access.

The review page on port 5174 is a fictional, in-memory design fixture. Use the actual application on port 5173 for cloud verification.

Official references: [React quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs), [API keys](https://supabase.com/docs/guides/getting-started/api-keys).
