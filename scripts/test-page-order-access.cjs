const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const ownerId = 'member-owner';
const orderId = 'ord_access_test';
const resultId = 'result-access-test';

function loadPage(file, mocks) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, AbortSignal, require: name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'next/link' || name.startsWith('@/components/') || name.startsWith('@/lib/saju/')) {
      return new Proxy({}, { get: () => () => { throw new Error('Unexpected content rendering'); } });
    }
    throw new Error(`Unexpected test import: ${name}`);
  } });
  return exports.default;
}

function fixture({ member = true, user = null, status = 'pending', results = ['first-result'], missingOrder = false, missingResult = false, resultPage = false } = {}) {
  const reads = [];
  const claims = [];
  let authCalls = 0;
  const order = {
    id: 'db-order', order_id: orderId, status, amount: member ? 23000 : 24900,
    user_id: member ? ownerId : null, guest_email: 'synthetic@example.test', product_id: 'product',
  };
  const service = { from: table => {
    let fields = '';
    const reply = () => {
      reads.push([table, fields]);
      if (table === 'orders') return { data: missingOrder ? null : fields === 'phone, marketing_opt_in' ? { phone: '01099990000', marketing_opt_in: false } : order, error: null };
      if (table === 'profiles') return { data: { phone: '01088880000' }, error: null };
      if (table === 'products') return { data: fields === 'compare_at_price' ? { compare_at_price: 35100 } : { name: 'Synthetic product', slug: 'sangun-sinjeom' }, error: null };
      if (table === 'saju_results') {
        if (!resultPage) return { data: results.map(id => ({ id })), error: null };
        if (fields === 'id, product_slug') throw new Error('CONTENT_REACHED');
        return { data: missingResult ? null : { id: resultId, order_id: order.id }, error: null };
      }
      throw new Error(`Unexpected table: ${table}`);
    };
    const query = {
      select(value) { fields = value; return query; }, eq() { return query; },
      order() { return query; }, limit() { return query; }, abortSignal() { return query; },
      maybeSingle() { return Promise.resolve().then(reply); }, single() { return Promise.resolve().then(reply); },
      then(resolve, reject) { return Promise.resolve().then(reply).then(resolve, reject); },
    };
    return query;
  } };
  const mocks = {
    'next/navigation': {
      notFound: () => { throw new Error('NOT_FOUND'); },
      redirect: destination => { throw new Error(`REDIRECT:${destination}`); },
    },
    '@/lib/supabase/server': {
      createServiceClient: () => service,
      createClient: async () => ({ auth: { getUser: async () => { authCalls++; return { data: { user } }; } } }),
    },
    '@/components/checkout/ContactFields': { CheckoutForm: 'checkout-form' },
    '@/components/checkout/PriceExposure': { PriceExposure: 'price-exposure' },
    '@/components/saju/TrustStrip': { TrustStrip: 'trust-strip' },
    '@/components/checkout/LoginNudge': { LoginNudge: 'login-nudge' },
    '@/lib/utils': { formatKRW: value => `${value}원` },
    '@/lib/pricing': { MEMBER_DISCOUNT: 1900 },
    '@/lib/claim-pending-order': { claimPendingOrder: async (...args) => { claims.push(args); } },
    '@/lib/world': { worldOfSlug: () => 'sangun', worldClass: () => '', worldBg: () => '' },
    '@/lib/toss/keys': { directPayReady: () => true },
    '@/lib/checkout-recovery': { checkoutRetryPath: value => `/checkout/${value}` },
  };
  const page = loadPage(resultPage ? 'src/app/results/[resultId]/page.tsx' : 'src/app/checkout/[orderId]/page.tsx', mocks);
  return {
    reads, claims, order, authCalls: () => authCalls,
    run: (searchParams = {}) => page({ params: Promise.resolve(resultPage ? { resultId } : { orderId }), searchParams: Promise.resolve(searchParams) }),
  };
}

function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== 'object') return [];
  return [node, ...nodes(node.props?.children)];
}

for (const status of ['pending', 'paid']) {
  for (const [label, user, expected] of [
    ['anonymous', null, `REDIRECT:/login?redirect=${encodeURIComponent(`/checkout/${orderId}`)}`],
    ['different member', { id: 'other-member' }, 'NOT_FOUND'],
  ]) {
    test(`${label} cannot read ${status} member checkout contacts or paid-result links`, async () => {
      const current = fixture({ status, user });
      await assert.rejects(current.run(), error => error.message === expected);
      assert.equal(current.authCalls(), 1);
      assert.deepEqual(current.reads.map(([table]) => table), ['orders']);
      assert.equal(current.claims.length, 0);
    });
  }
}

