const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../src/components/saju/SajuWizard.tsx');
const text = fs.readFileSync(filename, 'utf8');
const source = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = new Map();
function visit(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) declarations.set(node.name.text, node);
  ts.forEachChild(node, visit);
}
visit(source);
const names = ['guestEmailValid', 'requiresTeaserEmail', 'next', 'prev'];
const code = names.map(name => `const ${declarations.get(name).getText(source)};`).join('\n');
const compiled = ts.transpileModule(`${code}\nexports.next = next; exports.prev = prev;`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function harness(overrides = {}) {
  const changes = { gates: [], emails: [], loads: 0, steps: [] };
  const context = {
    exports: {}, useCallback: callback => callback,
    step: 8, confirmStep: 8, total: 10, productSlug: 'sangun-sinjeom', isLoggedIn: false,
    isNight: false, emailGate: false, emailSkipped: false, guestEmail: '', skipped: new Set(),
    setEmailGate: value => changes.gates.push(value),
    setGuestEmail: value => changes.emails.push(value),
    setStep: update => changes.steps.push(update(context.step)),
    loadTeaser: () => { changes.loads++; },
    ...overrides,
  };
  vm.runInNewContext(compiled, context);
  return { ...context.exports, changes };
}

test('Sangun guests see the email step before any teaser request', () => {
  const view = harness();
  view.next();
  assert.deepEqual(view.changes.gates, [true]);
  assert.equal(view.changes.loads, 0);
  assert.deepEqual(view.changes.steps, []);
});

test('empty and malformed email cannot bypass the gate through next or Enter', () => {
  for (const guestEmail of ['', '  ', 'invalid', 'name@domain', 'a b@example.test']) {
    const view = harness({ emailGate: true, guestEmail, emailSkipped: true });
    view.next();
    assert.equal(view.changes.loads, 0, guestEmail);
  }
});

test('valid email is trimmed and retained for the existing order path', () => {
  const view = harness({ emailGate: true, guestEmail: ' visitor@example.test ' });
  view.next();
  assert.equal(view.changes.loads, 1);
  assert.deepEqual(view.changes.emails, ['visitor@example.test']);
  assert.deepEqual(view.changes.gates, [false]);
  assert.match(text, /email: isLoggedIn \? undefined : guestEmail\.trim\(\)/);
});

test('members and guests with a valid restored address do not re-enter their email', () => {
  for (const overrides of [{ isLoggedIn: true }, { guestEmail: 'visitor@example.test' }]) {
    const view = harness(overrides);
    view.next();
    assert.equal(view.changes.loads, 1);
    assert.deepEqual(view.changes.gates, [false]);
  }
});

test('back from the email step returns to confirmation without losing the address', () => {
  const view = harness({ emailGate: true, guestEmail: 'visitor@example.test' });
  view.prev();
  assert.deepEqual(view.changes.gates, [false]);
  assert.deepEqual(view.changes.steps, []);
  assert.deepEqual(view.changes.emails, []);
  assert.equal(view.changes.loads, 0);
});

test('other products retain their optional email gate and skip flow', () => {
  const night = harness({ productSlug: 'inyeon-saju', isNight: true });
  night.next();
  assert.deepEqual(night.changes.gates, [true]);
  assert.equal(night.changes.loads, 0);
  const skipped = harness({ productSlug: 'inyeon-saju', isNight: true, emailSkipped: true });
  skipped.next();
  assert.equal(skipped.changes.loads, 1);
  const plain = harness({ productSlug: 'wealth-saju' });
  plain.next();
  assert.equal(plain.changes.loads, 1);
});

test('gate has an accessible autofill input, no required-flow skip, and no marketing consent', () => {
  assert.match(text, /htmlFor="teaser-email"/);
  assert.match(text, /id="teaser-email"[\s\S]*?autoComplete="email"/);
  assert.match(text, /required=\{requiresTeaserEmail\}/);
  assert.match(text, /\{!requiresTeaserEmail && <button[\s\S]*?그냥 볼게/);
  assert.match(text, /광고성 메일 수신에 동의하는 것은 아니에요/);
  assert.match(text, /if \(emailGate\) e\.preventDefault\(\)/);
  assert.match(text, /무료 풀이는 다음 화면에서 바로 볼 수 있어요/);
});
