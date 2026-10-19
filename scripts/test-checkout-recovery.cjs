const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
const orderId = 'ord_12345678901234567890';
let effects = [], events = [], notifications = [], requests = [];
let paymentError = null, sdkError = null, search = new URLSearchParams();
let checkoutOrderStatus = 'paid', checkoutResults = [], resultError = false;
let diagnosticThrows = false;
const mocks = {
  react: { useState: value => [value, () => {}], useRef: value => ({ current: value }), useEffect: effect => effects.push(effect), Suspense: 'test-suspense' },
  'next/link': 'test-link',
  'next/navigation': {
    useSearchParams: () => search,
    redirect: target => { throw new Error(`REDIRECT:${target}`); },
    notFound: () => { throw new Error('NOT_FOUND'); },
  },
  sonner: { toast: { error: message => notifications.push(message) } },
  '@/components/ui/button': { Button: 'test-button', buttonVariants: () => '' },
  '@/components/ui/card': Object.fromEntries(['Card', 'CardContent', 'CardDescription', 'CardHeader', 'CardTitle'].map(name => [name, name])),
  '@/lib/utils': { cn: (...values) => values.join(' '), formatKRW: value => `${value}원` },
  '@/lib/analytics': { track: (event, props) => { if (diagnosticThrows) throw new Error('diagnostic_failure'); events.push({ event, props }); } },
  '@/lib/toss/client': {
    loadPayment: async () => {
      if (sdkError) throw sdkError;
      return { requestPayment: async request => { requests.push(request); if (paymentError) throw paymentError; } };
    },
    loadWidgets: async () => {
      if (sdkError) throw sdkError;
      return {
        setAmount: async () => {}, renderPaymentMethods: async () => {}, renderAgreement: async () => {},
        requestPayment: async request => { requests.push(request); if (paymentError) throw paymentError; },
      };
    },
  },
};
function load(file) {
  const resolved = path.resolve(root, file);
  if (cache.has(resolved)) return cache.get(resolved).exports;
  const module = { exports: {} };
  cache.set(resolved, module);
  const code = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  function requireLocal(name) {
    if (mocks[name]) return mocks[name];
    if (name.startsWith('@/') || name.startsWith('.')) {
      const base = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : path.resolve(path.dirname(resolved), name);
      const target = ['.ts', '.tsx'].map(extension => base + extension).find(candidate => fs.existsSync(candidate));
      if (target) return load(target);
    }
    return require(name);
  }
  new Function('require', 'module', 'exports', code)(requireLocal, module, module.exports);
  return module.exports;
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
const flush = () => new Promise(resolve => setImmediate(resolve));
function reset() { effects = []; events = []; notifications = []; requests = []; paymentError = null; sdkError = null; diagnosticThrows = false; }
const props = { orderId, amount: 31900, customerKey: 'synthetic', productName: 'QA', productSlug: 'sangun-sinjeom', customerEmail: null };

async function main() {
  const recovery = load('src/lib/checkout-recovery.ts');
  assert.equal(recovery.CONTACT_SAVE_TIMEOUT_MS, 1500);
  assert.equal(recovery.checkoutRetryPath(orderId), `/checkout/${orderId}`);
  for (const invalid of [null, '', '//evil.example', '/checkout/x', '../x', `${orderId}/x`, `${orderId}?next=https://evil.example`, `${orderId}\n`, 'ord_SHORT', 'ord_1234567890123456789\n']) {
    assert.equal(recovery.checkoutRetryPath(invalid), null);
  }
  const failUrl = new URL(recovery.checkoutFailUrl('https://checkout.example.invalid', orderId));
  assert.equal(failUrl.pathname, '/checkout/fail');
  assert.equal(failUrl.searchParams.get('orderId'), orderId);
  assert.equal(new URL(recovery.checkoutFailUrl('https://checkout.example.invalid', orderId, 'direct')).searchParams.get('checkout_mode'), 'direct');
  assert.equal(recovery.checkoutMode('private@example.invalid'), undefined);
  assert.equal(new URL(recovery.checkoutFailUrl('https://checkout.example.invalid', '//evil.example')).search, '');
  assert.equal(recovery.checkoutFailureCode({ code: 'USER_CANCEL', message: 'private@example.invalid' }), 'USER_CANCEL');
  assert.equal(recovery.checkoutFailureCode({ code: 'private@example.invalid' }), 'unknown');
  assert.equal(recovery.checkoutFailureCode(new Error('private@example.invalid')), 'unknown');
  assert.doesNotThrow(() => recovery.safeCheckoutTrack(() => { throw new Error('diagnostic_failure'); }, 'checkout_test', {}));

  let contactRequest;
  global.fetch = async (url, options) => { contactRequest = { url, options }; return { ok: true }; };
  assert.equal(await recovery.saveOptionalCheckoutContact(orderId, { phone: null, marketingOptIn: false }), 'saved');
  assert.equal(contactRequest.options.method, 'PATCH');
  assert.equal(contactRequest.url, `/api/orders/${orderId}/contact`);
  assert.deepEqual(JSON.parse(contactRequest.options.body), { phone: null, marketingOptIn: false });
  await new Promise(resolve => setTimeout(resolve, 15));
  assert.equal(contactRequest.options.signal.aborted, false);
  global.fetch = async () => ({ ok: false });
  assert.equal(await recovery.saveOptionalCheckoutContact(orderId, { phone: null, marketingOptIn: false }), 'http_error');
  global.fetch = async () => { throw new Error('private@example.invalid'); };
  assert.equal(await recovery.saveOptionalCheckoutContact(orderId, { phone: null, marketingOptIn: false }), 'network_error');
  let abandonedSignal;
  global.fetch = (url, options) => { abandonedSignal = options.signal; return new Promise(() => {}); };
  assert.equal(await recovery.saveOptionalCheckoutContact(orderId, { phone: null, marketingOptIn: false }, 10), 'timeout');
  assert.equal(abandonedSignal.aborted, true);

  const form = load('src/components/checkout/ContactFields.tsx').CheckoutForm;
  reset();
  let contactCalls = 0;
  global.fetch = async () => { contactCalls++; throw new Error('private@example.invalid'); };
  let tree = form({ ...props, defaultPhone: null, ctaLabel: '결제하기', directPay: true });
  assert.equal(nodes(tree).find(node => node.type === 'input' && node.props.type === 'checkbox').props.checked, false);
  assert.equal(await nodes(tree).find(node => node.props?.onBeforePay).props.onBeforePay(), true);
  assert.equal(contactCalls, 1);
  assert.equal(events.at(-1).props.outcome, 'network_error');
  tree = form({ ...props, defaultPhone: '123', ctaLabel: '결제하기', directPay: true });
  assert.equal(await nodes(tree).find(node => node.props?.onBeforePay).props.onBeforePay(), false);
  assert.equal(contactCalls, 1);

  global.window = { location: { origin: 'https://checkout.example.invalid' } };
  global.sessionStorage = { setItem: () => {} };
  const components = [load('src/components/checkout/PayMethods.tsx').PayMethods, load('src/components/checkout/TossWidget.tsx').TossWidget];
  reset();
  global.fetch = (url, options) => { abandonedSignal = options.signal; return new Promise(() => {}); };
  const timedForm = form({ ...props, defaultPhone: null, ctaLabel: '결제하기', directPay: true });
  const timedBeforePay = nodes(timedForm).find(node => node.props?.onBeforePay).props.onBeforePay;
  tree = components[0]({ ...props, onBeforePay: timedBeforePay });
  effects.forEach(effect => effect());
  await flush();
  await nodes(tree).find(node => node.type === 'test-button').props.onClick();
  assert.equal(abandonedSignal.aborted, true);
  assert.equal(requests.length, 1);
  assert.ok(events.some(event => event.event === 'checkout_contact_save' && event.props.outcome === 'timeout'));
  for (const component of components) {
    const expectedMode = component === components[0] ? 'direct' : 'widget';
    reset();
    tree = component({ ...props, onBeforePay: async () => true });
    effects.forEach(effect => effect());
    await flush();
    assert.equal(requests.length, 0);
    await nodes(tree).find(node => node.type === 'test-button').props.onClick();
    assert.equal(requests.length, 1);
    assert.equal(new URL(requests[0].failUrl).searchParams.get('orderId'), orderId);
    assert.equal(new URL(requests[0].failUrl).searchParams.get('checkout_mode'), expectedMode);
    assert.equal(requests[0].orderId, orderId);
    assert.ok(events.some(event => event.event === 'checkout_pay_request'));
    assert.ok(events.every(event => event.props.checkout_mode === expectedMode));
    assert.equal(events.find(event => event.event === 'checkout_widget_ready').props.variant, expectedMode === 'widget' ? 'new' : 'direct');

    reset();
    paymentError = { code: 'USER_CANCEL', message: 'private@example.invalid' };
    tree = component({ ...props, onBeforePay: async () => true });
    effects.forEach(effect => effect());
    await flush();
    await nodes(tree).find(node => node.type === 'test-button').props.onClick();
    assert.equal(notifications.length, 0);
    assert.ok(events.some(event => event.event === 'checkout_pay_cancel'));
    assert.equal(requests.length, 1);

    reset();
    paymentError = { code: 'private@example.invalid', message: 'private@example.invalid' };
    tree = component({ ...props, onBeforePay: async () => true });
    effects.forEach(effect => effect());
    await flush();
    await nodes(tree).find(node => node.type === 'test-button').props.onClick();
    assert.equal(events.find(event => event.event === 'checkout_pay_error').props.code, 'unknown');
    assert.equal(JSON.stringify({ events, notifications }).includes('private@example.invalid'), false);

    reset();
    tree = component({ ...props, onBeforePay: async () => false });
    effects.forEach(effect => effect());
    await flush();
    await nodes(tree).find(node => node.type === 'test-button').props.onClick();
    assert.equal(requests.length, 0);

    reset();
    sdkError = new Error('private@example.invalid');
    tree = component(props);
    effects.forEach(effect => effect());
    await flush();
    assert.ok(events.some(event => event.event === 'checkout_widget_fail' && event.props.code === 'unknown'));
    assert.equal(JSON.stringify({ events, notifications }).includes('private@example.invalid'), false);

    reset();
    diagnosticThrows = true;
    global.fetch = async () => ({ ok: true });
    const diagnosticForm = form({ ...props, defaultPhone: null, ctaLabel: '결제하기', directPay: true });
    const safeBeforePay = nodes(diagnosticForm).find(node => node.props?.onBeforePay).props.onBeforePay;
    tree = component({ ...props, onBeforePay: safeBeforePay });
    effects.forEach(effect => effect());
    await flush();
    await nodes(tree).find(node => node.type === 'test-button').props.onClick();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].orderId, orderId);
    assert.equal(notifications.length, 0);
  }

  const failPage = load('src/app/checkout/fail/page.tsx').default;
  for (const valid of [true, false]) {
    reset();
    search = new URLSearchParams({ orderId: valid ? orderId : '//evil.example', code: 'private@example.invalid', message: 'private@example.invalid', checkout_mode: 'widget' });
    tree = failPage().props.children.type();
    effects.forEach(effect => effect());
    assert.equal(nodes(tree).filter(node => node.type === 'test-link' && node.props.href === `/checkout/${orderId}`).length, valid ? 1 : 0);
    assert.equal(requests.length, 0);
    assert.equal(events.at(-1).props.retryAvailable, valid);
    assert.equal(events.at(-1).props.checkout_mode, 'widget');
    assert.equal(JSON.stringify({ tree, events }).includes('private@example.invalid'), false);
  }
  reset(); diagnosticThrows = true;
  search = new URLSearchParams({ orderId, code: 'USER_CANCEL' });
  tree = failPage().props.children.type();
  assert.doesNotThrow(() => effects.forEach(effect => effect()));
  assert.equal(nodes(tree).filter(node => node.type === 'test-link' && node.props.href === `/checkout/${orderId}`).length, 1);
  mocks['@/lib/supabase/server'] = {
    createClient: async () => { throw new Error('Unexpected auth lookup'); },
    createServiceClient: () => ({ from: table => {
      const query = {
        select: () => query, eq: () => query, order: () => query,
        limit: async () => ({ data: checkoutResults, error: resultError ? { code: 'synthetic_error' } : null }),
        maybeSingle: async () => ({ data: table === 'orders'
          ? { id: 'synthetic-db', order_id: orderId, status: checkoutOrderStatus, amount: 31900, user_id: null, guest_email: null, product_id: 'synthetic-product' }
          : { compare_at_price: 54800 } }),
        single: async () => ({ data: { name: 'QA', slug: 'bundle-sangun-inyeon' } }),
      };
      return query;
    } }),
  };
  mocks['@/components/checkout/PriceExposure'] = { PriceExposure: 'price-exposure' };
  mocks['@/components/saju/TrustStrip'] = { TrustStrip: 'trust-strip' };
  mocks['@/components/checkout/LoginNudge'] = { LoginNudge: 'login-nudge' };
  mocks['@/lib/pricing'] = { MEMBER_DISCOUNT: 1900 };
  mocks['@/lib/claim-pending-order'] = { claimPendingOrder: async () => { throw new Error('Unexpected order claim'); } };
  mocks['@/lib/world'] = { worldOfSlug: () => 'sangun', worldClass: () => '', worldBg: () => '' };
  mocks['@/lib/toss/keys'] = { directPayReady: () => false };
  const checkoutPage = load('src/app/checkout/[orderId]/page.tsx').default;
  for (const failedResultRead of [false, true]) {
    checkoutOrderStatus = 'paid'; checkoutResults = []; resultError = failedResultRead;
    tree = await checkoutPage({ params: Promise.resolve({ orderId }), searchParams: Promise.resolve({}) });
    assert.equal(nodes(tree).filter(node => node.type === form).length, 0);
    assert.ok(JSON.stringify(tree).includes('다시 결제하지 마세요'));
    assert.equal(nodes(tree).filter(node => node.type === 'a' && node.props.href === `/checkout/${orderId}`).length, 1);
  }
  checkoutResults = [{ id: 'synthetic-result' }]; resultError = false;
  await assert.rejects(() => checkoutPage({ params: Promise.resolve({ orderId }), searchParams: Promise.resolve({}) }), /REDIRECT:\/results\/synthetic-result/);
  checkoutResults = [];
  tree = await checkoutPage({ params: Promise.resolve({ orderId: '//evil.example' }), searchParams: Promise.resolve({}) });
  assert.equal(nodes(tree).filter(node => node.type === 'a').length, 0);
  checkoutOrderStatus = 'pending';
  tree = await checkoutPage({ params: Promise.resolve({ orderId }), searchParams: Promise.resolve({}) });
  const pendingForm = nodes(tree).find(node => node.type === form);
  assert.ok(pendingForm);
  assert.equal(pendingForm.props.amount, 31900);
  const persisted = [];
  mocks['next/server'] = { NextResponse: class extends Response {} };
  mocks['@/lib/env'] = { isSupabaseConfigured: () => true, publicEnv: { NEXT_PUBLIC_SITE_URL: 'https://checkout.example.invalid' } };
  mocks['@/lib/supabase/server'] = { createServiceClient: () => ({ from: () => ({ insert: async row => { persisted.push(row); return { error: null }; } }) }) };
  mocks['@/lib/gate-experiment'] = { GATE_COOKIE: 'test-gate', readGateAssignment: () => ({ qa: false }), gateProps: () => ({ variant: 'a' }) };
  mocks['@/lib/detail-experiment'] = { DETAIL_COOKIE: 'test-detail', readDetailAssignment: () => undefined, detailProps: () => ({}), detailExperimentEnabled: () => false };
  mocks['@/lib/cta-experiment'] = { CTA_COOKIE: 'test-cta', readCtaAssignment: () => undefined, ctaProps: () => ({}), ctaExperimentEnabled: () => false };
  const receiveTrack = load('src/app/api/track/route.ts').POST;
  for (const mode of ['direct', 'widget']) {
    const response = await receiveTrack({
      headers: new Headers({ origin: 'https://checkout.example.invalid', host: 'checkout.example.invalid', 'user-agent': 'SyntheticCheckoutTest' }),
      cookies: { get: () => undefined },
      json: async () => ({ event: 'checkout_widget_ready', props: { orderId, variant: mode === 'widget' ? 'new' : 'direct', checkout_mode: mode } }),
    });
    assert.equal(response.status, 204);
    assert.equal(persisted.at(-1).props.variant, 'a');
    assert.equal(persisted.at(-1).props.checkout_mode, mode);
  }
  console.log('Checkout recovery: timeout, optional contact, safe retry, unchanged order, cancellation and privacy checks passed');
}
const originalFetch = global.fetch;
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { global.fetch = originalFetch; });
