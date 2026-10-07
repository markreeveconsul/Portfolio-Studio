-- Run in the Supabase SQL editor AFTER 001_foundation.sql, in a development project.
-- Tests execute under authenticated/anon roles, not the SQL editor's bypass role.
-- All fixtures and edits are rolled back. Any exception means a failed test.
begin;
insert into auth.users (id, email) values
('10000000-0000-4000-8000-000000000001','owner-a@example.invalid'),
('10000000-0000-4000-8000-000000000002','owner-b@example.invalid'),
('10000000-0000-4000-8000-000000000003','outsider@example.invalid'),
('10000000-0000-4000-8000-000000000004','admin@example.invalid');
insert into private.admin_users(user_id) values ('10000000-0000-4000-8000-000000000004');
insert into public.portfolios(id,owner_id,full_name) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Owner A'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Owner B');
insert into public.skills(portfolio_id,name) values
('20000000-0000-4000-8000-000000000001','A skill'),
('20000000-0000-4000-8000-000000000002','B skill');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$
declare affected integer;
begin
  if (select count(*) from public.portfolios where id::text like '20000000-%') <> 1 then raise exception 'Owner isolation failed'; end if;
  if (select count(*) from public.skills where portfolio_id::text like '20000000-%') <> 1 then raise exception 'Child isolation failed'; end if;
  if public.is_admin() then raise exception 'Owner became admin'; end if;
  update public.portfolios set about_me='Owner update' where id='20000000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Owner cannot update own record'; end if;
  update public.portfolios set about_me='Unauthorized' where id='20000000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Owner edited another portfolio'; end if;
  begin
    insert into private.admin_users(user_id) values ('10000000-0000-4000-8000-000000000001');
    raise exception 'Self-promotion was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.skills(portfolio_id,name) values ('20000000-0000-4000-8000-000000000002','Unauthorized');
    raise exception 'Cross-owner child insert was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.portfolios set owner_id='10000000-0000-4000-8000-000000000003' where id='20000000-0000-4000-8000-000000000001';
    raise exception 'Ownership reassignment was allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","user_metadata":{"role":"admin"}}',true);
do $$
begin
  if exists(select 1 from public.portfolios where id::text like '20000000-%') then raise exception 'Outsider can read portfolios'; end if;
  if public.is_admin() then raise exception 'User metadata elevated privileges'; end if;
end;
$$;

select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
do $$
declare affected integer;
begin
  if not public.is_admin() then raise exception 'Admin role lookup failed'; end if;
  if (select count(*) from public.portfolios where id::text like '20000000-%') <> 2 then raise exception 'Admin cannot read portfolios'; end if;
  if (select count(*) from public.skills where portfolio_id::text like '20000000-%') <> 2 then raise exception 'Admin cannot read children'; end if;
  update public.portfolios set about_me='Admin write' where id::text like '20000000-%';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Admin edited another owner portfolio'; end if;
  delete from public.skills where portfolio_id::text like '20000000-%';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Admin deleted another owner child'; end if;
  delete from public.portfolios where id::text like '20000000-%';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Admin deleted another owner portfolio'; end if;
end;
$$;

select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
delete from public.portfolios where id='20000000-0000-4000-8000-000000000001';
reset role;
do $$
begin
  if exists(select 1 from public.skills where portfolio_id='20000000-0000-4000-8000-000000000001') then raise exception 'Cascade deletion failed'; end if;
  if not exists(select 1 from public.portfolios where id='20000000-0000-4000-8000-000000000002') then raise exception 'Other owner data was deleted'; end if;
end;
$$;

set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$
begin
  begin
    perform 1 from public.portfolios;
    raise exception 'Anonymous database access was allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
rollback;
select 'All access-control assertions passed; fixtures rolled back.' as result;
