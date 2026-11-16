# Turning Billing Back On (`BILLING_ENABLED`)

KorsIQ currently runs in **Free Beta Mode** controlled by a single flag in [`lib/plans.ts`](../lib/plans.ts):

```ts
export const BILLING_ENABLED = false;
```

All billing code, Paystack routes, webhooks, database tables (`subscriptions`, `payment_transactions`, `webhook_events`, `ai_credit_ledger`), credit RPCs (`consume_ai_credits`, `refund_ai_credits`), and the checkout modal are kept intact and dormant while `BILLING_ENABLED` is `false`.

## Before flipping `BILLING_ENABLED = true`

1. **Plan limits & pricing (`lib/plans.ts`)**
   - Review `PLANS.free`, `PLANS.plus`, and `PLANS.studio` limits (active courses, storage, monthly uploads, circle create/join caps, and prices in Naira).
   - Note that the database trigger `public.enforce_course_plan_limit()` in `supabase/migrations/20261116_free_beta_limits_and_ai_logs.sql` currently enforces a flat 15-course active cap during Free Beta. If tiered course caps (5 / 10 / 15) should be enforced at the DB level again, add a new migration restoring tier-based `v_limit` lookup.

2. **AI credit allowances & per-action costs (`lib/aiCredits.ts`)**
   - Review `AI_CREDIT_ALLOWANCES` (`free: 20`, `plus: 150`, `studio: 200`) and `AI_CREDIT_COSTS` for Study Hub and Academic Studio actions.
   - Verify `consume_ai_credits` and `refund_ai_credits` RPCs are deployed in Supabase.

3. **Paystack environment variables (server-only)**
   - Confirm `PAYSTACK_SECRET_KEY` (live key) is set in the hosting environment.
   - Confirm `PAYSTACK_PLUS_PLAN_CODE` and `PAYSTACK_STUDIO_PLAN_CODE` match your live Paystack plans.
   - Confirm the Paystack webhook URL points to `/api/paystack/webhook` and signature verification succeeds.

4. **Smoke test after flipping**
   - Flip `BILLING_ENABLED = true` in `lib/plans.ts`.
   - Run `npm run lint` and `npm run build`.
   - Verify Pricing on the landing page, Plan & Usage in Settings, Admin Payments/Credits tabs, `/api/subscription/initialize`, and credit deduction on AI generation.
