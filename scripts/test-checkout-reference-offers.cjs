const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const cache = new Map();
const jsx = (type, props, key) => ({ type, props: props || {}, key });

function load(file) {
  const resolved = path.resolve(root, file);
  if (cache.has(resolved)) return cache.get(resolved).exports;
  const module = { exports: {} };
  cache.set(resolved, module);
  const source = fs.readFileSync(resolved, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const context = { module, exports: module.exports, require: name => {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: Symbol.for('react.fragment') };
    if (name.startsWith('@/') || name.startsWith('.')) {
      const base = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : path.resolve(path.dirname(resolved), name);
      const target = ['.ts', '.tsx'].map(extension => base + extension).find(candidate => fs.existsSync(candidate));
      if (target) return load(target);
    }
    if (name === 'clsx' || name === 'tailwind-merge') return require(name);
    throw new Error(`Unexpected test import: ${name}`);
  } };
  vm.runInNewContext(compiled, context, { filename: resolved });
  return module.exports;
}

const { checkoutSummary } = load('src/lib/checkout-summary.ts');
const { chargeFor, MEMBER_DISCOUNT } = load('src/lib/pricing.ts');
const { formatKRW } = load('src/lib/utils.ts');
const { CheckoutOfferSelection, CheckoutPriceSummary } = load('src/components/checkout/CheckoutOfferSelection.tsx');
const options = Object.freeze([
  Object.freeze({ productId: 'single', name: '박수무당 사주 — 앞으로 열두 달', price: 24900, compareAtPrice: 29900, includes: Object.freeze([]) }),
  Object.freeze({ productId: 'duo', name: '2종 묶음', price: 31900, compareAtPrice: 54800, includes: Object.freeze(['박수무당 사주 — 앞으로 열두 달', '직녀 연애사주 — 만나는 달']) }),
  Object.freeze({ productId: 'trio', name: '3종 묶음', price: 49900, compareAtPrice: 99700, includes: Object.freeze(['박수무당 사주 — 앞으로 열두 달', '직녀 연애사주 — 만나는 달', '견우의 재회예보 - 다시 만나는 달']) }),
]);

function elements(tree) {
  const found = [];
  function visit(node) {
    if (Array.isArray(node)) { for (const child of node) visit(child); return; }
    if (!node || typeof node !== 'object') return;
    found.push(node);
    visit(node.props?.children);
  }
  visit(tree);
  return found;
}

function textOf(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('').replace(/\s+/g, ' ').trim();
  return textOf(node.props?.children);
}

function renderSelection(overrides = {}) {
  return CheckoutOfferSelection({ options, selectedId: 'duo', recommendedId: 'duo', isMember: false, onSelect: () => {}, ...overrides });
}

function summaryRows(tree) {
  const rows = new Map();
  for (const node of elements(tree).filter(candidate => candidate.type === 'div')) {
    const children = elements(node);
    const label = children.find(child => child.type === 'dt');
    const value = children.find(child => child.type === 'dd');
    if (label && value) rows.set(textOf(label), textOf(value));
  }
  return rows;
}

test('actual chargeFor drives guest/member prices and the 1900 member discount', () => {
  assert.equal(MEMBER_DISCOUNT, 1900);
  for (const option of options) {
    for (const isMember of [false, true]) {
      const summary = checkoutSummary(option.price, option.compareAtPrice, isMember);
      assert.equal(summary.amount, chargeFor(option.price, isMember));
      assert.equal(summary.amount, option.price - (isMember ? 1900 : 0));
      assert.equal(summary.memberDiscount, isMember ? 1900 : 0);
      assert.equal(summary.referencePrice, option.compareAtPrice);
      assert.equal(summary.saleDiscount, option.compareAtPrice - option.price);
      assert.equal(summary.totalDiscount, summary.saleDiscount + summary.memberDiscount);
    }
  }
});

