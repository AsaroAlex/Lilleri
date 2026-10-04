-- Explicit demo-only retirement: canonical financial rows and user decisions remain owned and exportable.
CREATE TABLE synthetic_fixture_retirements (
 profile_id text PRIMARY KEY, household_id text NOT NULL DEFAULT '',
 state text NOT NULL CHECK(state IN ('retired','restored')), revision integer NOT NULL CHECK(revision > 0),
 proof jsonb NOT NULL CHECK(proof->>'version'='mock-fixture-retirement-v1'), updated_at text NOT NULL,
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE
);
CREATE TABLE synthetic_fixture_events (
 id text PRIMARY KEY, household_id text NOT NULL DEFAULT '', profile_id text NOT NULL,
 state text NOT NULL CHECK(state IN ('retired','restored')), revision integer NOT NULL CHECK(revision > 0),
 proof jsonb NOT NULL CHECK(proof->>'version'='mock-fixture-retirement-v1'), occurred_at text NOT NULL,
 UNIQUE(profile_id,revision),
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE
);
CREATE FUNCTION protect_synthetic_fixture_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' AND pg_trigger_depth()>1 AND NOT EXISTS(SELECT 1 FROM profiles WHERE id=OLD.profile_id) THEN RETURN OLD; END IF;
 RAISE EXCEPTION 'Synthetic fixture retirement events are immutable';
END;
$$;
CREATE TRIGGER synthetic_fixture_event_immutable BEFORE UPDATE OR DELETE ON synthetic_fixture_events FOR EACH ROW EXECUTE FUNCTION protect_synthetic_fixture_event();
CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON synthetic_fixture_retirements FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household();
CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON synthetic_fixture_events FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household();
ALTER TABLE synthetic_fixture_retirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE synthetic_fixture_retirements FORCE ROW LEVEL SECURITY;
ALTER TABLE synthetic_fixture_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE synthetic_fixture_events FORCE ROW LEVEL SECURITY;
CREATE POLICY trusted_boundary ON synthetic_fixture_retirements TO lilleri_trusted USING(true) WITH CHECK(true);
CREATE POLICY trusted_boundary ON synthetic_fixture_events TO lilleri_trusted USING(true) WITH CHECK(true);
CREATE POLICY financial_scope ON synthetic_fixture_retirements TO lilleri_runtime USING(household_id=nullif(current_setting('app.household_id',true),'') AND profile_id=nullif(current_setting('app.profile_id',true),'')) WITH CHECK(household_id=nullif(current_setting('app.household_id',true),'') AND profile_id=nullif(current_setting('app.profile_id',true),''));
CREATE POLICY financial_scope ON synthetic_fixture_events TO lilleri_runtime USING(household_id=nullif(current_setting('app.household_id',true),'') AND profile_id=nullif(current_setting('app.profile_id',true),'')) WITH CHECK(household_id=nullif(current_setting('app.household_id',true),'') AND profile_id=nullif(current_setting('app.profile_id',true),''));
GRANT SELECT, INSERT, UPDATE ON synthetic_fixture_retirements TO lilleri_runtime;
GRANT SELECT, INSERT ON synthetic_fixture_events TO lilleri_runtime;
