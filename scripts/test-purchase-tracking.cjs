const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
let db;
const mocks = { '@/lib/supabase/server': { createServiceClient: () => db } };
function load(file) {
  const resolved = path.resolve(root, file);
  if (cache.has(resolved)) return cache.get(resolved).exports;
  const module = { exports: {} }; cache.set(resolved, module);
  const source = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  new Function('require','module','exports',source)((name) => {
    if (mocks[name]) return mocks[name];
    if (name.startsWith('@/')) return load('src/'+name.slice(2)+'.ts');
    return require(name);
  },module,module.exports);
  return module.exports;
}
// Small PostgREST-style test adapter; SQL itself is tested with PGlite separately.
class MemoryDb {
  constructor(rows) { this.rows=rows; this.order={ status:'paid',exclude_from_pnl:false,refunded_amount:0,amount:26900 }; }
  from(table) {
    const db=this; let filters=[],patch=null,limit=Infinity,single=false;
    const q={ select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},lte(k,v){filters.push(r=>r[k]<=v);return q},
      order(){return q},limit(n){limit=n;return q},abortSignal(){return q},maybeSingle(){single=true;return q},
      upsert(){return q},insert(){return q},update(v){patch=v;return q},then(resolve,reject){
        try {
          if(table==='analytics_events') return Promise.resolve({data:null,error:null}).then(resolve,reject);
          if(table==='products') return Promise.resolve({data:{slug:'bundle-sangun-inyeon'},error:null}).then(resolve,reject);
          if(table==='orders') {
            if(patch) {
              const old=db.order.status;
              Object.assign(db.order,patch);
              if(old!=='paid' && db.order.status==='paid') {
                // Production trigger separately exercised by the PostgreSQL test.
                Object.assign(db.rows[0],{state:'pending',paid_at:patch.paid_at,amount:db.order.amount});
              }
            }
            return Promise.resolve({ data:{...db.order},error:null }).then(resolve,reject);
          }
          const matches=db.rows.filter(r=>filters.every(f=>f(r))).slice(0,limit);
          if(patch) for(const row of matches) Object.assign(row,patch);
          return Promise.resolve({data:single?(matches[0]?{...matches[0]}:null):matches.map(r=>({...r})),error:null}).then(resolve,reject);
        } catch(e){ return Promise.reject(e).then(resolve,reject); }
      }};
    return q;
  }
}
const base = (overrides={}) => ({
  order_id:'01000000-0000-4000-8000-000000000001',public_order_id:'ord_TEST_ONLY',
  event_id:'02000000-0000-4000-8000-000000000001',
  context:{environment:'production',qa:false,fbp:'fb.1.1801234567890.12345678',utm:'hookA',ua:'Test browser'},
  browser_dedup:true,amount:26900,product_slug:'bundle-sangun-inyeon',paid_at:new Date(Date.now()-1000).toISOString(),
  recorded_at:new Date().toISOString(),state:'pending',attempts:0,next_attempt_at:new Date(Date.now()-2000).toISOString(),
  lease_token:null,lease_until:null,sent_at:null,last_error:null,...overrides,
});
async function main() {
  const rules=load('src/lib/purchase-event.ts');
  const tracking=load('src/lib/purchase-tracking.ts');
  assert.equal(rules.metaAccepted(true,{events_received:0}),false);
  assert.equal(rules.metaAccepted(false,{events_received:1}),false);
  assert.equal(rules.metaAccepted(true,{events_received:1,error:{code:100}}),false);
  assert.equal(rules.metaAccepted(true,{events_received:1}),true);
  assert.equal(rules.metaCookie('fb.1.1801234567890.12345678','fbp'),'fb.1.1801234567890.12345678');
  assert.equal(rules.metaCookie('bad@email.example','fbp'),undefined);
  assert.deepEqual(rules.attributionCookie(encodeURIComponent(JSON.stringify({v:'email@example.com',email:'secret',qa:true}))),{qa:true});
  assert.equal(rules.isRecentPurchase(new Date(Date.now()-25*3600000).toISOString()),false);
  assert.equal(rules.isRecentPurchase(new Date(Date.now()+120000).toISOString()),false);
  assert.equal(tracking.receiptFor(base({state:'suppressed',context:{environment:'production',qa:true}})),null);
  assert.ok(tracking.receiptFor(base({state:'suppressed',last_error:'missing_matching_context'})),'CAPI suppression cannot suppress browser fallback');
  assert.equal(tracking.receiptFor(base({state:'checkout',paid_at:null})),null);
  assert.equal(tracking.receiptFor(base()).value,26900);
  const event=tracking.buildMetaEvent(base());
  assert.equal(event.event_id,base().event_id);
  assert.equal(event.custom_data.value,26900);
  assert.equal(event.event_source_url,'https://myeongunrok.com/checkout/success');
  assert.equal(JSON.stringify(event).includes('hookA'),false,'UTM stays first-party');
  assert.equal(JSON.stringify(event).includes('ord_TEST'),false,'raw order ID stays first-party');
  assert.equal(tracking.buildMetaEvent(base({context:{ua:'Only UA'}})),null);

  Object.assign(process.env,{VERCEL_ENV:'production',META_CAPI_ENABLED:'1',META_CAPI_ACCESS_TOKEN:'TEST_ONLY_NOT_REAL',
    NEXT_PUBLIC_META_PIXEL_ID:'123456',META_CAPI_API_VERSION:'v99.0',META_CAPI_START_AT:new Date(Date.now()-3600000).toISOString()});
  let sends=[];
  global.fetch=async(url,options)=>{sends.push({url,body:JSON.parse(options.body)});return{ok:true,status:200,json:async()=>({events_received:1})};};
  db=new MemoryDb([base()]);
  await Promise.all([tracking.dispatchPurchases(db),tracking.dispatchPurchases(db)]);
  assert.equal(sends.length,1,'CAS lease blocks concurrent dispatchers');
  assert.equal(db.rows[0].state,'sent');
  await tracking.dispatchPurchases(db); assert.equal(sends.length,1,'sent orders never retry');
  assert.equal(sends[0].url.includes('TEST_ONLY'),false,'token is not in URL');
  assert.equal(sends[0].body.data[0].event_id,event.event_id);

  db=new MemoryDb([base()]); sends=[];
  global.fetch=async()=>{throw new Error('TEST timeout');};
  await tracking.dispatchPurchases(db);
  assert.equal(db.rows[0].state,'pending'); assert.equal(db.rows[0].last_error,'transport_error');
  assert.ok(Date.parse(db.rows[0].next_attempt_at)>Date.now());
  assert.equal(db.rows[0].lease_token,null);
  db.rows[0].next_attempt_at=new Date(Date.now()-1).toISOString();
  global.fetch=async(url,options)=>{sends.push(JSON.parse(options.body).data[0]);return{ok:true,status:200,json:async()=>({events_received:1})};};
  await tracking.dispatchPurchases(db);
  assert.equal(sends[0].event_id,event.event_id,'timeout retry preserves event ID');
  assert.equal(sends[0].event_time,Math.floor(Date.parse(db.rows[0].paid_at)/1000),'retry preserves original payment time');

  db=new MemoryDb([base()]);
  global.fetch=async()=>({ok:true,status:200,json:async()=>({events_received:0})});
  await tracking.dispatchPurchases(db); assert.equal(db.rows[0].state,'pending','HTTP 200 alone is not acceptance');
  db=new MemoryDb([base({paid_at:new Date(Date.now()-25*3600000).toISOString()})]);
  await tracking.dispatchPurchases(db); assert.equal(db.rows[0].state,'expired');
  db=new MemoryDb([base({paid_at:new Date(Date.now()-2*3600000).toISOString()})]);
  await tracking.dispatchPurchases(db); assert.equal(db.rows[0].state,'expired','activation cutoff blocks backfill');
  db=new MemoryDb([base()]); db.order.exclude_from_pnl=true;
  await tracking.dispatchPurchases(db); assert.equal(db.rows[0].state,'suppressed');
  db=new MemoryDb([base({browser_dedup:false})]);
  await tracking.dispatchPurchases(db); assert.equal(db.rows[0].last_error,'legacy_browser_without_event_id');
  db=new MemoryDb([base()]); db.order.refunded_amount=26900;
  await tracking.dispatchPurchases(db); assert.equal(db.rows[0].state,'suppressed');
  db=new MemoryDb([base()]); process.env.VERCEL_ENV='preview';
  assert.equal((await tracking.dispatchPurchases(db)).state,'disabled'); assert.equal(db.rows[0].attempts,0);
  process.env.VERCEL_ENV='production'; delete process.env.META_CAPI_ACCESS_TOKEN;
  assert.equal((await tracking.dispatchPurchases(db)).state,'unconfigured'); assert.equal(db.rows[0].attempts,0);

  // Exercise the actual confirm handler with simulated Toss/DB/LLM boundaries.
  process.env.META_CAPI_ENABLED='0';
  mocks['next/server']={NextResponse:{json:(body,init)=>new Response(JSON.stringify(body),init)},after:()=>{}};
  let tossStatus='DONE',tossOrder='ord_TEST_ONLY',generated=0;
  mocks['@/lib/toss/confirm']={confirmTossPayment:async()=>({ok:true,via:'direct',data:{
    paymentKey:'test_payment',orderId:tossOrder,totalAmount:26900,status:tossStatus,approvedAt:new Date().toISOString(),
  }})};
  mocks['@/lib/saju/generate-result']={generateResultForOrder:async()=>{
    generated++;
    assert.equal(db.rows[0].state,'pending','receipt exists before the LLM runs');
    return {ok:false,reason:'llm_error'};
  }};
  const confirm=load('src/app/api/orders/confirm/route.ts');
  function freshCheckout(){
    db=new MemoryDb([base({state:'checkout',paid_at:null})]);
    Object.assign(db.order,{id:db.rows[0].order_id,order_id:'ord_TEST_ONLY',status:'pending',product_id:'p1',user_id:null,guest_email:'unused',toss_payment_key:null});
  }
  const request=(patch={})=>({json:async()=>({paymentKey:'test_payment',orderId:'ord_TEST_ONLY',amount:26900,purchaseTrackingVersion:1,...patch}),
    cookies:{get:()=>undefined},headers:new Headers()});
  freshCheckout();
  const paidResponse=await confirm.POST(request()); const paidBody=await paidResponse.json();
  assert.equal(paidResponse.status,200); assert.equal(paidBody.pending,true);
  assert.equal(paidBody.purchase.value,26900); assert.equal(generated,1,'LLM failure does not lose purchase');
  const sameId=paidBody.purchase.eventId;
  const replay=await confirm.POST(request()); assert.equal((await replay.json()).purchase.eventId,sameId);
  const tampered=await confirm.POST(request({amount:1})); assert.equal(tampered.status,400);
  const wrongKey=await confirm.POST(request({paymentKey:'forged'})); assert.equal(wrongKey.status,403);
  freshCheckout(); tossStatus='WAITING_FOR_DEPOSIT'; const beforeGenerated=generated;
  const deposit=await confirm.POST(request()); assert.equal((await deposit.json()).purchase,undefined);
  assert.equal(db.rows[0].state,'checkout'); assert.equal(generated,beforeGenerated);
  freshCheckout(); tossStatus='DONE'; tossOrder='another_order';
  assert.equal((await confirm.POST(request())).status,400); assert.equal(db.rows[0].state,'checkout');
  console.log('PASS confirm handler: receipt before failed LLM, same ID on replay, canonical bundle amount, wrong amount/key/order rejected, no purchase before deposit');

  const store=new Map(); const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
  global.localStorage=storage; global.sessionStorage=storage;
  global.location={pathname:'/checkout/success',hostname:'myeongunrok.com',search:''};
  global.document={referrer:'',cookie:''}; global.window={};
  Object.defineProperty(global,'navigator',{value:{sendBeacon:()=>true},configurable:true});
  const analytics=load('src/lib/analytics.ts');
  const receipt=tracking.receiptFor(base());
  assert.equal(analytics.trackConfirmedPurchase(receipt),false,'missing Pixel remains retryable');
  assert.equal(store.has('mr_purchase_'+receipt.orderId),false);
  const pixel=[]; global.window.fbq=(...args)=>pixel.push(args);
  assert.equal(analytics.trackConfirmedPurchase(receipt),true);
  assert.deepEqual(pixel[0],['track','Purchase',{value:26900,currency:'KRW',content_ids:['bundle-sangun-inyeon']},{eventID:receipt.eventId}]);
  analytics.trackConfirmedPurchase(receipt); assert.equal(pixel.length,1,'reload marker prevents replay');
  store.clear(); store.set('mr_gate_qa','1');
  assert.equal(analytics.trackConfirmedPurchase(receipt),false); assert.equal(pixel.length,1,'QA never emits Purchase');
  store.clear(); global.localStorage={getItem(){throw Error()},setItem(){throw Error()}};
  global.sessionStorage=global.localStorage;
  assert.equal(analytics.trackConfirmedPurchase(receipt),true,'storage denial does not block pixel');
  process.env.NEXT_PUBLIC_VERCEL_ENV='preview';
  assert.equal(analytics.trackConfirmedPurchase(receipt),false,'storage denial cannot bypass preview suppression');
  console.log('PASS purchase rules, CAPI payload/privacy, CAS concurrency, timeout retry, 200-without-ack, cutoff/expiry, refunds, disabled config, Pixel dedup, missing Pixel, QA, blocked storage');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
