# Deployment and final verification

## Current status

Prepared locally; no site has been published by this phase. The owner reports that portfolio saving, templates, deletion after migration 004, and password recovery work. Automated verification: 56 UI/service tests and 19 local database subtests passed (20 including the enclosing database test). Live cross-account access checks remain pending. The existing production build passes, with a non-blocking bundle-size advisory.

## Before publishing

1. Run `supabase/tests/deployment-readiness.sql` in Supabase SQL Editor. It only reads configuration, returns PASS/CHECK REQUIRED rows, and makes no changes. All 13 rows should pass. It cannot verify email delivery, redirect URLs, or complete policy behavior.
2. For hosted policy assertions, the separate `supabase/tests/access-control.sql` creates fictional fixtures in a transaction and rolls them back. Run the entire script in the development project; expect the final assertions-passed message. If it fails, retain the error and do not disable RLS to make it pass.
3. Use two ordinary test accounts and your admin account. Record results in the checklist below.

## Repository and Vercel setup

Use only the `portfolio-generator` folder as the repository root. Do not upload the surrounding workspace, screenshots containing credentials, or `.env.local`. The repository includes `.env.example`, source, migrations, tests, docs, and the lockfile. A private GitHub repository is appropriate; a Vercel site can still be reachable publicly while its repository remains private.

Import that repository into Vercel after accounts are ready. Review these settings:

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Root directory | Repository root (`.`) if only portfolio-generator was uploaded |
| Build command | `pnpm build` |
| Output directory | `dist` |
| Install command | `pnpm install --frozen-lockfile` |
| Node version | 22.x, matching Vite's supported Node 22.12+ requirement |

Set these build environment variables for Production:

```text
VITE_SUPABASE_URL=<your Supabase project URL>
VITE_SUPABASE_PUBLISHABLE_KEY=<your publishable key>
```

Use the existing project values from your local environment. These two values are browser-visible by design. Never add a service-role key, database password, or Google client secret. Vite embeds the values at build time, so changes require a new deployment. `.vercelignore` excludes local environment files from CLI uploads; Git ignores them separately.

The Vercel configuration includes security headers. Hash routes (`#dashboard`, `#signin`) do not need SPA path rewrites. Publish `dist` only; developer test fixtures must not be in that output.

## Once a stable production URL is assigned

Replace `https://YOUR-SITE.vercel.app` below with the actual URL. In Supabase Authentication → URL Configuration:

- Set Site URL to `https://YOUR-SITE.vercel.app/`.
- Add `https://YOUR-SITE.vercel.app/#dashboard` (email confirmation).
- Add `https://YOUR-SITE.vercel.app/?auth=google` (Google return).
- Add `https://YOUR-SITE.vercel.app/?auth=recovery` (password reset).
- Keep local redirects for local development. Avoid broad wildcard redirects to arbitrary preview deployments.

Google's authorized redirect remains the Supabase callback, `https://betdprtlcmoqhchdjqyn.supabase.co/auth/v1/callback`. The app returns from Supabase to the allowed site URL. Check the Google consent audience/test-user setting before asking classmates to sign in; development test-user restrictions may still apply.

## Live acceptance record

Use fictional portfolio contents for testing. Do not publish passwords or session tokens in test evidence.

| Check | Expected | Status |
| --- | --- | --- |
| Signed-out `#dashboard` and `#admin` | Sign-in gate, no personal contents | Pending |
| Ordinary account A | Save, refresh, edit only A's portfolio | Pending hosted privacy check |
| Ordinary account B | Sees B's workspace, no A records; admin route denied | Pending |
| Admin account | Read all portfolios/photos; no controls to edit other owners | Pending |
| Hosted policy assertions | SQL test passes and rolls fixtures back | Pending |
| Private photo URL without authorization | No downloadable photo | Pending |
| Email confirmation and Google | Return to stable production domain | Pending deployment |
| Password reset | New password works; Back to sign in signs out | Local user verification passed; production pending |
| Disposable portfolio deletion | Removes portfolio, preserves account, cleanup completes | Local user verification passed; production pending |
| Mobile and keyboard | Form labels, visible focus, usable buttons, no horizontal overflow | Final production check pending |

If the release fails, use Vercel's previous known-good deployment if available. Do not drop database tables or rerun the initial migrations as a recovery step. A frontend rollback does not roll back database changes.

Official references: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Vercel environment variables](https://vercel.com/docs/environment-variables), [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
