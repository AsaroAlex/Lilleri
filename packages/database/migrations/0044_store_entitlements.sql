-- Plus bought through the App Store or Google Play, read through RevenueCat. Written only by the
-- trusted boundary after an authenticated webhook has re-read the customer from RevenueCat's API;
-- the profile may read its own row. One row per profile: the latest state of the "plus"
-- entitlement, kept while it exists so the app can show renewal and management details.
CREATE TABLE store_entitlements (
 profile_id text PRIMARY KEY, household_id text NOT NULL DEFAULT '',
 store text NOT NULL CHECK(store IN ('app_store','play_store','promotional')),
 product_id text NOT NULL CHECK(length(product_id) BETWEEN 1 AND 255),
 -- NULL only for a non-expiring promotional grant.
 expires_at text,
 grace_expires_at text,
 will_renew boolean NOT NULL DEFAULT true,
 billing_issue boolean NOT NULL DEFAULT false,
 sandbox boolean NOT NULL DEFAULT false,
 management_url text CHECK(management_url IS NULL OR (management_url ~ '^https://' AND length(management_url) <= 2048)),
 refreshed_at text NOT NULL,
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE
);
CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON store_entitlements FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household();
ALTER TABLE store_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_entitlements FORCE ROW LEVEL SECURITY;
CREATE POLICY trusted_boundary ON store_entitlements TO lilleri_trusted USING(true) WITH CHECK(true);
CREATE POLICY financial_scope ON store_entitlements FOR SELECT TO lilleri_runtime USING(household_id=nullif(current_setting('app.household_id',true),'') AND profile_id=nullif(current_setting('app.profile_id',true),''));
GRANT SELECT ON store_entitlements TO lilleri_runtime;
-- A deleted profile's RevenueCat customer is erased too (GDPR), retried like Stripe cancellations.
ALTER TABLE billing_cancellations ADD COLUMN store_customer boolean NOT NULL DEFAULT false;
