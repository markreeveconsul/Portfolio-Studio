# Milestone 7 — Password recovery

## Setup

No SQL migration is required. In Supabase Authentication → URL Configuration → Redirect URLs, add this exact URL and save:

`http://127.0.0.1:5173/?auth=recovery`

Keep existing redirects. Continue opening the app on 127.0.0.1:5173; localhost or another port needs a separate allowed redirect. Add the deployed site's equivalent URL during deployment. Keep the default recovery email template pointing at Supabase's ConfirmationURL; custom templates need separate verification.

## Flow and limits

Sign in → Forgot password → enter email → Send reset link. Requests use `resetPasswordForEmail` and a neutral success message that does not confirm account existence. A pending request disables duplicate submission. No automatic resends are made; provider rate limits remain in effect. Google users can return to Google sign-in.

The SDK consumes the email link, then PASSWORD_RECOVERY with a session enables the new-password form. A query marker or ordinary saved session alone does not enable it. Callback URLs are cleaned after SDK processing. The update uses `updateUser({password})`; the form checks length 12–128 and matching confirmation. Provider errors never appear verbatim. Successful updates clear the fields and local recovery permission, keeping portfolio data unchanged.

Recovery permission is intentionally held only in memory. Refreshing or revisiting the reset page requires a fresh reset email. Expired or previously used links offer a new request. An ambiguous update failure does not claim success. This UI gate is not a replacement for Supabase's server-side authentication checks.

The recovery email establishes a signed-in session. Back to sign in now signs out the current browser session before navigating, so the normal signed-in redirect cannot send the user back to the dashboard. Failed sign-out stays on the recovery page with a retry message. Continue to my portfolio intentionally keeps the session. Three regression tests cover successful sign-out, failure/retry, and continuing to the dashboard; the recovery and Google suites pass together (16 tests).

## Verification

53 UI/service tests pass, including eight new recovery tests: entry point, redirect target, duplicate requests, neutral confirmation, request errors, callback markers with/without an existing session, password matching, successful update/permission consumption, and failed update. TypeScript and production build pass. Existing database tests were not rerun because no SQL changed. Vite's bundle-size advisory remains; it does not fail the build.

Hosted email delivery and actual password changes still need user verification. No real password was changed during development.

1. Use an email/password test account. Keep the local server running.
2. Request one reset link from the app and check your inbox/spam folder.
3. Open the newest link. Confirm the new-password form appears.
4. Enter and confirm a new password yourself, then submit. Confirm the success message and unchanged portfolio.
5. Sign out and verify the new password works and the old one fails.
6. Reopen the used link: it should offer a fresh reset request, not another enabled password form.
7. Confirm Google sign-in still works independently.

Reference: [Supabase recovery API](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail).

Next: hosted owner/admin privacy checks, deployment, and a study guide for the system.