test('missing, lower and nonfinite comparison prices never invent a sale discount', () => {
  for (const compareAtPrice of [undefined, null, 0, -1, 19900, 24900, NaN, Infinity, -Infinity]) {
    for (const isMember of [false, true]) {
      const summary = checkoutSummary(24900, compareAtPrice, isMember);
      assert.equal(summary.referencePrice, 24900);
      assert.equal(summary.saleDiscount, 0);
      assert.equal(summary.totalDiscount, isMember ? 1900 : 0);
      assert.equal(summary.amount, chargeFor(24900, isMember));
      const rendered = CheckoutPriceSummary({ price: 24900, compareAtPrice, isMember });
      const rows = summaryRows(rendered);
      assert.equal(rows.has('적용 할인'), false);
      assert.equal(rows.has('상품 기준가'), false);
      assert.equal(rows.get('최종 결제금액'), formatKRW(summary.amount));
      assert.doesNotMatch(textOf(rendered), /NaN|Infinity/);
    }
  }
});

test('member discount clamps to the price and exactly matches the real charge function', () => {
  for (const price of [0, 1, 100, 1000, 1899, 1900, 1901, 24900]) {
    for (const compareAtPrice of [null, price + 1000]) {
      const summary = checkoutSummary(price, compareAtPrice, true);
      assert.equal(summary.amount, chargeFor(price, true));
      assert.equal(summary.memberDiscount, Math.min(price, MEMBER_DISCOUNT));
      assert.equal(summary.totalDiscount, summary.referencePrice - summary.amount);
      assert.ok(summary.amount >= 0);
      assert.ok(summary.memberDiscount >= 0);
      const rows = summaryRows(CheckoutPriceSummary({ price, compareAtPrice, isMember: true }));
      assert.equal(rows.get('최종 결제금액'), formatKRW(summary.amount));
      assert.equal(rows.get('회원 할인'), summary.memberDiscount > 0 ? `-${formatKRW(summary.memberDiscount)}` : undefined);
    }
  }
});

test('option buttons preserve all prices and emit exactly the chosen product id', () => {
  const original = JSON.stringify(options);
  const selected = [];
  for (const isMember of [false, true]) {
    const buttons = elements(renderSelection({ isMember, onSelect: productId => selected.push(productId) })).filter(node => node.type === 'button');
    assert.equal(buttons.length, 3);
    for (const [index, button] of buttons.entries()) {
      assert.equal(button.props.type, 'button');
      assert.equal(typeof button.props['aria-pressed'], 'boolean');
      assert.ok(button.props.className.includes('focus-visible:'));
      assert.ok(textOf(button).includes(formatKRW(options[index].price)));
      button.props.onClick();
      assert.equal(selected.at(-1), options[index].productId);
      assert.equal(selected.length, (isMember ? 3 : 0) + index + 1);
    }
    assert.equal(buttons.filter(button => button.props['aria-pressed']).length, 1);
    assert.equal(buttons.find(button => button.props['aria-pressed']).key, 'duo');
  }
  assert.deepEqual(selected, ['single', 'duo', 'trio', 'single', 'duo', 'trio']);
  assert.equal(JSON.stringify(options), original);
});

test('recommendation is unique, selection stays controlled, and disabled uses native buttons', () => {
  const current = renderSelection();
  const nodes = elements(current);
  assert.equal(nodes.filter(node => node.type === 'span' && textOf(node) === '추천').length, 1);
  assert.ok(textOf(nodes.find(node => node.type === 'button' && node.key === 'duo')).includes('추천'));
  assert.equal(elements(renderSelection({ recommendedId: undefined })).filter(node => node.type === 'span' && textOf(node) === '추천').length, 0);
  assert.equal(elements(renderSelection({ recommendedId: 'missing' })).filter(node => node.type === 'span' && textOf(node) === '추천').length, 0);
  assert.ok(elements(renderSelection({ disabled: true })).filter(node => node.type === 'button').every(button => button.props.disabled === true));
});

test('package counts and included names remain truthful without reviews or coupons', () => {
  const buttons = elements(renderSelection()).filter(node => node.type === 'button');
  assert.match(textOf(buttons[0]), /박수무당 사주/);
  assert.match(textOf(buttons[0]), /단품 · 전체 풀이/);
  assert.match(textOf(buttons[1]), /2종 사주 패키지/);
  assert.match(textOf(buttons[1]), /박수무당 사주 \+ 직녀 연애사주/);
  assert.doesNotMatch(textOf(buttons[1]), /3종 사주 패키지|견우의 재회예보/);
  assert.match(textOf(buttons[2]), /3종 사주 패키지/);
  assert.match(textOf(buttons[2]), /박수무당 사주 \+ 직녀 연애사주 \+ 견우의 재회예보/);
  assert.doesNotMatch(textOf(renderSelection()), /후기|리뷰|쿠폰|별점|만족도|한정|마감/);
});

