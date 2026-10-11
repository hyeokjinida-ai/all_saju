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
  for (const flag of ['1', '0', undefined]) {
    if (flag === undefined) delete process.env.SANGUN_DETAIL_AB_ENABLED;
    else process.env.SANGUN_DETAIL_AB_ENABLED = flag;
    assert.equal(d.detailExperimentEnabled(), false);
    const response = await route(request());
    assert.deepEqual(await response.json(), {enabled:false,variant:'old',qa:false});
    assert.equal(response.headers.get('set-cookie'), null);
  }
  const gateToken=g.signGateAssignment({...g.createGateAssignment(),variant:'b'},secret);
  for (const variant of ['old','new']) {
    const original = {...d.createDetailAssignment(),variant};
    const saved = d.signDetailAssignment(original,secret);
    const response = await route(request({},`${d.DETAIL_COOKIE}=${saved}; ${g.GATE_COOKIE}=${gateToken}`));
    assert.deepEqual(await response.json(), {enabled:false,variant:'old',qa:false});
    assert.equal(response.headers.get('set-cookie'), null);
    assert.deepEqual(d.readDetailAssignment(saved), original);
  }
  const qaResponse=await route(request({qaVariant:'new'}));
  assert.deepEqual(await qaResponse.json(), {enabled:false,variant:'old',qa:true});
  const qaCookie=qaResponse.cookies.get(d.DETAIL_COOKIE);
  assert.equal(qaCookie.httpOnly,true); assert.equal(qaCookie.secure,true);
  assert.equal(d.readDetailAssignment(qaCookie.value).qa,true);
  const repeat=await route(request({},`${d.DETAIL_COOKIE}=${qaCookie.value}`));
  assert.deepEqual(await repeat.json(), {enabled:false,variant:'old',qa:true});
  assert.equal(repeat.headers.get('set-cookie'),null);
  assert.equal((await (await route(request({qa:true}))).json()).qa,true);
  process.env.VERCEL_ENV='preview';assert.equal((await (await route(request())).json()).qa,true);
  process.env.VERCEL_ENV='production';

  const track=load('src/app/api/track/route.ts').POST;
  inserted=[];await track(request({event:'detail_order_link',props:{orderId:'forged'}}));assert.equal(inserted.length,0);
  await track(request({event:'detail_entry'}));assert.equal(inserted.length,0);
  for (const event of ['detail_entry','detail_exposure','detail_assignment_unavailable']) {
    await track(request({event},`${d.DETAIL_COOKIE}=${token}`));
    assert.equal(inserted.length,0,'closed experiment must not collect new cohorts');
  }
  await track(request({event:'teaser_shown',props:{detail_variant:'new',detail_subject:'forged',qa:false}},`${d.DETAIL_COOKIE}=${token}`));
  assert.equal(inserted[0].props.detail_variant,'old');assert.equal(inserted[0].props.detail_subject,a.subject);
  await track(request({event:'teaser_shown'},`${d.DETAIL_COOKIE}=${qaCookie.value}; ${g.GATE_COOKIE}=${gateToken}`));
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
  console.log('PASS: old detail for all visitors; no new assignments or stale experiment beacons; historical cookie/order attribution preserved; tamper/expiry; QA isolation; bundles and purchase context');
}
main().catch(e=>{console.error(e);process.exitCode=1});
