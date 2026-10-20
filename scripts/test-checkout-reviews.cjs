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
vm.runInNewContext(compiled, {
  exports: exportsObject,
  require: name => {
    assert.equal(name, 'react/jsx-runtime');
    return { jsx, jsxs: jsx };
  },
});
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
  const rendered = nodes(exportsObject.CheckoutReviews());
  assert.deepEqual(rendered.filter(node => node.type === 'figcaption').map(text), ['89년생 여성', '02년생 여성', '94년생 여성']);
  const quotes = rendered.filter(node => node.type === 'blockquote').map(text);
  assert.equal(quotes.length, 3);
  assert.match(quotes[0], /30만 원짜리 신점/);
  assert.match(quotes[1], /소름 돋게 잘 맞아요/);
  assert.match(quotes[2], /과거를 다 맞추니/);
  assert.doesNotMatch(source, /★|구매 인증|인증된|평점|aggregateRating/);
});

test('first review stays visible while two others are in a native collapsed disclosure', () => {
  const tree = exportsObject.CheckoutReviews();
  const details = nodes(tree).find(node => node.type === 'details');
  assert.equal(details.props.open, undefined);
  assert.equal(nodes(details).filter(node => node.type === 'blockquote').length, 2);
  assert.match(text(nodes(details).find(node => node.type === 'summary')), /후기 2개 더 보기/);
  assert.equal(nodes(tree).filter(node => node.type === 'button').length, 0);
});

test('reviews appear before product selection only in the shared Sangun purchase panel', () => {
  const wizard = fs.readFileSync(path.join(root, 'src/components/saju/SajuWizard.tsx'), 'utf8');
  assert.match(wizard, /const renderPayPanel = \(\) => \([\s\S]*?productSlug === "sangun-sinjeom" && <CheckoutReviews \/>[\s\S]*?<CheckoutOfferSelection/);
});
