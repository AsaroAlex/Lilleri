-- DRAFT: review and freeze before copying into packages/database/migrations.
CREATE TABLE recurring_preferences (
  id text PRIMARY KEY,
  household_id text NOT NULL DEFAULT '',
  profile_id text NOT NULL,
  account_id text NOT NULL,
  selector jsonb NOT NULL,
  state jsonb NOT NULL,
  revision integer NOT NULL CHECK(revision BETWEEN 2 AND 2147483646),
  created_at text NOT NULL,
  updated_at text NOT NULL,
  UNIQUE(profile_id,account_id,id),
  FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
  FOREIGN KEY(profile_id,account_id) REFERENCES accounts(profile_id,id) ON DELETE CASCADE
);
CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON recurring_preferences
  FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household();
CREATE TABLE recurring_preference_events (
  id text PRIMARY KEY,
  household_id text NOT NULL DEFAULT '',
  profile_id text NOT NULL,
  account_id text NOT NULL,
  preference_id text NOT NULL,
  revision integer NOT NULL CHECK(revision BETWEEN 2 AND 2147483646),
  action text NOT NULL CHECK(action IN ('updated','undone')),
  snapshot jsonb NOT NULL,
  occurred_at text NOT NULL,
  UNIQUE(profile_id,preference_id,revision),
  FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
  FOREIGN KEY(profile_id,account_id,preference_id) REFERENCES recurring_preferences(profile_id,account_id,id) ON DELETE CASCADE
);
CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON recurring_preference_events
  FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household();
CREATE FUNCTION protect_recurring_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    IF NOT EXISTS(SELECT 1 FROM profiles WHERE id = OLD.profile_id)
       OR NOT EXISTS(SELECT 1 FROM accounts WHERE profile_id=OLD.profile_id AND id=OLD.account_id) THEN
      RETURN OLD;
    END IF;
  END IF;
  RAISE EXCEPTION 'Recurring history is immutable outside parent erasure';
END;
$$;
CREATE TRIGGER recurring_preference_event_immutable BEFORE UPDATE OR DELETE ON recurring_preference_events
  FOR EACH ROW EXECUTE FUNCTION protect_recurring_history();
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['recurring_preferences','recurring_preference_events'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',table_name);
    EXECUTE format('CREATE POLICY trusted_boundary ON %I TO lilleri_trusted USING(true) WITH CHECK(true)',table_name);
    EXECUTE format('CREATE POLICY financial_scope ON %I TO lilleri_runtime USING(household_id=nullif(current_setting(%L,true),%L) AND profile_id=nullif(current_setting(%L,true),%L)) WITH CHECK(household_id=nullif(current_setting(%L,true),%L) AND profile_id=nullif(current_setting(%L,true),%L))',table_name,'app.household_id','','app.profile_id','','app.household_id','','app.profile_id','');
  END LOOP;
END;
$$;
GRANT SELECT,INSERT,UPDATE ON recurring_preferences TO lilleri_runtime;
GRANT SELECT,INSERT ON recurring_preference_events TO lilleri_runtime;
