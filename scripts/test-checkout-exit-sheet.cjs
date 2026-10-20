const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../src/components/checkout/PaySheet.tsx');
const source = fs.readFileSync(filename, 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
const jsx = (type, props, key) => ({ type, props: props || {}, key });
const sameDependencies = (previous, next) => previous && next && previous.length === next.length && previous.every((value, index) => Object.is(value, next[index]));

function elements(tree) {
  const found = [];
  function visit(node) {
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    if (!node || typeof node !== 'object') return;
    found.push(node);
    visit(node.props?.children);
  }
  visit(tree);
  return found;
}

function createHarness(overrides = {}) {
  let hookCursor = 0;
  let dirty = false;
  let tree = null;
  let pendingEffects = [];
  let closeCount = 0;
  let wasInert = false;
  const hooks = [];
  const listeners = new Map();
  const registrations = [];
  const focusCalls = [];
  const refElements = new Map();
  const mountedRefs = new Set();
  const document = { body: { style: { overflow: 'auto' } }, activeElement: null };

  class FakeHTMLElement {
    constructor(name) {
      this.name = name;
      this.isConnected = true;
    }

    focus(options) {
      document.activeElement = this;
      focusCalls.push({ name: this.name, options });
    }
  }

  document.body = new FakeHTMLElement('body');
  document.body.style = { overflow: 'auto' };
  const opener = new FakeHTMLElement('opener');
  document.activeElement = opener;
  const children = jsx('section', { children: [
    jsx('input', { name: 'email', value: 'preserved@example.test' }),
    jsx('button', { type: 'button', 'aria-pressed': true, 'data-product-id': 'duo' }),
  ] });
  let props = { open: true, dark: true, sangun: true, totalDiscount: 1900, children, onClose: () => { closeCount += 1; }, ...overrides };
  const window = {
    addEventListener(type, listener) {
      assert.equal(type, 'keydown', 'the sheet must not install navigation or beforeunload guards');
      registrations.push(type);
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    get history() {
      throw new Error('the sheet must not intercept browser history');
    },
  };

  const react = {
    useState(initialValue) {
      const index = hookCursor++;
      if (!hooks[index]) {
        const slot = { value: typeof initialValue === 'function' ? initialValue() : initialValue };
        slot.setValue = nextValue => {
          const next = typeof nextValue === 'function' ? nextValue(slot.value) : nextValue;
          if (!Object.is(next, slot.value)) {
            slot.value = next;
            dirty = true;
          }
        };
        hooks[index] = slot;
      }
      return [hooks[index].value, hooks[index].setValue];
    },
    useRef(initialValue) {
      const index = hookCursor++;
      if (!hooks[index]) hooks[index] = { current: initialValue };
      return hooks[index];
    },
    useCallback(callback, dependencies) {
      const index = hookCursor++;
      if (!hooks[index] || !sameDependencies(hooks[index].dependencies, dependencies)) {
        hooks[index] = { value: callback, dependencies };
      }
      return hooks[index].value;
    },
    useEffect(effect, dependencies) {
      const index = hookCursor++;
      if (!hooks[index]) hooks[index] = { cleanup: undefined, dependencies: undefined };
      if (!sameDependencies(hooks[index].dependencies, dependencies)) {
        hooks[index].dependencies = dependencies;
        pendingEffects.push({ index, effect });
      }
    },
  };

  function CheckoutExitDialog() {
    throw new Error('the dialog is an opaque child in PaySheet contract tests');
  }

  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    HTMLElement: FakeHTMLElement,
    document,
    window,
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: Symbol.for('react.fragment') };
      if (name === 'react-dom') return { createPortal(node, target) {
        assert.equal(target, document.body);
        return node;
      } };
      if (name === './CheckoutExitDialog') return { CheckoutExitDialog };
      throw new Error(`Unexpected sheet import: ${name}`);
    },
  }, { filename });

  function commitRefs() {
    const nextRefs = new Set();
    for (const node of elements(tree)) {
      if (!node.props.ref) continue;
      const reference = node.props.ref;
      if (!refElements.has(reference)) refElements.set(reference, new FakeHTMLElement(node.props['aria-label'] || node.type));
      reference.current = refElements.get(reference);
      nextRefs.add(reference);
    }
    for (const reference of mountedRefs) {
      if (!nextRefs.has(reference)) reference.current = null;
    }
    mountedRefs.clear();
    for (const reference of nextRefs) mountedRefs.add(reference);
    const isInert = elements(tree).some(node => node.props.inert === true);
    if (isInert && !wasInert) document.activeElement = document.body;
    wasInert = isInert;
  }

  function render(nextProps = {}) {
    props = { ...props, ...nextProps };
    for (let iteration = 0; iteration < 10; iteration += 1) {
      hookCursor = 0;
      dirty = false;
      pendingEffects = [];
      tree = module.exports.PaySheet(props);
      commitRefs();
      for (const { index, effect } of pendingEffects) {
        hooks[index].cleanup?.();
        const cleanup = effect();
        hooks[index].cleanup = typeof cleanup === 'function' ? cleanup : undefined;
      }
      if (!dirty) return tree;
    }
    throw new Error('PaySheet render did not settle');
  }

  function dispatchKey(key = 'Escape', defaultPrevented = false) {
    const event = { key, defaultPrevented, preventDefault() { this.defaultPrevented = true; } };
    for (const listener of [...(listeners.get('keydown') || [])]) listener(event);
    render();
    return event;
  }

  function getDialog() {
    return elements(tree).find(node => node.type === CheckoutExitDialog);
  }

  function getSheet() {
    return elements(tree).find(node => node.props.id === 'pay-sheet');
  }

  function clickClose(kind = 'button') {
    const target = elements(tree).find(node => kind === 'button' ? node.type === 'button' && node.props['aria-label'] === '닫기' : node.type === 'div' && typeof node.props.onClick === 'function');
    assert.ok(target, `missing ${kind} close control`);
    target.props.onClick();
    render();
  }

  function unmount() {
    for (const slot of hooks) {
      slot.cleanup?.();
      slot.cleanup = undefined;
    }
    tree = null;
    commitRefs();
  }

  render();
  return {
    render, clickClose, dispatchKey, getDialog, getSheet, unmount,
    document, opener, children, focusCalls, registrations,
    createElement: name => new FakeHTMLElement(name),
    get tree() { return tree; },
    get closeCount() { return closeCount; },
    get keydownCount() { return listeners.get('keydown')?.size || 0; },
  };
}

