const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');

const compilerOptions = { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 };
const helperCode = ts.transpileModule(fs.readFileSync('src/lib/order-create-diagnostics.ts', 'utf8'), { compilerOptions }).outputText;
const helperContext = {
  exports: {}, crypto: webcrypto, performance,
  require: name => {
    assert.equal(name, '@/lib/pricing');
    return { MIN_CHARGE: 100 };
  },
};
vm.runInNewContext(helperCode, helperContext);
const fetchOrderWithDiagnostics = helperContext.exports.fetchOrderWithDiagnostics;
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const success = { orderId: 'ord_TEST_ONLY', amount: 19900 };
const privatePayload = { name: 'PRIVATE_NAME', birthDate: '1990-01-15', concerns: ['PRIVATE_CONCERN'], email: 'private@example.invalid', phone: '010-1111-2222' };

function fixture(request, trackThrows = false) {
  const events = [];
  let requests = 0;
  let elapsed = 0;
  return {
    events,
    requests: () => requests,
    run: () => fetchOrderWithDiagnostics({
      slug: 'bundle-sangun-inyeon', displayedAmount: 31900, member: false,
      now: () => elapsed,
      request: async () => { requests++; elapsed = 275; return request(); },
      track: (event, params) => { if (trackThrows) throw new Error('telemetry unavailable'); events.push({ event, params }); },
    }),
  };
}

function assertPrivateDataAbsent(events) {
  const serialized = JSON.stringify(events);
  for (const value of Object.values(privatePayload).flat()) assert.equal(serialized.includes(value), false);
  assert.equal(serialized.includes('PRIVATE_ERROR'), false);
}

test('one attempt and success join the saved server quote without private response fields', async () => {
  const sample = fixture(() => response({ ...success, ...privatePayload }));
  const result = await sample.run();
  assert.equal(result.ok, true);
  assert.equal(result.amount, 19900);
  assert.equal(sample.requests(), 1);
  assert.deepEqual(sample.events.map(entry => entry.event), ['order_create_attempt', 'order_create_result']);
  const [attempt, completed] = sample.events.map(entry => entry.params);
  assert.equal(attempt.attemptId, completed.attemptId);
  assert.match(attempt.attemptId, /^[0-9a-f-]{36}$/);
  assert.equal(completed.outcome, 'success');
  assert.equal(completed.duration_ms, 275);
  assert.equal(completed.http_status, 200);
  assert.equal(completed.value, 19900);
  assert.equal(completed.displayedAmount, 31900);
  assert.equal(completed.orderId, success.orderId);
  assert.ok(Object.keys(completed).length + 1 <= 12);
  assertPrivateDataAbsent(sample.events);
});

test('HTTP failures and price refresh classification never copy raw error details to telemetry', async () => {
  for (const status of [400, 404, 409, 500, 503]) {
    const sample = fixture(() => response({ error: 'PRIVATE_ERROR', detail: privatePayload, code: status === 409 ? 'PRICE_CHANGED' : 'PRIVATE_ERROR' }, status));
    const result = await sample.run();
    assert.equal(result.ok, false);
    assert.equal(result.error, 'PRIVATE_ERROR');
    assert.equal(sample.requests(), 1);
    assert.equal(sample.events.length, 2);
    assert.equal(sample.events[1].params.outcome, 'http_error');
    assert.equal(sample.events[1].params.http_status, status);
    assert.equal(sample.events[1].params.reason, status === 409 ? 'price_changed' : 'http_status');
    assertPrivateDataAbsent(sample.events);
  }
});

test('network failure is measured once without retrying or copying its message', async () => {
  const original = new Error('PRIVATE_ERROR private@example.invalid');
  const sample = fixture(() => { throw original; });
  await assert.rejects(sample.run(), error => error === original);
  assert.equal(sample.requests(), 1);
  assert.equal(sample.events.length, 2);
  assert.equal(sample.events[1].params.outcome, 'network_error');
  assert.equal(sample.events[1].params.http_status, undefined);
  assertPrivateDataAbsent(sample.events);
});

test('unreadable success and HTTP error responses retain distinct outcomes', async () => {
  for (const status of [200, 502]) {
    const sample = fixture(() => new Response('PRIVATE_ERROR private@example.invalid', { status }));
    await assert.rejects(sample.run());
    assert.equal(sample.requests(), 1);
    assert.equal(sample.events[1].params.outcome, status === 200 ? 'response_error' : 'http_error');
    assert.equal(sample.events[1].params.reason, 'invalid_json');
    assertPrivateDataAbsent(sample.events);
  }
});

test('malformed success responses cannot navigate or emit a false success', async () => {
  for (const body of [null, [], {}, { ...success, orderId: 'private@example.invalid' }, { ...success, amount: 0 }, { ...success, amount: 99 }, { ...success, amount: 19900.5 }, { ...success, amount: '19900' }]) {
    const sample = fixture(() => response(body));
    await assert.rejects(sample.run());
    assert.equal(sample.requests(), 1);
    assert.equal(sample.events[1].params.outcome, 'response_error');
    assert.equal(sample.events[1].params.reason, 'invalid_success');
    assert.equal(sample.events[1].params.orderId, undefined);
    assertPrivateDataAbsent(sample.events);
  }
});

