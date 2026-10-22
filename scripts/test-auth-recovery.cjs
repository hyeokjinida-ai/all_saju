const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
function load(file, mocks = {}) {
  const exports = {};
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(compiled, { exports, URL, URLSearchParams, require: name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name === 'react/jsx-runtime') return require(name);
    if (name === '@/lib/auth-redirect') return load('src/lib/auth-redirect.ts');
    throw new Error(`Unexpected test import: ${name}`);
  } });
  return exports;
}

function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== 'object') return [];
  return [node, ...nodes(node.props?.children)];
}

const ui = {
  'next/link': { default: 'link' },
  '@/components/ui/button': { Button: 'button' },
  '@/components/ui/input': { Input: 'input' },
  '@/components/ui/label': { Label: 'label' },
  '@/components/ui/card': { Card: 'card', CardContent: 'content', CardHeader: 'header', CardTitle: 'title', CardDescription: 'description' },
};

function clientFixture(file, auth, redirect = '/mypage') {
  const state = [], refs = [], notices = [], navigation = [];
  let stateIndex = 0, refIndex = 0;
  const hooks = {
    Suspense: 'suspense',
    useState(initial) {
      const index = stateIndex++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
    useRef(initial) { const index = refIndex++; return refs[index] ?? (refs[index] = { current: initial }); },
  };
  const exports = load(file, {
    ...ui, react: hooks, sonner: { toast: { error: value => notices.push(value), success: value => notices.push(value) } },
    '@/lib/supabase/client': { createClient: () => ({ auth }) },
    '@/lib/env': { publicEnv: { NEXT_PUBLIC_SITE_URL: 'https://test.example' } },
    'next/navigation': { useRouter: () => ({ push: value => navigation.push(value), refresh() {} }), useSearchParams: () => ({ get: key => key === 'redirect' ? redirect : null }) },
    '@/components/auth/KakaoLoginButton': { KakaoLoginButton: 'kakao', KakaoButtonSkeleton: 'skeleton', useKakaoEnabled: () => false },
  });
  const render = () => {
    stateIndex = 0; refIndex = 0;
    const tree = (exports.default ?? exports.ResetPasswordForm)();
    return tree.type === 'suspense' ? tree.props.children.type() : tree;
  };
  return {
    state, notices, navigation, render,
    change(id, value) { const input = nodes(render()).find(node => node.props.id === id); assert.ok(input); input.props.onChange({ target: { value } }); },
    submit() { return nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); },
  };
}

test('shared return paths keep internal checkout and result destinations and reject external or ambiguous paths', () => {
  const { safeAuthRedirect, passwordResetCallbackUrl } = load('src/lib/auth-redirect.ts');
  for (const value of ['/mypage', '/checkout/ord_saved?claim=1', '/results/saved-result#chapter', '/reset/update']) assert.equal(safeAuthRedirect(value), value);
  for (const value of [null, undefined, '', 'https://outside.invalid', '//outside.invalid', '/\\outside.invalid', 'javascript:alert(1)', '/\n/outside.invalid', '/%2foutside.invalid', '/%5coutside.invalid', '/a/..//outside.invalid', '/%0a/outside.invalid', '/%ZZ']) assert.equal(safeAuthRedirect(value), '/mypage');
  const callback = new URL(passwordResetCallbackUrl('https://test.example/ignored'));
  assert.equal(callback.pathname, '/auth/callback');
  assert.equal(callback.searchParams.get('next'), '/reset/update');
});

function callbackFixture({ error = null, redirectType = null, throws = false } = {}) {
  const codes = [];
  const route = load('src/app/auth/callback/route.ts', {
    'next/server': { NextResponse: { redirect: destination => ({ destination }) } },
    '@/lib/supabase/server': { createClient: async () => ({ auth: { exchangeCodeForSession: async code => {
      codes.push(code); if (throws) throw new Error('private SDK details'); return { data: { redirectType }, error };
    } } }) },
  }).GET;
  return { codes, run: query => route({ url: `https://test.example/auth/callback?${query}` }) };
}

test('OAuth and recovery callbacks preserve valid destinations and support older recovery links', async () => {
  const current = callbackFixture();
  assert.equal((await current.run('code=synthetic&next=%2Fcheckout%2Ford_saved%3Fclaim%3D1')).destination, 'https://test.example/checkout/ord_saved?claim=1');
  assert.equal((await current.run('code=synthetic&next=https%3A%2F%2Foutside.invalid')).destination, 'https://test.example/mypage');
  assert.equal((await current.run('code=synthetic&next=%2Freset%2Fupdate')).destination, 'https://test.example/reset/update');
  assert.equal((await callbackFixture({ redirectType: 'recovery' }).run('code=synthetic')).destination, 'https://test.example/reset/update');
});

test('missing, invalid and throwing recovery codes return a safe expired-link screen without echoing tokens', async () => {
  const missing = callbackFixture();
  assert.equal((await missing.run('next=%2Freset%2Fupdate')).destination, 'https://test.example/reset/update?error=expired');
  assert.equal(missing.codes.length, 0);
  for (const options of [{ error: { message: 'private' } }, { throws: true }]) {
    const current = callbackFixture(options);
    const result = await current.run('code=PRIVATE_TOKEN&next=%2Freset%2Fupdate');
    assert.equal(result.destination, 'https://test.example/reset/update?error=expired');
    assert.equal(JSON.stringify(result).includes('PRIVATE_TOKEN'), false);
  }
  const failedLogin = await callbackFixture({ throws: true }).run('code=synthetic&next=%2Fcheckout%2Ford_saved%3Fclaim%3D1');
  const destination = new URL(failedLogin.destination);
  assert.equal(destination.searchParams.get('error'), 'callback');
  assert.equal(destination.searchParams.get('redirect'), '/checkout/ord_saved?claim=1');
});

