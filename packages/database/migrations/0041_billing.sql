-- Stripe subscription billing. Rows are written only by the trusted boundary (signature-verified
-- webhooks, checkout creation, profile deletion); the financial runtime role may read its own plan.
-- No card, address or e-mail data is stored here: Stripe remains the payment record.
CREATE TABLE billing_customers (
 profile_id text PRIMARY KEY, household_id text NOT NULL DEFAULT '',
 stripe_customer_id text NOT NULL UNIQUE CHECK(stripe_customer_id ~ '^cus_[A-Za-z0-9]{1,250}$'),
 created_at text NOT NULL,
 UNIQUE(profile_id,stripe_customer_id),
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE
);
-- A subscription row can only belong to the profile that owns its Stripe customer.
CREATE TABLE billing_subscriptions (
 id text PRIMARY KEY CHECK(id ~ '^sub_[A-Za-z0-9]{1,250}$'),
 household_id text NOT NULL DEFAULT '', profile_id text NOT NULL, stripe_customer_id text NOT NULL,
 status text NOT NULL CHECK(status IN ('incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid','paused')),
 price_id text CHECK(price_id IS NULL OR length(price_id) BETWEEN 1 AND 255),
 -- NULL unless the single subscription item uses one of the configured Plus prices.
 "interval" text CHECK("interval" IN ('month','year')),
 current_period_end text, cancel_at_period_end boolean NOT NULL DEFAULT false, canceled_at text,
 -- Creation time (Unix seconds) of the newest Stripe event applied; older events never overwrite.
 stripe_created bigint NOT NULL CHECK(stripe_created >= 0), updated_at text NOT NULL,
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,stripe_customer_id) REFERENCES billing_customers(profile_id,stripe_customer_id) ON DELETE CASCADE
);
CREATE INDEX billing_subscriptions_profile ON billing_subscriptions(profile_id,stripe_created DESC);
-- Webhook idempotency journal: event identifiers and types only, never payloads.
CREATE TABLE billing_events (
 id text PRIMARY KEY CHECK(id ~ '^evt_[A-Za-z0-9]{1,250}$'),
 type text NOT NULL CHECK(length(type) BETWEEN 1 AND 128), received_at text NOT NULL
);
CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON billing_customers FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household();
CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON billing_subscriptions FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household();
ALTER TABLE billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_customers FORCE ROW LEVEL SECURITY;
ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events FORCE ROW LEVEL SECURITY;
CREATE POLICY trusted_boundary ON billing_customers TO lilleri_trusted USING(true) WITH CHECK(true);
CREATE POLICY trusted_boundary ON billing_subscriptions TO lilleri_trusted USING(true) WITH CHECK(true);
CREATE POLICY trusted_boundary ON billing_events TO lilleri_trusted USING(true) WITH CHECK(true);
CREATE POLICY financial_scope ON billing_customers FOR SELECT TO lilleri_runtime USING(household_id=nullif(current_setting('app.household_id',true),'') AND profile_id=nullif(current_setting('app.profile_id',true),''));
CREATE POLICY financial_scope ON billing_subscriptions FOR SELECT TO lilleri_runtime USING(household_id=nullif(current_setting('app.household_id',true),'') AND profile_id=nullif(current_setting('app.profile_id',true),''));
GRANT SELECT ON billing_customers TO lilleri_runtime;
GRANT SELECT ON billing_subscriptions TO lilleri_runtime;