test('telemetry failure cannot block success or mask the original network failure', async () => {
  const sample = fixture(() => response(success), true);
  assert.equal((await sample.run()).ok, true);
  assert.equal(sample.requests(), 1);
  const original = new Error('offline');
  const failed = fixture(() => { throw original; }, true);
  await assert.rejects(failed.run(), error => error === original);
  assert.equal(failed.requests(), 1);
});

test('a pending request stays single and separate manual calls have separate attempt IDs', async () => {
  let resolveRequest;
  const sample = fixture(() => new Promise(resolve => { resolveRequest = resolve; }));
  const pending = sample.run();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sample.requests(), 1);
  assert.equal(sample.events.length, 1);
  resolveRequest(response(success));
  await pending;
  const next = sample.run();
  resolveRequest(response(success));
  await next;
  assert.equal(sample.requests(), 2);
  assert.notEqual(sample.events[0].params.attemptId, sample.events[2].params.attemptId);
});

const wizard = fs.readFileSync('src/components/saju/SajuWizard.tsx', 'utf8');
const syntax = ts.createSourceFile('SajuWizard.tsx', wizard, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let createOrderSource;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'createOrder') createOrderSource = node.getText(syntax);
  ts.forEachChild(node, visit);
}
visit(syntax);
assert.ok(createOrderSource);
const createOrderCode = ts.transpileModule(`${createOrderSource}\nexports.run = createOrder;`, { compilerOptions }).outputText;

function wizardFixture({ member = false, validEmail = true, birthDate = privatePayload.birthDate, reply = () => response(success), trackThrows = false } = {}) {
  const events = [], requests = [], navigation = [], submitting = [], errors = [];
  let refreshes = 0;
  const context = {
    exports: {}, Error, form: { birthDate }, guestEmailValid: validEmail, isLoggedIn: member,
    selected: { productId: 'TEST_PRODUCT', slug: 'bundle-sangun-inyeon' }, effectivePrice: 31900,
    guestEmail: ` ${privatePayload.email} `, payload: () => ({ ...privatePayload }),
    chargeFor: (price, isMember) => price - (isMember ? 1900 : 0), fetchOrderWithDiagnostics,
    setStep() {}, setSubmitting: value => submitting.push(value), toast: { error: value => errors.push(value) },
    router: { push: value => navigation.push(value), refresh: () => refreshes++ },
    track: (event, params) => { if (trackThrows) throw new Error('telemetry unavailable'); events.push({ event, params }); },
    fetch: async (url, init) => { requests.push({ url, init }); return reply(); },
  };
  vm.runInNewContext(createOrderCode, context);
  return { run: context.exports.run, events, requests, navigation, submitting, errors, refreshes: () => refreshes };
}

test('actual wizard preserves POST payload, member discount and server-saved amount before checkout', async () => {
  for (const member of [false, true]) {
    const sample = wizardFixture({ member });
    await sample.run();
    assert.equal(sample.requests.length, 1);
    const request = sample.requests[0];
    assert.equal(request.url, '/api/orders/create');
    assert.equal(request.init.method, 'POST');
    assert.equal(request.init.signal, undefined);
    const body = JSON.parse(request.init.body);
    assert.equal(body.productId, 'TEST_PRODUCT');
    assert.equal(body.displayedAmount, member ? 30000 : 31900);
    assert.equal(body.email, member ? undefined : privatePayload.email);
    assert.equal(body.name, privatePayload.name);
    assert.deepEqual(sample.navigation, ['/checkout/ord_TEST_ONLY']);
    assert.equal(sample.events.at(-1).event, 'begin_checkout');
    assert.equal(sample.events.at(-1).params.value, 19900);
    assertPrivateDataAbsent(sample.events);
  }
});

test('actual wizard keeps client validation outside network attempt counts', async () => {
  for (const options of [{ validEmail: false }, { birthDate: '' }]) {
    const sample = wizardFixture(options);
    await sample.run();
    assert.equal(sample.requests.length, 0);
    assert.equal(sample.events.length, 0);
    assert.equal(sample.navigation.length, 0);
    assert.equal(sample.errors.length, 1);
  }
});

test('actual wizard refreshes a stale quote without retrying and releases loading on failure', async () => {
  const sample = wizardFixture({ reply: () => response({ code: 'PRICE_CHANGED', error: '새 금액을 확인해 주세요' }, 409) });
  await sample.run();
  assert.equal(sample.requests.length, 1);
  assert.equal(sample.refreshes(), 1);
  assert.equal(sample.navigation.length, 0);
  assert.deepEqual(sample.submitting, [true, false]);
  assert.equal(sample.errors[0], '새 금액을 확인해 주세요');
});

test('actual wizard still navigates when both diagnostic and begin_checkout tracking throw', async () => {
  const sample = wizardFixture({ trackThrows: true });
  await sample.run();
  assert.equal(sample.requests.length, 1);
  assert.deepEqual(sample.navigation, ['/checkout/ord_TEST_ONLY']);
  assert.equal(sample.errors.length, 0);
});