const childPositions = new WeakMap();

function assertChildrenPreserved(harness) {
  const sheet = harness.getSheet();
  assert.ok(sheet);
  const directChildren = Array.isArray(sheet.props.children) ? sheet.props.children : [sheet.props.children];
  const position = directChildren.indexOf(harness.children);
  assert.ok(position >= 0, 'checkout content must remain a direct child of the same sheet');
  assert.equal(directChildren.filter(child => child === harness.children).length, 1);
  assert.equal(elements(harness.tree).filter(child => child === harness.children).length, 1);
  if (!childPositions.has(harness)) childPositions.set(harness, position);
  assert.equal(position, childPositions.get(harness), 'checkout content must keep its mounted sibling position');
  assert.equal(elements(sheet).find(node => node.type === 'input').props.value, 'preserved@example.test');
  assert.equal(elements(sheet).find(node => node.props['data-product-id'] === 'duo').props['aria-pressed'], true);
}

test('sangun close button and backdrop ask before actually leaving', () => {
  for (const control of ['button', 'backdrop']) {
    const harness = createHarness();
    assert.equal(harness.getDialog(), undefined);
    harness.clickClose(control);
    assert.ok(harness.getDialog());
    assert.equal(harness.getDialog().props.totalDiscount, 1900);
    assert.equal(harness.closeCount, 0);
    harness.getDialog().props.onLeave();
    harness.render();
    assert.equal(harness.getDialog(), undefined);
    assert.equal(harness.closeCount, 1);
    harness.unmount();
  }
});

