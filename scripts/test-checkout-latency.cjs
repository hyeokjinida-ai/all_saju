const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const flush = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
function load(file, mocks) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, AbortSignal, require: name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name === 'zod') return require(name);
    throw new Error(`Unexpected test import: ${name}`);
  } });
  return exports;
}
function query(run) {
  const builder = { select() { return builder; }, eq() { return builder; }, is() { return builder; }, gte() { return builder; }, order() { return builder; }, limit() { return builder; }, maybeSingle() { return builder; }, single() { return builder; }, abortSignal() { return builder; }, then(resolve, reject) { return Promise.resolve().then(run).then(resolve, reject); } };
  return builder;
}

for (const reuse of [false, true]) {
  test(`order creation overlaps auth/product and waits for both attribution writes (${reuse ? 'reused' : 'new'})`, async () => {
    const auth = deferred(), product = deferred(), gate = deferred(), context = deferred();
    const started = [];
    let captured;
    const service = { from: table => {
      let inserting = false;
      const builder = query(() => {
        started.push(table);
        if (table === 'products') return product.promise;
        if (table === 'orders') return { data: inserting ? { id: 'new-db' } : reuse ? { id: 'old-db', order_id: 'ord_saved', amount: 19900 } : null, error: null };
        return { data: null, error: null };
      });
      builder.insert = () => { inserting = true; return builder; };
      builder.update = () => builder;
      return builder;
    } };
    const create = load('src/app/api/orders/create/route.ts', {
      'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
      nanoid: { nanoid: () => 'new_order' },
      '@/lib/supabase/server': { createServiceClient: () => service, createClient: async () => ({ auth: { getUser: () => { started.push('auth'); return auth.promise; } } }) },
      '@/lib/pricing': { MIN_CHARGE: 100, chargeFor: price => price },
      '@/lib/cta-experiment': { CTA_COOKIE: 'cta' },
      '@/lib/gate-experiment': { GATE_COOKIE: 'gate' },
      '@/lib/detail-experiment': { DETAIL_COOKIE: 'detail' },
      '@/lib/gate-order-attribution': { recordGateOrder: () => { started.push('gate'); return gate.promise; } },
      '@/lib/purchase-tracking': { capturePurchaseContext: (...args) => { captured = args; started.push('context'); return context.promise; } },
    }).POST;
    let settled = false;
    const request = { json: async () => ({ productId: '10000000-0000-4000-8000-000000000001', displayedAmount: 24900, birthDate: '1990-01-01', birthTime: null, timeUnknown: true, gender: 'female', calendar: 'solar', concerns: [], email: 'qa@example.test' }), cookies: { get: () => undefined } };
    const pending = create(request).then(result => { settled = true; return result; });
    await flush();
    assert.ok(started.includes('auth'));
    assert.ok(started.includes('products'));
    assert.equal(started.includes('orders'), false);
    product.resolve({ data: { id: 'product', slug: 'sangun-sinjeom', price: 24900, is_active: true }, error: null });
    auth.resolve({ data: { user: null } });
    await flush();
    assert.ok(started.includes('gate'));
    assert.ok(started.includes('context'));
    gate.resolve();
    await flush();
    assert.equal(settled, false);
    context.resolve();
    const response = await pending;
    assert.equal(response.status, 200);
    assert.equal(response.body.amount, reuse ? 19900 : 24900);
    assert.equal(response.body.orderId, reuse ? 'ord_saved' : 'ord_new_order');
    if (reuse) assert.equal(captured[4], undefined);
    else assert.deepEqual(JSON.parse(JSON.stringify(captured[4])), { id: 'new-db', order_id: 'ord_new_order', status: 'pending' });
  });
}

