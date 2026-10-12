const fs0=require('node:fs');
const project=require('node:path').resolve(__dirname,'..');
const harness=fs0.readFileSync(project+'/scripts/test-detail-ab.cjs','utf8').split('async function main()')[0]
 .replace("const root = path.resolve(__dirname, '..')",`const root = ${JSON.stringify(project)}`);
const checks=`async function main(){
 const c=load('src/lib/cta-experiment.ts');
 const assignment={...c.createCtaAssignment(),qa:false};
 const token=c.signCtaAssignment(assignment,secret);
 const cookie=c.CTA_COOKIE+'='+token;
 const request=(body,cookie='')=>new NextRequest('https://test.example/api/track',{method:'POST',headers:{host:'test.example',origin:'https://test.example',cookie,'Content-Type':'application/json','User-Agent':'QA browser'},body:JSON.stringify(body)});
 const track=load('src/app/api/track/route.ts').POST;
 await track(request({event:'cta_order_link',props:{orderId:'forged'}},cookie)); assert.equal(inserted.length,0);
 await track(request({event:'cta_exposure'})); assert.equal(inserted.length,0);
 await track(request({event:'cta_exposure',props:{cta_variant:'b',cta_subject:'forged',cta_experiment:'fake',qa:true}},cookie));
 assert.equal(inserted.length,1); assert.equal(inserted[0].props.cta_variant,assignment.variant);assert.equal(inserted[0].props.cta_subject,assignment.subject); assert.equal(inserted[0].props.cta_experiment,c.CTA_EXPERIMENT);assert.equal(inserted[0].props.qa,false);
 const qaCookie=c.CTA_COOKIE+'='+c.signCtaAssignment({...assignment,qa:true},secret);
 await track(request({event:'cta_click',props:{qa:false}},qaCookie));assert.equal(inserted.at(-1).props.qa,true);
 process.env.SANGUN_CTA_AB_ENABLED='0';const count=inserted.length;await track(request({event:'cta_exposure'},cookie));assert.equal(inserted.length,count);delete process.env.SANGUN_CTA_AB_ENABLED;
 const link=load('src/lib/gate-order-attribution.ts').recordGateOrder;
 inserted=[];await link(undefined,'ord_TEST','bundle-sangun-inyeon',undefined,token);
 assert.equal(inserted.length,1);assert.equal(inserted[0].event,'cta_order_link'); assert.equal(inserted[0].props.source,'server');assert.equal(inserted[0].props.orderId,'ord_TEST');assert.equal(inserted[0].props.cta_subject,assignment.subject);
 inserted=[];await link(undefined,'ord_TEST','inyeon-saju',undefined,token);assert.equal(inserted.length,0);
 const capture=load('src/lib/purchase-tracking.ts').capturePurchaseContext;
 await capture(service,request({},qaCookie),'internal-test');assert.equal(captured.context.cta_subject,assignment.subject);assert.equal(captured.context.qa,true);
 console.log('PASS: server labels override forged labels; unsigned/closed exposures and forged order links rejected; QA excluded; bundle purchase linked; other product isolated; CTA purchase context retained.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});`;
new Function('require','__dirname',harness+checks)(require,__dirname);
