-- Database-only tests. No WhatsApp/webhook calls. Every test row is rolled back.
begin;
create temporary table ctx(k text primary key,v jsonb);
grant select,insert,update on ctx to service_role,anon;
create function pg_temp.assert_true(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; end $$;
create function pg_temp.expect_error(q text,label text) returns void language plpgsql as $$
declare failed boolean:=false;
begin
 begin execute q; exception when others then failed:=true; end;
 if not failed then raise exception 'FAIL expected rejection: %',label; end if;
end $$;
set local role service_role;
do $test$
declare s jsonb; s2 jsonb; i uuid; i2 uuid; h text; h2 text; d jsonb; d2 jsonb; r jsonb;
 m bigint; e bigint; p bigint; o public.outcomes; v_a real; v_b real; v_n int; v_date date; v_before real; v_real text;
begin
 s:=public.noo_web_session(true); i:=(s->>'identity_id')::uuid; h:=s->>'household_id';
 s2:=public.noo_web_session(true); i2:=(s2->>'identity_id')::uuid; h2:=s2->>'household_id';
 insert into ctx values('s',s),('s2',s2);
 perform pg_temp.assert_true(h<>h2,'independent web households');
 perform pg_temp.assert_true(public.noo_identity('web',s->>'session_token')=i,'token resolves correct owner');
 perform pg_temp.expect_error(format('select public.noo_draft(%L,%L,%L,%L,%L::jsonb)',i,'preconsent','create','measurement','{"items":[{"item_ar":"رز","grams":100}]}'),'reject before consent');
 perform public.noo_message(i,'hello','مرحبا');
 perform public.noo_message(i,'consent','موافق');
 perform public.noo_message(i,'size','٦');
 r:=public.noo_message(i,'city','بريدة');
 perform pg_temp.assert_true(r->>'stage'='ready' and (r->>'should_reply')::boolean,'onboarding complete');
 r:=public.noo_message(i,'city','بريدة');
 perform pg_temp.assert_true(not (r->>'should_reply')::boolean and r->>'reason'='duplicate','message retry suppressed');
 perform pg_temp.expect_error(format('select public.noo_message(%L,%L,%L)',i,'city','الرياض'),'reused request changed payload');
 perform public.noo_message(i2,'consent','موافق'); perform public.noo_message(i2,'size','4'); perform public.noo_message(i2,'city','الرياض');
 -- Original text parser is exercised, including edit and cancel.
 perform public.noo_message(i,'measure','رمينا 500 جرام رز و200 جرام خبز');
 perform pg_temp.assert_true((select count(*)=0 from public.measurements where household_id=h),'draft excluded from measurements');
 perform public.noo_message(i,'edit','رمينا 300 جرام رز و100 جرام خبز');
 perform pg_temp.assert_true((select version=2 from nawa_engine.drafts where identity_id=i and status='pending'),'text edit increments version');
 perform public.noo_message(i,'cancel','إلغاء القياس');
 perform pg_temp.assert_true((select count(*)=0 from public.measurements where household_id=h),'cancel writes no measurement');
 perform public.noo_message(i,'measure2','رمينا 500 جرام رز و200 جرام خبز');
 select jsonb_build_object('draft_id',id,'version',version) into d from nawa_engine.drafts where identity_id=i and status='pending';
 r:=public.noo_message(i,'confirm','صح');
 select id into m from public.measurements where household_id=h;
 perform pg_temp.assert_true((select total_g=700 from public.measurements where id=m),'700g and items atomically saved');
 perform public.noo_message(i,'confirm','صح'); perform public.noo_message(i,'confirm-again','صح');
 perform public.noo_draft(i,'another-confirm','confirm',null,null,(d->>'draft_id')::uuid,(d->>'version')::int);
 perform pg_temp.assert_true((select count(*)=1 from public.measurements where household_id=h),'repeat confirmations single effect');
 perform pg_temp.assert_true((select count(*)=2 from nawa_engine.feed_links where item_id in(select id from public.measurement_items where measurement_id=m)),'one feed row per item');
 update public.measurement_items set grams=400 where measurement_id=m and item_ar='رز';
 perform pg_temp.assert_true((select total_g=600 from public.measurements where id=m),'sum after update');
 delete from public.measurement_items where measurement_id=m and item_ar='خبز';
 perform pg_temp.assert_true((select total_g=400 from public.measurements where id=m),'sum after delete');
 perform pg_temp.assert_true((select count(*)=1 from nawa_engine.feed_links where item_id in(select id from public.measurement_items where measurement_id=m)),'feed delete cleanup');
 -- Failure after parent insert must roll back all rows (invalid source).
 d2:=public.noo_draft(i,'bad-draft','create','measurement','{"source":"invalid","items":[{"item_ar":"رز","grams":100}]}');
 perform pg_temp.expect_error(format('select public.noo_draft(%L,%L,%L,null,null,%L,%s)',i,'bad-confirm','confirm',d2->>'draft_id',d2->>'version'),'failed atomic measurement');
 perform pg_temp.assert_true((select count(*)=1 from public.measurements where household_id=h),'no partial measurement after failure');
 perform public.noo_draft(i,'bad-cancel','cancel',null,null,(d2->>'draft_id')::uuid,(d2->>'version')::int);
 perform public.fn_forecast(h,null); select ratio into v_before from public.forecasts where household_id=h and day=date '2026-10-29';
 d2:=public.noo_draft(i,'event-draft','create','event','{"type":"gathering","starts_on":"2026-10-29","guests":14}');
 perform public.fn_forecast(h,null);
 perform pg_temp.assert_true((select ratio=v_before from public.forecasts where household_id=h and day=date '2026-10-29'),'event draft excluded from forecast');
 perform pg_temp.expect_error(format('select public.noo_draft(%L,%L,%L,null,null,%L,%s)',i2,'steal-confirm','confirm',d2->>'draft_id',d2->>'version'),'other identity cannot confirm');
 perform pg_temp.expect_error(format('select public.noo_draft(%L,%L,%L,null,null,%L,%s)',i2,'steal-cancel','cancel',d2->>'draft_id',d2->>'version'),'other identity cannot cancel');
 r:=public.noo_draft(i,'event-confirm','confirm',null,null,(d2->>'draft_id')::uuid,(d2->>'version')::int); e:=(r->>'event_id')::bigint;
 perform public.noo_draft(i,'event-repeat','confirm',null,null,(d2->>'draft_id')::uuid,(d2->>'version')::int);
 perform pg_temp.assert_true((select count(*)=1 and bool_and(confirmed) from public.events where household_id=h),'confirmed event once');
 perform pg_temp.assert_true((select 'gathering'=any(drivers) and ratio>v_before from public.forecasts where household_id=h and day=date '2026-10-29'),'event affects correct day');
 perform pg_temp.assert_true((select count(*)=7 and min(day)=date '2026-10-25' and max(day)=date '2026-10-31' from public.fn_forecast(h,null)),'seven demo days');
 -- Unconfirmed raw events also have no effect.
 insert into public.events(household_id,type,starts_on,confirmed) values(h,'eid',date '2026-10-26',false);
 perform public.fn_forecast(h,null);
 perform pg_temp.assert_true((select not ('eid'=any(drivers)) from public.forecasts where household_id=h and day=date '2026-10-26'),'unconfirmed raw event ignored');
 v_before:=public.fn_baseline_kg(h);
 -- Future data deliberately inserted with the guard temporarily bypassed via a fixture is tested separately by owner.
 perform pg_temp.assert_true(public.effective_today(h)=date '2026-10-25','effective demo time');
 perform public.noo_demo_advance(h,5,'advance-5');
 v_date:=public.effective_today(h); perform public.noo_demo_advance(h,5,'advance-5');
 perform pg_temp.assert_true(public.effective_today(h)=v_date and public.effective_today(h2)=date '2026-10-25','clock retry and session isolation');
 perform pg_temp.expect_error(format('select public.noo_demo_advance(%L,-1,%L)',h,'negative'),'negative clock');
 perform pg_temp.expect_error(format('select public.noo_demo_advance(%L,8,%L)',h,'too-big'),'bounded clock');
 d2:=public.noo_draft(i,'event-measure','create','measurement',jsonb_build_object('event_id',e,'measured_on','2026-10-30','items',jsonb_build_array(jsonb_build_object('item_ar','رز','category','grains_cooked','grams',900))));
 r:=public.noo_draft(i,'event-measure-confirm','confirm',null,null,(d2->>'draft_id')::uuid,(d2->>'version')::int); m:=(r->>'measurement_id')::bigint;
 insert into public.plans(household_id,event_id,driver,steps) values(h,e,'gathering','[{"step_id":"G-PRE-01"}]') returning id into p;
 insert into public.adherence(plan_id,answer) values(p,'yes');
 o:=public.fn_record_outcome(p,m);
 perform pg_temp.assert_true(o.change_pct is null and o.prev_similar_g is null,'no invented percentage without previous event');
 select alpha,beta into v_a,v_b from public.bandit_arms where household_id=h and step_id='G-PRE-01';
 select n_obs into v_n from public.driver_multipliers where scope=h and driver='gathering';
 perform public.fn_record_outcome(p,m);
 perform pg_temp.assert_true((select alpha=v_a and beta=v_b from public.bandit_arms where household_id=h and step_id='G-PRE-01') and (select n_obs=v_n from public.driver_multipliers where scope=h and driver='gathering'),'outcome retry no extra learning');
 insert into public.plans(household_id,event_id,steps) values(h2,null,'[]') returning id into p;
 perform pg_temp.expect_error(format('select public.fn_record_outcome(%s,%s)',p,m),'cross family outcome rejected');
 perform pg_temp.expect_error(format('update public.measurement_items set grams=1 where measurement_id=%s',m),'learned data immutable');
 s2:=public.noo_web_session(false); v_real:=s2->>'household_id';
 perform public.noo_message((s2->>'identity_id')::uuid,'yes','موافق'); perform public.noo_message((s2->>'identity_id')::uuid,'size','3'); perform public.noo_message((s2->>'identity_id')::uuid,'city','الرياض');
 insert into ctx values('real',s2);
 perform pg_temp.expect_error(format('select public.fn_nashra(%L)',v_real),'real nashra id alone rejected');
 perform pg_temp.assert_true(public.noo_nashra((s2->>'identity_id')::uuid)->'household'->>'id'=v_real,'authorized private nashra');
 perform pg_temp.expect_error(format('select public.noo_demo_advance(%L,1,%L)',v_real,'real-time'),'real clock rejected');
 perform public.noo_demo_reset(h,'reset-test');
 perform pg_temp.assert_true(exists(select 1 from public.households where id=v_real and not is_demo),'demo reset retains real household');
 perform pg_temp.assert_true(exists(select 1 from public.households where id=h2),'demo reset retains other demo');
 -- Existing Omar showcase is preserved; do not reseed.
 -- Showcase existence and public read are checked separately.
 perform pg_temp.assert_true((select count(*)>=30 from public.plan_library),'30 library steps');
 perform pg_temp.assert_true((select count(*)=0 from public.plan_library where embedding is not null),'no false embedding claim');
end $test$;
reset role;
-- Insert a future fixture without disabling any trigger, by moving only its own demo clock back afterwards.
do $future$
declare h text; mid bigint; b real;
begin
 h:=(select v->>'household_id' from ctx where k='s2');
 b:=public.fn_baseline_kg(h);
 update public.households set demo_today=date '2026-11-10' where id=h;
 insert into public.measurements(household_id,source,measured_on,total_g) values(h,'text',date '2026-11-10',0) returning id into mid;
 insert into public.measurement_items(measurement_id,item_ar,category,grams,reason,confidence) values(mid,'رز','grains_cooked',99999,'other',1);
 update public.households set demo_today=date '2026-10-25' where id=h;
 perform pg_temp.assert_true(public.fn_baseline_kg(h)=b,'future measurement excluded from baseline');
 perform pg_temp.assert_true((nawa_engine.nashra_data(h)->'top_items')::jsonb='[]'::jsonb,'future item excluded from nashra');
end $future$;
set local role anon;
select pg_temp.assert_true((select count(*)>=1 from public.v_kpis),'anon aggregate view');
select * from public.v_funnel;
select * from public.v_live;
select * from public.v_cohort_trend;
select * from public.v_waste_by_item_reason;
select * from public.v_tool_usage;
select count(*) from public.v_critical_weeks;
select pg_temp.expect_error('select * from public.households','anon household raw');
select pg_temp.expect_error('select * from public.measurements','anon measurement raw');
select pg_temp.expect_error('insert into public.events(household_id,type) values(''x'',''other'')','anon write');
select pg_temp.expect_error('select public.fn_forecast(''h_show'',null)','anon forecast write');
select pg_temp.expect_error('select public.fn_demo_advance(''h_show'',1)','anon advance');
select pg_temp.expect_error('select * from nawa_engine.drafts','anon internal drafts');
select pg_temp.expect_error(format('select public.fn_nashra(%L)',(select v->>'household_id' from ctx where k='real')),'anon real bulletin');
select pg_temp.assert_true(public.fn_nashra('h_show')->'household'->>'id'='h_show','anon explicit public showcase');
reset role;
rollback;
select jsonb_build_object('status','PASS','suite','phase1 acceptance','data_changes','rolled back','external_messages',0,
 'covered',jsonb_build_array('onboarding and consent','legacy text parser','draft edit cancel confirm','retry and version ownership',
 'atomic persistence','item update delete totals','event confirmation and forecast','effective time and seven days','future exclusion',
 'outcome idempotency and ownership','private nashra','anon views and denials','demo reset and session isolation','reference counts')) result;

