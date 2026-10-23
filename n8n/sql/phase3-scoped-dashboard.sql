-- Aggregate-only scope reads; original household rows and flags are preserved.
create or replace function public.noo_dashboard_read(p_scope text default 'demo')
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $body$
declare view_name text; key_name text; definition text; query_text text; rows_json jsonb; result jsonb;
begin
 if p_scope not in ('demo','real') then raise exception 'invalid scope' using errcode='22023'; end if;
 result := jsonb_build_object('scope',p_scope,'includes_synthetic_demo',p_scope='demo');
 foreach view_name in array array['v_kpis','v_funnel','v_cohort_trend','v_waste_by_item_reason'] loop
  definition := rtrim(pg_get_viewdef(('public.'||view_name)::regclass,true),';'||E'\n ');
  if view_name='v_kpis' then
   definition := replace(definition,'m.event_id = e.id AND m.measured_on >= e.starts_on',
    'm.event_id = e.id AND m.household_id = e.household_id AND m.finalized AND m.measured_on <= CASE WHEN h.is_demo THEN coalesce(h.demo_today,(now() at time zone ''Asia/Riyadh'')::date) ELSE (now() at time zone ''Asia/Riyadh'')::date END AND m.measured_on >= e.starts_on');
  elsif view_name='v_funnel' then
   definition := $funnel$
    with e as (
     select e.* from public.events e join public.households h on h.id=e.household_id
     where h.cohort='nawa' and e.confirmed and e.starts_on<=case when h.is_demo then coalesce(h.demo_today,(now() at time zone 'Asia/Riyadh')::date) else (now() at time zone 'Asia/Riyadh')::date end
    ), p as (select distinct e.id from e join public.plans p on p.event_id=e.id and p.household_id=e.household_id where p.sent_at is not null),
    a as (select distinct p.id from p join public.plans pl on pl.event_id=p.id join public.adherence a on a.plan_id=pl.id where a.answer in ('yes','partial')),
    r as (select distinct a.id from a join e on e.id=a.id join public.measurements m on m.event_id=e.id and m.household_id=e.household_id join public.households h on h.id=e.household_id where m.finalized and m.measured_on>=e.starts_on and m.measured_on<=case when h.is_demo then coalesce(h.demo_today,(now() at time zone 'Asia/Riyadh')::date) else (now() at time zone 'Asia/Riyadh')::date end)
    select 1 stage_order,'مناسبات مؤكدة حان موعدها'::text stage_ar,(select count(*) from e) count
    union all select 2,'أُتيحت لها خطة',(select count(*) from p)
    union all select 3,'سُجل تطبيقها كليًا أو جزئيًا',(select count(*) from a)
    union all select 4,'أُعيد القياس بعد التطبيق',(select count(*) from r)
   $funnel$;
  end if;
  definition := regexp_replace(definition,'\mhouseholds\M','scoped_households','g');
  definition := replace(definition,'public.scoped_households','scoped_households');
  query_text := 'WITH scoped_households AS (select * from public.households where (is_demo or id ~ ''^d_[0-9]+$'') = $1) ';
  if definition ~* '^\s*WITH\s' then query_text := query_text || ', ' || regexp_replace(definition,'^\s*WITH\s+','','i');
  else query_text := query_text || definition; end if;
  execute 'select coalesce(jsonb_agg(to_jsonb(scoped_row)),''[]''::jsonb) from ('||query_text||') scoped_row' into rows_json using p_scope='demo';
  if view_name='v_kpis' then select coalesce(jsonb_agg((r-'scoped_households')||jsonb_build_object('households',r->'scoped_households')),'[]'::jsonb) into rows_json from jsonb_array_elements(rows_json) r; end if;
  key_name := case view_name when 'v_kpis' then 'kpis' when 'v_funnel' then 'funnel' when 'v_cohort_trend' then 'trend' else 'waste' end;
  result := result || jsonb_build_object(key_name,rows_json);
 end loop;
 select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into rows_json from
 (select c.tool,count(*) as clicks from public.tool_clicks c join public.households h on h.id=c.household_id
 where (h.is_demo or h.id ~ '^d_[0-9]+$')=(p_scope='demo') group by c.tool) t;
 return result || jsonb_build_object('tools',rows_json);
end $body$;
revoke all on function public.noo_dashboard_read(text) from public;
grant execute on function public.noo_dashboard_read(text) to anon,authenticated,service_role;
comment on function public.noo_dashboard_read(text) is 'Intentional anonymous aggregate-only API; no household identifiers or private rows are returned. d_001..d_200 are the original synthetic seed dataset.';

alter table public.live_feed add column if not exists is_demo boolean not null default true;
update public.live_feed f set is_demo=(h.is_demo or h.id ~ '^d_[0-9]+$')
from nawa_engine.feed_links l join public.measurement_items mi on mi.id=l.item_id
join public.measurements m on m.id=mi.measurement_id join public.households h on h.id=m.household_id
where f.id=l.feed_id;
do $fix$ declare definition text; begin
 definition:=pg_get_functiondef('public.trg_live_feed()'::regprocedure);
 if position('reason_ar,source,is_demo' in definition)=0 then
  definition:=replace(definition,'insert into public.live_feed(city,item_ar,grams,reason_ar,source)','insert into public.live_feed(city,item_ar,grams,reason_ar,source,is_demo)');
  definition:=replace(definition,'public.fn_reason_ar(new.reason),m.source from public.measurements m',
    'public.fn_reason_ar(new.reason),m.source,(select h.is_demo or h.id ~ ''^d_[0-9]+$'' from public.households h where h.id=m.household_id) from public.measurements m');
  execute definition;
 end if;
end $fix$;
create or replace view public.v_live with(security_invoker=true) as
select id,city,item_ar,grams,reason_ar,created_at,is_demo from public.live_feed order by created_at desc limit 50;
grant select on public.v_live to anon,authenticated;
