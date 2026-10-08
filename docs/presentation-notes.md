# Portfolio Studio presentation notes

This is an editable speaking guide, not a slide deck. Personal details are intentionally omitted. Adjust the suggested 8–10 minute duration to your instructor's requirement.

## 1. Introduction — 45 seconds

“Portfolio Studio is an online portfolio template generator. A user enters information once, saves it to an online database, and displays it using one of five designs. I built it with React, TypeScript, and Supabase, and deployed it on Vercel. Individual portfolios are private to the owner and authorized administrators.”

Show the live website address. Distinguish the public homepage from the private portfolio workspace.

## 2. Main workflow — 3 minutes

Sign in with a prepared demonstration account. Use fictional portfolio details. Enter or edit a name and a project, then choose Save changes to stay in the editor. Use Save & continue to open the preview. Refresh to show that data persists. Switch among Simple, Modern, Creative, Professional Résumé, and Project Showcase and explain that the data is shared while the presentation changes. Save a template choice.

Return to Edit information. Explain that text must be saved before changing photos. Select a prepared JPG under 2 MB, show the local preview, then Save photo. Avoid improvising with an unsupported phone format during the demonstration.

Say: “The browser preview is not proof of saving. The explicit save writes to Supabase; refreshing retrieves the stored record.”

## 3. Database and integrity — 90 seconds

Show the relationship diagram in project-documentation.md. Explain one user to one portfolio and one portfolio to many section rows. Explain why files are in Storage and only their paths are in PostgreSQL.

Trace a save: PortfolioEditor validates the draft, repository.ts calls save_cebu_portfolio, which delegates to the existing section/personal save functions, PostgreSQL checks owner and revision, then commits all section changes together. Mention that a failed transaction rolls back and stale versions are rejected.

## 4. Privacy and administrator access — 60 seconds

Show an ordinary account's denied admin route. Use a separate browser session for a prepared admin account and show read-only viewing of the fictional portfolio. Do not display admin credentials or database secrets.

Say: “The database policies enforce access even if someone changes the browser interface. The admin role comes from a protected membership table, not from a form field.”

## 5. Recovery and deletion — 60 seconds

Explain the recovery email flow and the difference between Back to sign in and Continue to my portfolio. Do not display a real reset token or password.

For deletion, use only a disposable demonstration portfolio. Show the typed DELETE confirmation. Explain that its sections are removed, the photo is queued for cleanup, and the sign-in account remains. If there is insufficient time, demonstrate cancellation and explain the tested deletion flow.

## 6. Testing and limitations — 60 seconds

The latest completed local suite had 72 UI/service tests and 22 database subtests. Local database tests use actual PostgreSQL semantics with test stand-ins for Supabase-owned services. Hosted delivery and real-device behavior require manual tests. State that mobile and admin checks were reported by the owner/testers, rather than claiming exhaustive device coverage.

Mention practical limits: one portfolio per account, five templates, JPG/PNG/WebP up to 2 MB, and private access. The owner reported deploying the latest package. Fresh authenticated desktop/phone screenshots and a full live review are still pending.

## Questions to rehearse

| Question | Main answer |
| --- | --- |
| Why Supabase? | It provides hosted PostgreSQL, authentication, and private storage for the project's scope. |
| Why not keep everything in browser storage? | The assignment requires an online database and persistence across authenticated sessions/devices. |
| How do you prevent cross-user access? | Owner IDs, foreign keys, RLS, and protected administrator membership. |
| Why do you need both React and SQL validation? | React gives immediate feedback; SQL protects integrity for every request. |
| What happens when a save partly fails? | A transaction rolls back the portfolio and section changes together. |
| What happens when two tabs edit the same portfolio? | Revision checking rejects the stale write; the user reloads the saved version. |
| Why can file cleanup fail separately? | Storage calls are outside the SQL transaction, so queued retry is needed. |
| Why is the publishable key visible? | It identifies the project; session authorization and policies protect the data. It is not an admin secret. |
| Why does the reset link sign someone in? | Supabase authenticates the recovery session before permitting a password change. |
| How do updates reach the live site? | Commit code to GitHub, then Vercel builds the deployment; local edits alone do nothing to production. |
| What would you improve next? | Verified mobile picker feedback, controlled photo compression, and broader device testing, after confirming requirements. |

## Rehearsal and fallback

Prepare fictional data, a small supported photo, and separate user/admin sessions. Practice the exact sequence twice. Keep screenshots available if the network fails, clearly identifying them as screenshots rather than a live operation. Do not disable authentication or RLS to make the demonstration easier.

## Short study schedule

Session 1: run the app and explain each route. Session 2: trace one save through the React component, repository, and SQL function. Session 3: read the relationship diagram and RLS policies. Session 4: explain photos, recovery, and cleanup failure cases. Session 5: rehearse the presentation and answer the questions without reading the notes.

## Feedback evidence

Use feedback-tracker.md to summarize actual classmate findings when available. Do not invent satisfaction scores or claim testing is complete before responses arrive. Screenshot capture is scheduled for the owner later; see screenshot-checklist.md.
