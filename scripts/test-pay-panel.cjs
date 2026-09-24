// Run: node --test scripts/test-pay-panel.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('src/lib/observe-pay-panel.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function fixture() {
  let panel = null, mutation;
  const observations = [], values = [], timers = new Map();
  let seq = 0;
  const context = { exports: {}, window: { innerHeight: 844, innerWidth: 390 },
    document: { body: {}, getElementById: id => id === 'pay-panel' ? panel : { id: 'pay' } },
    IntersectionObserver: class {
      constructor(fn) { this.fn = fn; observations.push(this); }
      observe(el) { this.target = el; }
      disconnect() { this.disconnected = true; }
    },
    MutationObserver: class { constructor(fn) { mutation = fn; } observe() {} disconnect() { mutation = () => {}; } },
    setTimeout: fn => { timers.set(++seq, fn); return seq; }, clearTimeout: id => timers.delete(id),
  };
  vm.runInNewContext(source, context);
  const stop = context.exports.observePayPanel(v => values.push(v));
  return { values, observations, stop,
    mount(top = 100) { panel = { isConnected: true, top, getBoundingClientRect() {
      return { top: this.top, bottom: this.top + 200, left: 0, right: 390, width: 390, height: 200 };
    } }; mutation(); return panel; },
    remove() { panel.isConnected = false; panel = null; mutation(); },
    intersect(visible, observer = observations.at(-1)) { observer.fn([{target: observer.target, isIntersecting: visible}]); },
    flush() { const batch = [...timers.values()]; timers.clear(); batch.forEach(fn => fn()); },
  };
}
test('wizard next-button container is never treated as the payment panel', () => {
  const f = fixture(); f.flush(); assert.equal(f.observations.length, 0); assert.deepEqual(f.values, []); f.stop();
});
test('visible payment panel counts without requiring a scroll', () => {
  const f = fixture(); f.mount(); f.intersect(true); assert.deepEqual(f.values, [false]); f.flush();
  assert.deepEqual(f.values, [false, true]); f.stop();
});
test('transient entry and layout shift do not count', () => {
  const f = fixture(); const panel = f.mount(); f.intersect(true); f.intersect(false); f.flush();
  assert.equal(f.values.includes(true), false);
  f.intersect(true); panel.top = 1000; f.flush(); assert.equal(f.values.includes(true), false); f.stop();
});
test('closing sheet reconnects to the replacement inline panel; stale callbacks are ignored', () => {
  const f = fixture(); f.mount(); const old = f.observations[0]; f.intersect(true); f.remove();
  f.flush(); assert.equal(f.values.includes(true), false); assert.equal(old.disconnected, true);
  f.mount(); f.intersect(true, old); f.flush(); assert.equal(f.values.includes(true), false);
  f.intersect(true); f.flush(); assert.equal(f.values.at(-1), true); f.stop();
});
test('unmount cancels pending view reporting and observers', () => {
  const f = fixture(); f.mount(); f.intersect(true); f.stop(); f.flush();
  f.intersect(true); f.flush(); assert.equal(f.values.includes(true), false);
  assert.equal(f.observations[0].disconnected, true);
});
