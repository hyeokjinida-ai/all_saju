-- New payments only. No UPDATE/backfill of historical orders or purchase events.
begin;
create table public.purchase_tracking (
  order_id uuid primary key references public.orders(id) on delete cascade,
  public_order_id text not null,
  event_id uuid not null default gen_random_uuid() unique,
  context jsonb not null default '{}'::jsonb,
  browser_dedup boolean not null default false,
  amount integer,
  product_slug text,
  paid_at timestamptz,
  recorded_at timestamptz not null default now(),
  state text not null default 'checkout'
    check (state in ('checkout','pending','sent','suppressed','expired')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  sent_at timestamptz,
  last_error text
);
alter table public.purchase_tracking enable row level security;
revoke all on public.purchase_tracking from anon, authenticated;
grant all on public.purchase_tracking to service_role;
create index purchase_tracking_due on public.purchase_tracking(next_attempt_at) where state = 'pending';

-- The paid transition and durable conversion record commit in the SAME transaction.
-- A duplicate confirm/webhook cannot create a second event or replace its amount/time.
create function public.record_paid_purchase() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status::text <> 'paid' then return new; end if;
  if tg_op = 'UPDATE' and old.status::text = 'paid' then return new; end if;
  insert into public.purchase_tracking(order_id, public_order_id, amount, product_slug, paid_at, state, last_error)
  values (new.id, new.order_id, new.amount,
    (select slug from public.products where id = new.product_id), new.paid_at,
    'suppressed', 'missing_checkout_context')
  on conflict (order_id) do update set
    amount = excluded.amount, product_slug = excluded.product_slug, paid_at = excluded.paid_at,
    state = case when coalesce(new.exclude_from_pnl, false)
      or coalesce(purchase_tracking.context->>'qa','false') = 'true'
      or purchase_tracking.context->>'environment' is distinct from 'production'
      or new.paid_at is null then 'suppressed' else 'pending' end,
    last_error = case when coalesce(new.exclude_from_pnl, false) then 'excluded_order'
      when coalesce(purchase_tracking.context->>'qa','false') = 'true' then 'qa_order'
      when purchase_tracking.context->>'environment' is distinct from 'production' then 'nonproduction_or_missing_context'
      when new.paid_at is null then 'missing_paid_at' else null end
  where purchase_tracking.paid_at is null;
  return new;
end;
$$;
revoke all on function public.record_paid_purchase() from public, anon, authenticated;
create trigger orders_purchase_tracking after insert or update of status on public.orders
for each row execute function public.record_paid_purchase();
comment on table public.purchase_tracking is 'Verified paid-order ledger and Meta outbox. Count distinct order_id; separate extra-question from main products. No historical backfill.';
commit;
