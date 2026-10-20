const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const orderId = 'ord_12345678901234567890';
const compilerOptions = { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true };
const flush = () => new Promise(resolve => setImmediate(resolve));
const expanded = new WeakMap();
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (typeof tree.type === 'function') {
    if (!expanded.has(tree)) expanded.set(tree, tree.type(tree.props));
    return [tree, ...nodes(expanded.get(tree))];
  }
  return [tree, ...nodes(tree.props?.children)];
}

function fixture(overrides = {}) {
  const hooks = [], pendingEffects = [], requests = [], events = [], notifications = [];
  let cursor = 0;
  let sdkCalls = 0;
  let beforeCalls = 0;
  let tree;
  const state = { sdkError: null, paymentError: null, validation: true, diagnosticThrows: false, beforePending: null, requestPending: null };
  const props = {
    orderId, amount: 31900, customerKey: 'synthetic-customer', productName: 'synthetic-product',
    productSlug: 'bundle-sangun-inyeon', customerEmail: 'private@example.invalid', customerMobilePhone: '01011112222',
    beforeButton: { type: 'contact-confirm', props: {} }, ctaLabel: '원래 결제 버튼',
    onBeforePay: async () => { beforeCalls++; return state.beforePending ? state.beforePending : state.validation; },
    ...overrides,
  };
  const mocks = {
    react: {
      useState(initial) {
        const position = cursor++;
        if (!hooks[position]) hooks[position] = { value: initial };
        return [hooks[position].value, value => { hooks[position].value = typeof value === 'function' ? value(hooks[position].value) : value; }];
      },
      useRef(initial) {
        const position = cursor++;
        if (!hooks[position]) hooks[position] = { current: initial };
        return hooks[position];
      },
      useEffect(effect, dependencies) {
        const position = cursor++;
        if (!hooks[position] || dependencies.some((value, index) => hooks[position].dependencies[index] !== value)) {
          hooks[position] = { dependencies };
          pendingEffects.push(effect);
        }
      },
    },
    'next/link': 'test-link',
    'next/image': 'test-image',
    sonner: { toast: { error: message => notifications.push(message) } },
    '@/components/ui/button': { Button: 'test-button' },
    '@/lib/utils': { formatKRW: value => `${value.toLocaleString('ko-KR')}원` },
    '@/lib/analytics': { track: (event, params) => { if (state.diagnosticThrows) throw new Error('diagnostic unavailable'); events.push({ event, params }); } },
    './TossWidget': { LAST_ORDER_SLUG_KEY: 'last-order-slug' },
    '@/lib/toss/client': {
      loadPayment: async () => {
        sdkCalls++;
        if (state.sdkError) throw state.sdkError;
        return {
          requestPayment: async request => {
            requests.push(request);
            if (state.paymentError) throw state.paymentError;
            if (state.requestPending) await state.requestPending;
          },
        };
      },
    },
  };
  const cache = new Map();
  function load(relative) {
    const file = path.resolve(root, relative);
    if (cache.has(file)) return cache.get(file);
    const exported = {};
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions }).outputText;
    const context = {
      exports: exported, module: { exports: exported }, URL, AbortController, setTimeout, clearTimeout,
      window: { location: { origin: 'https://checkout.example.invalid' } },
      sessionStorage: { setItem() {} },
      require(name) {
        if (mocks[name]) return mocks[name];
        if (name.startsWith('@/')) return load(path.join('src', `${name.slice(2)}.ts`));
        return require(name);
      },
    };
    vm.runInNewContext(code, context, { filename: file });
    cache.set(file, context.module.exports);
    return context.module.exports;
  }
  const Component = load('src/components/checkout/PayMethods.tsx').PayMethods;
  function render() { cursor = 0; tree = Component(props); return tree; }
  render();
  return {
    state, props, requests, events, notifications,
    render, tree: () => tree, sdkCalls: () => sdkCalls, beforeCalls: () => beforeCalls,
    async mount() { pendingEffects.splice(0).forEach(effect => effect()); await flush(); },
    buttons: () => nodes(tree).filter(node => node.type === 'test-button'),
    click(method) {
      const button = nodes(tree).find(node => node.type === 'test-button' && (method ? node.props['data-payment-method'] === method : true));
      assert.ok(button, `Missing button ${method || 'common'}`);
      return button.props.onClick();
    },
  };
}

