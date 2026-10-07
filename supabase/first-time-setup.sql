-- FIRST-TIME SETUP ONLY: new Portfolio Studio project.
-- Generated from migrations 001-003; do not run those separately after this succeeds.
-- All setup changes commit together or roll back together.
begin;
-- SOURCE: supabase/migrations/001_foundation.sql
-- Run once in a NEW Supabase project. No credentials belong in this file.
-- Browser access is denied unless an explicit RLS policy permits it.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
revoke all on private.admin_users from public, anon, authenticated;
alter table private.admin_users enable row level security;

-- Uses a server-managed table, never user-editable account metadata.
create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from private.admin_users a where a.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create table public.portfolios (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 1 and 120),
  email text not null default '' check (char_length(email) <= 254),
  contact_number text not null default '' check (char_length(contact_number) <= 40),
  address text not null default '' check (char_length(address) <= 300),
  about_me text not null default '' check (char_length(about_me) <= 3000),
  photo_path text,
  template text not null default 'simple' check (template in ('simple', 'modern', 'creative')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint own_photo_folder check (
    photo_path is null or (split_part(photo_path, '/', 1) = owner_id::text and char_length(photo_path) <= 500)
  )
);

create table public.education (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  institution text not null check (char_length(trim(institution)) between 1 and 180),
  qualification text not null default '' check (char_length(qualification) <= 180),
  start_date date,
  end_date date,
  position integer not null default 0 check (position >= 0),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create table public.skills (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  position integer not null default 0 check (position >= 0)
);
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text not null default '' check (char_length(description) <= 3000),
  project_url text not null default '' check (project_url = '' or (project_url ~ '^https?://' and char_length(project_url) <= 2000)),
  repository_url text not null default '' check (repository_url = '' or (repository_url ~ '^https?://' and char_length(repository_url) <= 2000)),
  position integer not null default 0 check (position >= 0)
);
create table public.experience (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  organization text not null check (char_length(trim(organization)) between 1 and 180),
  role_title text not null check (char_length(trim(role_title)) between 1 and 180),
  description text not null default '' check (char_length(description) <= 3000),
  start_date date,
  end_date date,
  position integer not null default 0 check (position >= 0),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create table public.social_links (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 80),
  url text not null check (url ~ '^https?://' and char_length(url) <= 2000),
  position integer not null default 0 check (position >= 0)
);

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger portfolio_updated before update on public.portfolios
for each row execute function private.touch_updated_at();

alter table public.portfolios enable row level security;
revoke all on public.portfolios from public, anon, authenticated;
grant select, insert, update, delete on public.portfolios to authenticated;
create policy portfolio_read on public.portfolios for select to authenticated
using (owner_id = (select auth.uid()) or (select public.is_admin()));
create policy portfolio_create on public.portfolios for insert to authenticated
with check (owner_id = (select auth.uid()));
create policy portfolio_edit on public.portfolios for update to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy portfolio_delete on public.portfolios for delete to authenticated
using (owner_id = (select auth.uid()));

-- Related records inherit read access through the protected parent.
-- Every write ALSO checks ownership explicitly, so admin reading cannot grant editing.
do $$
declare child text;
begin
  foreach child in array array['education', 'skills', 'projects', 'experience', 'social_links'] loop
    execute format('alter table public.%I enable row level security', child);
    execute format('revoke all on public.%I from public, anon, authenticated', child);
    execute format('grant select, insert, update, delete on public.%I to authenticated', child);
    execute format('create index %I on public.%I (portfolio_id)', child || '_portfolio_idx', child);
    execute format('create policy child_read on public.%I for select to authenticated using (exists (select 1 from public.portfolios p where p.id = portfolio_id))', child);
    execute format('create policy child_create on public.%I for insert to authenticated with check (exists (select 1 from public.portfolios p where p.id = portfolio_id and p.owner_id = (select auth.uid())))', child);
    execute format('create policy child_edit on public.%I for update to authenticated using (exists (select 1 from public.portfolios p where p.id = portfolio_id and p.owner_id = (select auth.uid()))) with check (exists (select 1 from public.portfolios p where p.id = portfolio_id and p.owner_id = (select auth.uid())))', child);
    execute format('create policy child_delete on public.%I for delete to authenticated using (exists (select 1 from public.portfolios p where p.id = portfolio_id and p.owner_id = (select auth.uid())))', child);
  end loop;
