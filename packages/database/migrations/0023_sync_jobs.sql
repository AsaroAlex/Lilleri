CREATE TABLE sync_jobs (
 id text PRIMARY KEY, household_id text NOT NULL DEFAULT '', profile_id text NOT NULL,
 connection_id text NOT NULL, consent_id text NOT NULL, provider_id text NOT NULL,
 request_id text NOT NULL, request_hash text NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'),
 mode text NOT NULL CHECK(mode IN ('user_present','unattended')),
 requested_from text, requested_to text NOT NULL,
 state text NOT NULL CHECK(state IN ('queued','running','partial','retry_wait','blocked','completed','failed','cancelled')),
 reason text CHECK(reason IN ('budget_reached','inactive','policy_unknown','provider_unavailable','rate_limited','timeout','invalid_provider_contract','bound_reached','consent_inactive','snapshot_expired','history_gap','partial')),
 configuration_revision integer NOT NULL CHECK(configuration_revision > 0),
 configuration_digest text NOT NULL CHECK(configuration_digest ~ '^[a-f0-9]{64}$'),
 configuration jsonb NOT NULL CHECK(jsonb_typeof(configuration) = 'object'),
 provider_policy jsonb NOT NULL CHECK(jsonb_typeof(provider_policy) = 'object'),
 lease_token text, lease_expires_at text, lease_epoch integer NOT NULL CHECK(lease_epoch >= 0),
 failures integer NOT NULL CHECK(failures >= 0), available_at text NOT NULL,
 revision integer NOT NULL CHECK(revision > 0), report jsonb NOT NULL CHECK(jsonb_typeof(report) = 'object'),
 created_at text NOT NULL, updated_at text NOT NULL, completed_at text,
 UNIQUE(profile_id,id), UNIQUE(profile_id,connection_id,id), UNIQUE(profile_id,connection_id,consent_id,id),
 UNIQUE(profile_id,connection_id,request_id),
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,connection_id) REFERENCES connections(profile_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,connection_id,consent_id) REFERENCES consents(profile_id,connection_id,id) ON DELETE CASCADE,
 CHECK((state = 'running') = (lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)),
 CHECK((state = 'completed') = (completed_at IS NOT NULL))
);
CREATE UNIQUE INDEX sync_jobs_one_active ON sync_jobs(profile_id,connection_id)
 WHERE state IN ('queued','running','partial','retry_wait');
CREATE INDEX sync_jobs_due ON sync_jobs(profile_id,state,available_at,created_at);
CREATE TABLE sync_stages (
 job_id text PRIMARY KEY, household_id text NOT NULL DEFAULT '', profile_id text NOT NULL,
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload) = 'object'), expires_at text NOT NULL,
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,job_id) REFERENCES sync_jobs(profile_id,id) ON DELETE CASCADE
);
CREATE TABLE sync_budget_reservations (
 id text PRIMARY KEY, household_id text NOT NULL DEFAULT '', profile_id text NOT NULL,
 connection_id text NOT NULL, consent_id text NOT NULL, job_id text NOT NULL,
 lease_epoch integer NOT NULL CHECK(lease_epoch > 0),
 mode text NOT NULL CHECK(mode IN ('user_present','unattended')),
 window_start text NOT NULL, window_end text NOT NULL CHECK(window_end > window_start),
 provider_limit integer CHECK(provider_limit >= 0), evidence_reference text, reserved_at text NOT NULL,
 UNIQUE(profile_id,job_id,lease_epoch),
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,connection_id,consent_id,job_id) REFERENCES sync_jobs(profile_id,connection_id,consent_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,connection_id,consent_id) REFERENCES consents(profile_id,connection_id,id) ON DELETE CASCADE,
 CHECK(mode <> 'unattended' OR (provider_limit IS NOT NULL AND evidence_reference IS NOT NULL))
);
CREATE INDEX sync_reservations_window ON sync_budget_reservations(profile_id,consent_id,mode,window_start);
CREATE TABLE sync_activity (
 profile_id text PRIMARY KEY, household_id text NOT NULL DEFAULT '', last_user_present_at text NOT NULL,
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE
);
CREATE TABLE sync_source_presence (
 transaction_id text PRIMARY KEY, household_id text NOT NULL DEFAULT '', profile_id text NOT NULL,
 connection_id text NOT NULL, account_id text NOT NULL,
 state text NOT NULL CHECK(state IN ('present','missing_once','removed_by_source','pending_replaced','pending_absent')),
 missing_completions integer NOT NULL CHECK(missing_completions BETWEEN 0 AND 2),
 last_complete_job_id text NOT NULL, evidence jsonb NOT NULL CHECK(jsonb_typeof(evidence) = 'object'), updated_at text NOT NULL,
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,connection_id,account_id) REFERENCES accounts(profile_id,connection_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,account_id,transaction_id) REFERENCES transactions(profile_id,account_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,connection_id,last_complete_job_id) REFERENCES sync_jobs(profile_id,connection_id,id) ON DELETE CASCADE
);
CREATE TABLE sync_issues (
 id text PRIMARY KEY, household_id text NOT NULL DEFAULT '', profile_id text NOT NULL,
 connection_id text NOT NULL, job_id text NOT NULL, account_id text NOT NULL, transaction_id text,
 kind text NOT NULL CHECK(kind IN ('balance_mismatch','removed_by_source','history_gap','pending_absent')), created_at text NOT NULL,
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,connection_id,job_id) REFERENCES sync_jobs(profile_id,connection_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,connection_id,account_id) REFERENCES accounts(profile_id,connection_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,account_id,transaction_id) REFERENCES transactions(profile_id,account_id,id) ON DELETE CASCADE
);
CREATE FUNCTION protect_sync_budget_reservation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 AND
    (NOT EXISTS(SELECT 1 FROM profiles WHERE id = OLD.profile_id)
     OR NOT EXISTS(SELECT 1 FROM connections WHERE profile_id = OLD.profile_id AND id = OLD.connection_id)) THEN
   RETURN OLD;
 END IF;
 RAISE EXCEPTION 'Sync budget reservations are append-only until parent erasure';
END;
$$;
CREATE TRIGGER sync_reservation_immutable BEFORE UPDATE OR DELETE ON sync_budget_reservations
 FOR EACH ROW EXECUTE FUNCTION protect_sync_budget_reservation();
DO $$ DECLARE table_name text; BEGIN
 FOREACH table_name IN ARRAY ARRAY['sync_jobs','sync_stages','sync_budget_reservations','sync_activity','sync_source_presence','sync_issues'] LOOP
  EXECUTE format('CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household()',table_name);
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',table_name);
  EXECUTE format('CREATE POLICY trusted_boundary ON %I TO lilleri_trusted USING(true) WITH CHECK(true)',table_name);
  EXECUTE format('CREATE POLICY financial_scope ON %I TO lilleri_runtime USING(household_id = nullif(current_setting(''app.household_id'',true),'''') AND profile_id = nullif(current_setting(''app.profile_id'',true),'''')) WITH CHECK(household_id = nullif(current_setting(''app.household_id'',true),'''') AND profile_id = nullif(current_setting(''app.profile_id'',true),''''))',table_name);
  IF table_name IN ('sync_budget_reservations','sync_issues') THEN
   EXECUTE format('GRANT SELECT, INSERT ON %I TO lilleri_runtime',table_name);
  ELSIF table_name = 'sync_jobs' THEN
   EXECUTE format('GRANT SELECT, INSERT, UPDATE ON %I TO lilleri_runtime',table_name);
  ELSE
   EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO lilleri_runtime',table_name);
  END IF;
 END LOOP;
END $$;
