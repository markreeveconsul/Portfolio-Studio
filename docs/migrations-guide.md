# Database migrations 001–007

A migration is an ordered, versioned database change. These scripts update PostgreSQL tables, constraints, policies and functions; React/CSS changes are deployed separately through Vercel.

| Number | Change | Reason |
| --- | --- | --- |
| 001 | Portfolio and child tables, admin membership, RLS, private photo storage | Establish relationships and owner/admin access |
| 002 | save_personal_information and monotonic updated_at | Save profile/links atomically and reject stale edits |
| 003 | save_portfolio_information | Extend the same transaction to all repeating sections |
| 004 | delete_own_portfolio and photo_cleanup_jobs | Delete owner records while retaining retryable file cleanup |
| 005 | cebu_address JSONB and save_cebu_portfolio | Store structured Cebu City addresses without rewriting legacy text |
| 006 | Location lookup/validation and expanded save function | Support wider Cebu and prevent mismatched city/barangay pairs |
| 007 | Expand template check constraint | Allow resume/showcase in addition to the original three IDs |

Current save chain: PortfolioEditor → repository.savePortfolio → save_cebu_portfolio → save_portfolio_information → save_personal_information. The nested SQL work shares one transaction. Photo and template saves are separate operations.

Run each script once in order. BEGIN/COMMIT protects against partial application; it is not an automatic rollback after success. Manual execution in SQL Editor does not automatically populate a migration history just because files have numbered names. Keep applied files as history and add a new migration for later changes.

The first-time-setup.sql bundle contains 001–003. A new database using that bundle should then receive 004–007; do not also rerun 001–003 individually. An existing configured database should receive only missing migrations.

Database migrations do not create the UI, store your Google client secret, or deploy Vercel. The Philippine flag is an SVG UI change. Migration 007 permits template identifiers; the actual designs live in React/CSS.
