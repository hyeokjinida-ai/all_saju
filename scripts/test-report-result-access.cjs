const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the actual server page with an in-memory, read-only Supabase double.
// Child components stay opaque JSX nodes. No DB, network, payment, or secret is loaded.
const root = path.resolve(__dirname, '..');
const pageFile = 'src/app/results/[resultId]/page.tsx';
const ownerId = 'fixture-member-owner';
const resultId = 'fixture-first-result';
const secondResultId = 'fixture-second-result';
const orderId = 'ord_FIXTURE_REPORT_ONLY';
const clone = value => JSON.parse(JSON.stringify(value));

function nodes(value) {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== 'object') return [];
  return [value, ...nodes(value.props?.children)];
}

function fixture({
  member = true, user = { id: ownerId }, missingResult = false,
  missingOrder = false, resultSlug = 'sangun-sinjeom', gender = 'female',
  missingInput = false, rawAnalysis = { fixture: 'same-stored-analysis' },
} = {}) {
  const reads = [];
  const computations = [];
  let authCalls = 0;
  const result = {
    id: resultId, order_id: orderId, product_slug: resultSlug,
    interpretation_md: '# Stored paid reading\n\nThe complete stored interpretation.',
    myeongsik: { fixture: 'stored-myeongsik' }, raw_analysis: rawAnalysis,
    created_at: '2026-10-27T01:00:00.000Z',
  };
  const order = {
    product_id: 'fixture-bundle-product', paid_at: '2026-10-27T00:59:00.000Z',
    user_id: member ? ownerId : null,
    guest_email: 'synthetic-recipient@example.test',
    toss_payment_key: 'FIXTURE_PAYMENT_KEY_MUST_NOT_BE_RENDERED',
  };
  const savedInput = missingInput ? null : {
    name: 'Synthetic reader', birth_date: '1990-01-02', birth_time: null,
    time_unknown: true, gender, calendar: 'solar', concerns: ['fixture-concern'],
  };
  const siblings = [
    { id: resultId, product_slug: resultSlug },
    { id: secondResultId, product_slug: 'inyeon-saju' },
  ];
  const service = { from(table) {
    let fields = '';
    const filters = [];
    const reply = () => {
      reads.push({ table, fields, filters: clone(filters) });
      if (table === 'orders') return { data: missingOrder ? null : order };
      if (table === 'saju_results') {
        return { data: fields === 'id, product_slug' ? siblings : missingResult ? null : result };
      }
      if (table === 'saju_inputs') return { data: savedInput };
      if (table === 'extra_questions') return { data: fields === 'id' ? null : [] };
      if (table === 'products') {
        if (fields === 'slug, name') return { data: siblings.map(s => ({ slug: s.product_slug, name: `Product ${s.product_slug}` })) };
        if (fields === 'name, slug') return { data: { name: 'Fixture bundle', slug: 'bundle-sangun-inyeon' } };
        if (fields === 'price, is_active') return { data: { price: 5000, is_active: true } };
        if (fields === 'id, slug, name, description, price') return { data: [] };
      }
      throw new Error(`Unexpected mock query: ${table} / ${fields}`);
    };
    const query = {
      select(value) { fields = value; return query; },
      eq(...args) { filters.push(['eq', ...args]); return query; },
      neq(...args) { filters.push(['neq', ...args]); return query; },
      in(...args) { filters.push(['in', ...args]); return query; },
      order() { return query; }, limit() { return query; },
      single() { return Promise.resolve().then(reply); },
      maybeSingle() { return Promise.resolve().then(reply); },
      then(resolve, reject) { return Promise.resolve().then(reply).then(resolve, reject); },
    };
    return query;
  } };
  const calculation = name => (...args) => {
    computations.push({ name, args });
    if (name === 'buildResultView') return { fixture: 'same-view-model', input: args[0] };
    return { fixture: name };
  };
  const mocks = {
    'next/link': { default: 'Link' },
    'next/navigation': {
      notFound() { throw new Error('NOT_FOUND'); },
      redirect(destination) { throw new Error(`REDIRECT:${destination}`); },
    },
    '@/lib/supabase/server': {
      createServiceClient: () => service,
      createClient: async () => ({ auth: { getUser: async () => {
        authCalls++;
        return { data: { user } };
      } } }),
    },
    '@/lib/saju/generate-result': { EXTRA_QUESTION_SLUG: 'extra-question' },
    '@/lib/saju/result-view': { buildResultView: calculation('buildResultView') },
    '@/lib/saju/teaser': { buildChartRows: calculation('buildChartRows') },
    '@/lib/saju/profile-tags': { parseProfileTags: () => ({ partnerSex: 'female' }) },
    '@/lib/saju/reunion-input': { REUNION_SLUG: 'reunion-saju' },
    '@/lib/saju/prompt': { REUNION_CHAPTER_BADGES: { fixture: 'reunion-badges' } },
    '@/lib/saju/prescription': { computePrescription: calculation('computePrescription') },
    '@/lib/saju/saju-api': Object.fromEntries([
      'computeInyeonFacts', 'computeWealthFacts', 'computeWealthYears',
      'computeDaeunTimeline', 'extractCrossSellSignal',
    ].map(name => [name, calculation(name)])),
  };
  const source = fs.readFileSync(path.join(root, pageFile), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require(name) {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name === 'react/jsx-runtime') return require(name);
    if (name.startsWith('@/components/')) return new Proxy({}, { get: (_, key) => String(key) });
    throw new Error(`Unexpected test import: ${name}`);
  } });
  return {
    reads, computations, result, savedInput, authCalls: () => authCalls,
    run: (searchParams, omitSearchParams = false) => exports.default({
      params: Promise.resolve({ resultId }),
      ...(omitSearchParams ? {} : { searchParams: Promise.resolve(searchParams ?? {}) }),
    }),
  };
}

