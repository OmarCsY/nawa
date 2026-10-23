create or replace function nawa_engine.nashra_data(p_household text) returns json
language sql stable set search_path='' as $body$
select json_build_object(
 'household',(select json_build_object('id',h.id,'size',h.size,'city',h.city,'today',public.effective_today(h.id),'is_demo',h.is_demo) from public.households h where h.id=p_household),
 'days',coalesce((select json_agg(x order by x.day) from (
  select f.day,f.level,f.expected_kg,f.ratio,f.drivers,f.reason_ar,f.items_at_risk,
   (select p.steps from public.plans p join public.events e on e.id=p.event_id
    where p.household_id=p_household and e.household_id=p_household and e.confirmed and e.starts_on=f.day and p.sent_at is not null order by p.created_at desc limit 1) as plan
  from public.forecasts f where f.household_id=p_household and f.day between public.effective_today(p_household) and public.effective_today(p_household)+6
 ) x),'[]'::json),
 'events',coalesce((select json_agg(x order by x.starts_on) from (
  select e.type,e.starts_on,e.ends_on,e.guests from public.events e where e.household_id=p_household and e.confirmed
  and e.starts_on<=public.effective_today(p_household)+6 and coalesce(e.ends_on,e.starts_on)>=public.effective_today(p_household)-1
 ) x),'[]'::json),
 'top_items',coalesce((select json_agg(t) from (
  select mi.item_ar,sum(mi.grams) grams,round(100.0*sum(mi.grams)/nullif(sum(sum(mi.grams)) over(),0)) share
  from public.measurement_items mi join public.measurements m on m.id=mi.measurement_id
  where m.household_id=p_household and m.finalized and m.measured_on between public.effective_today(p_household)-60 and public.effective_today(p_household)
  group by mi.item_ar order by sum(mi.grams) desc limit 5)t),'[]'::json),
 'last_outcome',(select json_build_object('actual_g',o.actual_g,'prev_similar_g',o.prev_similar_g,'change_pct',o.change_pct)
  from public.outcomes o join public.plans p on p.id=o.plan_id join public.measurements m on m.id=o.measurement_id
  where p.household_id=p_household and m.measured_on<=public.effective_today(p_household) order by m.measured_on desc,o.created_at desc limit 1)
)
$body$;