test('changing the selected offer keeps the totals banner and price summary synchronized', () => {
  for (const isMember of [false, true]) {
    let selectedId = 'duo';
    for (const target of options) {
      const tree = renderSelection({ isMember, selectedId, onSelect: value => { selectedId = value; } });
      elements(tree).find(node => node.type === 'button' && node.key === target.productId).props.onClick();
      const rerendered = renderSelection({ isMember, selectedId });
      const summary = checkoutSummary(target.price, target.compareAtPrice, isMember);
      const banner = elements(rerendered).find(node => node.type === 'p' && textOf(node).startsWith('총 '));
      assert.equal(textOf(banner), `총 ${formatKRW(summary.totalDiscount)} 할인받았어요!`);
      assert.equal(banner.props['aria-live'], 'polite');
      assert.equal(String(banner.props['aria-atomic']), 'true');
      const renderedSummary = CheckoutPriceSummary({ price: target.price, compareAtPrice: target.compareAtPrice, isMember });
      const rows = summaryRows(renderedSummary);
      assert.equal(rows.get('상품 기준가'), formatKRW(summary.referencePrice));
      assert.equal(rows.get('적용 할인'), `-${formatKRW(summary.saleDiscount)}`);
      assert.equal(rows.get('회원 할인'), isMember ? '-1,900원' : undefined);
      assert.equal(rows.get('최종 결제금액'), formatKRW(chargeFor(target.price, isMember)));
      assert.equal(summary.totalDiscount, summary.saleDiscount + summary.memberDiscount);
    }
  }
});

test('invalid comparison prices hide sale anchors and only show real member savings', () => {
  for (const compareAtPrice of [null, 19900, NaN, Infinity]) {
    const current = [Object.freeze({ ...options[0], compareAtPrice })];
    for (const isMember of [false, true]) {
      const tree = renderSelection({ options: current, selectedId: 'single', isMember });
      assert.equal(elements(tree).filter(node => node.type === 'del').length, 0);
      const banners = elements(tree).filter(node => node.type === 'p' && textOf(node).startsWith('총 '));
      assert.equal(banners.length, isMember ? 1 : 0);
      if (isMember) assert.equal(textOf(banners[0]), '총 1,900원 할인받았어요!');
      assert.doesNotMatch(textOf(tree), /NaN|Infinity|%/);
    }
  }
});

test('empty and unknown selections fail safely without inventing products or prices', () => {
  assert.equal(renderSelection({ options: [] }), null);
  const tree = renderSelection({ selectedId: 'not-an-offer' });
  const active = elements(tree).filter(node => node.type === 'button' && node.props['aria-pressed']);
  assert.equal(active.length, 1);
  assert.equal(active[0].key, 'single');
  const banner = elements(tree).find(node => node.type === 'p' && textOf(node).startsWith('총 '));
  assert.equal(textOf(banner), '총 5,000원 할인받았어요!');
});

test('reference layout uses warm accent card outlines and a flat receipt without radio decorations', () => {
  const tree = renderSelection();
  const nodes = elements(tree);
  const buttons = nodes.filter(node => node.type === 'button');
  assert.ok(buttons.every(button => button.props.className.includes('border-2')));
  assert.ok(buttons.find(button => button.key === 'duo').props.className.includes('border-[#E87964]'));
  assert.ok(buttons.filter(button => button.key !== 'duo').every(button => button.props.className.includes('border-[#3B3B41]')));
  assert.equal(nodes.filter(node => node.type === 'svg' || node.type === 'input').length, 0);
  assert.doesNotMatch(JSON.stringify(tree), /D9BA7B/);
  assert.match(textOf(tree), /패키지 할인혜택/);
  const receipt = CheckoutPriceSummary({ price: 31900, compareAtPrice: 54800, isMember: false });
  assert.doesNotMatch(receipt.props.className, /rounded-|bg-/);
  assert.equal(elements(receipt).filter(node => node.props?.className?.includes('border-t')).length, 1);
});
