const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const timers=new Map();let clock=0,id=0;
global.setInterval=(fn,ms)=>{timers.set(++id,{fn,at:clock+ms,ms});return id};
global.setTimeout=(fn,ms)=>{timers.set(++id,{fn,at:clock+ms,ms:0});return id};
global.clearInterval=global.clearTimeout=(key)=>timers.delete(key);
async function advance(ms){const end=clock+ms;while(true){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;const [key,t]=next;clock=t.at;if(t.ms)t.at+=t.ms;else timers.delete(key);t.fn();await Promise.resolve();await Promise.resolve();}clock=end;await Promise.resolve();}
const mod={exports:{}};
const source=ts.transpileModule(fs.readFileSync('src/lib/purchase-receipt-poller.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('exports',source)(mod.exports);
const start=mod.exports.startPurchaseReceiptPolling;
const receipt={orderId:'ord_TEST_ONLY',eventId:'same-event',paidAt:new Date().toISOString(),value:31900,currency:'KRW',slug:'bundle-sangun-inyeon'};
function reset(){timers.clear();clock=0;}
(async()=>{
 reset();let reads=0,sends=[];
 let p=start({read:async()=>{reads++;return reads===1?null:receipt},send:r=>{sends.push(r);return true}});
 p.accept(null); // Fast confirm has completed but receipt was temporarily null.
 await advance(10000);assert.equal(sends.length,1);assert.equal(reads,2);assert.equal(timers.size,0);
 p.accept(receipt);await advance(20000);assert.equal(sends.length,1,'late confirm cannot duplicate delivery');
 reset();reads=0;sends=[];let pixelReady=false;
 p=start({read:async()=>{reads++;return receipt},send:r=>{if(!pixelReady)return false;sends.push(r);return true}});
 assert.equal(p.accept(receipt),false);await advance(5000);pixelReady=true;await advance(5000);
 assert.equal(sends.length,1);assert.equal(sends[0].eventId,receipt.eventId);assert.equal(reads,0,'cached receipt avoids repeated database requests');
 reset();reads=0;sends=[];
 p=start({read:async()=>{reads++;if(reads===1)throw Error('temporary');return receipt},send:r=>{sends.push(r);return true}});
 await advance(10000);assert.equal(sends.length,1,'network exception does not end retries');
 reset();let resolveRead;reads=0;sends=[];
 p=start({read:()=>{reads++;return new Promise(r=>resolveRead=r)},send:r=>{sends.push(r);return true}});
 await advance(15000);assert.equal(reads,1,'slow fetches never overlap');p.stop();resolveRead(receipt);await Promise.resolve();await Promise.resolve();assert.equal(sends.length,0,'unmounted page ignores late response');
 reset();let timeouts=[];reads=0;
 p=start({read:async()=>{reads++;return null},send:()=>true,onTimeout:r=>timeouts.push(r)});
 await advance(125000);const finalReads=reads;await advance(120000);assert.equal(reads,finalReads);assert.deepEqual(timeouts,[false]);assert.equal(timers.size,0);
 assert.equal(p.accept(receipt),true,'late verified confirm may still deliver once after polling deadline');
 reset();timeouts=[];
 p=start({read:async()=>receipt,send:()=>false,onTimeout:r=>timeouts.push(r)});
 await advance(125000);assert.deepEqual(timeouts,[true],'distinguish receipt available but Pixel unavailable');
 reset();p=start({read:async()=>receipt,send:()=>true});p.stop();assert.equal(p.accept(receipt),false);await advance(10000);assert.equal(timers.size,0);
 console.log('PASS: null confirm, delayed Pixel, same event ID, late confirm dedup, transient error, no overlapping fetch, unmount, bounded timeout and timeout reason');
})().catch(e=>{console.error(e);process.exitCode=1});
