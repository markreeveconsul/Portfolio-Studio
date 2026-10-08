# Portfolio Studio study guide

Live site: https://myfolio-studio.vercel.app/

## Architecture

React and TypeScript implement the interface. Vite builds the static website and Vercel serves it. Supabase supplies authentication, PostgreSQL, and private photo storage. The publishable key identifies the project; the user's session and database policies determine access.

## Source reading order

1. src/main.tsx mounts the application.
2. src/App.tsx handles routes, sessions, account forms, and navigation guards.
3. src/lib/supabase.ts initializes the Supabase client.
4. src/features/portfolio/Workspace.tsx checks admin access.
5. PortfolioEditor.tsx maintains the draft and saved baseline.
6. model.ts, sections.ts, and urls.ts validate data.
7. repository.ts sends database requests.
8. PortfolioView.tsx and template components display saved data.
9. PhotoEditor.tsx and photos.ts handle photo selection and upload.
10. src/features/auth/PasswordRecovery.tsx implements password recovery.
11. supabase/migrations/001-007 define database structure and behavior.

## Database design

Each auth.users account may own one portfolios row. Education, skills, projects, experience, and social_links contain multiple child rows linked by portfolio_id. Foreign keys enforce relationships and cascade portfolio deletion to child records. The profile-photos bucket stores private files; the portfolio stores the path. The private.admin_users table holds administrator membership. photo_cleanup_jobs retains pending file deletions.

## Important flows

Saving: validate the draft, call save_cebu_portfolio (which calls save_portfolio_information and save_personal_information), check ownership and revision, replace information and sections atomically, then update the saved baseline. A failed transaction rolls back all changes.

Concurrent edits: updated_at identifies the version originally loaded. A stale request is rejected instead of overwriting another tab's changes.

Photos: selecting produces a local preview. Explicit Save photo uploads a unique owner-prefixed file, updates the database reference conditionally, then removes the old file. Ambiguous responses retain files rather than risk deleting a referenced photo. Current limits are JPG/PNG/WebP up to 2 MB. The owner reports successful iPhone and additional phone upload tests. The original isolated picker complaint remains unexplained; the updated picker is included in the latest package, with actual-device checking still needed.

Deletion: typed DELETE confirmation calls an owner/revision-checked database function. Portfolio and child records are deleted while the current photo is queued for cleanup. Storage deletion can be retried. The sign-in account remains active.

Recovery: the email link authenticates the recovery session. The app accepts a matching new password and calls updateUser. Back to sign in signs out the current session first. Continue to my portfolio keeps the session.

## Presentation questions

Why validate twice? Browser checks provide quick feedback; database constraints protect data even when the interface is bypassed.

Why transactions? A save spans several tables and must either complete fully or roll back.

Why row-level security? UI visibility is not authorization. Database policies enforce owner access and read-only admin access on every request.

How does someone become admin? A trusted operator assigns a confirmed user's ID in the private membership table; signup and editable metadata cannot grant the role.

Why a cleanup queue? Database transactions and Storage API calls cannot commit together. Durable queued work supports later retries.

What does deployment do? It makes the built interface available online. Supabase remains the backend, and production authentication redirects must be configured.

What do tests prove? Mocked UI tests verify behavior; local PostgreSQL tests execute migrations and policy assertions. Live email, hosted settings, and real mobile behavior still require manual testing.

## Demonstration order

Use fictional data. Show the homepage, sign in, save and refresh a portfolio, compare templates, and demonstrate a photo. Contrast ordinary and admin access. Explain recovery without displaying tokens. Demonstrate deletion only with a disposable portfolio. Trace one save from UI to repository to SQL function.


## New source files to study

ProfessionalPortfolio.tsx renders Résumé and Showcase, professional-templates.css styles them, and TemplateThumbnail.tsx provides schematic layout previews. CebuContactFields.tsx and SearchSelect.tsx implement dependent searchable address fields. cebu-locations.json is the bundled location snapshot; migrations 005–006 enforce the matching database rules. Template layout is frontend code; migration 007 only expands allowed template IDs.
