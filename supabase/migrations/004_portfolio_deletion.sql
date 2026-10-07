-- Run once after migrations 001-003. Retains failed photo cleanup across refreshes.
begin;
create table public.photo_cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  photo_path text not null,
  created_at timestamptz not null default now(),
  check (split_part(photo_path, '/', 1) = owner_id::text),
  unique(owner_id, photo_path)
);
alter table public.photo_cleanup_jobs enable row level security;
revoke all on public.photo_cleanup_jobs from public, anon, authenticated;
grant select, insert, delete on public.photo_cleanup_jobs to authenticated;
create policy cleanup_read on public.photo_cleanup_jobs for select to authenticated using (owner_id = (select auth.uid()));
create policy cleanup_create on public.photo_cleanup_jobs for insert to authenticated with check (owner_id = (select auth.uid()));
create policy cleanup_delete on public.photo_cleanup_jobs for delete to authenticated using (owner_id = (select auth.uid()));

create function public.delete_own_portfolio(p_id uuid, p_expected_updated_at timestamptz)
returns void language plpgsql security invoker set search_path = '' as $$
declare deleted public.portfolios%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  delete from public.portfolios where id=p_id and owner_id=auth.uid() and updated_at=p_expected_updated_at returning * into deleted;
  if not found then raise exception 'Portfolio changed or unavailable; reload first' using errcode='P0002'; end if;
  if deleted.photo_path is not null then
    insert into public.photo_cleanup_jobs(owner_id,photo_path) values(auth.uid(),deleted.photo_path) on conflict do nothing;
  end if;
end;
$$;
revoke all on function public.delete_own_portfolio(uuid,timestamptz) from public, anon;
grant execute on function public.delete_own_portfolio(uuid,timestamptz) to authenticated;
commit;
