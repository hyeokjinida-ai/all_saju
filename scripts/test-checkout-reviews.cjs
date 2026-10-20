const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/components/checkout/CheckoutReviews.tsx'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const jsx = (type, props) => typeof type === 'function' ? type(props) : { type, props: props || {} };
const exportsObject = {};
let effects = [];
let refs = [];
let stateChanges = [];
let stateIndex = 0;
let paused = false;
let interval;
let cleared = false;
const media = { matches: false, addEventListener() {}, removeEventListener() {} };
const document = { hidden: false };
vm.runInNewContext(compiled, {
  exports: exportsObject,
  window: { matchMedia: () => media, innerHeight: 800, setInterval: (callback, delay) => { interval = { callback, delay }; return 1; }, clearInterval: () => { cleared = true; } },
  document,
  require: name => {
    if (name === 'react') return {
      useRef: value => { const ref = { current: value }; refs.push(ref); return ref; },
      useCallback: callback => callback,
      useEffect: effect => effects.push(effect),
      useState: initial => { const current = stateIndex++; return [current === 1 ? paused : initial, value => stateChanges.push({ index: current, value })]; },
    };
    assert.equal(name, 'react/jsx-runtime');
    return { jsx, jsxs: jsx };
  },
});
function renderCarousel(options = {}) {
  effects = []; refs = []; stateChanges = []; stateIndex = 0; interval = undefined; cleared = false;
  paused = options.paused ?? false;
  media.matches = options.reducedMotion ?? false;
  document.hidden = false;
  return exportsObject.CheckoutReviews();
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('');
  if (tree == null || typeof tree === 'boolean') return '';
  return typeof tree === 'object' ? text(tree.props?.children) : String(tree);
}

test('uses only the three supplied reviews, without invented ratings or verification', () => {
  const rendered = nodes(renderCarousel());
  assert.deepEqual(rendered.filter(node => node.type === 'figcaption').map(text), ['89년생 여성', '02년생 여성', '94년생 여성']);
  const quotes = rendered.filter(node => node.type === 'blockquote').map(text);
  assert.equal(quotes.length, 3);
  assert.match(quotes[0], /30만 원짜리 신점/);
  assert.match(quotes[1], /소름 돋게 잘 맞아요/);
  assert.match(quotes[2], /과거를 다 맞추니/);
  assert.doesNotMatch(source, /★|구매 인증|인증된|평점|aggregateRating/);
});

test('carousel exposes one active slide with manual navigation and pause controls', () => {
  const tree = renderCarousel();
  const rendered = nodes(tree);
  const slides = rendered.filter(node => node.props['aria-roledescription'] === '슬라이드');
  assert.deepEqual(slides.map(node => node.props['aria-hidden']), [false, true, true]);
  assert.equal(rendered.filter(node => node.type === 'details').length, 0);
  const buttons = rendered.filter(node => node.type === 'button');
  assert.deepEqual(buttons.map(node => node.props['aria-label']), ['1번째 후기 보기', '2번째 후기 보기', '3번째 후기 보기', '후기 자동 넘김 일시정지']);
  buttons[3].props.onClick();
  assert.equal(stateChanges.at(-1).value(false), true);
});

test('automatic rotation advances every five seconds, wraps and cleans up on unmount', () => {
  renderCarousel();
  const moves = [];
  const track = { clientWidth: 300, scrollLeft: 0, scrollTo: options => { moves.push(options.left); track.scrollLeft = options.left; } };
  refs[0].current = { closest: () => null, getBoundingClientRect: () => ({ top: 10, bottom: 220 }) };
  refs[1].current = track;
  effects[0]();
  const cleanup = effects[1]();
  assert.equal(interval.delay, 5000);
  interval.callback(); interval.callback(); interval.callback();
  assert.deepEqual(moves, [300, 600, 0]);
  assert.deepEqual(stateChanges.filter(change => change.index === 0).map(change => change.value), [1, 2, 0]);
  cleanup();
  assert.equal(cleared, true);
});

test('reading, touch, focus, hidden tabs and exit confirmation suspend rotation', () => {
  const tree = renderCarousel();
  let inert = false;
  let moves = 0;
  refs[0].current = { closest: () => inert ? {} : null, getBoundingClientRect: () => ({ top: 10, bottom: 220 }) };
  refs[1].current = { clientWidth: 300, scrollLeft: 0, scrollTo: () => moves++ };
  effects[1]();
  tree.props.onMouseEnter(); interval.callback();
  tree.props.onMouseLeave();
  tree.props.onPointerDown(); interval.callback();
  tree.props.onPointerUp();
  tree.props.onFocusCapture(); interval.callback();
  tree.props.onBlurCapture({ currentTarget: { contains: () => false }, relatedTarget: null });
  document.hidden = true; interval.callback();
  document.hidden = false;
  inert = true; interval.callback();
  assert.equal(moves, 0);
  inert = false; interval.callback();
  assert.equal(moves, 1);
});

test('pause disables the timer and reduced-motion preference defaults to paused', () => {
  renderCarousel({ paused: true });
  effects[1]();
  assert.equal(interval, undefined);
  renderCarousel({ reducedMotion: true });
  effects[0]();
  assert.equal(stateChanges.at(-1).index, 1);
  assert.equal(stateChanges.at(-1).value, true);
});

test('compact reviews appear before product selection only in the Sangun purchase popup', () => {
  const wizard = fs.readFileSync(path.join(root, 'src/components/saju/SajuWizard.tsx'), 'utf8');
  assert.match(wizard, /const renderPayPanel = \(\) => \([\s\S]*?productSlug === "sangun-sinjeom" && payOpen && <CheckoutReviews \/>[\s\S]*?<CheckoutOfferSelection/);
});
