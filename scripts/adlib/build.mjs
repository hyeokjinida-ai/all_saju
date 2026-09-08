// keywords.json → dist/adlib-sweep.user.js (Tampermonkey 설치 파일)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const setArg = (() => { const i = process.argv.indexOf('--set'); return i >= 0 ? process.argv[i + 1] : 'saju'; })();
const SETS = { saju: ['keywords.json', 'adlib-sweep.user.js'], commerce: ['keywords-commerce.json', 'adlib-sweep-commerce.user.js'] };
const picked = SETS[setArg];
if (!picked) { console.error(`알 수 없는 --set ${setArg}. 가능: ${Object.keys(SETS).join(', ')}`); process.exit(1); }
const [srcFile, outFile] = picked;
const kw = JSON.parse(readFileSync(join(here, srcFile), 'utf8'));
const flat = [];
for (const c of kw.categories) for (const k of c.keywords) flat.push({ q: k.q, cat: c.id, catName: c.name, tier: k.tier });
flat.sort((a, b) => a.tier - b.tier || a.cat.localeCompare(b.cat));
const tpl = readFileSync(join(here, 'collector.user.template.js'), 'utf8');
const out = tpl.replace('/*__KEYWORDS__*/[]', JSON.stringify(flat));
mkdirSync(join(here, 'dist'), { recursive: true });
writeFileSync(join(here, 'dist', outFile), out);
console.log(`dist/${outFile} ← ${srcFile} · ${flat.length} keywords (tier1 ${flat.filter((k) => k.tier === 1).length})`);
