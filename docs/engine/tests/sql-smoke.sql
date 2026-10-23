begin;
set local nawa_engine.debug='on';
do $smoke$
declare r jsonb; s jsonb; q jsonb; job uuid; i uuid; h text; nonce text:=repeat('a',64); av double precision;
begin
 q:=jsonb_build_object('route','channels/web/inbound','_channel','web','request_id',gen_random_uuid(),'client_nonce',nonce,'session',null,'type','text','text','مرحبا');
 r:=public.noo_engine_prepare(q); s:=r->'session';
 if (r->>'http_status')::int<>200 or s->>'token' is null then raise exception 'bootstrap failed: %',r; end if;
 i:=(s->>'id')::uuid;h:=r->'response'->>'household_id';
 r:=public.noo_engine_prepare(q);
 if r->'session'<>s or not (r->>'replayed')::boolean then raise exception 'bootstrap retry failed'; end if;
 for av in select generate_series(1,3)::double precision loop
  q:=jsonb_build_object('route','channels/web/inbound','_channel','web','request_id',gen_random_uuid(),'session',s,'type','text','text',case av when 1 then 'موافق' when 2 then '6' else 'بريدة' end);
  r:=public.noo_engine_prepare(q);
  if (r->>'http_status')::int<>200 then raise exception 'onboarding failed: %',r; end if;
 end loop;
 if r->'response'->>'stage'<>'ready' then raise exception 'not ready: %',r; end if;
 q:=jsonb_build_object('route','channels/web/inbound','_channel','web','request_id',gen_random_uuid(),'session',s,'type','text','text','رمينا 500 جرام رز و200 جرام خبز');
 r:=public.noo_engine_prepare(q);
 if (r->>'done')::boolean then raise exception 'expected AI job'; end if;
 job:=(r->>'job_id')::uuid;
 r:=public.noo_engine_finish(job,'{"intent":"measurement","measurement":{"items":[{"item_ar":"رز","grams":500},{"item_ar":"خبز","grams":200}]}}');
 if (r->>'http_status')::int<>200 or r->'response'->'card'->>'status'<>'draft' then raise exception 'draft failed %',r; end if;
 q:=jsonb_build_object('route','channels/web/inbound','_channel','web','request_id',gen_random_uuid(),'session',s,'type','text','text','صح');
 r:=public.noo_engine_prepare(q);
 if r->'response'->'card'->>'status'<>'confirmed' then raise exception 'confirm failed %',r; end if;
 if (select sum(total_g) from public.measurements where household_id=h)<>700 then raise exception 'total wrong'; end if;
 perform setseed(0.42);
 select avg(nawa_engine.beta_sample(9,1)) into av from generate_series(1,5000);
 if abs(av-0.9)>0.02 then raise exception 'Beta sampling mean failed: %',av; end if;
end $smoke$;
rollback;
select 'PASS: SQL bootstrap, onboarding, draft, confirmation, retry, Beta(9,1) sampling; rolled back' result;
