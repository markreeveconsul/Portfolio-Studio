-- Run once in a NEW Supabase project. No credentials belong in this file.
-- Browser access is denied unless an explicit RLS policy permits it.
begin;

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

commit;
