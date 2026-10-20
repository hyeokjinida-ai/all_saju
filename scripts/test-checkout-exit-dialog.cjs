const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/components/checkout/CheckoutExitDialog.tsx'), 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}

function text(tree) {
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree);
  if (!tree || typeof tree !== 'object') return '';
  if (Array.isArray(tree)) return tree.map(text).join('');
  return text(tree.props?.children);
}

function fixture(totalDiscount = 6900) {
  const effects = [], cleanups = [], callbacks = [];
  const document = { activeElement: null };
  let nextId = 0;
  class Element {
    constructor(name) { this.name = name; this.isConnected = true; this.focusCount = 0; }
    focus(options) { this.focusCount++; this.focusOptions = options; document.activeElement = this; }
  }
  const previousFocus = new Element('previous');
  document.activeElement = previousFocus;
  const module = { exports: {} };
  const mocks = {
    react: {
      useId: () => `exit-dialog-${nextId++}`,
      useRef: value => ({ current: value }),
      useEffect: effect => effects.push(effect),
    },
    '@/lib/utils': { formatKRW: value => `${value.toLocaleString('ko-KR')}원` },
  };
  vm.runInNewContext(code, {
    module, exports: module.exports, document, HTMLElement: Element,
    require: name => mocks[name] || require(name),
  });
  const tree = module.exports.CheckoutExitDialog({
    totalDiscount, onContinue: () => callbacks.push('continue'), onLeave: () => callbacks.push('leave'),
  });
  const flattened = nodes(tree);
  const buttons = flattened.filter(node => node.type === 'button');
  const elements = buttons.map(button => {
    const element = new Element(text(button));
    button.props.ref.current = element;
    return element;
  });
  return {
    tree, flattened, buttons, elements, callbacks, document, previousFocus, Element,
    mount() { effects.splice(0).forEach(effect => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); }); },
    unmount() { cleanups.splice(0).forEach(cleanup => cleanup()); },
    key(key, shiftKey = false) {
      const event = { key, shiftKey, prevented: false, stopped: false,
        preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } };
      tree.props.onKeyDown(event);
      return event;
    },
  };
}

