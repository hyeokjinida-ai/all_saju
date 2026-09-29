# Purchase tracking rollout

## Current implementation

Migration `0015_purchase_tracking.sql` adds a private ledger/outbox. A database trigger
records the first transition to `paid` in the same transaction as the order. Historical
paid orders are not backfilled. Each order has one immutable event ID, paid amount,
product slug and original payment time. Bundle purchases remain one order; `extra-question`
must be reported separately from main products and new customers.

The confirm handler reads that receipt and attempts direct Meta delivery **before** result
generation. Result generation still uses the existing single confirm lifecycle. A separate
read-only receipt endpoint lets the browser send Purchase while the result is being generated;
it never starts a second LLM call. Toss webhooks verify order ID, amount and DONE through Toss
before updating the order, then schedule delivery with Next `after`.

Pixel and direct CAPI use identical `Purchase` + `event_id`. A new browser explicitly sends
`purchaseTrackingVersion: 1`; direct CAPI suppresses legacy clients without that marker.
Missing Pixel initialization does not permanently mark the browser event sent. Purchase
value comes from the server receipt, never the success URL. No historical purchase replay.

## Deployment gates — do not skip

1. Inspect live schema and apply migration 0015 **before application deployment**. The
   migration creates a table, function and trigger; it neither updates old orders nor removes data.
   Verify RLS is enabled, anon/authenticated cannot access it, and the old paid count is unchanged.
2. Deploy the reviewed tracking-only commit; exclude unrelated UI edits. CAPI is OFF by default.
3. Confirm a new paid order creates exactly one ledger row before its result finishes. Verify
   bundles, additional questions and excluded/QA orders; use sandbox transactions or normal
   subsequent customer orders, never charge a real card without separate spending authorization.
4. **An existing Meta-hosted CAPI integration is already active for this dataset.** Do not describe
   it as absent just because this application's Vercel env has no CAPI token. Verify how the
   existing integration handles the explicit event ID in Test Events before enabling direct CAPI.
   The existing integration's raw received-event total is not the number of attributed purchases.
5. Reuse an appropriate existing direct-integration token if available. Otherwise obtain explicit
   action-time authorization before creating a new credential. Choose the option without Dataset
   Quality API; that additional permission is not needed. Store the token only in the production
   server environment. Never put tokens in Git, browser-visible variables, logs or chat.
6. Configure `META_CAPI_ACCESS_TOKEN`, the existing `NEXT_PUBLIC_META_PIXEL_ID`, a currently supported
   `META_CAPI_API_VERSION`, and `META_CAPI_START_AT` (actual activation ISO UTC). Enable
   `META_CAPI_ENABLED=1` only after test delivery/dedup has been verified. Activation time excludes
   earlier payments; it does not backfill missing historical revenue into Meta.
7. Verify Meta Test Events and subsequent actual receipts against Toss/order IDs. `events_received: 1`
   confirms API acceptance only, not campaign attribution. Record actual activation/deployment times.

## Retry and reporting

- Compare-and-swap attempts plus a one-minute lease prevent concurrent workers from sending the
  same row. Ambiguous timeouts retain the event ID/time for retry; automatic delivery stops after
  24 hours and before any activation cutoff. Never reset sent/expired rows for automatic replay.
- Retry runs after subsequent successful confirmations and in the daily cron at 00:45 KST.
  This is **not a minute-by-minute retry guarantee** on the current Hobby plan. A daily run processes
  at most five rows; paid traffic provides additional bounded runs. Monitor pending/expired rows
  and token failures in the daily report. Do not silently treat backlog as successful delivery.
- `purchase_tracking` is the canonical paid-event ledger. Browser `analytics_events.purchase`
  is a delivery trace and now carries explicit orderId/eventId. Do not sum the two tables as sales.
- Join orders for current refunds/exclude flags. Report gross payments, refunds and net paid
  revenue separately. CAPI sends the original gross paid amount, not estimated profit.
- Matching context contains only first-party anonymous IDs, UTM, Meta cookies and browser UA.
  Raw customer name, birth date, email, question text and payment keys are never sent to Meta.
  The event source URL has no query string. Raw order ID/UTM remain first-party.

## Validation

`node scripts/test-purchase-tracking.cjs` exercises actual confirm flow with simulated Toss/LLM,
the CAPI payload/acknowledgment/retry/lease rules and browser Pixel/storage behavior.

`PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node scripts/test-purchase-tracking-sql.mjs`
exercises the migration in isolated PostgreSQL: atomicity, uniqueness, immutable values,
QA/preview/exclusion, failed/pending payments, bundles/add-ons, RLS and no historical backfill.

Build from an isolated tracked-source snapshot plus only these changes when another dev server
or UI task is using the shared checkout. Local mock success is not evidence of live Meta acceptance.

## Rollback

Disable direct CAPI and deploy that environment before rolling back the application. Preserve the
ledger and all old orders. If a trigger failure blocks order persistence, an administrator can
disable only `orders_purchase_tracking` on `public.orders`; do not drop the ledger or rewrite orders.
Reconcile any Toss-approved payment whose DB write failed before retrying; do not blindly approve
the charge again. Keep this recovery separate from conversion backfill.
