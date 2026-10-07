# Portfolio Studio

A private portfolio generator for the IM / HCI / WST assignment. React + TypeScript + Vite; Supabase Auth, PostgreSQL, and private Storage; intended hosting on Vercel.

## Current checkpoint

Implemented: home page and three template design studies; account screens; protected owner/admin workspace; portfolio information editor; atomic save/retrieve/edit integration; saved Simple preview; read-only admin list and detail; database access policies; local React and PostgreSQL tests.

The editor covers name, contact email, phone, address/location, introduction, up to ten ordered social links, and education, skills, projects, and experience (up to 30 entries each). It includes validation, unsaved-change warnings, preserved draft values after errors, duplicate-submit prevention, and stale-edit detection.

**Supabase connection values are configured locally**, and the user reports successful account, persistence, template, deletion, and recovery tests after migrations 001–004. Hosted cross-account privacy verification remains pending. Real portfolio information is never persisted to localStorage or replaced by mock success responses.

Google sign-in is implemented on both account forms, including callback session handling, cancellation feedback, and duplicate-click protection. The user configured and successfully tested the provider; see `docs/google-signin.md` for setup. Production redirects still need verification. Only basic identity access is requested; portfolio RLS policies are unchanged.

Private profile-photo selection, preview, upload, replacement, and removal are implemented. Save text changes first, then use the separate photo controls. Photos use authenticated downloads; failed cleanup is reported without claiming the old object was removed. See `docs/milestone-4.md` and `docs/admin-access.md`.

Simple, Modern, and Creative saved-data layouts and template selection are implemented. Preview choices are separate from saved choices; template saves preserve all content and photos. Admin detail displays the saved design. See `docs/milestone-5.md`.

Owner portfolio deletion with typed confirmation and durable photo cleanup is implemented. **Apply migration 004 before using it**; see `docs/milestone-6.md`.

Password recovery is implemented with email requests, validated recovery sessions, and matching new-password fields. Add the recovery redirect URL and run the manual checks in `docs/milestone-7.md` before considering hosted recovery verified.

**Still to finish:** remaining cloud verification; deployment and final documentation.

Deployment preparation and the live acceptance checklist are in `docs/deployment.md`. A read-only schema inventory is available in `supabase/tests/deployment-readiness.sql`; it does not change data or replace access-policy tests.

## Run locally

Use Node 22.12+ (or newer supported LTS) and pnpm:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

If the environment blocks Vite's development dependency optimizer, use the production preview:

```sh
pnpm build
pnpm preview --port 5173
```

## Connect Supabase

1. Create a development Supabase project.
2. Run the files in `supabase/migrations/` once in order: `001_foundation.sql`, `002_personal_information.sql`, `003_portfolio_sections.sql`, then `004_portfolio_deletion.sql`. Skip migrations already applied successfully. The first-time-setup.sql bundle includes only 001–003; run 004 after that bundle.
3. Enable email/password authentication and email confirmation. Set the password minimum to 12 characters, matching the UI.
4. Set the local Auth Site URL to `http://127.0.0.1:5173/` and allow the exact callback `http://127.0.0.1:5173/#dashboard`. At deployment, configure the production Site URL and matching production callback.
5. Copy `.env.example` to `.env.local`. Fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` using the project's URL and browser publishable key. Restart the dev server or rebuild the preview.
6. Create and confirm two test accounts. Verify each can save, refresh, retrieve, and edit only its own portfolio.
7. Run `supabase/tests/access-control.sql` in the development project's SQL editor. Fixtures are rolled back; any exception is a test failure.
8. Deliberately assign one confirmed account as admin and verify read-only access to the other account's portfolio.

All VITE values are browser-visible. Never put a secret/service-role key or database password there. `.env.local` is ignored by Git.

## Permissions

| Actor | Read | Create/edit/delete |
| --- | --- | --- |
| Signed out | None | None |
| Owner | Own records/photos | Own records/photos |
| Authorized admin | All portfolio records/photos | Own records/photos only |

Admin membership lives in the protected `private.admin_users` table, never in user-editable metadata. A trusted database operator can assign a deliberately selected, confirmed Auth user UUID:

```sql
insert into private.admin_users (user_id)
values ('REPLACE_WITH_CONFIRMED_AUTH_USER_UUID');
```

Delete that membership row to revoke access, then refresh the UI. Database policies check the role table on each request. Hiding a button is not the security boundary.

Photos use a private bucket and owner-prefixed paths. The photo UI uses authenticated downloads and explicit file cleanup. Database deletion alone does not remove Storage objects.

## Study map and data flow

- `src/App.tsx`: navigation, account screens, session lifecycle, unsaved-navigation guard.
- `src/features/portfolio/Workspace.tsx`: account permissions and owner/admin screens.
- `PortfolioEditor.tsx`: retrieves the owner's data, keeps input in React state, validates it, and submits explicit saves. Read failures block editing; save failures retain input.
- `SectionsEditor.tsx` and `sections.ts`: repeatable fields and section validation.
- `model.ts`: types and validation, including safe HTTP/HTTPS links.
- `repository.ts`: Supabase queries and the `save_portfolio_information` RPC call.
- `supabase/migrations/002_personal_information.sql`: derives the owner from `auth.uid()`, checks the revision, updates personal information and links in one transaction, and returns the saved record under RLS.
- `SimplePortfolio.tsx`: displays the confirmed saved record. Empty sections are hidden; user content is rendered as React text.
- `AdminPortfolios.tsx`: paginated read-only list and detail screen.

`003_portfolio_sections.sql` extends the atomic save to all four repeating sections. A failure rolls back the entire save. Template choice and photos are preserved. A stale revision preserves the draft and asks the user to copy needed edits before reloading the saved version.

Hash routing supports static-host refreshes without rewrite rules. Portfolio content never appears in route URLs. The homepage's three template samples remain fictional design studies until their full implementations are finished.

## Tests and review

```sh
pnpm typecheck
pnpm test
pnpm build
```

The UI tests use isolated repository mocks. Database tests execute the actual migrations in a local PGlite PostgreSQL engine with minimal stand-ins for Supabase-owned Auth/Storage schemas. **PGlite is only a test dependency**, not the production database. Hosted Auth, API access, email, and file delivery still require cloud verification.

The developer-only `/tests/review.html` fixture uses fictional, in-memory data, resets on refresh, and is excluded from the production build. It is not an authentication bypass. To bundle the fixture separately, run `node tests/build-review.mjs`; output goes to `work/editor-review-dist` in the workspace, separate from production `dist`.

See `docs/milestone-3.md` for the current test record and `docs/supabase-setup.md` for first-time setup.
