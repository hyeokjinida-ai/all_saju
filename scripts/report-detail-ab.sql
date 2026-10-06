-- Read-only. No names, email, saju input or payment keys.
-- Main result: mature 24-hour cohort. Provisional rows are NOT a winner decision.
with config as (
  select now() as as_of, interval '24 hours' as conversion_window
), events as (
  select event, created_at, props, props->>'detail_subject' as subject,
    props->>'detail_variant' as variant
  from analytics_events where props->>'detail_experiment' = 'sangun_detail_old_new_v1'
), excluded_subjects as (
  select subject from events group by subject
  having bool_or(coalesce(props->>'qa','false') = 'true') or count(distinct variant) > 1
  union
  select context->>'detail_subject' from purchase_tracking
    where context->>'detail_experiment'='sangun_detail_old_new_v1' and context->>'qa'='true'
), entries as (
  select distinct on (subject) subject, variant, created_at as entered_at,
    coalesce(props->>'variant','unassigned') as gate,
    coalesce(nullif(props->>'utm',''),'untagged') as creative
  from events
  where event = 'detail_entry' and variant in ('old','new') and subject is not null
    and subject not in (select subject from excluded_subjects where subject is not null)
  order by subject, created_at
), raw_links as (
  select props->>'orderId' as order_id, subject from events
    where event='detail_order_link' and props->>'source'='server'
  union
  select public_order_id, context->>'detail_subject' from purchase_tracking
    where context->>'detail_experiment'='sangun_detail_old_new_v1'
), links as (
  select order_id, min(subject) as subject from raw_links
  where subject is not null group by order_id having count(distinct subject)=1
), paid as (
  select l.subject, count(distinct o.order_id) as paid_orders,
    sum(greatest(0,o.amount-coalesce(o.refunded_amount,0))) as net_revenue
  from links l join orders o using(order_id) join entries e on e.subject=l.subject
    join products p on p.id=o.product_id cross join config c
  where o.status='paid' and o.paid_at>=e.entered_at and o.paid_at<=least(c.as_of,e.entered_at+c.conversion_window)
    and not coalesce(o.exclude_from_pnl,false) and p.slug like '%sangun%'
  group by l.subject
), rows as (
  select e.*, e.entered_at+c.conversion_window<=c.as_of as mature,
    coalesce(p.paid_orders,0) as paid_orders,coalesce(p.net_revenue,0) as net_revenue,
    bool_or(v.event='pay_view') as pay_view,
    bool_or(v.event='begin_checkout') as checkout,
    bool_or(v.event='detail_exposure') as rendered,
    bool_or(v.event='detail_exposure' and v.props->>'fallback'='true') as fallback
  from entries e cross join config c left join paid p on p.subject=e.subject
    left join events v on v.subject=e.subject and v.created_at>=e.entered_at
      and v.created_at<=least(c.as_of,e.entered_at+c.conversion_window)
  group by e.subject,e.variant,e.entered_at,e.gate,e.creative,c.conversion_window,c.as_of,p.paid_orders,p.net_revenue
), scopes as (
  select 'all' as scope, 'all' as segment,* from rows
  union all select 'gate',gate,* from rows
  union all select 'creative',creative,* from rows
  union all select 'gate+creative',gate||' / '||creative,* from rows
), summary as (
  select scope,segment,variant,mature,count(*) as detail_visitors,
    count(*) filter(where rendered) as rendered_visitors,
    count(*) filter(where fallback) as fallback_visitors,
    count(*) filter(where pay_view) as pay_option_visitors,
    count(*) filter(where checkout) as checkout_visitors,
    count(*) filter(where paid_orders>0) as paid_buyers,
    sum(paid_orders) as paid_orders,sum(net_revenue) as net_revenue,
    round(100.0*count(*) filter(where paid_orders>0)/nullif(count(*),0),2) as paid_percent,
    round(100.0*count(*) filter(where not coalesce(checkout,false))/nullif(count(*),0),2) as detail_to_checkout_exit_percent
  from scopes group by scope,segment,variant,mature
)
select jsonb_build_object(
  'as_of',(select as_of from config),'conversion_window',(select conversion_window::text from config),
  'excluded_qa_or_conflicting_subjects',(select count(*) from excluded_subjects),
  'conflicting_orders',(select count(*) from (select order_id from raw_links group by order_id having count(distinct subject)>1) x),
  'linked_orders_without_entry',(select count(*) from links l where not exists(select 1 from entries e where e.subject=l.subject)),
  'rows',coalesce((select jsonb_agg(to_jsonb(s) order by scope,segment,variant,mature) from summary s),'[]'::jsonb)
) as detail_ab_report;
