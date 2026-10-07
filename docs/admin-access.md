# Assign your administrator account

Sign in normally using Google or email/password. A signed-in user is an authenticated member, not a guest. An admin uses the same sign-in screen; a protected database membership grants the additional read-only workspace.

1. In Supabase, open Authentication → Users. Find the exact account you use to sign in. Confirm its email and copy its **User UID** (UUID).
2. In SQL Editor, replace the placeholder below with that UUID, then run:

```sql
insert into private.admin_users (user_id)
values ('PASTE_YOUR_USER_UID_HERE'::uuid)
on conflict (user_id) do nothing;
```

3. Refresh the app while signed in. My portfolio will show **Admin account** and an **Admin workspace** tab. Open that tab to view users' portfolios and private photos. Other users' records remain read-only.

Only grant this role to an account you intend to trust with every portfolio. Do not put the service-role key in the app or add a client-side “make me admin” button. The user table and email must be checked before choosing the UUID; do not assume the first user is the administrator.

To revoke that account's membership, run the following using the same UUID, then refresh:

```sql
delete from private.admin_users
where user_id = 'PASTE_YOUR_USER_UID_HERE'::uuid;
```

Verify: a normal second account must not see the Admin workspace tab and must be denied at `/#admin`. Your admin account can view that account's portfolio but cannot edit or delete it. Owner access remains unchanged.
