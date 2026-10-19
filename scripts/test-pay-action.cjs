const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const ts = require('typescript');

const source = ts.transpileModule(fs.readFileSync('src/lib/observe-pay-action.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function fixture(surface = 'inline') {
  let container = null;
  let button = null;
  let mutation = () => {};
  let serial = 0;
  const values = [], observations = [], timers = new Map(), listeners = new Map(), viewportListeners = new Map();
  const viewport = { height: 844, width: 390, offsetTop: 0, offsetLeft: 0,
    addEventListener: (event, handler) => viewportListeners.set(event, handler),
    removeEventListener: event => viewportListeners.delete(event),
  };
  const context = {
    exports: {},
    window: { innerHeight: 844, innerWidth: 390, visualViewport: viewport,
      addEventListener: (event, handler) => listeners.set(event, handler),
      removeEventListener: event => listeners.delete(event),
    },
    document: { body: {}, getElementById: id => id === (surface === 'sheet' ? 'pay-sheet' : 'pay-panel') ? container : null },
    IntersectionObserver: class {
      constructor(callback, options) { this.callback = callback; this.options = options; observations.push(this); }
      observe(target) { this.target = target; }
      disconnect() { this.disconnected = true; }
    },
    MutationObserver: class { constructor(callback) { mutation = callback; } observe() {} disconnect() { mutation = () => {}; } },
    setTimeout: (callback, delay) => { assert.equal(delay, 250); timers.set(++serial, callback); return serial; },
    clearTimeout: timer => timers.delete(timer),
  };
  vm.runInNewContext(source, context);
  const stop = context.exports.observePayAction(value => values.push(value), surface);
  const element = (top, height) => ({ isConnected: true, top, height, left: 0, width: 390,
    getBoundingClientRect() { return { top: this.top, bottom: this.top + this.height, left: this.left, right: this.left + this.width, height: this.height, width: this.width }; },
  });
  return {
    values, observations, stop, timers, listeners, viewportListeners, viewport,
    mount(top = 100, panelTop = 50, panelHeight = 794) {
      button = element(top, 60);
      container = { ...element(panelTop, panelHeight), querySelector: selector => { assert.equal(selector, 'button[data-price-amount]'); return button; } };
      mutation();
      return { button, container };
    },
    replace(top = 100) { button.isConnected = false; button = element(top, 60); mutation(); return button; },
    remove() { button.isConnected = false; container.isConnected = false; button = null; container = null; mutation(); },
    mutate: () => mutation(),
    scroll: () => listeners.get('scroll')?.(),
    resize: () => viewportListeners.get('resize')?.(),
    intersect: (observer = observations.at(-1)) => observer.callback([{ target: observer.target, isIntersecting: true, intersectionRatio: 1 }]),
    flush() { const pending = [...timers.values()]; timers.clear(); pending.forEach(callback => callback()); },
  };
}

test('panel options alone do not hide the sticky action or count a button exposure', () => {
  const sample = fixture();
  sample.mount(1000, 700);
  sample.intersect(); sample.flush();
  assert.deepEqual(sample.values, []);
  assert.equal(sample.observations[0].target.top, 1000);
  sample.stop();
});

test('a half-visible actual button requires dwell and hides the sticky action until it leaves', () => {
  const sample = fixture();
  const { button } = sample.mount(814);
  assert.deepEqual(sample.values, []);
  sample.flush();
  assert.deepEqual(sample.values, [true]);
  button.top = 815; sample.scroll();
  assert.deepEqual(sample.values, [true, false]);
  sample.flush();
  assert.deepEqual(sample.values, [true, false]);
  sample.stop();
});

test('geometry is rechecked after dwell and after layout shifts without requiring scroll', () => {
  const sample = fixture();
  const { button } = sample.mount();
  button.top = 1000; sample.flush();
  assert.equal(sample.values.includes(true), false);
  button.top = 100; sample.mutate(); sample.flush();
  assert.equal(sample.values.at(-1), true);
  button.top = 1000; sample.mutate();
  assert.equal(sample.values.at(-1), false);
  sample.stop();
});

test('brief entry cancels the dwell instead of counting a scroll-through', () => {
  const sample = fixture();
  const { button } = sample.mount();
  button.top = 900; sample.scroll(); sample.flush();
  assert.equal(sample.values.includes(true), false);
  sample.stop();
});

test('sheet measurement clips to the scroll container as well as the viewport', () => {
  const sample = fixture('sheet');
  const { button } = sample.mount(100, 200, 644);
  sample.intersect(); sample.flush();
  assert.equal(sample.values.includes(true), false);
  button.top = 200; sample.scroll(); sample.flush();
  assert.equal(sample.values.at(-1), true);
  sample.stop();
});

test('mobile keyboard resize excludes a button beneath the visual viewport', () => {
  const sample = fixture();
  sample.mount(700); sample.flush();
  assert.equal(sample.values.at(-1), true);
  sample.viewport.height = 500; sample.resize();
  assert.equal(sample.values.at(-1), false);
  sample.stop();
});

test('button replacement and modal removal discard old observers and dwell callbacks', () => {
  const sample = fixture();
  sample.mount();
  const old = sample.observations[0];
  sample.replace(1000); sample.intersect(old); sample.flush();
  assert.equal(old.disconnected, true);
  assert.equal(sample.values.includes(true), false);
  sample.replace(100); sample.flush();
  assert.equal(sample.values.at(-1), true);
  sample.remove();
  assert.equal(sample.values.at(-1), false);
  sample.stop();
});

test('cleanup cancels timers, observers and viewport listeners', () => {
  const sample = fixture();
  sample.mount(); sample.stop(); sample.flush(); sample.intersect(); sample.mutate();
  assert.equal(sample.values.includes(true), false);
  assert.equal(sample.timers.size, 0);
  assert.equal(sample.listeners.size, 0);
  assert.equal(sample.viewportListeners.size, 0);
  assert.equal(sample.observations[0].disconnected, true);
});

test('wizard keeps historical panel tracking and gates both detail renderers on actual action visibility', () => {
  const wizard = fs.readFileSync('src/components/saju/SajuWizard.tsx', 'utf8');
  assert.match(wizard, /usePayInView\(productSlug,/);
  assert.match(wizard, /inlinePayVisible=\{payActionInView\}/);
  assert.match(wizard, /payInView=\{payActionInView\}/);
  assert.match(wizard, /track\("pay_action_view", \{ slug, via \}\)/);
  assert.match(wizard, /track\("pay_view", \{ slug, via: "inline" \}\)/);
});
