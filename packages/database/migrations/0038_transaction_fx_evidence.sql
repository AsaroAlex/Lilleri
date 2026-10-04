-- Durable, encrypted provider FX evidence is independent of the raw-payload retention clock.
CREATE TABLE transaction_fx_evidence (
 id text PRIMARY KEY, household_id text NOT NULL DEFAULT '', profile_id text NOT NULL,
 connection_id text NOT NULL, account_id text NOT NULL, transaction_id text NOT NULL,
 provider_id text NOT NULL, revision integer NOT NULL CHECK(revision > 0),
 observation_id text, job_id text, observed_at text NOT NULL,
 payload text NOT NULL CHECK(payload LIKE 'lilleri:v1:%'),
 UNIQUE(profile_id,transaction_id,revision),
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,connection_id,account_id) REFERENCES accounts(profile_id,connection_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,account_id,transaction_id) REFERENCES transactions(profile_id,account_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,observation_id) REFERENCES source_observations(profile_id,id) DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(profile_id,connection_id,job_id) REFERENCES sync_jobs(profile_id,connection_id,id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX transaction_fx_owned_order ON transaction_fx_evidence(profile_id,transaction_id,revision DESC);
CREATE FUNCTION protect_transaction_fx_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 AND
    (NOT EXISTS(SELECT 1 FROM profiles WHERE id=OLD.profile_id)
     OR NOT EXISTS(SELECT 1 FROM accounts WHERE profile_id=OLD.profile_id AND id=OLD.account_id)
     OR NOT EXISTS(SELECT 1 FROM transactions WHERE profile_id=OLD.profile_id AND id=OLD.transaction_id)) THEN
  RETURN OLD;
 END IF;
 RAISE EXCEPTION 'FX evidence is immutable until source erasure';
END;
$$;
CREATE TRIGGER transaction_fx_immutable BEFORE UPDATE OR DELETE ON transaction_fx_evidence FOR EACH ROW EXECUTE FUNCTION protect_transaction_fx_evidence();
CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON transaction_fx_evidence FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household();
ALTER TABLE transaction_fx_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_fx_evidence FORCE ROW LEVEL SECURITY;
CREATE POLICY trusted_boundary ON transaction_fx_evidence TO lilleri_trusted USING(true) WITH CHECK(true);
CREATE POLICY financial_scope ON transaction_fx_evidence TO lilleri_runtime USING(household_id=nullif(current_setting('app.household_id',true),'') AND profile_id=nullif(current_setting('app.profile_id',true),'')) WITH CHECK(household_id=nullif(current_setting('app.household_id',true),'') AND profile_id=nullif(current_setting('app.profile_id',true),''));
GRANT SELECT, INSERT ON transaction_fx_evidence TO lilleri_runtime;
