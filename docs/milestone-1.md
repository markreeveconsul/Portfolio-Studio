# Milestone 1: foundation and access model

Target completion of the full project: October 19, 2026. Study and rehearsal: October 20–25. Approximate deadline: October 26.

## Approved scope

One portfolio per account; exactly Simple, Modern, and Creative templates; explicit Save & continue; optional work experience; private portfolios readable by the owner and authorized admins. The application home page is public. Admin access is read-only for other users' portfolios. More powerful admin functions require a separate decision.

Portfolio Studio is a provisional project label, not an additional product feature. Template content uses a fictional Alex Morgan. Branding can be changed without database changes.

## Access design

Admin membership lives in an unexposed `private.admin_users` table. The browser can call `is_admin()` only to check its own role; it cannot provide an arbitrary user ID. The function uses a fixed empty search path and a qualified query. Only trusted database operators can grant roles.

All six portfolio tables have RLS enabled. Owners can create/read/update/delete their own portfolio. Admins gain read access, including related records and private photos, but cannot edit other owners' records. Anonymous roles have no portfolio table privileges. Repeating records cascade on parent deletion. Files require separate cleanup.

## Review checklist

- Desktop and mobile home layout; three clearly different template studies.
- Preview buttons open the right template; Escape closes and returns focus.
- Navigation and private-route gate work after refresh.
- No fake successful sign-in or save when Supabase is absent.
- Account forms label each input and announce errors; confirmation passwords must match.
- No public portfolio path or account-controlled admin role.
- Setup documentation excludes privileged credentials.

## Verification record

TypeScript and production build passed. Browser checks verified template dialogs, Escape/focus return, missing-configuration handling, private-route refresh, and mobile layout. See milestone 2 for current implementation and additional tests.

Cloud authentication, email delivery, SQL migration execution, live RLS tests, and private Storage behavior are unverified until a Supabase development project is connected. The supplied SQL test asserts owner isolation, related-record isolation, owner updates, cross-owner write rejection, admin read-only access, forbidden self-promotion, forged metadata rejection, cascading deletion, and anonymous access rejection.

Before production, also test actual Storage uploads/downloads with two users and an admin, use a configured email sender for reliable confirmation/recovery, implement password recovery, and run the complete deployed assignment workflow.
