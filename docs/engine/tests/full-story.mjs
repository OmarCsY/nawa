import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const base='https://automations-n8n.gkrgfu.easypanel.host/webhook/noo-engine/v1/';let session=null;const steps=[];
async function call(route,body={},audio){const req={request_id:crypto.randomUUID(),session,...body};if(!session)req.client_nonce=crypto.randomBytes(32).toString('hex');let payload=JSON.stringify(req),headers={'Content-Type':'application/json',Origin:'https://nawa-litadoom.vercel.app'};if(audio){payload=new FormData();payload.append('metadata',JSON.stringify(req));payload.append('audio',new Blob([fs.readFileSync(new URL('./fixtures/synthetic-voice.m4a',import.meta.url))],{type:'audio/mp4'}),'sample.m4a');headers={Origin:'https://nawa-litadoom.vercel.app'};}const r=await fetch(base+route,{method:'POST',headers,body:payload});const b=await r.json();assert.equal(r.status,200,b.error?.code);session=b.session||session;steps.push({route,input:audio?'صوتية تجريبية: 500 جرام رز و200 جرام خبز':body.text||body.action?.id||body,reply:{...b,session:b.session?{id:'REDACTED',token:'REDACTED'}:null}});console.log('PASS',route,b.stage,b.card?.type||'');return b;}
await call('channels/web/inbound',{text:'مرحبا'});for(const text of ['موافق','4','الرياض'])await call('channels/web/inbound',{text});
let d=await call('measurements',{data:{items:[{item_ar:'رز',category:'grains_cooked',grams:2000,reason:'other'},{item_ar:'خبز',category:'bread',grams:1000,reason:'other'}]}});await call('channels/web/inbound',{type:'action',action:d.buttons.find(x=>x.id==='confirm_measurement')});
let ev=await call('events/parse',{text:'الخميس الجاي عندنا عزيمة 14 شخص'});assert.equal(ev.card?.type,'event');let saved=await call('channels/web/inbound',{type:'action',action:ev.buttons.find(x=>x.id==='confirm_event')});
let p=await call('plans/generate',{data:{event_id:saved.card.id}});assert.equal(p.card?.type,'plan');let planId=p.card.id;
await call('channels/web/inbound',{type:'action',action:p.buttons.find(x=>x.id==='accept_plan')});
await call('demo/advance-time',{days:7});await call('channels/web/inbound',{text:'طبقتها'});
d=await call('measurements/voice',{type:'voice'},true);let result=await call('channels/web/inbound',{type:'action',action:d.buttons.find(x=>x.id==='confirm_measurement')});
const outcome=result.messages.find(x=>x.card?.type==='outcome')?.card;assert(outcome,'Outcome card missing');assert(outcome.data.change_pct===null||typeof outcome.data.change_pct==='number');
await call('summary');await call('forecast');
// Session credentials intentionally are not written to disk.
fs.writeFileSync(new URL('./full-story-results.local.json',import.meta.url),JSON.stringify({timestamp:new Date().toISOString(),provider:'real Gemini',project_ref:'xjegeggcsemvytfnvzez',plan_id:planId,steps},null,2));
console.log('PASS complete production story, outcome percent',outcome.data.change_pct);
