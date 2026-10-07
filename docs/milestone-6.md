# Milestone 6 — Portfolio deletion

## Setup required

Run `supabase/migrations/004_portfolio_deletion.sql` once in Supabase SQL Editor after migrations 001–003. Existing projects should run only 004. New projects using first-time-setup.sql must run 004 afterward. This migration creates a cleanup queue and deletion function; it does not delete an existing portfolio when installed.

## Behavior

The owner opens View saved portfolio and finds Delete portfolio below the preview. They must type DELETE and press Permanently delete portfolio. Cancellation makes no changes. The account remains active and the owner may start a new portfolio.

The RPC derives the owner from auth.uid(), verifies the saved revision, deletes the portfolio (cascading related sections), and records its current photo path for cleanup in the same transaction. Owners can read/process only their own cleanup jobs; admin read access to portfolios does not permit deleting another owner's portfolio. Photo files remain private while cleanup is pending.

After confirmed deletion the client removes the queued photo and then removes the queue record. Network/storage errors retain the job for Retry photo cleanup. Reloading the workspace discovers pending jobs. An ambiguous database outcome instructs the user to reload before trying again. Only the deleted portfolio's referenced photo is queued; old unused uploads from earlier ambiguous photo saves still require the cleanup described in milestone-4.md.

## Verification

44 UI/service tests and 18 database subtests pass (19 including the enclosing test). The production and review builds pass. Tests cover confirmation/cancel, stale deletion, successful deletion despite deferred storage cleanup, retry UI, storage removal before queue acknowledgement, retained jobs after cleanup failure, ownership, cascading sections, durable jobs, and account retention. The confirmation screen was also reviewed in the local fictional-data fixture. Live deletion should be tested with a disposable portfolio only after applying migration 004.

Next milestone: password recovery, followed by final verification and deployment.
