// keywords.json → dist/adlib-sweep.user.js (Tampermonkey 설치 파일)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const kw = JSON.parse(readFileSync(join(here, 'keywords.json'), 'utf8'));
const flat = [];
for (const c of kw.categories) for (const k of c.keywords) flat.push({ q: k.q, cat: c.id, catName: c.name, tier: k.tier });
flat.sort((a, b) => a.tier - b.tier || a.cat.localeCompare(b.cat));
const tpl = readFileSync(join(here, 'collector.user.template.js'), 'utf8');
const out = tpl.replace('/*__KEYWORDS__*/[]', JSON.stringify(flat));
mkdirSync(join(here, 'dist'), { recursive: true });
writeFileSync(join(here, 'dist', 'adlib-sweep.user.js'), out);
console.log(`dist/adlib-sweep.user.js ← ${flat.length} keywords (tier1 ${flat.filter((k) => k.tier === 1).length})`);
