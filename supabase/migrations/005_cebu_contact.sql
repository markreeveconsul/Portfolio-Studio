-- Apply once after 004. Existing addresses and phone values are not rewritten.
begin;
alter table public.portfolios add column cebu_address jsonb;
alter table public.portfolios add constraint valid_cebu_address check (
  cebu_address is null or (
    jsonb_typeof(cebu_address)='object'
    and cebu_address ?& array['barangay','street','postal_code']
    and jsonb_typeof(cebu_address->'barangay')='string'
    and jsonb_typeof(cebu_address->'street')='string'
    and jsonb_typeof(cebu_address->'postal_code')='string'
    and (cebu_address->>'barangay'='' or cebu_address->>'barangay' in ('Adlaon','Agsungot','Apas','Babag','Bacayan','Banilad','Basak Pardo','Basak San Nicolas','Binaliw','Bonbon','Budla-an','Buhisan','Bulacao','Buot-Taup Pardo','Busay','Calamba','Cambinocot','Camputhaw','Capitol Site','Carreta','Central','Cogon Pardo','Cogon Ramos','Day-as','Duljo','Ermita','Guadalupe','Guba','Hippodromo','Inayawan','Kalubihan','Kalunasan','Kamagayan','Kasambagan','Kinasang-an Pardo','Labangon','Lahug','Lorega','Lusaran','Luz','Mabini','Mabolo','Malubog','Mambaling','Pahina Central','Pahina San Nicolas','Pamutan','Pardo','Pari-an','Paril','Pasil','Pit-os','Pulangbato','Pung-ol-Sibugay','Punta Princesa','Quiot Pardo','Sambag I','Sambag II','San Antonio','San Jose','San Nicolas Central','San Roque','Santa Cruz','Sapangdaku','Sawang Calero','Sinsin','Sirao','Suba Pob.','Sudlon I','Sudlon II','T. Padilla','Tabunan','Tagbao','Talamban','Taptap','Tejero','Tinago','Tisa','To-ong Pardo','Zapatera'))
    and char_length(cebu_address->>'street')<=200
    and (cebu_address->>'postal_code'='' or cebu_address->>'postal_code' ~ '^[0-9]{4}$')
  )
);
create function public.save_cebu_portfolio(
 p_full_name text, p_email text, p_contact_number text, p_address text, p_about_me text,
 p_social_links jsonb, p_education jsonb, p_skills jsonb, p_projects jsonb, p_experience jsonb,
 p_expected_updated_at timestamptz, p_cebu_address jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb; saved public.portfolios%rowtype;
begin
 result := public.save_portfolio_information(p_full_name,p_email,p_contact_number,
   case when p_cebu_address is null then p_address else 'Cebu City, Philippines' end,
   p_about_me,p_social_links,p_education,p_skills,p_projects,p_experience,p_expected_updated_at);
 update public.portfolios set cebu_address=p_cebu_address
 where id=(result->>'id')::uuid and owner_id=auth.uid() returning * into saved;
 if not found then raise exception 'Portfolio unavailable' using errcode='42501'; end if;
 return result || to_jsonb(saved);
end;
$$;
revoke all on function public.save_cebu_portfolio(text,text,text,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,timestamptz,jsonb) from public,anon;
grant execute on function public.save_cebu_portfolio(text,text,text,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,timestamptz,jsonb) to authenticated;
commit;
