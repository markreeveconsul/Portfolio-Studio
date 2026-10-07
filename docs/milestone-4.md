# Milestone 4 — Private photos and administrator guidance

Photos support local selection preview, explicit upload, replacement, and confirmed removal. JPG, PNG, and WebP are accepted up to 2 MB. Save portfolio information first, then save the photo separately. Text editing is disabled during the photo request, and navigation warns while it is running.

The existing private profile-photos bucket and owner/admin RLS policies from migration 001 are used. No new migration is required. Database reads now include photo_path. The preview and admin detail download images with the authenticated Storage API and display temporary browser object URLs, revoked on unmount. There are no public photo links.

Every upload gets a unique owner-prefixed path. The portfolio update checks owner, ID, and updated_at. Old objects are removed only after a confirmed database update. A known revision conflict attempts cleanup of the unused new upload. An ambiguous save failure retains the upload because the database may already reference it; the user is asked to reload. Cleanup failures are reported, with a private orphan possibly remaining. An admin/operator can review unused objects in Supabase Storage; do not remove a currently referenced photo. Storage and PostgreSQL do not share a transaction.

The user's live Google sign-in and text saving/persistence have been reported successful. Hosted photo delivery and cross-account/admin checks remain to be performed with real accounts. See admin-access.md to assign the owner's admin role deliberately.

Validation: 32 UI/service tests and 15 PostgreSQL subtests passed (16 reported including the enclosing database test). TypeScript, production build, and review build passed. Desktop review shows the controls; mobile document width matches scroll width at the tested narrow viewport. Service tests cover explicit upload, file limits, stale revision cleanup, ambiguous outcomes, removal ordering, and object URL cleanup. Database tests cover owner isolation, admin read-only photo access, anonymous denial, and private bucket configuration.