test('password-edit page requires a server-verified session and treats expired-link flags as unauthenticated', async () => {
  for (const [user, errorFlag, authError, expected] of [[null, undefined, null, false], [{ id: 'owner' }, undefined, null, true], [{ id: 'owner' }, 'expired', null, false], [{ id: 'owner' }, undefined, { message: 'failed' }, false]]) {
    let lookups = 0;
    const page = load('src/app/(auth)/reset/update/page.tsx', { ...ui,
      '@/components/auth/ResetPasswordForm': { ResetPasswordForm: 'password-form' },
      '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => { lookups++; return { data: { user }, error: authError }; } } }) },
    }).default;
    const tree = await page({ searchParams: Promise.resolve({ error: errorFlag }) });
    assert.equal(nodes(tree).some(node => node.type === 'password-form'), expected);
    assert.equal(lookups, errorFlag ? 0 : 1);
  }
});

test('reset email request uses the recovery destination, trims email and blocks duplicate submits', async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const calls = [];
  const current = clientFixture('src/app/(auth)/reset/page.tsx', { resetPasswordForEmail: (...args) => { calls.push(args); return pending; } });
  current.change('email', ' synthetic@example.test ');
  const first = current.submit(); await current.submit();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'synthetic@example.test');
  assert.equal(new URL(calls[0][1].redirectTo).searchParams.get('next'), '/reset/update');
  release({ error: null }); await first;
  assert.ok(nodes(current.render()).some(node => node.props.role === 'status'));
  assert.equal(nodes(current.render()).find(node => node.type === 'button').props.disabled, false);
});

test('reset request exceptions and SDK errors release the button and allow a manual retry', async () => {
  for (const rejects of [false, true]) {
    let calls = 0;
    const current = clientFixture('src/app/(auth)/reset/page.tsx', { resetPasswordForEmail: async () => {
      calls++; if (calls === 1) { if (rejects) throw Error('private'); return { error: { message: 'private' } }; } return { error: null };
    } });
    current.change('email', 'synthetic@example.test'); await current.submit();
    assert.ok(nodes(current.render()).some(node => node.props.role === 'alert'));
    assert.equal(JSON.stringify(current.render()).includes('private'), false);
    await current.submit(); assert.equal(calls, 2);
    assert.ok(nodes(current.render()).some(node => node.props.role === 'status'));
  }
});

test('password length and confirmation are validated before any credential update', async () => {
  let updates = 0;
  const current = clientFixture('src/components/auth/ResetPasswordForm.tsx', { updateUser: async () => { updates++; return { error: null }; } });
  current.change('new-password', 'short'); current.change('confirm-password', 'short'); await current.submit();
  assert.equal(updates, 0);
  current.change('new-password', 'SyntheticPassword1'); current.change('confirm-password', 'DifferentPassword2'); await current.submit();
  assert.equal(updates, 0);
  assert.ok(nodes(current.render()).some(node => node.props.role === 'alert'));
});

test('one password update clears credentials and shows completion without transmitting other profile fields', async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const calls = [];
  const current = clientFixture('src/components/auth/ResetPasswordForm.tsx', { updateUser: value => { calls.push(value); return pending; } });
  current.change('new-password', 'SyntheticPassword1'); current.change('confirm-password', 'SyntheticPassword1');
  const first = current.submit(); await current.submit();
  assert.equal(calls.length, 1); assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), { password: 'SyntheticPassword1' });
  release({ error: null }); await first;
  assert.equal(current.state[0], ''); assert.equal(current.state[1], '');
  assert.equal(nodes(current.render()).some(node => node.type === 'form'), false);
  assert.ok(nodes(current.render()).some(node => node.type === 'link' && node.props.href === '/mypage'));
});

test('password save failures do not claim completion and can be retried', async () => {
  for (const code of ['same_password', 'weak_password', 'session_missing', 'network']) {
    let calls = 0;
    const current = clientFixture('src/components/auth/ResetPasswordForm.tsx', { updateUser: async () => {
      calls++; if (calls === 1) { if (code === 'network') throw Error('private'); return { error: { code, message: 'private' } }; } return { error: null };
    } });
    current.change('new-password', 'SyntheticPassword1'); current.change('confirm-password', 'SyntheticPassword1'); await current.submit();
    assert.ok(nodes(current.render()).some(node => node.props.role === 'alert'));
    assert.equal(nodes(current.render()).some(node => node.props.role === 'status'), false);
    await current.submit(); assert.equal(calls, 2);
    assert.ok(nodes(current.render()).some(node => node.props.role === 'status'));
  }
});

test('email login validates return paths and releases its lock on network failure', async () => {
  for (const destination of ['/checkout/ord_saved?claim=1', 'https://outside.invalid', 'javascript:alert(1)']) {
    let calls = 0;
    const current = clientFixture('src/app/(auth)/login/page.tsx', { signInWithPassword: async () => { calls++; if (calls === 1) throw Error('private'); return { error: null }; } }, destination);
    current.change('email', 'synthetic@example.test'); current.change('password', 'SyntheticPassword1');
    await current.submit(); assert.equal(current.navigation.length, 0);
    await current.submit(); assert.equal(current.navigation[0], destination.startsWith('/checkout/') ? destination : '/mypage');
    assert.equal(calls, 2);
  }
});

test('Kakao callback always passes its destination through the shared validator', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/auth/KakaoLoginButton.tsx'), 'utf8');
  assert.match(source, /encodeURIComponent\(safeAuthRedirect\(redirect\)\)/);
});
