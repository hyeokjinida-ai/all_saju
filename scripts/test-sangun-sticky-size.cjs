const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../src/components/saju/SajuWizard.tsx');
const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = source.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === 'StickyBuyBar');
assert.ok(component);
const compiled = ts.transpileModule(`${component.getText(source)}\nexports.StickyBuyBar = StickyBuyBar;`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const jsx = (type, props) => ({ type, props: props || {} });

function render(dark) {
  const exports = {};
  const heights = [];
  const context = {
    exports,
    require: name => {
      assert.equal(name, 'react/jsx-runtime');
      return { jsx, jsxs: jsx, Fragment: 'fragment' };
    },
    useState: initial => [initial === false ? true : initial, value => heights.push(value)],
    useEffect: () => {},
    createPortal: element => element,
    document: { body: {} },
  };
  vm.runInNewContext(compiled, context);
  let clicks = 0;
  const tree = exports.StickyBuyBar({ dark, note: '성격부터 재물·인연까지', buyLabel: '인생 사주 보러가기', onBuy: () => clicks++ });
  const bar = tree.props.children[1];
  return { bar, note: bar.props.children[0], button: bar.props.children[1], heights, clickCount: () => clicks };
}

test('Sangun sticky button fills the bottom bar without changing the purchase action', () => {
  const view = render(true);
  assert.equal(view.button.props.style.minHeight, 'calc(56px + env(safe-area-inset-bottom, 0px))');
  assert.equal(view.button.props.style.paddingBottom, 'env(safe-area-inset-bottom, 0px)');
  assert.match(view.button.props.className, /text-\[17px\]/);
  assert.match(view.button.props.className, /px-5/);
  assert.match(view.button.props.className, /\bw-full\b/);
  assert.doesNotMatch(view.bar.props.className, /\b(?:px-|py-|gap-)/);
  assert.equal(view.note, false);
  assert.equal(view.button.props.children.props.children[1].props.children, '인생 사주 보러가기');
  view.button.props.onClick();
  assert.equal(view.clickCount(), 1);
});

test('other product sticky bars retain their original sizing', () => {
  const view = render(false);
  assert.equal(view.button.props.style.minHeight, 44);
  assert.match(view.button.props.className, /text-\[13px\]/);
  assert.match(view.button.props.className, /px-3\.5/);
  assert.match(view.note.props.className, /text-\[13px\]/);
  assert.match(view.bar.props.className, /gap-2\.5 px-3 py-2\.5/);
  assert.equal(view.button.props.style.paddingBottom, undefined);
});

test('bottom spacer still follows the measured bar height', () => {
  const view = render(true);
  view.bar.props.ref({ offsetHeight: 77 });
  assert.deepEqual(view.heights, [77]);
});

test('Sangun action has a decorative arrow and visible pointer, press and keyboard feedback', () => {
  const view = render(true);
  const arrow = view.button.props.children.props.children[2];
  assert.equal(arrow.props['aria-hidden'], 'true');
  assert.equal(arrow.props.children, '→');
  assert.match(view.button.props.className, /cursor-pointer/);
  assert.match(view.button.props.className, /active:brightness-95/);
  assert.match(view.button.props.className, /focus-visible:outline-2/);
  assert.match(view.button.props.style.background, /linear-gradient/);
  assert.match(view.button.props.style.boxShadow, /inset/);
  assert.equal(view.button.props.type, 'button');
  assert.equal(render(false).button.props.children, '인생 사주 보러가기');
});
