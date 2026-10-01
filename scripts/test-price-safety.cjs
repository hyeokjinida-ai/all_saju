// No network, real payments, production keys, or customer data.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const root=path.resolve(__dirname,'..'), cache=new Map();
let db,user=null,serial=0;
const mocks={
  'next/server':{NextResponse:{json:(body,init)=>new Response(JSON.stringify(body),init)}},
  nanoid:{nanoid:()=>`TEST${++serial}`},
  '@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user}})}}),createServiceClient:()=>db},
  '@/lib/gate-experiment':{GATE_COOKIE:'test_gate'},
  '@/lib/gate-order-attribution':{recordGateOrder:async()=>{}},
  '@/lib/purchase-tracking':{capturePurchaseContext:async()=>{}},
};
function load(file) {
  const resolved=path.resolve(root,file);
  if(cache.has(resolved))return cache.get(resolved).exports;
  const m={exports:{}};cache.set(resolved,m);
  const code=ts.transpileModule(fs.readFileSync(resolved,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  new Function('require','module','exports',code)((name)=>mocks[name]??(name.startsWith('@/')?load('src/'+name.slice(2)+'.ts'):require(name)),m,m.exports);
  return m.exports;
}
const pid='10000000-0000-4000-8000-000000000001';
class MemoryDb {
  constructor(price,slug='sangun-sinjeom'){
    this.tables={products:[{id:pid,slug,price,is_active:true}],orders:[],saju_inputs:[]};
    this.failPending=false;
  }
  from(table){
    const db=this;let filters=[],patch,insert,single=false,max=Infinity;
    const q={select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},is(k,v){return q.eq(k,v)},
      gte(k,v){filters.push(r=>r[k]>=v);return q},order(){return q},limit(v){max=v;return q},
      maybeSingle(){single=true;return q},single(){single=true;return q},
      update(v){patch=v;return q},insert(v){insert=v;return q},
      then(resolve,reject){try{
        if(db.failPending&&table==='orders'&&!insert&&!patch)return Promise.resolve({data:null,error:{code:'read_failed'}}).then(resolve,reject);
        if(insert)db.tables[table].push({id:`test-${++serial}`,created_at:new Date().toISOString(),...insert});
        const rows=(insert?db.tables[table].slice(-1):db.tables[table].filter(r=>filters.every(f=>f(r)))).slice(0,max);
        if(patch)rows.forEach(r=>Object.assign(r,patch));
        return Promise.resolve({data:single?(rows[0]?{...rows[0]}:null):rows.map(r=>({...r})),error:null}).then(resolve,reject);
      }catch(e){return Promise.reject(e).then(resolve,reject)}}};return q;
  }
}
function oldOrder(amount=19900){return {id:'old-db-id',order_id:'ord_OLD_ONLY',product_id:pid,status:'pending',amount,user_id:null,toss_payment_key:null,guest_email:'qa@example.invalid',created_at:new Date().toISOString()}}
const request=(displayedAmount)=>({json:async()=>({productId:pid,birthDate:'1990-01-01',birthTime:null,timeUnknown:true,gender:'female',calendar:'solar',concerns:[],email:'qa@example.invalid',...(displayedAmount===undefined?{}:{displayedAmount})}),cookies:{get:()=>undefined}});
async function main(){
  const create=load('src/app/api/orders/create/route.ts').POST;
  const claim=load('src/lib/claim-pending-order.ts').claimPendingOrder;
  for(const [slug,price]of[['sangun-sinjeom',24900],['bundle-sangun-inyeon',31900],['inyeon-saju',17900]]){
    for(const member of[false,true]){
      db=new MemoryDb(price,slug);user=member?{id:'qa-member'}:null;
      const expected=price-(member?1900:0),res=await create(request(expected)),body=await res.json();
      assert.equal(res.status,200);assert.equal(body.amount,expected);assert.equal(db.tables.orders[0].amount,expected);
      assert.equal(db.tables.orders[0].user_id,user?.id??null);
    }
  }
  user=null;db=new MemoryDb(24900);db.tables.orders.push(oldOrder());
  const existing=await create(request(24900));assert.equal((await existing.json()).amount,19900);assert.equal(db.tables.orders.length,1);
  db=new MemoryDb(31900,'bundle-sangun-inyeon');db.tables.orders.push(oldOrder(26900));
  assert.equal((await (await create(request(31900))).json()).amount,26900);
  db=new MemoryDb(24900);user={id:'qa-member'};db.tables.orders.push({...oldOrder(18000),user_id:user.id});
  assert.equal((await (await create(request(23000))).json()).amount,18000);
  user=null;db=new MemoryDb(24900);let res=await create(request(19900));
  assert.equal(res.status,409);assert.equal((await res.json()).code,'PRICE_CHANGED');assert.equal(db.tables.orders.length,0);
  // Pre-deployment tabs have no quote field; the server still dictates the checkout amount.
  assert.equal((await (await create(request())).json()).amount,24900);
  db=new MemoryDb(24900);db.failPending=true;assert.equal((await create(request(24900))).status,503);assert.equal(db.tables.orders.length,0);
  // Price manipulation fails, without creating a chargeable order.
  db=new MemoryDb(24900);assert.equal((await create(request(100))).status,409);assert.equal(db.tables.orders.length,0);
  for(const [saved,current,discounted]of[[19900,24900,18000],[26900,31900,25000],[24900,24900,23000],[31900,31900,30000]]){
    db=new MemoryDb(current);db.tables.orders.push(oldOrder(saved));
    const snapshot={...db.tables.orders[0]};
    await Promise.all([claim(db,snapshot,'qa-member'),claim(db,snapshot,'qa-member')]);
    assert.equal(db.tables.orders[0].amount,discounted,'one discount on the original quote');
    await claim(db,db.tables.orders[0],'qa-member');assert.equal(db.tables.orders[0].amount,discounted);
  }
  db=new MemoryDb(24900);db.tables.orders.push({...oldOrder(),status:'paid'});
  await claim(db,oldOrder(),'qa-member');assert.equal(db.tables.orders[0].amount,19900,'concurrent paid transition stays untouched');
  db=new MemoryDb(24900);db.tables.orders.push({...oldOrder(),amount:20000});
  await claim(db,oldOrder(),'qa-member');assert.equal(db.tables.orders[0].amount,20000,'concurrent amount change is not overwritten');
  db=new MemoryDb(24900);db.tables.orders.push({...oldOrder(),toss_payment_key:'already_issued_deposit'});
  await claim(db,oldOrder(),'qa-member');assert.equal(db.tables.orders[0].amount,19900,'pending deposit amount cannot be changed');
  // Execute the real payment UI handlers against SDK doubles, never Toss.
  let effects=[],sdkAmount,paymentRequest;
  mocks.react={useState:v=>[v,()=>{}],useRef:v=>({current:v}),useEffect:f=>effects.push(f)};
  mocks['next/link']='test-link';mocks.sonner={toast:{error:m=>{throw Error(m)}}};
  mocks['@/components/ui/button']={Button:'test-button'};
  mocks['@/lib/analytics']={track:()=>{}};
  mocks['./TossWidget']={LAST_ORDER_SLUG_KEY:'test-slug'};
  mocks['@/lib/toss/client']={
    loadPayment:async()=>({requestPayment:async v=>{paymentRequest=v;sdkAmount=v.amount.value}}),
    loadWidgets:async()=>({setAmount:async v=>{sdkAmount=v.value},renderPaymentMethods:async()=>{},renderAgreement:async()=>{},requestPayment:async v=>{paymentRequest=v}}),
  };
  global.window={location:{origin:'https://checkout.example.invalid'}};global.sessionStorage={setItem:()=>{}};
  function buttons(node){if(!node||typeof node!=='object')return[];if(Array.isArray(node))return node.flatMap(buttons);return[...(node.type==='test-button'?[node]:[]),...buttons(node.props?.children)]}
  for(const component of[load('src/components/checkout/PayMethods.tsx').PayMethods,load('src/components/checkout/TossWidget.tsx').TossWidget]){
    for(const amount of[19900,18000,26900,25000,24900,23000,31900,30000]){
      effects=[];sdkAmount=null;paymentRequest=null;
      const tree=component({orderId:'ord_TEST_SDK',amount,customerKey:'qa',productName:'QA',productSlug:'sangun-sinjeom',customerEmail:null});
      effects.forEach(f=>f());await new Promise(resolve=>setImmediate(resolve));
      await buttons(tree)[0].props.onClick();
      assert.equal(sdkAmount,amount);assert.equal(paymentRequest.orderId,'ord_TEST_SDK');
    }
  }
  console.log('PASS both actual payment UI handlers send all old/new guest/member amounts unchanged to the mocked SDK');
  console.log('PASS fresh guest/member/single/bundle prices; old pending amount and response; stale quote 409; read failure; tamper rejection; legacy tab; one-time claim; concurrent claim/payment/amount protection');
}
main().catch(e=>{console.error(e);process.exitCode=1});
