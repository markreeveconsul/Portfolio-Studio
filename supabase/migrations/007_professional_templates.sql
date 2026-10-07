-- Apply once after 006. Adds two choices; existing selections and permissions stay intact.
begin;
alter table public.portfolios drop constraint portfolios_template_check;
alter table public.portfolios add constraint portfolios_template_check check (template in ('simple','modern','creative','resume','showcase'));
commit;
