ALTER TABLE consents ADD CONSTRAINT consents_profile_connection_id
  UNIQUE(profile_id,connection_id,id);

CREATE TABLE consent_lifecycles (
  connection_id text PRIMARY KEY,
  household_id text NOT NULL DEFAULT '',
  profile_id text NOT NULL,
  consent_id text NOT NULL,
  revision integer NOT NULL CHECK(revision > 0),
  paused boolean NOT NULL DEFAULT false,
  provider_authorization jsonb NOT NULL,
  provider_metadata jsonb,
  source text NOT NULL CHECK(source IN ('provider','legacy')),
  provider_error text CHECK(provider_error IN ('unavailable','requires_action')),
  updated_at text NOT NULL,
  FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
  FOREIGN KEY(profile_id,connection_id) REFERENCES connections(profile_id,id) ON DELETE CASCADE,
  FOREIGN KEY(profile_id,connection_id,consent_id) REFERENCES consents(profile_id,connection_id,id) ON DELETE CASCADE
);
CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON consent_lifecycles
  FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household();

CREATE TABLE consent_events (
  id text PRIMARY KEY,
  household_id text NOT NULL DEFAULT '',
  profile_id text NOT NULL,
  connection_id text NOT NULL,
  consent_id text NOT NULL,
  revision integer NOT NULL CHECK(revision > 0),
  action text NOT NULL CHECK(action IN ('granted','renewed','paused','resumed','revoked','provider_error','provider_recovered','legacy_imported')),
  source text NOT NULL CHECK(source IN ('provider','user','legacy')),
  provider_authorization jsonb NOT NULL,
  provider_metadata jsonb,
  occurred_at text NOT NULL,
  FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
  FOREIGN KEY(profile_id,connection_id) REFERENCES connections(profile_id,id) ON DELETE CASCADE,
  FOREIGN KEY(profile_id,connection_id,consent_id) REFERENCES consents(profile_id,connection_id,id) ON DELETE CASCADE,
  UNIQUE(profile_id,connection_id,revision)
);
CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON consent_events
  FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household();
CREATE FUNCTION protect_consent_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' OR EXISTS(SELECT 1 FROM profiles WHERE id = OLD.profile_id) THEN
    RAISE EXCEPTION 'Consent events are append-only until profile erasure';
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER consent_event_immutable BEFORE UPDATE OR DELETE ON consent_events
  FOR EACH ROW EXECUTE FUNCTION protect_consent_event();

ALTER TABLE consent_lifecycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_lifecycles FORCE ROW LEVEL SECURITY;
CREATE POLICY trusted_boundary ON consent_lifecycles TO lilleri_trusted USING(true) WITH CHECK(true);
CREATE POLICY financial_scope ON consent_lifecycles TO lilleri_runtime
  USING(household_id = nullif(current_setting('app.household_id',true),'') AND profile_id = nullif(current_setting('app.profile_id',true),''))
  WITH CHECK(household_id = nullif(current_setting('app.household_id',true),'') AND profile_id = nullif(current_setting('app.profile_id',true),''));
GRANT SELECT, INSERT, UPDATE, DELETE ON consent_lifecycles TO lilleri_runtime;

ALTER TABLE consent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_events FORCE ROW LEVEL SECURITY;
CREATE POLICY trusted_boundary ON consent_events TO lilleri_trusted USING(true) WITH CHECK(true);
CREATE POLICY financial_scope ON consent_events TO lilleri_runtime
  USING(household_id = nullif(current_setting('app.household_id',true),'') AND profile_id = nullif(current_setting('app.profile_id',true),''))
  WITH CHECK(household_id = nullif(current_setting('app.household_id',true),'') AND profile_id = nullif(current_setting('app.profile_id',true),''));
GRANT SELECT, INSERT ON consent_events TO lilleri_runtime;
