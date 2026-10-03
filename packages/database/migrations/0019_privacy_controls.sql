-- Scoped local privacy metadata. These are user choices, not lawful-basis/vendor approvals.
CREATE TABLE profile_privacy_settings (
  profile_id text PRIMARY KEY,
  household_id text NOT NULL DEFAULT '',
  rules_only boolean NOT NULL,
  revision integer NOT NULL CHECK(revision > 0),
  updated_at text NOT NULL,
  FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE
);
CREATE TABLE profile_privacy_events (
  id text PRIMARY KEY,
  profile_id text NOT NULL,
  household_id text NOT NULL DEFAULT '',
  revision integer NOT NULL CHECK(revision > 1),
  before_values jsonb NOT NULL,
  after_values jsonb NOT NULL,
  occurred_at text NOT NULL,
  UNIQUE(profile_id,revision),
  FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE
);
CREATE TABLE transaction_privacy (
  profile_id text NOT NULL,
  household_id text NOT NULL DEFAULT '',
  transaction_id text NOT NULL,
  quiet boolean NOT NULL,
  private_flag boolean NOT NULL,
  revision integer NOT NULL CHECK(revision > 0),
  updated_at text NOT NULL,
  PRIMARY KEY(profile_id,transaction_id),
  FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
  FOREIGN KEY(profile_id,transaction_id) REFERENCES transactions(profile_id,id) ON DELETE CASCADE
);
CREATE TABLE transaction_privacy_events (
  id text PRIMARY KEY,
  profile_id text NOT NULL,
  household_id text NOT NULL DEFAULT '',
  transaction_id text NOT NULL,
  revision integer NOT NULL CHECK(revision > 1),
  before_values jsonb NOT NULL,
  after_values jsonb NOT NULL,
  occurred_at text NOT NULL,
  UNIQUE(profile_id,transaction_id,revision),
  FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
  FOREIGN KEY(profile_id,transaction_id) REFERENCES transactions(profile_id,id) ON DELETE CASCADE
);
CREATE TABLE privacy_permissions (
  profile_id text NOT NULL,
  household_id text NOT NULL DEFAULT '',
  purpose text NOT NULL CHECK(purpose IN ('P-AI','C-ANALYTICS','N-SERVICE')),
  state text NOT NULL CHECK(state IN ('granted','denied','revoked')),
  revision integer NOT NULL CHECK(revision > 1),
  text_version text NOT NULL,
  text_hash text NOT NULL CHECK(text_hash ~ '^[a-f0-9]{64}$'),
  notice_version text NOT NULL,
  vendor_list_version text,
  updated_at text NOT NULL,
  reask_not_before text,
  PRIMARY KEY(profile_id,purpose),
  FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
  CHECK((purpose='P-AI' AND vendor_list_version IS NOT NULL) OR (purpose<>'P-AI' AND vendor_list_version IS NULL)),
  CHECK((state='granted' AND reask_not_before IS NULL) OR (state<>'granted' AND reask_not_before IS NOT NULL))
);
CREATE TABLE privacy_permission_events (
  id text PRIMARY KEY,
  profile_id text NOT NULL,
  household_id text NOT NULL DEFAULT '',
  purpose text NOT NULL CHECK(purpose IN ('P-AI','C-ANALYTICS','N-SERVICE')),
  revision integer NOT NULL CHECK(revision > 1),
  action text NOT NULL CHECK(action IN ('granted','denied','revoked')),
  before_state text NOT NULL CHECK(before_state IN ('not_granted','granted','denied','revoked')),
  after_state text NOT NULL CHECK(after_state IN ('granted','denied','revoked')),
  text_version text NOT NULL,
  text_hash text NOT NULL CHECK(text_hash ~ '^[a-f0-9]{64}$'),
  notice_version text NOT NULL,
  vendor_list_version text,
  reask_not_before text,
  source_of_truth text NOT NULL CHECK(source_of_truth='local_preference'),
  evidence_method text NOT NULL CHECK(evidence_method='explicit_choice'),
  ui_context text NOT NULL CHECK(ui_context='privacy_settings'),
  occurred_at text NOT NULL,
  UNIQUE(profile_id,purpose,revision),
  FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
  CHECK(action=after_state),
  CHECK((purpose='P-AI' AND vendor_list_version IS NOT NULL) OR (purpose<>'P-AI' AND vendor_list_version IS NULL)),
  CHECK((after_state='granted' AND reask_not_before IS NULL) OR (after_state<>'granted' AND reask_not_before IS NOT NULL))
);

CREATE FUNCTION protect_privacy_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=OLD.profile_id) THEN RETURN OLD; END IF;
    IF TG_TABLE_NAME='transaction_privacy_events' THEN
      IF NOT EXISTS(SELECT 1 FROM transactions WHERE profile_id=OLD.profile_id AND id=OLD.transaction_id) THEN RETURN OLD; END IF;
    END IF;
  END IF;
  RAISE EXCEPTION 'Privacy history is immutable outside parent erasure';
END;
$$;
CREATE TRIGGER profile_privacy_event_immutable BEFORE UPDATE OR DELETE ON profile_privacy_events
  FOR EACH ROW EXECUTE FUNCTION protect_privacy_history();
CREATE TRIGGER transaction_privacy_event_immutable BEFORE UPDATE OR DELETE ON transaction_privacy_events
  FOR EACH ROW EXECUTE FUNCTION protect_privacy_history();
CREATE TRIGGER privacy_permission_event_immutable BEFORE UPDATE OR DELETE ON privacy_permission_events
  FOR EACH ROW EXECUTE FUNCTION protect_privacy_history();

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['profile_privacy_settings','profile_privacy_events','transaction_privacy','transaction_privacy_events','privacy_permissions','privacy_permission_events'] LOOP
    EXECUTE format('CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household()',table_name);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',table_name);
    EXECUTE format('CREATE POLICY trusted_boundary ON %I TO lilleri_trusted USING(true) WITH CHECK(true)',table_name);
    EXECUTE format('CREATE POLICY financial_scope ON %I TO lilleri_runtime USING(household_id=nullif(current_setting(%L,true),%L) AND profile_id=nullif(current_setting(%L,true),%L)) WITH CHECK(household_id=nullif(current_setting(%L,true),%L) AND profile_id=nullif(current_setting(%L,true),%L))',table_name,'app.household_id','','app.profile_id','','app.household_id','','app.profile_id','');
    EXECUTE format('GRANT SELECT,INSERT ON %I TO lilleri_runtime',table_name);
  END LOOP;
END;
$$;
GRANT UPDATE ON profile_privacy_settings,transaction_privacy,privacy_permissions TO lilleri_runtime;
