# Milestone 2 — Personal Information

The first data workflow now supports personal-information entry, atomic save, retrieval, editing, and a Simple preview, plus read-only admin review.

## Verification

- TypeScript checks and production build pass.
- 14 React tests pass: validation, unsafe links, failed loads/saves, draft preservation, confirmed preview, editing revision, duplicate submissions, literal text rendering, empty sections, read-only admin UI, cancelled navigation, refresh/sign-out warnings, and normal-user admin-route denial.
- Nine PostgreSQL subtests pass, including the supplied access-control assertions, atomic rollback, stale revisions, owner isolation, admin read-only access, and private-photo row policies. The runner includes the enclosing test in its reported total of 10.
- Browser review passed at desktop and phone breakpoints: no horizontal overflow, required-name feedback, adding links, save-to-preview, and returning to edit. No browser console errors were observed. The fixture is fictional and does not demonstrate cloud persistence.

## Limits

No Supabase project or live account is configured yet. Hosted authentication, confirmation email, PostgREST integration, actual photo delivery, and persistence through the deployed URL are unverified.

The local PostgreSQL tests substitute minimal Supabase-owned Auth/Storage schemas but execute the application's migrations unchanged. They validate SQL semantics, not hosted service configuration. Cloud access checks remain required before deployment.

## Next piece

Connect Supabase, apply both migrations, confirm two accounts, and verify save → refresh → edit with owner/admin isolation. Then extend the transaction to education, skills, projects, and experience. Add photos and deletion with a file-cleanup strategy. Retain exactly three templates.
