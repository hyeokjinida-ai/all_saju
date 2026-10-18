const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const wizard = fs.readFileSync('src/components/saju/SajuWizard.tsx', 'utf8');
const syntax = ts.createSourceFile('SajuWizard.tsx', wizard, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let callback;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(syntax) === 'loadTeaser') callback = node.initializer.arguments[0].getText(syntax);
  ts.forEachChild(node, visit);
}
visit(syntax);
assert.ok(callback);
const callbackCode = ts.transpileModule(`exports.run = ${callback};`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function fixture({ slug = 'sangun-sinjeom', active = false, failed = false, assignment = Promise.resolve(null) } = {}) {
  const events = [], timers = [], loading = [], choices = [];
  const context = {
    exports: {}, Date: { now: () => 1000 }, productSlug: slug, SANGUN_DETAIL_AB_ACTIVE: active,
    MIN_TEASER_LOADING_MS: 3200, teaserStep: 9,
    form: { name: 'PRIVATE NAME', birthDate: '1990-01-15', timeUnknown: true },
    profileTags: () => [], reunionAnswerTags: () => [], assignDetail: () => assignment,
    setTeaserLoading: value => loading.push(value), setDetailChoice: value => choices.push(value),
    setPersonalData() {}, setPersonalDetailReady() {}, setDetailFailed() {}, setStep() {},
    setPillars() {}, setTokens() {}, setTeaser() {},
    fetch: async () => { if (failed) throw new Error('offline'); return { json: async () => ({ ok: true, teaser: {}, view: {} }) }; },
    track: (event, props) => events.push({ event, props }),
    setTimeout: (resolve, delay) => { timers.push(delay); resolve(); },
  };
  vm.runInNewContext(callbackCode, context);
  return { run: context.exports.run, events, timers, loading, choices };
}

test('Sangun shows a ready teaser without the former 3.2 second hold or a closed experiment response', async () => {
  const sample = fixture({ assignment: new Promise(() => {}) });
  await sample.run();
  assert.deepEqual(sample.loading, [true, false]);
  assert.deepEqual(sample.timers, []);
  assert.deepEqual(sample.choices, [null]);
  assert.equal(sample.events.at(-1).event, 'teaser_timing');
  assert.equal(sample.events.at(-1).props.outcome, 'ok');
  assert.equal(JSON.stringify(sample.events).includes('PRIVATE NAME'), false);
  assert.equal(JSON.stringify(sample.events).includes('1990-01-15'), false);
});

test('an active experiment still settles before showing its detail', async () => {
  let finish;
  const sample = fixture({ active: true, assignment: new Promise(resolve => { finish = resolve; }) });
  const pending = sample.run();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(sample.loading, [true]);
  finish({ variant: 'old', qa: true });
  await pending;
  assert.equal(sample.choices[0].variant, 'old');
  assert.deepEqual(sample.loading, [true, false]);
});

test('a failed request releases loading and records failure without a forced wait', async () => {
  const sample = fixture({ failed: true });
  await sample.run();
  assert.deepEqual(sample.loading, [true, false]);
  assert.deepEqual(sample.timers, []);
  assert.equal(sample.events.at(-1).props.outcome, 'failed');
});

test('other products keep their existing minimum animation time', async () => {
  const sample = fixture({ slug: 'inyeon-saju' });
  await sample.run();
  assert.deepEqual(sample.timers, [3200]);
});

test('the gate preloads its poster while deferring the hidden idle video', () => {
  const mediaCode = ts.transpileModule(fs.readFileSync('src/components/products/BgMedia.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const context = { exports: {}, require };
  vm.runInNewContext(mediaCode, context);
  const html = renderToStaticMarkup(React.createElement(context.exports.BgMedia, {
    video: '/products/sangun/gate.mp4', loopVideo: '/products/sangun/gate-idle.mp4',
    img: '/products/sangun/gate.webp', alt: 'Gate', className: 'gate', priority: true,
  }));
  assert.match(html, /as="image"[^>]*href="\/products\/sangun\/gate.webp"/);
  assert.match(html, /compact-v1\/gate.mp4/);
  assert.match(html, /preload="none"/);
  assert.doesNotMatch(html, /gate-idle.mp4/);
});