test('only Sangun-family products render four immediate payment buttons with contact content first', async () => {
  for (const slug of ['sangun-sinjeom', 'bundle-sangun-inyeon', 'bundle-sangun-wealth', 'bundle-sangun-inyeon-reunion']) {
    const sample = fixture({ productSlug: slug });
    await sample.mount();
    const flattened = nodes(sample.tree());
    const buttons = sample.buttons();
    assert.equal(buttons.length, 4);
    assert.deepEqual(buttons.map(button => button.props['data-payment-method']), ['kakaopay', 'naverpay', 'tosspay', 'card']);
    assert.equal(flattened.filter(node => node.type === 'input' && node.props.type === 'radio').length, 0);
    assert.ok(buttons.every(button => flattened.indexOf(button) > flattened.findIndex(node => node.type === 'contact-confirm')));
    assert.equal(buttons[0].props.style.background, '#FEE500');
    assert.equal(buttons[1].props.style.background, '#03C75A');
    assert.ok(buttons.every(button => button.props['aria-label'].includes('31,900원')));
    assert.ok(JSON.stringify(flattened).includes('/pay/kakaopay.png'));
    assert.ok(JSON.stringify(flattened).includes('/pay/naverpay.svg'));
    assert.ok(JSON.stringify(sample.tree()).includes('개인정보처리방침'));
    assert.equal(sample.requests.length, 0);
  }
});

test('reference payment actions match the yellow and green centered pair without a heading or repeated amounts', () => {
  const sample = fixture();
  const buttons = sample.buttons();
  assert.ok(buttons.every(button => button.props.variant === 'outline' && button.props.className.includes('shadow-none')));
  assert.ok(buttons.every(button => button.props.className.includes('font-sans-kr')));
  const primaryGrid = nodes(sample.tree()).find(node => node.type === 'div' && node.props.className === 'grid grid-cols-2 gap-3');
  assert.ok(primaryGrid);
  assert.deepEqual(nodes(primaryGrid).filter(node => node.type === 'test-button'), buttons.slice(0, 2));
  for (const button of buttons.slice(0, 2)) {
    assert.ok(button.props.className.includes('h-[60px]'));
    assert.ok(button.props.className.includes('w-full'));
    assert.ok(button.props.className.includes('justify-center'));
    assert.ok(button.props.className.includes('rounded-xl'));
    assert.equal(button.props.className.includes('flex-col'), false);
    assert.equal(button.props.style.color, '#111111');
    assert.ok(nodes(button).some(node => node.type === 'span' && node.props.children === '결제'));
  }
  assert.ok(buttons.every(button => button.props.className.includes('focus-visible:ring-[#E87964]') && button.props.className.includes('focus-visible:ring-offset-[#111111]')));
  assert.ok(buttons.slice(2).every(button => button.props.className.includes('h-11') && button.props.className.includes('bg-[#171717]')));
  const naverNodes = nodes(buttons[1]);
  assert.equal(naverNodes.some(node => node.type === 'span' && node.props.className?.includes('bg-white')), false);
  assert.ok(naverNodes.some(node => node.type === 'test-image' && node.props.src === '/pay/naverpay.svg' && node.props.width === 66 && node.props.height === 22 && node.props.className.includes('brightness-0')));
  const serializedChildren = JSON.stringify(buttons.map(button => button.props.children));
  assert.equal(serializedChildren.includes('31,900'), false);
  assert.equal(nodes(sample.tree()).some(node => node.type === 'p' && node.props.children === '결제수단을 선택해 주세요'), false);
  assert.equal(serializedChildren.includes('D9BA7B'), false);
  assert.ok(buttons.every(button => button.props['aria-label'].includes('31,900원')));
});

test('other products retain four radios and the existing shared payment button', async () => {
  for (const slug of ['inyeon-saju', 'reunion-saju', 'marriage-saju', 'premium-saju', null]) {
    const sample = fixture({ productSlug: slug });
    await sample.mount();
    const radios = nodes(sample.tree()).filter(node => node.type === 'input' && node.props.type === 'radio');
    assert.equal(radios.length, 4);
    assert.equal(sample.buttons().length, 1);
    assert.equal(sample.buttons()[0].props.children, '원래 결제 버튼');
    radios.find(radio => radio.props.value === 'card').props.onChange();
    sample.render();
    await sample.click();
    assert.equal(sample.requests[0].card.flowMode, 'DEFAULT');
    assert.equal(sample.requests[0].card.easyPay, undefined);
  }
});