for (const view of [undefined, 'report']) {
  const query = view ? { view } : {};
  const suffix = view ? '?view=report' : '';
  test(`member login guard runs before sibling/input/fact reads (${view ?? 'default'})`, async () => {
    const sample = fixture({ user: null });
    await assert.rejects(sample.run(query), error => error.message === `REDIRECT:/login?redirect=${encodeURIComponent(`/results/${resultId}${suffix}`)}`);
    assert.equal(sample.authCalls(), 1);
    assert.deepEqual(sample.reads.map(r => r.table), ['saju_results', 'orders']);
    assert.equal(sample.computations.length, 0);
  });

  test(`another member cannot read the result with a URL query (${view ?? 'default'})`, async () => {
    const sample = fixture({ user: { id: 'fixture-other-member' } });
    await assert.rejects(sample.run(query), error => error.message === 'NOT_FOUND');
    assert.equal(sample.authCalls(), 1);
    assert.deepEqual(sample.reads.map(r => r.table), ['saju_results', 'orders']);
    assert.equal(sample.computations.length, 0);
  });

  test(`missing results and missing parent orders fail closed (${view ?? 'default'})`, async () => {
    for (const missing of ['missingResult', 'missingOrder']) {
      const sample = fixture({ [missing]: true });
      await assert.rejects(sample.run(query), error => error.message === 'NOT_FOUND');
      assert.equal(sample.authCalls(), 0);
      assert.deepEqual(sample.reads.map(r => r.table), missing === 'missingResult' ? ['saju_results'] : ['saju_results', 'orders']);
      assert.equal(sample.computations.length, 0);
    }
  });
}

test('the owner can render the report using the same stored paid result and view-model input', async () => {
  const legacy = fixture();
  const report = fixture();
  const oldNodes = nodes(await legacy.run());
  const newNodes = nodes(await report.run({ view: 'report' }));
  const oldResult = oldNodes.find(n => n.type === 'SangunResult');
  const newResult = newNodes.find(n => n.type === 'SajuPaidReport');
  assert.ok(oldResult);
  assert.ok(newResult);
  assert.equal(report.authCalls(), 1);
  assert.equal(newResult.props.markdown, oldResult.props.markdown);
  assert.equal(newResult.props.recordedAt, oldResult.props.recordedAt);
  assert.deepEqual(clone(newResult.props.view), clone(oldResult.props.view));
  assert.deepEqual(report.reads, legacy.reads);
  assert.equal(JSON.stringify(newNodes).includes('FIXTURE_PAYMENT_KEY_MUST_NOT_BE_RENDERED'), false);
});