test('only the server-created pending order skips a redundant purchase-context lookup', async () => {
  const source = fs.readFileSync(path.join(root, 'src/lib/purchase-tracking.ts'), 'utf8');
  const syntax = ts.createSourceFile('purchase-tracking.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const declaration = syntax.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'capturePurchaseContext');
  const compiled = ts.transpileModule(`${declaration.getText(syntax)}\nexports.run = capturePurchaseContext;`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, process: { env: { VERCEL_ENV: 'production' } }, console,
    GATE_COOKIE: 'gate', DETAIL_COOKIE: 'detail', CTA_COOKIE: 'cta',
    readGateAssignment: () => null, readDetailAssignment: () => null, readCtaAssignment: () => null,
    attributionCookie: () => ({}), metaCookie: () => undefined, timeout: () => undefined,
  });
  const request = { cookies: { get: () => undefined }, headers: { get: () => null } };
  for (const [known, status, expectedReads, expectedWrites] of [[{ id: 'new-db', order_id: 'ord_new', status: 'pending' }, 'pending', 0, 1], [undefined, 'pending', 1, 1], [undefined, 'paid', 1, 0], [{ id: 'wrong-db', order_id: 'ord_wrong', status: 'pending' }, 'paid', 1, 0]]) {
    let reads = 0, writes = 0;
    const service = { from: table => {
      const builder = query(() => {
        if (table === 'orders') { reads++; return { data: { id: 'new-db', order_id: 'ord_new', status }, error: null }; }
        writes++;
        return { data: null, error: null };
      });
      builder.upsert = () => builder;
      return builder;
    } };
    await exports.run(service, request, 'new-db', false, known);
    assert.equal(reads, expectedReads);
    assert.equal(writes, expectedWrites);
  }
});

test('SDK preloading does not create a payment or widget and keeps customer binding on checkout', async () => {
  const calls = [];
  const env = { NEXT_PUBLIC_TOSS_API_CLIENT_KEY: 'test_api', NEXT_PUBLIC_TOSS_CLIENT_KEY: 'test_widget' };
  const client = load('src/lib/toss/client.ts', {
    '@tosspayments/tosspayments-sdk': { loadTossPayments: async key => { calls.push(['load', key]); return { payment: options => { calls.push(['payment', options.customerKey]); return {}; }, widgets: options => { calls.push(['widgets', options.customerKey]); return {}; } }; } },
    '@/lib/env': { publicEnv: env },
  });
  await client.preloadPaymentSdk();
  assert.deepEqual(calls, [['load', 'test_api']]);
  await client.loadPayment('customer');
  assert.deepEqual(calls.at(-1), ['payment', 'customer']);
  env.NEXT_PUBLIC_TOSS_API_CLIENT_KEY = '';
  await client.preloadPaymentSdk();
  assert.deepEqual(calls.at(-1), ['load', 'test_widget']);
});

