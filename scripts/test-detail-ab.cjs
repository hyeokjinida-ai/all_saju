// In-memory doubles only. No real customers, network or payments.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const { NextRequest } = require('next/server');
const root = path.resolve(__dirname, '..'), cache = new Map();
const secret = 'DETAIL_TEST_ONLY_NOT_A_REAL_SECRET';
Object.assign(process.env, { SUPABASE_SECRET_KEY: secret, VERCEL_ENV: 'production' });
let inserted = [], captured;
const service = { from(table) {
  const q = { select(){return q},eq(){return q},abortSignal(){return q},maybeSingle(){return q},
    insert(rows){inserted.push(...(Array.isArray(rows)?rows:[rows]));return q},
    upsert(row){captured=row;return q},update(){return q},
    then(resolve,reject){return Promise.resolve({error:null,data:table==='orders'?{id:'internal-test',order_id:'ord_TEST',status:'pending'}:null}).then(resolve,reject)} };
  return q;
} };
const mocks = { '@/lib/supabase/server': {createServiceClient:()=>service}, '@/lib/env': {
  isSupabaseConfigured:()=>true, publicEnv:{NEXT_PUBLIC_SITE_URL:'https://test.example'},
} };
function load(file) {
  const resolved=path.resolve(root,file);if(cache.has(resolved))return cache.get(resolved).exports;
  const m={exports:{}};cache.set(resolved,m);
  const code=ts.transpileModule(fs.readFileSync(resolved,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  new Function('require','module','exports',code)(name=>mocks[name]??(name.startsWith('@/')?load('src/'+name.slice(2)+'.ts'):require(name)),m,m.exports);
  return m.exports;
}
async function main() {
  const d=load('src/lib/detail-experiment.ts'),g=load('src/lib/gate-experiment.ts');
  const route=load('src/app/api/experiments/sangun-detail/route.ts').POST;
  const a=d.createDetailAssignment('01000000-0000-4000-8000-000000000001');
  const token=d.signDetailAssignment(a,secret);
  assert.deepEqual(d.readDetailAssignment(token),a);
  assert.equal(d.readDetailAssignment(token+'x'),null);
  assert.equal(d.readDetailAssignment(token,'wrong'),null);
  assert.equal(d.readDetailAssignment(token,secret,a.assignedAt+(d.DETAIL_MAX_AGE+1)*1000),null);
  assert.equal(d.readDetailAssignment(token,secret,a.assignedAt-120000),null);
  assert.equal(d.readDetailAssignment(g.signGateAssignment({...a,variant:'a'},secret)),null);
  const counts={old:0,new:0};
  for(let n=0;n<256;n++)counts[d.createDetailAssignment(`${n.toString(16).padStart(2,'0')}000000-0000-4000-8000-000000000001`).variant]++;
  assert.deepEqual(counts,{old:128,new:128});
  const request=(body={},cookie='',origin='https://test.example')=>new NextRequest('https://test.example/api/experiments/sangun-detail',{
    method:'POST',headers:{host:'test.example',origin,cookie,'Content-Type':'application/json','User-Agent':'QA browser'},body:JSON.stringify(body),
  });
  assert.equal((await route(request({},'', 'https://evil.example'))).status,403);
  const first=await route(request());const body=await first.json(), cookie=first.cookies.get(d.DETAIL_COOKIE);
  assert.equal(body.qa,false);assert.equal(cookie.httpOnly,true);assert.equal(cookie.secure,true);
  const repeat=await route(request({},`${d.DETAIL_COOKIE}=${cookie.value}`));
  assert.deepEqual(await repeat.json(),body);assert.equal(repeat.cookies.get(d.DETAIL_COOKIE),undefined);
  const gateToken=g.signGateAssignment({...g.createGateAssignment(),variant:'b'},secret);
  // Changing gate assignment cannot change an existing detail assignment.
  assert.equal((await (await route(request({},`${d.DETAIL_COOKIE}=${token}; ${g.GATE_COOKIE}=${gateToken}`))).json()).variant,'old');
  const pairs=new Set();
  for(const gv of ['a','b'])for(const dv of ['old','new']){
    const response=await route(request({qaVariant:dv},`${g.GATE_COOKIE}=${g.signGateAssignment({...g.createGateAssignment(),variant:gv},secret)}`));
    const choice=await response.json();assert.equal(choice.qa,true);pairs.add(gv+'-'+choice.variant);
  }
  assert.equal(pairs.size,4);
  const qaResponse=await route(request({qaVariant:'new'}));const qaCookie=qaResponse.cookies.get(d.DETAIL_COOKIE);
  assert.equal((await (await route(request({},`${d.DETAIL_COOKIE}=${qaCookie.value}`))).json()).qa,true);
  assert.equal((await (await route(request({qa:true}))).json()).qa,true);
  process.env.VERCEL_ENV='preview';assert.equal((await (await route(request())).json()).qa,true);
  process.env.VERCEL_ENV='production';process.env.SANGUN_DETAIL_AB_ENABLED='0';
  assert.equal((await (await route(request())).json()).enabled,false);delete process.env.SANGUN_DETAIL_AB_ENABLED;

  const track=load('src/app/api/track/route.ts').POST;
  inserted=[];await track(request({event:'detail_order_link',props:{orderId:'forged'}}));assert.equal(inserted.length,0);
  await track(request({event:'detail_entry'}));assert.equal(inserted.length,0);
  await track(request({event:'detail_entry',props:{detail_variant:'new',detail_subject:'forged',qa:false}},`${d.DETAIL_COOKIE}=${token}`));
  assert.equal(inserted[0].props.detail_variant,'old');assert.equal(inserted[0].props.detail_subject,a.subject);
  await track(request({event:'detail_exposure',props:{rendered:'new'}},`${d.DETAIL_COOKIE}=${qaCookie.value}; ${g.GATE_COOKIE}=${gateToken}`));
  assert.equal(inserted.at(-1).props.qa,true,'gate qa=false cannot overwrite detail QA');
  const link=load('src/lib/gate-order-attribution.ts').recordGateOrder;
  inserted=[];await link(undefined,'ord_TEST','bundle-sangun-inyeon',token);
  assert.equal(inserted.length,1);assert.equal(inserted[0].event,'detail_order_link');
  assert.equal(inserted[0].props.source,'server');assert.equal(inserted[0].props.detail_subject,a.subject);
  inserted=[];await link(gateToken,'ord_TEST','bundle-sangun-inyeon-reunion',token);
  assert.deepEqual(inserted.map(r=>r.event),['gate_order_link','detail_order_link']);
  inserted=[];await link(gateToken,'ord_TEST','inyeon-saju',token);assert.equal(inserted.length,0);
  await link(gateToken,'ord_TEST','sangun-sinjeom',qaCookie.value);assert.ok(inserted.every(r=>r.props.qa));
  const purchase=load('src/lib/purchase-tracking.ts');
  await purchase.capturePurchaseContext(service,request({},`${d.DETAIL_COOKIE}=${token}`),'internal-test');
  assert.equal(captured.context.detail_variant,'old');assert.equal(captured.context.qa,false);
  await purchase.capturePurchaseContext(service,request({},`${d.DETAIL_COOKIE}=${qaCookie.value}`),'internal-test');
  assert.equal(captured.context.qa,true);
  console.log('PASS: signed sticky 50:50; independent gate/detail; tamper, expiry, QA persistence, stop switch; server-only event labels/order links; bundles; purchase context; QA isolation');
}
main().catch(e=>{console.error(e);process.exitCode=1});
