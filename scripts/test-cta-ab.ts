import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { CTA_COOKIE, CTA_MAX_AGE, CTA_EXPERIMENT, createCtaAssignment, signCtaAssignment, readCtaAssignment, type CtaAssignment } from '../src/lib/cta-experiment';
import { createGateAssignment, signGateAssignment } from '../src/lib/gate-experiment';
import { summarizeCta } from '../src/lib/cta-report';
import { POST } from '../src/app/api/experiments/sangun-cta/route';
const secret='test-only-key';
const now=Date.now();
const a={...createCtaAssignment('01000000-0000-4000-8000-000000000000',now),qa:false};
const b={...createCtaAssignment('ff000000-0000-4000-8000-000000000000',now),qa:false};
assert.equal(a.variant,'a'); assert.equal(b.variant,'b');
const token=signCtaAssignment(a,secret);
assert.deepEqual(readCtaAssignment(token,secret,now),a);
assert.equal(readCtaAssignment(token+'x',secret,now),null);
assert.equal(readCtaAssignment(token,'wrong',now),null);
assert.equal(readCtaAssignment(token,secret,now+(CTA_MAX_AGE+1)*1000),null);
assert.equal(readCtaAssignment(signGateAssignment(createGateAssignment(),secret),secret,now),null);
const counts={a:0,b:0};
for(let i=0;i<256;i++) counts[createCtaAssignment(`${i.toString(16).padStart(2,'0')}000000-0000-4000-8000-000000000000` as Parameters<typeof createCtaAssignment>[0],now).variant]++;
assert.deepEqual(counts,{a:128,b:128});
const event=(event:string,assignment:CtaAssignment,extra={})=>({event,created_at:new Date(now).toISOString(),props:{cta_experiment:CTA_EXPERIMENT,cta_subject:assignment.subject,cta_variant:assignment.variant,...extra}});
const events=[event('cta_exposure',a),event('cta_exposure',a),event('cta_click',a),event('cta_click',a),event('cta_exposure',b),event('cta_click',b),event('cta_order_link',a,{source:'server',orderId:'paid'}),event('cta_exposure',b,{qa:true,cta_subject:'qa'}),event('gate_exposure',b),event('cta_exposure',b,{cta_experiment:'old-test',cta_subject:'old'})];
const order={order_id:'paid',status:'paid',paid_at:new Date(now+1000).toISOString(),amount:24900,refunded_amount:1000,exclude_from_pnl:false};
const report=summarizeCta(events,[order,order],now+8*86400000);
assert.equal(report.allExposed,2); assert.equal(report.variants.a.clicked,1); assert.equal(report.variants.b.clicked,1);
assert.equal(report.variants.a.paidBuyers,1); assert.equal(report.variants.a.netPaid,23900);
assert.equal(summarizeCta(events,[order],now+1000).immature,2);
async function main(){
 const saved={secret:process.env.SUPABASE_SECRET_KEY,env:process.env.VERCEL_ENV,flag:process.env.SANGUN_CTA_AB_ENABLED};
 try{
  process.env.SUPABASE_SECRET_KEY=secret; process.env.VERCEL_ENV='production'; delete process.env.SANGUN_CTA_AB_ENABLED;
  const req=(body={},cookie='',origin='http://localhost:3065')=>new NextRequest('http://localhost:3065/api/experiments/sangun-cta',{method:'POST',headers:{origin,host:'localhost:3065','content-type':'application/json',cookie},body:JSON.stringify(body)});
  assert.equal((await POST(req({},'','https://foreign.invalid'))).status,403);
  const fresh=await POST(req()); assert.equal((await fresh.json()).enabled,true);
  const freshCookie=fresh.cookies.get(CTA_COOKIE)!; assert.ok(freshCookie); assert.equal(readCtaAssignment(freshCookie.value,secret)!.qa,false);
  const sticky=await POST(req({},`${CTA_COOKIE}=${token}`)); assert.equal((await sticky.json()).variant,'a'); assert.equal(sticky.cookies.get(CTA_COOKIE),undefined);
  const qa=await POST(req({qaVariant:'b'},`${CTA_COOKIE}=${token}`)); assert.deepEqual(await qa.json(),{enabled:true,variant:'b',qa:true});
  const qaCookie=qa.cookies.get(CTA_COOKIE)!;
  const persisted=await POST(req({},`${CTA_COOKIE}=${qaCookie.value}`)); assert.equal((await persisted.json()).qa,true);
  const tampered=await POST(req({},`${CTA_COOKIE}=${token}x`)); assert.ok(tampered.cookies.get(CTA_COOKIE));
  process.env.SANGUN_CTA_AB_ENABLED='0'; const off=await POST(req()); assert.equal((await off.json()).enabled,false); assert.equal(off.cookies.get(CTA_COOKIE),undefined);
  delete process.env.SANGUN_CTA_AB_ENABLED; delete process.env.SUPABASE_SECRET_KEY; assert.equal((await POST(req())).status,503);
  console.log('PASS: independent 50:50 assignment, sticky cookie, tamper/expiry, QA persistence, stop switch, missing secret, isolated cohorts, deduplicated clicks/orders, net purchase revenue.');
 } finally{ for(const [key,value] of Object.entries({SUPABASE_SECRET_KEY:saved.secret,VERCEL_ENV:saved.env,SANGUN_CTA_AB_ENABLED:saved.flag})) {if(value===undefined) delete process.env[key]; else process.env[key]=value;} }
}
void main().catch(e=>{console.error(e);process.exitCode=1;});