test('checkout starts independent reads together and retains the server order amount', async () => {
  const product = deferred(), reference = deferred(), profile = deferred();
  const started = [];
  const service = { from: table => {
    let fields = '';
    const builder = query(() => {
      if (table === 'orders' && fields.includes('status')) return { data: { id: 'db-order', order_id: 'ord_saved', status: 'pending', amount: 23000, user_id: 'member', guest_email: null, product_id: 'product' } };
      if (table === 'orders') { started.push('contact'); return { data: { phone: null, marketing_opt_in: false }, error: null }; }
      if (table === 'profiles') { started.push('profile'); return profile.promise; }
      if (fields === 'name, slug') { started.push('product'); return product.promise; }
      started.push('reference'); return reference.promise;
    });
    builder.select = value => { fields = value; return builder; };
    return builder;
  } };
  const jsx = (type, props) => typeof type === 'function' ? type(props) : { type, props: props || {} };
  const page = load('src/app/checkout/[orderId]/page.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { notFound: () => { throw new Error('Not found'); }, redirect: () => { throw new Error('Unexpected redirect'); } },
    '@/lib/supabase/server': { createServiceClient: () => service, createClient: () => { throw new Error('Unexpected auth lookup'); } },
    '@/components/checkout/ContactFields': { CheckoutForm: 'checkout-form' },
    '@/components/checkout/PriceExposure': { PriceExposure: 'price-exposure' },
    '@/components/saju/TrustStrip': { TrustStrip: 'trust-strip' },
    '@/components/checkout/LoginNudge': { LoginNudge: 'login-nudge' },
    '@/lib/utils': { formatKRW: value => `${value}원` },
    '@/lib/pricing': { MEMBER_DISCOUNT: 1900 },
    '@/lib/claim-pending-order': { claimPendingOrder: () => { throw new Error('Unexpected claim'); } },
    '@/lib/world': { worldOfSlug: () => 'sangun', worldClass: () => '', worldBg: () => '' },
    '@/lib/toss/keys': { directPayReady: () => true },
    '@/lib/checkout-recovery': { checkoutRetryPath: () => null },
  }).default;
  let settled = false;
  const pending = page({ params: Promise.resolve({ orderId: 'ord_saved' }), searchParams: Promise.resolve({}) }).then(result => { settled = true; return result; });
  await flush();
  assert.deepEqual([...started].sort(), ['contact', 'product', 'profile', 'reference']);
  product.resolve({ data: { name: '상품', slug: 'sangun-sinjeom' } });
  reference.resolve({ data: { compare_at_price: 35100 } });
  await flush();
  assert.equal(settled, false);
  profile.resolve({ data: { phone: '01000000000' } });
  const tree = await pending;
  function nodes(node) {
    if (Array.isArray(node)) return node.flatMap(nodes);
    if (!node || typeof node !== 'object') return [];
    return [node, ...nodes(node.props?.children)];
  }
  const form = nodes(tree).find(node => node.type === 'checkout-form');
  assert.equal(form.props.amount, 23000);
  assert.equal(form.props.defaultPhone, '01000000000');
  assert.deepEqual(JSON.parse(JSON.stringify(form.props.savedContact)), { phone: null, marketingOptIn: false });
});

test('unchanged contact skips the network but edits and later clearing are always saved', async () => {
  const source = fs.readFileSync(path.join(root, 'src/components/checkout/ContactFields.tsx'), 'utf8');
  const syntax = ts.createSourceFile('ContactFields.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration;
  function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'beforePay') declaration = node; ts.forEachChild(node, visit); }
  visit(syntax);
  const code = ts.transpileModule(`${declaration.getText(syntax)}\nexports.run = beforePay;`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const writes = [], events = [];
  const context = { exports: {}, Date, orderId: 'ord_saved', digits: '', optIn: false, directPay: true,
    savedContactRef: { current: { orderId: 'ord_saved', phone: null, marketingOptIn: false } },
    setErr() {}, track() {}, safeCheckoutTrack: (...args) => events.push(args),
    saveOptionalCheckoutContact: async (orderId, contact) => { writes.push({ orderId, ...contact }); return 'saved'; },
  };
  vm.runInNewContext(code, context);
  assert.equal(await context.exports.run(), true);
  assert.equal(writes.length, 0);
  assert.equal(events.at(-1)[2].outcome, 'unchanged');
  context.digits = '01000000000';
  await context.exports.run();
  context.digits = '';
  await context.exports.run();
  context.optIn = true;
  await context.exports.run();
  assert.deepEqual(writes.map(write => [write.phone, write.marketingOptIn]), [['01000000000', false], [null, false], [null, true]]);
  context.savedContactRef.current = { orderId: 'another-order', phone: null, marketingOptIn: true };
  await context.exports.run();
  assert.equal(writes.length, 4);
  context.optIn = false;
  context.savedContactRef.current = { orderId: 'ord_saved', phone: null, marketingOptIn: true };
  await context.exports.run();
  assert.equal(writes.at(-1).marketingOptIn, false);
  assert.equal(writes.length, 5);
  context.digits = '12';
  assert.equal(await context.exports.run(), false);
  assert.equal(writes.length, 5);
});
