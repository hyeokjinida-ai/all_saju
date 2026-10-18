const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
const mocks = {
  'next/server': { NextResponse: { json: (body, init) => new Response(JSON.stringify(body), init) } },
  '@/lib/supabase/server': { createServiceClient: () => { throw Error('Test must not use DB'); } },
};
function load(file) {
  const resolved = path.resolve(root, file);
  if (cache.has(resolved)) return cache.get(resolved).exports;
  const mod = { exports: {} }; cache.set(resolved, mod);
  const js = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', js)(name => {
    if (mocks[name]) return mocks[name];
    return name.startsWith('@/') ? load('src/' + name.slice(2) + '.ts') : require(name);
  }, mod, mod.exports);
  return mod.exports;
}
(async () => {
  Object.assign(process.env, { CRON_SECRET: 'fake-cron', VERCEL_ENV: 'production', META_CAPI_ENABLED: '0',
    META_CAPI_ACCESS_TOKEN: 'fake-test-token', NEXT_PUBLIC_META_PIXEL_ID: '123456', META_CAPI_API_VERSION: 'v26.0' });
  const route = load('src/app/api/cron/purchase-tracking/test/route.ts');
  const request = (body, auth = 'Bearer fake-cron') => ({ headers: new Headers({ authorization: auth }), json: async () => body });
  let sent = [];
  global.fetch = async (url, options) => {
    sent.push({ url, body: JSON.parse(options.body) });
    return { ok: true, status: 200, json: async () => ({ events_received: 1 }) };
  };
  assert.equal((await route.POST(request({ testEventCode: 'TEST12345' }, 'wrong'))).status, 401);
  assert.equal((await route.POST(request({}))).status, 400);
  assert.equal((await route.POST(request({ testEventCode: 'production' }))).status, 400);
  assert.equal(sent.length, 0);
  process.env.META_CAPI_ENABLED = '1';
  assert.equal((await route.POST(request({ testEventCode: 'TEST12345' }))).status, 409);
  process.env.META_CAPI_ENABLED = '0'; process.env.VERCEL_ENV = 'preview';
  assert.equal((await route.POST(request({ testEventCode: 'TEST12345' }))).status, 409);
  process.env.VERCEL_ENV = 'production'; delete process.env.META_CAPI_ACCESS_TOKEN;
  assert.equal((await route.POST(request({ testEventCode: 'TEST12345' }))).status, 503);
  process.env.META_CAPI_ACCESS_TOKEN = 'fake-test-token';
  const response = await route.POST(request({ testEventCode: 'TEST12345', amount: 99999, email: 'never-send@example.com' }));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.testOnly, true); assert.equal(sent.length, 2);
  assert.deepEqual(sent[0], sent[1], 'replay must preserve the entire event and test code');
  assert.equal(sent[0].body.test_event_code, 'TEST12345');
  assert.equal(sent[0].body.data[0].event_name, 'Purchase');
  assert.equal(sent[0].body.data[0].custom_data.value, 0);
  assert.match(result.eventId, /^capi_test_/);
  assert.equal(JSON.stringify(sent).includes('never-send'), false);
  assert.equal(JSON.stringify(result).includes('fake-test-token'), false);
  sent = [];
  global.fetch = async () => ({ ok: false, status: 400, json: async () => ({ error: { code: 190, message: 'secret upstream data' } }) });
  const failure = await route.POST(request({ testEventCode: 'TEST12345' }));
  assert.equal(failure.status, 502);
  const failureBody = await failure.json();
  assert.equal(failureBody.results.length, 1);
  assert.equal(failureBody.results[0].errorCode, 190);
  assert.equal(JSON.stringify(failureBody).includes('secret upstream'), false);
  console.log('PASS: authenticated test-only commissioning, disabled-only gate, no DB or customers, canonical payload, stable duplicate, sanitized failures');
})().catch(error => { console.error(error); process.exitCode = 1; });
