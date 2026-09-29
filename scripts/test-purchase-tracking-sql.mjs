import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Run against an isolated in-memory PostgreSQL engine, NEVER a live Supabase DB.
if (!process.env.PGLITE_MODULE) throw new Error('Set PGLITE_MODULE to the installed @electric-sql/pglite/dist/index.js');
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create table products(id uuid primary key default gen_random_uuid(), slug text);
  create table orders(id uuid primary key default gen_random_uuid(), order_id text,
    product_id uuid references products(id), amount int, status text, paid_at timestamptz,
    exclude_from_pnl boolean default false);
  insert into products(slug) values ('bundle-sangun-inyeon'), ('extra-question');
  insert into orders(order_id,product_id,amount,status,paid_at)
    select 'historical',id,26900,'paid',now()-interval '2 days' from products limit 1;
`);
await db.exec(await readFile(new URL('../supabase/migrations/0015_purchase_tracking.sql', import.meta.url), 'utf8'));
assert.equal((await db.query('select * from purchase_tracking')).rows.length, 0, 'never backfill old purchases');

async function makeOrder(name, ctx, amount = 26900, slug = 'bundle-sangun-inyeon', excluded = false) {
  const { rows: [o] } = await db.query(`insert into orders(order_id,product_id,amount,status,exclude_from_pnl)
    select $1,id,$2,'pending',$4 from products where slug=$3 returning *`, [name, amount, slug, excluded]);
  if (ctx) await db.query('insert into purchase_tracking(order_id,public_order_id,context) values ($1,$2,$3)', [o.id,name,JSON.stringify(ctx)]);
  return o;
}
async function paid(o) {
  await db.query("update orders set status='paid',paid_at=now() where id=$1", [o.id]);
  return (await db.query('select * from purchase_tracking where order_id=$1',[o.id])).rows[0];
}
const bundle = await makeOrder('bundle', {environment:'production',qa:false,utm:'hookA'});
assert.equal((await db.query('select state from purchase_tracking where order_id=$1',[bundle.id])).rows[0].state,'checkout');
const first = await paid(bundle);
assert.equal(first.state,'pending');
assert.equal(first.amount,26900);
assert.equal(first.product_slug,'bundle-sangun-inyeon');
assert.equal(first.context.utm,'hookA');
const again = await paid(bundle);
assert.equal(again.event_id,first.event_id,'duplicate webhook uses same id');
assert.equal(+again.paid_at,+first.paid_at,'event time is immutable');
assert.equal((await db.query('select * from purchase_tracking where order_id=$1',[bundle.id])).rows.length,1);
assert.equal((await paid(await makeOrder('qa',{environment:'production',qa:true}))).state,'suppressed');
assert.equal((await paid(await makeOrder('preview',{environment:'preview',qa:false}))).state,'suppressed');
assert.equal((await paid(await makeOrder('excluded',{environment:'production'},19900,'bundle-sangun-inyeon',true))).state,'suppressed');
assert.equal((await paid(await makeOrder('no-context',null))).state,'suppressed');
const extra = await paid(await makeOrder('extra',{environment:'production'},3100,'extra-question'));
assert.equal(extra.amount,3100); assert.equal(extra.product_slug,'extra-question');
const pending = await makeOrder('awaiting-deposit',{environment:'production'});
assert.equal((await db.query('select paid_at from purchase_tracking where order_id=$1',[pending.id])).rows[0].paid_at,null);
await db.query("update orders set status='failed' where id=$1",[pending.id]);
assert.equal((await db.query('select state from purchase_tracking where order_id=$1',[pending.id])).rows[0].state,'checkout');
await db.exec("update orders set status='paid' where order_id='historical'");
assert.equal((await db.query("select * from purchase_tracking where public_order_id='historical'")).rows.length,0);
// Trigger failure rolls back the order transition together with its receipt.
await db.exec('begin');
const rolledBack = await makeOrder('rollback',{environment:'production'});
await paid(rolledBack); await db.exec('rollback');
assert.equal((await db.query("select * from purchase_tracking where public_order_id='rollback'")).rows.length,0);
const permissions = (await db.query(`select has_table_privilege('anon','purchase_tracking','select') as anon,
  has_table_privilege('authenticated','purchase_tracking','select') as member,
  relrowsecurity from pg_class where oid='purchase_tracking'::regclass`)).rows[0];
assert.deepEqual(permissions,{anon:false,member:false,relrowsecurity:true});
await db.close();
console.log('PASS PostgreSQL: atomic ledger, one event/order, immutable amount/time, no backfill, QA/preview/exclusion, pending/failed, bundles/add-ons, RLS, rollback');