end;
$$;

-- Profile photos are private too. Store file paths, never public URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

create policy photo_read on storage.objects for select to authenticated
using (bucket_id = 'profile-photos' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));
create policy photo_upload on storage.objects for insert to authenticated
with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy photo_update on storage.objects for update to authenticated
using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy photo_delete on storage.objects for delete to authenticated
using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);


-- SOURCE: supabase/migrations/002_personal_information.sql
-- Atomic save of one owner's personal information and ordered social links.
-- SECURITY INVOKER retains RLS. Ownership is derived from auth.uid(), never input.

-- Advance the revision even when two updates share a transaction timestamp.
create or replace function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  return new;
end;
$$;

create function public.save_personal_information(
  p_full_name text,
  p_email text,
  p_contact_number text,
  p_address text,
  p_about_me text,
  p_social_links jsonb,
  p_expected_updated_at timestamptz
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  current_portfolio public.portfolios%rowtype;
  saved_portfolio public.portfolios%rowtype;
  links jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_social_links is null or jsonb_typeof(p_social_links) <> 'array' then
    raise exception 'Links must be an array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_social_links) > 10 then
    raise exception 'At most ten links are allowed' using errcode = '22023';
  end if;
  if p_email <> '' and p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid contact email' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_social_links) as item
    where jsonb_typeof(item) <> 'object'
       or jsonb_typeof(item->'label') is distinct from 'string'
       or jsonb_typeof(item->'url') is distinct from 'string'
       or item->>'url' !~ '^https?://[^/[:space:]@]+([/?#][^[:space:]]*)?$'
  ) then
    raise exception 'Invalid link' using errcode = '22023';
  end if;

  select * into current_portfolio from public.portfolios
  where owner_id = auth.uid() for update;

  if found then
    if p_expected_updated_at is null or current_portfolio.updated_at <> p_expected_updated_at then
      raise exception 'Portfolio changed; reload before saving' using errcode = 'P0002';
    end if;
    update public.portfolios set
      full_name = trim(p_full_name), email = trim(p_email),
      contact_number = trim(p_contact_number), address = trim(p_address), about_me = trim(p_about_me)
    where id = current_portfolio.id returning * into saved_portfolio;
  else
    if p_expected_updated_at is not null then
      raise exception 'Portfolio is no longer available; reload before saving' using errcode = 'P0002';
    end if;
    insert into public.portfolios(owner_id,full_name,email,contact_number,address,about_me)
    values (auth.uid(),trim(p_full_name),trim(p_email),trim(p_contact_number),trim(p_address),trim(p_about_me))
    returning * into saved_portfolio;
  end if;

  delete from public.social_links where portfolio_id = saved_portfolio.id;
  insert into public.social_links(portfolio_id,label,url,position)
  select saved_portfolio.id, trim(item->>'label'), trim(item->>'url'), (ordinality - 1)::integer
  from jsonb_array_elements(p_social_links) with ordinality as entry(item, ordinality);

  select coalesce(jsonb_agg(jsonb_build_object('label',label,'url',url,'position',position) order by position),'[]'::jsonb)
  into links from public.social_links where portfolio_id = saved_portfolio.id;

  return to_jsonb(saved_portfolio) || jsonb_build_object('social_links',links);
end;
$$;

revoke all on function public.save_personal_information(text,text,text,text,text,jsonb,timestamptz) from public, anon;
grant execute on function public.save_personal_information(text,text,text,text,text,jsonb,timestamptz) to authenticated;


