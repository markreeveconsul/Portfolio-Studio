-- Read-only configuration inventory: safe to run in Supabase SQL Editor.
-- Does not read portfolio contents, modify data, or assign admin access.
-- Every row should pass. Passing is NOT a substitute for live access tests.
with expected_tables(schema_name, table_name) as (
  values ('public','portfolios'), ('public','education'), ('public','skills'),
    ('public','projects'), ('public','experience'), ('public','social_links'),
    ('public','photo_cleanup_jobs'), ('private','admin_users')
), checks as (
  select 'RLS enabled: ' || e.schema_name || '.' || e.table_name as check_name,
    coalesce(c.relrowsecurity, false) as passed
  from expected_tables e
  left join pg_namespace n on n.nspname=e.schema_name
  left join pg_class c on c.relnamespace=n.oid and c.relname=e.table_name and c.relkind='r'
  union all
  select 'RPC installed: is_admin', to_regprocedure('public.is_admin()') is not null
  union all
  select 'RPC installed: full portfolio save',
    to_regprocedure('public.save_portfolio_information(text,text,text,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,timestamptz)') is not null
  union all
  select 'RPC installed: portfolio deletion',
    to_regprocedure('public.delete_own_portfolio(uuid,timestamptz)') is not null
  union all
  select 'Profile photo bucket is private with expected upload limits', exists (
    select 1 from storage.buckets where id='profile-photos' and public=false
      and file_size_limit=2097152
      and allowed_mime_types @> array['image/jpeg','image/png','image/webp']::text[]
      and allowed_mime_types <@ array['image/jpeg','image/png','image/webp']::text[]
  )
  union all
  select 'Browser roles cannot access admin membership schema',
    not has_schema_privilege('authenticated','private','USAGE')
    and not has_schema_privilege('anon','private','USAGE')
)
select check_name, case when passed then 'PASS' else 'CHECK REQUIRED' end as result
from checks order by check_name;
