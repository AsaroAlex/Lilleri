-- Redirect-based bank authorisations for an official account-information provider.
-- Only a SHA-256 of the single-use state is stored; the provider's code is never persisted.
CREATE TABLE bank_authorizations (
 id text PRIMARY KEY CHECK(length(id) BETWEEN 1 AND 200),
 household_id text NOT NULL DEFAULT '',
 profile_id text NOT NULL,
 provider_id text NOT NULL CHECK(length(provider_id) BETWEEN 1 AND 200),
 institution_id text NOT NULL CHECK(length(institution_id) BETWEEN 1 AND 256),
 connection_id text NOT NULL CHECK(length(connection_id) BETWEEN 1 AND 200),
 purpose text NOT NULL CHECK(purpose IN('connect','renew')),
 state_hash text NOT NULL UNIQUE CHECK(state_hash ~ '^[a-f0-9]{64}$'),
 status text NOT NULL CHECK(status IN('pending','completing','completed','failed','expired')),
 failure_code text CHECK(failure_code IS NULL OR failure_code ~ '^[a-z_]{1,64}$'),
 consent_id text CHECK(consent_id IS NULL OR length(consent_id) BETWEEN 1 AND 200),
 created_at text NOT NULL,
 expires_at text NOT NULL,
 settled_at text,
 CHECK(expires_at > created_at),
 CHECK((status IN('pending','completing'))=(settled_at IS NULL)),
 CHECK(status <> 'completed' OR consent_id IS NOT NULL),
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE
);
CREATE INDEX bank_authorizations_profile ON bank_authorizations(profile_id,created_at);
CREATE INDEX bank_authorizations_open ON bank_authorizations(expires_at) WHERE status IN('pending','completing');
CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON bank_authorizations FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household();
ALTER TABLE bank_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_authorizations FORCE ROW LEVEL SECURITY;
CREATE POLICY trusted_boundary ON bank_authorizations TO lilleri_trusted USING(true) WITH CHECK(true);
CREATE POLICY financial_scope ON bank_authorizations TO lilleri_runtime USING(household_id=nullif(current_setting('app.household_id',true),'') AND profile_id=nullif(current_setting('app.profile_id',true),'')) WITH CHECK(household_id=nullif(current_setting('app.household_id',true),'') AND profile_id=nullif(current_setting('app.profile_id',true),''));
GRANT SELECT, INSERT, UPDATE ON bank_authorizations TO lilleri_runtime;
