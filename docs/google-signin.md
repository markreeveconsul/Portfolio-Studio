# Google sign-in setup

The app now supports Google through Supabase Auth. Provider configuration and live sign-in verification are still required. The database owner/admin policies stay unchanged.

## Google Cloud

1. Open https://console.cloud.google.com/ and create or select a project named Portfolio Studio.
2. Open Google Auth Platform and complete its setup (Branding / Audience). Use Portfolio Studio as the app name and your email for support/contact. Choose External for personal Google accounts. During testing, add your Google email under Audience → Test users if that setting is shown.
3. In Data Access, configure only the basic identity scopes: openid, userinfo.email, and userinfo.profile. No Gmail, Drive, or other API access is needed.
4. In Clients, create an OAuth client of type Web application.
5. Set the authorized redirect URI to exactly:

```
https://betdprtlcmoqhchdjqyn.supabase.co/auth/v1/callback
```

This is the hosted Supabase callback even though the React app runs locally. The redirect-based SDK flow does not embed Google's JavaScript sign-in widget.

6. Save the Client ID and Client Secret. Enter the secret directly into Supabase in the next step; do not put it in chat, source code, or any VITE environment variable.

## Supabase

1. Authentication → Sign In / Providers → Google: enable Google, enter the Google Client ID and Client Secret, and save. Keep normal nonce/email verification protections enabled.
2. Authentication → URL Configuration → Redirect URLs: add this exact return URL alongside the existing email callback:

```
http://127.0.0.1:5173/?auth=google
```

3. Keep Site URL as `http://127.0.0.1:5173/` for local testing.

## Verify

Open `http://127.0.0.1:5173/#signup` in a regular browser (Google may reject embedded browsers). Click Continue with Google and complete the account selection and consent yourself. The app should return to My portfolio. Save a fictional portfolio, refresh, sign out, and return with the same Google account. Verify the same saved record loads. Verify a second account cannot read it and only an assigned admin has read-only access.

Also test cancelling Google consent and returning with the browser Back button. The form should permit retrying. Startup failures show a safe message without displaying provider response contents. Our automated tests mock the SDK; they do not prove Google dashboard configuration or live consent works.

For deployment, configure the production Site URL and exact `https://YOUR_DOMAIN/?auth=google` return URL in Supabase. Review Google's audience/publishing settings before asking classmates to sign in; a testing configuration may restrict access. The hosted Supabase callback remains the same unless the Supabase project/domain changes.

Implementation: the SDK completes its default browser OAuth session handling before the app replaces the callback URL with #dashboard (or #signin on failure). The app never treats the query marker as proof of login. No Google client secret belongs in this frontend.

References: https://supabase.com/docs/guides/auth/social-login/auth-google and https://supabase.com/docs/guides/auth/redirect-urls.
