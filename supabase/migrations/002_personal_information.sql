-- Atomic save of one owner's personal information and ordered social links.
-- SECURITY INVOKER retains RLS. Ownership is derived from auth.uid(), never input.
begin;

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

commit;