for (const user of [null, { id: 'fixture-other-member' }]) {
  test(`guest capability links retain report access without member authentication (${user ? 'signed in' : 'anonymous'})`, async () => {
    const sample = fixture({ member: false, user });
    assert.ok(nodes(await sample.run({ view: 'report' })).some(n => n.type === 'SajuPaidReport'));
    assert.equal(sample.authCalls(), 0);
  });
}

test('bundle sibling links preserve report mode while the explicit legacy link removes it', async () => {
  const sample = fixture();
  const links = nodes(await sample.run({ view: 'report' })).filter(n => n.type === 'Link');
  assert.ok(links.some(n => n.props.href === `/results/${resultId}?view=report`));
  assert.ok(links.some(n => n.props.href === `/results/${secondResultId}?view=report`));
  assert.ok(links.some(n => n.props.href === `/results/${resultId}` && n.props.children === '기존 결과지로 보기'));
});

for (const view of [undefined, '', 'story', 'REPORT', ['report', 'story']]) {
  test(`only the exact report opt-in changes the legacy result renderer (${JSON.stringify(view)})`, async () => {
    const sample = fixture();
    const tree = await sample.run({ view }, view === undefined);
    const content = nodes(tree);
    assert.ok(content.some(n => n.type === 'SangunResult'));
    assert.equal(content.some(n => n.type === 'SajuPaidReport'), false);
    assert.ok(content.some(n => n.type === 'Link' && n.props.href === `/results/${secondResultId}`));
    assert.equal(tree.props.style.color, '#fff');
  });
}

for (const [slug, renderer] of [
  ['inyeon-saju', 'JiknyeoResult'], ['marriage-saju', 'JiknyeoResult'],
  ['reunion-saju', 'JiknyeoResult'], ['basic-saju', 'ResultScroll'],
]) {
  test(`default renderer remains ${renderer} for ${slug}`, async () => {
    const sample = fixture({ resultSlug: slug });
    const content = nodes(await sample.run());
    assert.ok(content.some(n => n.type === renderer));
    assert.equal(content.some(n => n.type === 'SajuPaidReport'), false);
  });
}

for (const slug of ['sangun-sinjeom', 'inyeon-saju', 'marriage-saju', 'reunion-saju']) {
  test(`report mode preserves the stored or legacy fallback gender used for ${slug} facts`, async () => {
    for (const gender of ['female', 'male', null]) {
      const legacy = fixture({ resultSlug: slug, gender });
      const report = fixture({ resultSlug: slug, gender });
      await legacy.run();
      await report.run({ view: 'report' });
      const before = legacy.computations.find(c => c.name === 'computeInyeonFacts');
      const after = report.computations.find(c => c.name === 'computeInyeonFacts');
      assert.ok(before);
      assert.ok(after);
      assert.deepEqual(clone(after.args), clone(before.args), `same stored ${slug} input must keep the same computed facts (gender=${gender})`);
    }
  });
}

test('legacy results without raw analysis or saved inputs still render through either presentation', async () => {
  for (const view of [undefined, 'report']) {
    const sample = fixture({ missingInput: true, rawAnalysis: null });
    const content = nodes(await sample.run({ view }));
    const reading = content.find(n => n.type === (view ? 'SajuPaidReport' : 'SangunResult'));
    assert.ok(reading);
    assert.equal(reading.props.markdown, sample.result.interpretation_md);
    assert.equal(reading.props.name, null);
    assert.equal(sample.computations.some(c => c.name === 'computeInyeonFacts'), false);
  }
});