test('discounted dialog has associated accessible text, requested heading and equal-sized actions', () => {
  const sample = fixture();
  const dialog = sample.flattened.find(node => node.props?.role === 'dialog');
  assert.equal(dialog.props['aria-modal'], 'true');
  assert.notEqual(dialog.props['aria-labelledby'], dialog.props['aria-describedby']);
  const heading = sample.flattened.find(node => node.props?.id === dialog.props['aria-labelledby']);
  const headingCopy = nodes(heading).find(node => node.type === 'span' && !node.props['aria-hidden']);
  assert.equal(text(headingCopy), '6,900원 할인 적용 중이에요');
  assert.equal(text(sample.flattened.find(node => node.props?.id === dialog.props['aria-describedby'])), '선택한 상품과 금액을 다시 확인하고\n결제를 계속하시겠어요?');
  assert.deepEqual(sample.buttons.map(text), ['나가기', '혜택 받고 계속하기']);
  assert.ok(sample.buttons.every(button => button.props.type === 'button' && button.props.className.includes('h-14') && button.props.className.includes('min-w-0') && button.props.className.includes('w-full') && button.props.className.includes('rounded-full')));
  assert.ok(sample.buttons[0].props.className.includes('bg-[#27272B]'));
  assert.ok(sample.buttons[1].props.className.includes('bg-[#B9473C]') && sample.buttons[1].props.className.includes('hover:bg-[#A63F35]') && sample.buttons[1].props.className.includes('text-white'));
  assert.ok(dialog.props.className.includes('w-full') && dialog.props.className.includes('min-w-0'));
  assert.ok(dialog.props.className.includes('max-w-[360px]') && dialog.props.className.includes('bg-[#111]') && dialog.props.className.includes('text-white') && dialog.props.className.includes('rounded-[20px]'));
  assert.doesNotMatch(dialog.props.className, /border/);
  assert.ok(dialog.props.className.includes('max-h-[calc(100dvh-2rem)]') && dialog.props.className.includes('overflow-y-auto'));
  const actions = sample.flattened.find(node => node.props?.className === 'mt-7 grid gap-3');
  assert.ok(actions);
  assert.ok(sample.tree.props.className.includes('overflow-y-auto'));
  assert.ok(sample.tree.props.className.includes('p-4'));
  assert.ok(sample.tree.props.className.includes('bg-black/75'));
  assert.doesNotMatch(sample.tree.props.className, /blur/);
  const icon = nodes(heading).find(node => node.props?.['aria-hidden']);
  assert.equal(icon.props['aria-hidden'], 'true');
  assert.equal(text(icon), '🎁');
  assert.ok(icon.props.className.includes('text-2xl'));
  assert.ok(heading.props.className.includes('flex') && heading.props.className.includes('text-white'));
  assert.ok(headingCopy.props.className.includes('min-w-0') && headingCopy.props.className.includes('break-words'));
  assert.doesNotMatch(source, /#D9BA7B|#F5F2EA|<svg/);
  assert.doesNotMatch(text(sample.tree), /만료|지금만|사라져/);
  assert.deepEqual(sample.callbacks, []);
});

test('zero, negative and non-finite discounts use a neutral exit confirmation', () => {
  for (const amount of [0, -100, NaN, Infinity, -Infinity, null, '6900']) {
    const sample = fixture(amount);
    assert.ok(text(sample.tree).includes('결제를 나가시겠어요?'));
    assert.doesNotMatch(text(sample.tree), /할인|혜택/);
    assert.deepEqual(sample.buttons.map(text), ['나가기', '계속하기']);
  }
});

test('mount initially focuses continuing and unmount restores the original connected element', () => {
  const sample = fixture();
  sample.mount();
  assert.equal(sample.document.activeElement, sample.elements[1]);
  assert.equal(sample.elements[1].focusOptions.preventScroll, true);
  assert.equal(sample.previousFocus.focusCount, 0);
  sample.unmount();
  assert.equal(sample.document.activeElement, sample.previousFocus);
  assert.equal(sample.previousFocus.focusCount, 1);
  assert.equal(sample.previousFocus.focusOptions.preventScroll, true);
});

test('focus restoration tolerates detached or missing previously focused elements', () => {
  const detached = fixture();
  detached.mount();
  detached.previousFocus.isConnected = false;
  assert.doesNotThrow(() => detached.unmount());
  assert.equal(detached.previousFocus.focusCount, 0);
  const missing = fixture();
  missing.document.activeElement = null;
  missing.mount();
  assert.doesNotThrow(() => missing.unmount());
  assert.equal(missing.previousFocus.focusCount, 0);
});

test('Tab and Shift+Tab cycle inside the dialog and reclaim externally moved focus', () => {
  const sample = fixture();
  sample.mount();
  for (const shiftKey of [false, false, true, true]) {
    const previous = sample.document.activeElement;
    const event = sample.key('Tab', shiftKey);
    assert.equal(event.prevented, true);
    assert.equal(event.stopped, true);
    assert.notEqual(sample.document.activeElement, previous);
    assert.ok(sample.elements.includes(sample.document.activeElement));
    assert.equal(sample.document.activeElement.focusOptions.preventScroll, true);
  }
  sample.document.activeElement = sample.previousFocus;
  sample.key('Tab');
  assert.equal(sample.document.activeElement, sample.elements[0]);
  sample.document.activeElement = sample.previousFocus;
  sample.key('Tab', true);
  assert.equal(sample.document.activeElement, sample.elements[1]);
  assert.deepEqual(sample.callbacks, []);
});

test('Escape continues and stops propagation rather than leaving or affecting parent dialogs', () => {
  const sample = fixture();
  const event = sample.key('Escape');
  assert.equal(event.prevented, true);
  assert.equal(event.stopped, true);
  assert.deepEqual(sample.callbacks, ['continue']);
  const ordinary = sample.key('Enter');
  assert.equal(ordinary.prevented, false);
  assert.equal(ordinary.stopped, false);
  assert.deepEqual(sample.callbacks, ['continue']);
});

test('backdrop continues while inside clicks do not choose an action', () => {
  const sample = fixture();
  const backdrop = {};
  sample.tree.props.onClick({ target: {}, currentTarget: backdrop });
  assert.deepEqual(sample.callbacks, []);
  sample.tree.props.onClick({ target: backdrop, currentTarget: backdrop });
  assert.deepEqual(sample.callbacks, ['continue']);
});

test('only the explicit leave action leaves and neither action creates a payment request', () => {
  const sample = fixture();
  sample.buttons[1].props.onClick();
  sample.buttons[0].props.onClick();
  assert.deepEqual(sample.callbacks, ['continue', 'leave']);
  assert.doesNotMatch(source, /beforeunload|pushState|replaceState|requestPayment|fetch\s*\(|window\./);
});
