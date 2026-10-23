CREATE OR REPLACE FUNCTION public.noo_engine_finish(p_job_id uuid, p_ai jsonb DEFAULT NULL::jsonb, p_error text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare job nawa_engine.api_calls; iid uuid; hh text; inp jsonb; ctx nawa_engine.context; dd nawa_engine.drafts;
 req text; txt text; action text; target text; ver int; rr jsonb; result jsonb; card jsonb; buttons jsonb:='[]'; selected_text text[];
 intent text; payload jsonb; items jsonb:='[]'; item jsonb; grams int; estimate boolean:=false; starts date; ends date; measured date;
 ev public.events; pp public.plans; outcome public.outcomes; summary jsonb; messages jsonb:='[]'; oldday date; newday date; count_events int;
begin
 select * into job from nawa_engine.api_calls where id=p_job_id;
 if not found then raise exception 'job not found' using errcode='42501'; end if;
 iid:=job.identity_id;
 perform 1 from nawa_engine.identities where id=iid and (expires_at is null or expires_at>now()) for update;
 if not found then raise exception 'expired session' using errcode='28000'; end if;
 select * into job from nawa_engine.api_calls where id=p_job_id for update;
 if job.state='done' then return jsonb_build_object('done',true,'http_status',job.http_status,'response',job.response,'replayed',true); end if;
 hh:=nawa_engine.require_ready(iid); inp:=job.input; req:=job.request_id; txt:=nawa_engine.norm(inp->>'text');
 select * into ctx from nawa_engine.context where identity_id=iid;
 if job.context_revision<>ctx.revision then raise exception 'context changed' using errcode='40001'; end if;
 select * into dd from nawa_engine.drafts where identity_id=iid and status='pending' order by updated_at desc limit 1;
 action:=inp->'action'->>'id'; target:=inp->'action'->>'target_id'; ver:=(inp->'action'->>'version')::int;
 if p_error is not null then
  result:=nawa_engine.envelope(iid,req,case when inp->>'type'='voice' then 'تعذر تفريغ الصوت. جرّب تسجيلًا أوضح أو اكتب الأصناف والكميات نصيًا.' else 'تعذر فهم الرسالة الآن. أعد المحاولة أو وضح التفاصيل.' end);
  result:=result||jsonb_build_object('error',jsonb_build_object('code',case when inp->>'type'='voice' then 'AUDIO_TRANSCRIPTION_FAILED' else 'AI_UNAVAILABLE' end,'message_ar',result->>'reply_ar','retryable',true));
  update nawa_engine.api_calls set state='retryable',response=result,http_status=503 where id=job.id;
  return jsonb_build_object('done',true,'http_status',503,'response',result);
 end if;

 if job.route='demo/advance-time' then
  if not exists(select 1 from public.households where id=hh and is_demo) or (inp->>'days')::int not in(2,7) then raise exception 'demo days must be 2 or 7' using errcode='22023'; end if;
  oldday:=public.effective_today(hh);
  perform public.noo_demo_advance(hh,(inp->>'days')::int,req);
  newday:=public.effective_today(hh);
  perform nawa_engine.sweep(iid,oldday+1,newday,true);
  messages:=nawa_engine.web_messages(iid,((newday+time '22:00') at time zone 'Asia/Riyadh'));
  result:=nawa_engine.envelope(iid,req,'صار تاريخ العرض '||newday::text||'. الرسائل المستحقة أدناه مبنية على بيانات تجريبية.',null,'[]',messages,jsonb_build_object('forecast',public.noo_nashra(iid)->'days'));
 elsif job.route in('forecast','nashra') or txt='نشره' then
  perform public.fn_forecast(hh,null);
  result:=nawa_engine.envelope(iid,req,'هذه نشرة أسرتكم للأيام السبعة القادمة 🌱',null,'[]','[]',public.noo_nashra(iid)::jsonb);
 elsif job.route='summary' or txt='ملخص' then
  select jsonb_build_object('from',public.effective_today(hh)-29,'to',public.effective_today(hh),'measurements',count(*),'total_g',coalesce(sum(total_g),0)) into summary
  from public.measurements where household_id=hh and finalized and measured_on between public.effective_today(hh)-29 and public.effective_today(hh);
  result:=nawa_engine.envelope(iid,req,'ملخص آخر 30 يومًا: '||(summary->>'measurements')||' قياس، بإجمالي '||(summary->>'total_g')||' جرام. لا تعني هذه الأرقام وحدها وجود انخفاض.',null,'[]','[]',summary);
 elsif job.route='plans/generate' then
  pp:=nawa_engine.plan(iid,(inp->'data'->>'event_id')::bigint);
  update public.plans set sent_at=coalesce(sent_at,now()) where id=pp.id and (select channel from nawa_engine.identities where id=iid)='web';
  select * into pp from public.plans where id=pp.id;
  update nawa_engine.context set active_plan_id=pp.id,active_event_id=pp.event_id,awaiting='plan_choice' where identity_id=iid;
  result:=nawa_engine.envelope(iid,req,'هذه خطة المناسبة من مكتبة الخطوات 🌱',nawa_engine.plan_card(pp),nawa_engine.plan_buttons(pp.id));
 elsif job.route='outcomes' then
  select * into pp from public.plans where id=(inp->'data'->>'plan_id')::bigint and household_id=hh;
  if not found then raise exception 'plan ownership' using errcode='42501'; end if;
  outcome:=public.fn_record_outcome(pp.id,(inp->'data'->>'measurement_id')::bigint);
  result:=nawa_engine.envelope(iid,req,case when outcome.change_pct is null then 'حفظنا النتيجة، ولا يوجد قياس سابق صالح للمقارنة.' else 'نتيجة المناسبة مقارنة بقياس سابق صالح: '||outcome.change_pct::text||'%.' end,jsonb_build_object('type','outcome','status','saved','data',to_jsonb(outcome)));
 else
  if action is null and dd.id is not null and txt in('صح','تاكيد','احفظ','تمام','عدل','تعديل','الغاء','الغاء القياس','الغاء المناسبه') then
   action:=case when txt in('صح','تاكيد','احفظ','تمام') then 'confirm_' when txt in('عدل','تعديل') then 'edit_' else 'cancel_' end||dd.kind;
   target:=dd.id::text; ver:=dd.version;
  end if;
  if action like 'confirm_%' or action like 'edit_%' or action like 'cancel_%' then
   select * into dd from nawa_engine.drafts where id=target::uuid and identity_id=iid;
   if not found then raise exception 'draft ownership' using errcode='42501'; end if;
   if action<>'confirm_'||dd.kind and action<>'edit_'||dd.kind and action<>'cancel_'||dd.kind then raise exception 'wrong draft type' using errcode='22023'; end if;
   if action like 'edit_%' then
    if ver is distinct from dd.version or dd.status<>'pending' then raise exception 'version conflict' using errcode='40001'; end if;
    update nawa_engine.context set pending=dd.payload,awaiting='edit_'||dd.kind,updated_at=now() where identity_id=iid;
    result:=nawa_engine.envelope(iid,req,'أرسل البيانات كاملة بعد التعديل. لن تُحفظ إلا بعد تأكيد النسخة الجديدة.',nawa_engine.draft_card(dd));
   elsif action like 'cancel_%' then
    rr:=public.noo_draft(iid,req||':draft','cancel',null,null,dd.id,ver);
    update nawa_engine.context set pending=null,awaiting=null,updated_at=now() where identity_id=iid;
    result:=nawa_engine.envelope(iid,req,'ألغيت المسودة، ولم تُحفظ في السجل.');
   else
    rr:=public.noo_draft(iid,req||':draft','confirm',null,null,dd.id,ver);
    if dd.kind='event' then
     select * into ev from public.events where id=(rr->>'event_id')::bigint;
     card:=jsonb_build_object('type','event','status','confirmed','id',ev.id,'data',jsonb_build_object('type',ev.type,'type_ar',nawa_engine.event_label(ev.type),'starts_on',ev.starts_on,'ends_on',ev.ends_on,'guests',ev.guests));
     result:=nawa_engine.envelope(iid,req,'تم حفظ '||nawa_engine.event_label(ev.type)||' بتاريخ '||ev.starts_on::text||' ✅',card,'[]','[]',jsonb_build_object('forecast',public.noo_nashra(iid)->'days'));
    else
     card:=jsonb_build_object('type','measurement','status','confirmed','id',rr->'measurement_id','data',dd.payload||jsonb_build_object('total_g',rr->'total_g'));
     result:=nawa_engine.envelope(iid,req,'تم حفظ القياس ✅ المجموع '||(rr->>'total_g')||' جرام.',card);
     if ctx.active_plan_id is not null and (dd.payload->>'event_id')::bigint=ctx.active_event_id then
      if exists(select 1 from public.measurements m join public.events e on e.id=m.event_id where m.id=(rr->>'measurement_id')::bigint and m.measured_on between e.starts_on and coalesce(e.ends_on,e.starts_on)+3) then
      outcome:=public.fn_record_outcome(ctx.active_plan_id,(rr->>'measurement_id')::bigint);
      messages:=jsonb_build_array(jsonb_build_object('kind','outcome','reply_ar',case when outcome.change_pct is null then 'لا يوجد قياس سابق صالح للمقارنة؛ سجلنا هذه النتيجة كنقطة بداية.' else 'التغير مقارنة بالمناسبة السابقة: '||outcome.change_pct::text||'%.' end,'buttons','[]'::jsonb,'card',jsonb_build_object('type','outcome','status','saved','data',to_jsonb(outcome))));
      result:=result||jsonb_build_object('messages',messages);
      else
       result:=result||jsonb_build_object('messages',jsonb_build_array(jsonb_build_object('kind','text','reply_ar','حُفظ القياس. وصل بعد نافذة متابعة المناسبة (حتى ثلاثة أيام بعد نهايتها)، لذلك لن يُستخدم لحساب نتيجتها أو تحديث التعلم.','buttons','[]'::jsonb)));
      end if;
      update nawa_engine.context set active_plan_id=null,active_event_id=null where identity_id=iid;
     end if;
    end if;
    update nawa_engine.context set pending=null,awaiting=null,updated_at=now() where identity_id=iid;
   end if;
  else
   selected_text:=regexp_match(txt,'^(طبقتها|جزئيا|ما طبقتها|بطبقها|ذكرني|ما تناسبنا) ([0-9]+)$');
   if action is null and selected_text is not null then
    action:=case selected_text[1] when 'طبقتها' then 'adherence_yes' when 'جزئيا' then 'adherence_partial' when 'ما طبقتها' then 'adherence_no' when 'بطبقها' then 'accept_plan' when 'ذكرني' then 'remind_plan' when 'ما تناسبنا' then 'reject_plan' end;
    target:=selected_text[2];select case when action like 'adherence_%' then adherence_version else version end into ver from nawa_engine.plan_state where plan_id=target::bigint;
   end if;
   if action is null and ctx.awaiting='adherence' and txt in('طبقتها','جزئيا','ما طبقتها','نعم','لا','جزئي')
    and (select count(distinct o.plan_id) from nawa_engine.outbox o where o.identity_id=iid and o.kind='followup' and o.status in('sent','available') and not exists(select 1 from public.adherence a where a.plan_id=o.plan_id))>1 then
    select jsonb_agg(jsonb_build_object('id','adherence_yes','label','طبقتها للخطة '||p.id,'target_id',p.id::text,'version',1)) into buttons
    from public.plans p where p.household_id=hh and exists(select 1 from nawa_engine.outbox o where o.identity_id=iid and o.plan_id=p.id and o.kind='followup' and o.status in('sent','available')) and not exists(select 1 from public.adherence a where a.plan_id=p.id);
    result:=nawa_engine.envelope(iid,req,'عندك أكثر من متابعة. اختر الخطة أو اكتب «طبقتها رقم_الخطة» أو «جزئيا رقم_الخطة» أو «ما طبقتها رقم_الخطة».',null,buttons);
    update nawa_engine.api_calls set state='done',response=result,http_status=200 where id=job.id;
    return jsonb_build_object('done',true,'http_status',200,'response',result);
   end if;
   if action is null and ctx.active_plan_id is not null then
    if ctx.awaiting='adherence' then txt:=case txt when 'نعم' then 'طبقتها' when 'لا' then 'ما طبقتها' when 'جزئي' then 'جزئيا' else txt end;end if;
    action:=case txt when 'طبقتها' then 'adherence_yes' when 'جزئيا' then 'adherence_partial' when 'ما طبقتها' then 'adherence_no'
    when 'بطبقها' then 'accept_plan' when 'ذكرني' then 'remind_plan' when 'ذكرني بكره' then 'remind_plan' when 'ما تناسبنا' then 'reject_plan' end;
    if action is not null then target:=ctx.active_plan_id::text; select case when action like 'adherence_%' then adherence_version else version end into ver from nawa_engine.plan_state where plan_id=ctx.active_plan_id; end if;
   end if;
   if job.route='plans/adherence' then action:='adherence_'||(inp->'data'->>'answer'); target:=inp->'data'->>'plan_id'; ver:=(inp->'data'->>'version')::int; end if;
   if action in('accept_plan','remind_plan','reject_plan','adherence_yes','adherence_partial','adherence_no','measure_plan') then
    select * into pp from public.plans where id=target::bigint and household_id=hh for update;
    if not found then raise exception 'plan ownership' using errcode='42501'; end if;
    if action in('accept_plan','remind_plan','reject_plan') then
     if ver is distinct from (select version from nawa_engine.plan_state where plan_id=pp.id) then raise exception 'plan version conflict' using errcode='40001'; end if;
     update nawa_engine.plan_state set choice=case action when 'accept_plan' then 'accepted' when 'remind_plan' then 'remind' else 'rejected' end,
      remind_on=case when action='remind_plan' then public.effective_today(hh)+1 end,version=version+1,updated_at=now() where plan_id=pp.id;
     result:=nawa_engine.envelope(iid,req,case action when 'accept_plan' then 'تمام 🌱 سنسأل عن التطبيق بعد المناسبة.' when 'remind_plan' then 'سأذكرك بالخطة غدًا.' else 'سجلت أن الخطة لا تناسبكم. لن نرسل تذكير المناسبة لهذه الخطة.' end,nawa_engine.plan_card(pp));
    else
     if action<>'measure_plan' then
      if ver is distinct from (select adherence_version from nawa_engine.plan_state where plan_id=pp.id) then raise exception 'adherence version conflict' using errcode='40001';end if;
      insert into public.adherence(plan_id,answer) values(pp.id,replace(action,'adherence_','')) on conflict(plan_id) do update set answer=excluded.answer,answered_at=now();
      update nawa_engine.plan_state set adherence_version=adherence_version+1 where plan_id=pp.id;
     end if;
     update nawa_engine.context set active_plan_id=pp.id,active_event_id=pp.event_id,awaiting='measurement',updated_at=now() where identity_id=iid;
     result:=nawa_engine.envelope(iid,req,'سجلت الإجابة 🌱 أرسل الآن أصناف هدر هذه المناسبة وكمياتها، نصًا أو صوتًا.');
    end if;
   elsif txt in('صح','تاكيد','احفظ','تمام','الغاء','الغاء القياس','الغاء المناسبه') then
    result:=nawa_engine.envelope(iid,req,'لا توجد مسودة تنتظر هذا الإجراء. أرسل القياس أو المناسبة أولًا.');
   elsif txt='مساعده' then
    result:=nawa_engine.envelope(iid,req,'سجل الهدر بالأصناف والكميات، أو اذكر مناسبة. اكتب «نشرة» أو «ملخص». «إيقاف» يوقف الرسائل.');
   else
    if job.route='measurements' then intent:='measurement'; payload:=inp->'data';
    else intent:=p_ai->>'intent'; payload:=p_ai->intent; end if;
    if intent='event' then
     if payload is null then raise exception 'event payload required' using errcode='22023'; end if;
     if payload->>'type' not in('gathering','travel','ramadan_iftar','eid','other') then raise exception 'invalid event type' using errcode='22023'; end if;
     if coalesce((payload->>'needs_clarification')::boolean,false) or payload->>'starts_on' is null then
      update nawa_engine.context set pending=jsonb_build_object('intent','event','event',payload,'text',coalesce(inp->>'text',p_ai->>'transcript')),awaiting='event_date',updated_at=now() where identity_id=iid;
      update public.households set conversation_stage='awaiting_clarification' where id=hh;
      result:=nawa_engine.envelope(iid,req,coalesce(nullif(payload->>'question_ar',''),'متى موعد '||nawa_engine.event_label(payload->>'type')||'؟'));
     else
      starts:=(payload->>'starts_on')::date; ends:=(payload->>'ends_on')::date;
      if starts<public.effective_today(hh) or ends<starts or (payload->>'guests')::int not between 1 and 1000 then raise exception 'invalid event fields' using errcode='22023'; end if;
      payload:=jsonb_build_object('type',payload->>'type','starts_on',starts,'ends_on',ends,'guests',(payload->>'guests')::int,'raw_text',coalesce(inp->>'text',p_ai->>'transcript'));
      if dd.id is not null then
       if dd.kind<>'event' then raise exception 'another draft is pending' using errcode='40001'; end if;
       rr:=public.noo_draft(iid,req||':draft','edit',null,payload,dd.id,dd.version);
      else rr:=public.noo_draft(iid,req||':draft','create','event',payload); end if;
      select * into dd from nawa_engine.drafts where id=(rr->>'draft_id')::uuid;
      result:=nawa_engine.envelope(iid,req,'فهمت: '||nawa_engine.event_label(payload->>'type')||' يوم '||starts::text||coalesce(' لـ'||(payload->>'guests')||' شخص','')||'. صحيح؟ لم تُحفظ بعد.',nawa_engine.draft_card(dd),nawa_engine.draft_buttons(dd));
     end if;
    elsif intent='measurement' then
     if payload is null or jsonb_typeof(payload->'items') is distinct from 'array' then raise exception 'measurement items required' using errcode='22023'; end if;
     for item in select value from jsonb_array_elements(payload->'items') loop
      grams:=(item->>'grams')::int;
      if item->>'unit_ar' is not null then
       select round(u.grams_est*coalesce((item->>'quantity')::numeric,1)) into grams from public.food_units u
       where nawa_engine.norm(u.unit_ar)=nawa_engine.norm(item->>'unit_ar') and u.category in(coalesce(item->>'category','any'),'any') order by (u.category<>'any') desc limit 1;
       estimate:=true;
      end if;
      if grams is null then
       update nawa_engine.context set pending=jsonb_build_object('intent','measurement','measurement',payload,'text',coalesce(inp->>'text',p_ai->>'transcript')),awaiting='quantity',updated_at=now() where identity_id=iid;
       update public.households set conversation_stage='awaiting_clarification' where id=hh;
       result:=nawa_engine.envelope(iid,req,'كم كمية '||coalesce(item->>'item_ar','الصنف')||'؟ اكتب وزنًا أو وحدة مثل «نص قدر».'); exit;
      end if;
      items:=items||jsonb_build_array(item||jsonb_build_object('grams',grams,'reason',coalesce(item->>'reason','other'),'category',coalesce(item->>'category','other'),'confidence',coalesce((item->>'confidence')::real,1)));
     end loop;
     if result is null then
      measured:=coalesce((payload->>'measured_on')::date,public.effective_today(hh));
      if ctx.active_plan_id is not null and ctx.awaiting='measurement' then
       payload:=payload||jsonb_build_object('event_id',ctx.active_event_id);
      end if;
      payload:=jsonb_build_object('items',items,'measured_on',measured,'source',case when inp->>'type'='voice' then 'voice' else 'text' end,
       'event_id',payload->'event_id','transcript',coalesce(p_ai->>'transcript',inp->>'text'),'estimated',estimate);
      if dd.id is not null then
       if dd.kind<>'measurement' then raise exception 'another draft is pending' using errcode='40001'; end if;
       rr:=public.noo_draft(iid,req||':draft','edit',null,payload,dd.id,dd.version);
      else rr:=public.noo_draft(iid,req||':draft','create','measurement',payload); end if;
      select * into dd from nawa_engine.drafts where id=(rr->>'draft_id')::uuid;
      result:=nawa_engine.envelope(iid,req,'هذا القياس للمراجعة: '||(select sum((x->>'grams')::int)::text from jsonb_array_elements(items)x)||' جرام بتاريخ '||measured::text||case when estimate then '، والوزن تقريبي من قاموس الوحدات' else '' end||'. اكتب «صح» للحفظ أو «عدّل» أو «إلغاء».',nawa_engine.draft_card(dd),nawa_engine.draft_buttons(dd));
     end if;
    else
     result:=nawa_engine.envelope(iid,req,coalesce(nullif(p_ai->>'question_ar',''),'أرسل أصناف الهدر وكمياتها، أو نوع المناسبة وموعدها.'));
    end if;
   end if;
  end if;
 end if;
 update nawa_engine.api_calls set state='done',response=result,http_status=200 where id=job.id;
 return jsonb_build_object('done',true,'http_status',200,'response',result);
exception
 when sqlstate '42501' or sqlstate '28000' then
  result:=nawa_engine.failure(req,'FORBIDDEN','لا تملك صلاحية هذا الإجراء أو انتهت الجلسة.');
  return jsonb_build_object('done',true,'http_status',403,'response',result);
 when sqlstate '40001' or unique_violation then
  result:=nawa_engine.failure(req,'VERSION_CONFLICT','تغيرت المسودة أو الخطة. راجع النسخة الحالية قبل التأكيد.');
  return jsonb_build_object('done',true,'http_status',409,'response',result);
 when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or check_violation or sqlstate '22023' then
  result:=nawa_engine.failure(req,'INVALID_DATA','لم تُحفظ بيانات غير صالحة. راجع التاريخ والكميات وبيانات الإجراء.');
  return jsonb_build_object('done',true,'http_status',400,'response',result);
 when others then
  if current_user='postgres' and current_setting('nawa_engine.debug',true)='on' then raise; end if;
  result:=nawa_engine.failure(req,'ENGINE_ERROR','تعذر إكمال العملية الآن دون حفظ جزئي. حاول مرة أخرى.',true);
  return jsonb_build_object('done',true,'http_status',503,'response',result);
end $function$