test('member owner retains the saved amount and checkout contact fields', async () => {
  const current = fixture({ user: { id: ownerId } });
  const form = nodes(await current.run()).find(node => node.type === 'checkout-form');
  assert.equal(current.authCalls(), 1);
  assert.equal(form.props.amount, 23000);
  assert.equal(form.props.customerKey, ownerId);
  assert.equal(form.props.customerEmail, 'synthetic@example.test');
  assert.equal(form.props.defaultPhone, '01088880000');
  assert.equal(form.props.savedContact.phone, '01099990000');
});

test('member owner can reach the first bundle result or the paid waiting screen', async () => {
  const ready = fixture({ user: { id: ownerId }, status: 'paid', results: ['first-result', 'second-result'] });
  await assert.rejects(ready.run(), error => error.message === 'REDIRECT:/results/first-result');
  const waiting = fixture({ user: { id: ownerId }, status: 'paid', results: [] });
  const tree = await waiting.run();
  assert.equal(nodes(tree).some(node => node.type === 'checkout-form'), false);
  assert.ok(nodes(tree).some(node => node.type === 'h1' && node.props.children === '결제 완료'));
});

for (const user of [null, { id: 'other-member' }]) {
  test(`guest checkout remains accessible without an ownership lookup (${user ? 'signed in' : 'anonymous'})`, async () => {
    const current = fixture({ member: false, user });
    const form = nodes(await current.run()).find(node => node.type === 'checkout-form');
    assert.equal(current.authCalls(), 0);
    assert.equal(form.props.amount, 24900);
    assert.equal(form.props.customerKey, 'guest_db-order');
    assert.equal(form.props.defaultPhone, null);
  });
}

test('paid guest orders retain their result redirect without requiring login', async () => {
  const current = fixture({ member: false, status: 'paid' });
  await assert.rejects(current.run(), error => error.message === 'REDIRECT:/results/first-result');
  assert.equal(current.authCalls(), 0);
});

test('login claim keeps the same guest order and invokes the existing claim exactly once', async () => {
  const current = fixture({ member: false, user: { id: ownerId } });
  await assert.rejects(current.run({ claim: '1' }), error => error.message === `REDIRECT:/checkout/${orderId}`);
  assert.equal(current.authCalls(), 1);
  assert.equal(current.claims.length, 1);
  assert.equal(current.claims[0][1], current.order);
  assert.equal(current.claims[0][2], ownerId);
});

test('missing checkout orders fail closed without querying contacts or authentication', async () => {
  const current = fixture({ missingOrder: true });
  await assert.rejects(current.run(), error => error.message === 'NOT_FOUND');
  assert.equal(current.authCalls(), 0);
  assert.deepEqual(current.reads.map(([table]) => table), ['orders']);
});

for (const [label, member, user, expected] of [
  ['anonymous member result', true, null, `REDIRECT:/login?redirect=${encodeURIComponent(`/results/${resultId}`)}`],
  ['different member result', true, { id: 'other-member' }, 'NOT_FOUND'],
  ['owner member result', true, { id: ownerId }, 'CONTENT_REACHED'],
  ['anonymous guest result', false, null, 'CONTENT_REACHED'],
  ['signed-in guest result', false, { id: 'other-member' }, 'CONTENT_REACHED'],
]) {
  test(`result ownership policy: ${label}`, async () => {
    const current = fixture({ resultPage: true, member, user });
    await assert.rejects(current.run(), error => error.message === expected);
    assert.equal(current.authCalls(), member ? 1 : 0);
    const contentRead = current.reads.some(([table, fields]) => table === 'saju_results' && fields === 'id, product_slug');
    assert.equal(contentRead, expected === 'CONTENT_REACHED');
  });
}

test('a result without a readable parent order is not treated as a guest result', async () => {
  const current = fixture({ resultPage: true, missingOrder: true });
  await assert.rejects(current.run(), error => error.message === 'NOT_FOUND');
  assert.equal(current.authCalls(), 0);
  assert.equal(current.reads.length, 2);
});

test('a missing result never reaches the parent-order or content lookup', async () => {
  const current = fixture({ resultPage: true, missingResult: true });
  await assert.rejects(current.run(), error => error.message === 'NOT_FOUND');
  assert.deepEqual(current.reads.map(([table]) => table), ['saju_results']);
});