test('continue returns to the same selected offer and email without calling onClose', () => {
  const harness = createHarness();
  assertChildrenPreserved(harness);
  harness.clickClose();
  assertChildrenPreserved(harness);
  harness.getDialog().props.onContinue();
  harness.render();
  assert.equal(harness.getDialog(), undefined);
  assert.equal(harness.closeCount, 0);
  assertChildrenPreserved(harness);
  harness.clickClose('backdrop');
  assertChildrenPreserved(harness);
  harness.unmount();
});

test('confirmation makes the still-mounted sheet inert and hidden from assistive technology', () => {
  const harness = createHarness();
  assert.equal(harness.getSheet().props['aria-modal'], true);
  harness.clickClose();
  const wrapper = elements(harness.tree).find(node => node.props.inert === true);
  assert.ok(wrapper);
  assert.equal(wrapper.props['aria-hidden'], true);
  assert.ok(elements(wrapper).includes(harness.getSheet()));
  assert.equal(harness.getSheet().props['aria-modal'], false);
  assertChildrenPreserved(harness);
  harness.getDialog().props.onContinue();
  harness.render();
  assert.equal(elements(harness.tree).some(node => node.props.inert === true), false);
  assert.equal(harness.getSheet().props['aria-modal'], true);
  assert.equal(elements(harness.tree).some(node => node.props['aria-hidden'] === true), false);
  harness.unmount();
});

test('only the first Escape opens confirmation and later Escape is left to the child dialog', () => {
  const harness = createHarness();
  assert.equal(harness.dispatchKey().defaultPrevented, true);
  assert.ok(harness.getDialog());
  assert.equal(harness.closeCount, 0);
  assert.equal(harness.dispatchKey().defaultPrevented, false);
  assert.ok(harness.getDialog());
  assert.equal(harness.closeCount, 0);
  harness.getDialog().props.onContinue();
  harness.render();
  assert.equal(harness.getDialog(), undefined);
  assert.ok(harness.getSheet());
  assert.equal(harness.closeCount, 0);
  harness.unmount();
});

test('continue restores the pre-inert input trigger even after the browser blurs focus to body', () => {
  const harness = createHarness();
  const trigger = harness.createElement('email');
  trigger.focus({ preventScroll: true });
  harness.dispatchKey();
  assert.ok(harness.getDialog());
  assert.equal(harness.document.activeElement, harness.document.body);
  const previousFocusCalls = harness.focusCalls.length;
  harness.getDialog().props.onContinue();
  harness.render();
  assert.equal(harness.document.activeElement, trigger);
  assert.equal(harness.focusCalls.length, previousFocusCalls + 1);
  assert.equal(harness.focusCalls.at(-1).options.preventScroll, true);
  assert.equal(harness.closeCount, 0);
  assertChildrenPreserved(harness);
  harness.unmount();
});

test('continue falls back to the sheet close button when the prior trigger is body or disconnected', () => {
  for (const previousTrigger of ['body', 'disconnected']) {
    const harness = createHarness();
    const trigger = previousTrigger === 'body' ? harness.document.body : harness.createElement('email');
    harness.document.activeElement = trigger;
    harness.dispatchKey();
    assert.equal(harness.document.activeElement, harness.document.body);
    if (previousTrigger === 'disconnected') trigger.isConnected = false;
    harness.getDialog().props.onContinue();
    harness.render();
    const closeButton = elements(harness.getSheet()).find(node => node.type === 'button' && node.props['aria-label'] === '닫기');
    assert.equal(harness.document.activeElement, closeButton.props.ref.current);
    assert.equal(harness.document.activeElement.name, '닫기');
    assert.equal(harness.closeCount, 0);
    harness.unmount();
  }
});

test('a busy transition dismisses confirmation without stealing focus back to its trigger', () => {
  const harness = createHarness();
  const trigger = harness.createElement('email');
  trigger.focus({ preventScroll: true });
  harness.dispatchKey();
  assert.equal(harness.document.activeElement, harness.document.body);
  const previousFocusCalls = harness.focusCalls.length;
  harness.render({ busy: true });
  assert.equal(harness.getDialog(), undefined);
  assert.equal(harness.document.activeElement, harness.document.body);
  assert.equal(harness.focusCalls.length, previousFocusCalls);
  harness.render({ busy: false });
  assert.equal(harness.document.activeElement, harness.document.body);
  assert.equal(harness.focusCalls.length, previousFocusCalls);
  assert.equal(harness.closeCount, 0);
  harness.unmount();
});