-- SOURCE: supabase/migrations/003_portfolio_sections.sql
-- Saves all editable text sections together. Photos and template choice are unchanged.
create function public.save_portfolio_information(
  p_full_name text, p_email text, p_contact_number text, p_address text, p_about_me text,
  p_social_links jsonb, p_education jsonb, p_skills jsonb, p_projects jsonb, p_experience jsonb,
  p_expected_updated_at timestamptz
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  section jsonb;
  item jsonb;
  field_value jsonb;
  result jsonb;
  portfolio uuid;
begin
  foreach section in array array[p_education,p_skills,p_projects,p_experience] loop
    if section is null or jsonb_typeof(section) <> 'array' then
      raise exception 'Sections must be arrays' using errcode='22023';
    end if;
    if jsonb_array_length(section) > 30 then
      raise exception 'At most thirty entries per section' using errcode='22023';
    end if;
    for item in select value from jsonb_array_elements(section) loop
      if jsonb_typeof(item) <> 'object' then
        raise exception 'Entries must be objects' using errcode='22023';
      end if;
      for field_value in select value from jsonb_each(item) loop
        if jsonb_typeof(field_value) not in ('string','null') then
          raise exception 'Entry values must be text' using errcode='22023';
        end if;
      end loop;
    end loop;
  end loop;
  if exists (
    select 1 from jsonb_array_elements(p_projects) entry,
    lateral (values(entry->>'project_url'),(entry->>'repository_url')) links(url)
    where coalesce(url,'') <> '' and url !~ '^https?://[^/[:space:]@]+([/?#][^[:space:]]*)?$'
  ) then
    raise exception 'Invalid project URL' using errcode='22023';
  end if;

  -- The nested function verifies ownership/revision and locks the parent row.
  -- Every following mutation shares its transaction; any failure rolls it all back.
  result := public.save_personal_information(p_full_name,p_email,p_contact_number,p_address,p_about_me,p_social_links,p_expected_updated_at);
  portfolio := (result->>'id')::uuid;

  delete from public.education where portfolio_id=portfolio;
  insert into public.education(portfolio_id,institution,qualification,start_date,end_date,position)
  select portfolio,trim(coalesce(entry->>'institution','')),trim(coalesce(entry->>'qualification','')),
    nullif(entry->>'start_date','')::date,nullif(entry->>'end_date','')::date,(n-1)::integer
  from jsonb_array_elements(p_education) with ordinality items(entry,n);

  delete from public.skills where portfolio_id=portfolio;
  insert into public.skills(portfolio_id,name,position)
  select portfolio,trim(coalesce(entry->>'name','')),(n-1)::integer
  from jsonb_array_elements(p_skills) with ordinality items(entry,n);

  delete from public.projects where portfolio_id=portfolio;
  insert into public.projects(portfolio_id,title,description,project_url,repository_url,position)
  select portfolio,trim(coalesce(entry->>'title','')),trim(coalesce(entry->>'description','')),
    trim(coalesce(entry->>'project_url','')),trim(coalesce(entry->>'repository_url','')),(n-1)::integer
  from jsonb_array_elements(p_projects) with ordinality items(entry,n);

  delete from public.experience where portfolio_id=portfolio;
  insert into public.experience(portfolio_id,organization,role_title,description,start_date,end_date,position)
  select portfolio,trim(coalesce(entry->>'organization','')),trim(coalesce(entry->>'role_title','')),
    trim(coalesce(entry->>'description','')),nullif(entry->>'start_date','')::date,nullif(entry->>'end_date','')::date,(n-1)::integer
  from jsonb_array_elements(p_experience) with ordinality items(entry,n);

  return result || jsonb_build_object(
    'education',(select coalesce(jsonb_agg(jsonb_build_object('institution',institution,'qualification',qualification,'start_date',start_date,'end_date',end_date,'position',position) order by position),'[]'::jsonb) from public.education where portfolio_id=portfolio),
    'skills',(select coalesce(jsonb_agg(jsonb_build_object('name',name,'position',position) order by position),'[]'::jsonb) from public.skills where portfolio_id=portfolio),
    'projects',(select coalesce(jsonb_agg(jsonb_build_object('title',title,'description',description,'project_url',project_url,'repository_url',repository_url,'position',position) order by position),'[]'::jsonb) from public.projects where portfolio_id=portfolio),
    'experience',(select coalesce(jsonb_agg(jsonb_build_object('organization',organization,'role_title',role_title,'description',description,'start_date',start_date,'end_date',end_date,'position',position) order by position),'[]'::jsonb) from public.experience where portfolio_id=portfolio)
  );
end;
$$;
revoke all on function public.save_portfolio_information(text,text,text,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,timestamptz) from public, anon;
grant execute on function public.save_portfolio_information(text,text,text,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,timestamptz) to authenticated;

commit;