test('every reference method uses the original server amount, order, contact and return URLs', async () => {
  for (const [method, easyPay] of [['kakaopay', 'KAKAOPAY'], ['naverpay', 'NAVERPAY'], ['tosspay', 'TOSSPAY'], ['card', undefined]]) {
    const sample = fixture({ amount: 30000 });
    await sample.mount();
    await sample.click(method);
    assert.equal(sample.requests.length, 1);
    const request = sample.requests[0];
    assert.equal(request.amount.value, 30000);
    assert.equal(request.amount.currency, 'KRW');
    assert.equal(request.method, 'CARD');
    assert.equal(request.orderId, orderId);
    assert.equal(request.orderName, 'synthetic-product');
    assert.equal(request.customerEmail, sample.props.customerEmail);
    assert.equal(request.customerMobilePhone, sample.props.customerMobilePhone);
    assert.equal(request.card.easyPay, easyPay);
    assert.equal(request.card.flowMode, easyPay ? 'DIRECT' : 'DEFAULT');
    assert.equal(request.successUrl, 'https://checkout.example.invalid/checkout/success');
    const failure = new URL(request.failUrl);
    assert.equal(failure.pathname, '/checkout/fail');
    assert.equal(failure.searchParams.get('orderId'), orderId);
    assert.equal(failure.searchParams.get('checkout_mode'), 'direct');
    assert.equal(sample.beforeCalls(), 1);
    assert.equal(sample.events.filter(event => event.event === 'checkout_pay_request').length, 1);
    assert.equal(sample.events.find(event => event.event === 'checkout_pay_request').params.method, method);
    assert.equal(JSON.stringify(sample.events).includes('private@example.invalid'), false);
    assert.equal(JSON.stringify(sample.events).includes('01011112222'), false);
  }
});

test('rapid taps across different methods remain one validation and one payment request', async () => {
  const sample = fixture();
  await sample.mount();
  let resolveBefore;
  sample.state.beforePending = new Promise(resolve => { resolveBefore = resolve; });
  const first = sample.click('kakaopay');
  const second = sample.click('naverpay');
  assert.equal(sample.beforeCalls(), 1);
  assert.equal(sample.requests.length, 0);
  resolveBefore(true);
  await Promise.all([first, second]);
  assert.equal(sample.requests.length, 1);
  assert.equal(sample.requests[0].card.easyPay, 'KAKAOPAY');
  await sample.click('card');
  assert.equal(sample.requests.length, 1);
  sample.render();
  assert.ok(sample.buttons().every(button => button.props.disabled));
});

test('validation failure releases the lock without opening a payment window', async () => {
  const sample = fixture();
  await sample.mount();
  sample.state.validation = false;
  await sample.click('kakaopay');
  assert.equal(sample.requests.length, 0);
  sample.render();
  assert.ok(sample.buttons().every(button => !button.props.disabled));
  sample.state.validation = true;
  await sample.click('naverpay');
  assert.equal(sample.requests.length, 1);
  assert.equal(sample.requests[0].card.easyPay, 'NAVERPAY');
});

test('cancellations and errors release the lock and preserve sanitized tracking', async () => {
  for (const code of ['USER_CANCEL', 'PAY_PROCESS_CANCELED', 'REJECT_CARD_COMPANY']) {
    const sample = fixture();
    await sample.mount();
    sample.state.paymentError = { code, message: 'private@example.invalid' };
    await sample.click('naverpay');
    sample.render();
    assert.ok(sample.buttons().every(button => !button.props.disabled));
    const canceled = code !== 'REJECT_CARD_COMPANY';
    assert.equal(sample.notifications.length, canceled ? 0 : 1);
    assert.ok(sample.events.some(event => event.event === (canceled ? 'checkout_pay_cancel' : 'checkout_pay_error') && event.params.method === 'naverpay'));
    assert.equal(JSON.stringify({ events: sample.events, notifications: sample.notifications }).includes('private@example.invalid'), false);
    sample.state.paymentError = null;
    await sample.click('card');
    assert.equal(sample.requests.length, 2);
    assert.equal(sample.requests[1].card.flowMode, 'DEFAULT');
  }
});

test('a failed SDK can load again on a later manual tap without automatic payment retries', async () => {
  const sample = fixture();
  sample.state.sdkError = new Error('sdk unavailable');
  await sample.mount();
  await sample.click('kakaopay');
  assert.equal(sample.requests.length, 0);
  assert.equal(sample.sdkCalls(), 2);
  sample.state.sdkError = null;
  await sample.click('tosspay');
  assert.equal(sample.sdkCalls(), 3);
  assert.equal(sample.requests.length, 1);
  assert.equal(sample.requests[0].card.easyPay, 'TOSSPAY');
});

test('contact-hook exceptions and telemetry exceptions do not permanently block a later valid payment', async () => {
  let rejectContact = true;
  const sample = fixture({ onBeforePay: async () => { if (rejectContact) throw new Error('contact unavailable'); return true; } });
  sample.state.diagnosticThrows = true;
  await sample.mount();
  await sample.click('kakaopay');
  assert.equal(sample.requests.length, 0);
  rejectContact = false;
  await sample.click('naverpay');
  assert.equal(sample.requests.length, 1);
  assert.equal(sample.requests[0].card.easyPay, 'NAVERPAY');
});