test('leaving closes the parent sheet without briefly restoring focus to the checkout trigger', () => {
  const harness = createHarness();
  const trigger = harness.createElement('email');
  trigger.focus({ preventScroll: true });
  harness.dispatchKey();
  assert.equal(harness.document.activeElement, harness.document.body);
  const previousFocusCalls = harness.focusCalls.length;
  harness.getDialog().props.onLeave();
  harness.render({ open: false });
  assert.equal(harness.closeCount, 1);
  assert.equal(harness.tree, null);
  assert.equal(harness.document.activeElement, harness.opener);
  assert.deepEqual(harness.focusCalls.slice(previousFocusCalls).map(call => call.name), ['opener']);
  harness.unmount();
});

test('non-Escape keys and already handled Escape do not open confirmation', () => {
  const harness = createHarness();
  assert.equal(harness.dispatchKey('Enter').defaultPrevented, false);
  harness.dispatchKey('Escape', true);
  assert.equal(harness.getDialog(), undefined);
  assert.equal(harness.closeCount, 0);
  harness.unmount();
});

test('other worlds and busy checkout retain immediate close for each close control', () => {
  for (const props of [{ sangun: false }, { busy: true }, { sangun: undefined, busy: undefined }]) {
    for (const control of ['button', 'backdrop', 'Escape']) {
      const harness = createHarness(props);
      if (control === 'Escape') harness.dispatchKey();
      else harness.clickClose(control);
      assert.equal(harness.getDialog(), undefined);
      assert.equal(harness.closeCount, 1);
      harness.unmount();
    }
  }
});

test('busy transition discards pending confirmation and it never reappears after completion', () => {
  const harness = createHarness();
  harness.clickClose();
  assert.ok(harness.getDialog());
  harness.render({ busy: true });
  assert.equal(harness.getDialog(), undefined);
  assert.equal(harness.closeCount, 0);
  assertChildrenPreserved(harness);
  harness.render({ busy: false });
  assert.equal(harness.getDialog(), undefined);
  harness.clickClose();
  assert.ok(harness.getDialog());
  harness.unmount();
});

test('closing externally clears confirmation and reopening does not reuse a stale request', () => {
  const harness = createHarness();
  harness.clickClose();
  harness.render({ open: false });
  assert.equal(harness.tree, null);
  assert.equal(harness.keydownCount, 0);
  assert.equal(harness.document.body.style.overflow, 'auto');
  assert.equal(harness.document.activeElement, harness.opener);
  harness.render({ open: true });
  assert.ok(harness.getSheet());
  assert.equal(harness.getDialog(), undefined);
  assert.equal(harness.closeCount, 0);
  assertChildrenPreserved(harness);
  harness.unmount();
});

test('body scroll and opener focus are restored, with no history or unload interception', () => {
  const harness = createHarness();
  assert.equal(harness.document.body.style.overflow, 'hidden');
  assert.equal(harness.document.activeElement.name, '닫기');
  assert.equal(harness.keydownCount, 1);
  harness.clickClose();
  assert.equal(harness.keydownCount, 1);
  harness.getDialog().props.onContinue();
  harness.render();
  assert.equal(harness.keydownCount, 1);
  assert.ok(harness.registrations.every(type => type === 'keydown'));
  harness.unmount();
  assert.equal(harness.document.body.style.overflow, 'auto');
  assert.equal(harness.document.activeElement, harness.opener);
  assert.equal(harness.keydownCount, 0);
  assert.equal(harness.focusCalls.at(-1).options.preventScroll, true);
});

test('initially closed sheet renders nothing and defaults do not invent a discount', () => {
  const harness = createHarness({ open: false, totalDiscount: undefined });
  assert.equal(harness.tree, null);
  assert.equal(harness.keydownCount, 0);
  assert.equal(harness.document.body.style.overflow, 'auto');
  assert.equal(harness.document.activeElement, harness.opener);
  harness.render({ open: true });
  harness.clickClose();
  assert.equal(harness.getDialog().props.totalDiscount, 0);
  harness.unmount();
});
