-- Saves all editable text sections together. Photos and template choice are unchanged.
begin;
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
