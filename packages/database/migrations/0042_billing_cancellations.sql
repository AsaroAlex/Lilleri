-- Stripe cancellations a profile deletion still owes. The trusted boundary arms a row before the
-- erasure transaction (whose cascade removes the billing rows) and deletes it once Stripe has
-- confirmed every cancellation; failures are retried with backoff. A row whose profile still
-- exists after the arming grace belongs to a deletion that never committed and is discarded.
-- No foreign key on purpose: the row must outlive the profile it refers to.
CREATE TABLE billing_cancellations (
 profile_id text PRIMARY KEY CHECK(length(profile_id) BETWEEN 1 AND 200),
 stripe_customer_id text CHECK(stripe_customer_id IS NULL OR stripe_customer_id ~ '^cus_[A-Za-z0-9]{1,250}$'),
 subscription_ids jsonb NOT NULL CHECK(jsonb_typeof(subscription_ids)='array'),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts >= 0),
 armed_at text NOT NULL, next_attempt_at text NOT NULL
);
CREATE INDEX billing_cancellations_due ON billing_cancellations(next_attempt_at);
ALTER TABLE billing_cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_cancellations FORCE ROW LEVEL SECURITY;
CREATE POLICY trusted_boundary ON billing_cancellations TO lilleri_trusted USING(true) WITH CHECK(true);
