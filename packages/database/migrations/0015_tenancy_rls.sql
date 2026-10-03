-- Reserved tenancy is personal-only: no household sharing or business product is enabled.
-- Provision login passwords outside migrations. The database owner is a trusted bootstrap,
-- identity and maintenance boundary; HTTP financial queries use the separate runtime role.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lilleri_runtime') THEN
    CREATE ROLE lilleri_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lilleri_trusted') THEN
    CREATE ROLE lilleri_trusted NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('lilleri_runtime','lilleri_trusted')
             AND (rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolcanlogin)) THEN
    RAISE EXCEPTION 'Reserved database role attributes are unsafe';
  END IF;
  EXECUTE format('GRANT lilleri_trusted TO %I', current_user);
  EXECUTE format('GRANT lilleri_runtime TO %I', current_user);
END;
$$;

CREATE TABLE households (
  id text PRIMARY KEY,
  created_at text NOT NULL
);
INSERT INTO households(id,created_at) SELECT 'household:' || id, created_at FROM profiles;
-- Erasure routing survives the financial profile and needs the same reserved scope.
INSERT INTO households(id,created_at)
  SELECT 'household:' || profile_id, erased_at FROM profile_tombstones ON CONFLICT DO NOTHING;
INSERT INTO households(id,created_at)
  SELECT 'household:' || profile_id, min(created_at) FROM revocation_jobs GROUP BY profile_id
  ON CONFLICT DO NOTHING;
INSERT INTO households(id,created_at)
  SELECT 'household:' || profile_id, staged_at FROM profile_key_tombstones ON CONFLICT DO NOTHING;

ALTER TABLE profiles ADD COLUMN household_id text NOT NULL DEFAULT '';
UPDATE profiles SET household_id = 'household:' || id;
ALTER TABLE profiles ADD CONSTRAINT profiles_household_fk FOREIGN KEY(household_id) REFERENCES households(id);
ALTER TABLE profiles ADD CONSTRAINT profiles_household_id UNIQUE(household_id,id);

CREATE FUNCTION reserve_profile_household() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.household_id IS DISTINCT FROM OLD.household_id THEN
    RAISE EXCEPTION 'Household reassignment is not enabled';
  END IF;
  IF NEW.household_id = '' THEN NEW.household_id := 'household:' || NEW.id; END IF;
  IF NEW.household_id IS DISTINCT FROM ('household:' || NEW.id) THEN
    RAISE EXCEPTION 'Household sharing is not enabled';
  END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO households(id,created_at) VALUES(NEW.household_id,NEW.created_at) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER profiles_reserved_household BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION reserve_profile_household();

CREATE FUNCTION enforce_reserved_household() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected text;
BEGIN
  SELECT household_id INTO expected FROM public.profiles WHERE id = NEW.profile_id;
  IF expected IS NULL AND TG_TABLE_NAME IN ('profile_tombstones','revocation_jobs','profile_key_tombstones') THEN
    expected := 'household:' || NEW.profile_id;
    IF NOT EXISTS (SELECT 1 FROM public.households WHERE id = expected) THEN
      INSERT INTO public.households(id,created_at)
        VALUES(expected,coalesce(to_jsonb(NEW)->>'created_at',to_jsonb(NEW)->>'erased_at',to_jsonb(NEW)->>'staged_at'));
    END IF;
  END IF;
  IF expected IS NULL THEN RAISE EXCEPTION 'Financial profile is unavailable'; END IF;
  IF NEW.household_id = '' THEN NEW.household_id := expected; END IF;
  IF NEW.household_id IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Household scope mismatch'; END IF;
  IF TG_OP = 'UPDATE' AND (NEW.household_id IS DISTINCT FROM OLD.household_id OR NEW.profile_id IS DISTINCT FROM OLD.profile_id) THEN
    RAISE EXCEPTION 'Financial tenant reassignment is not enabled';
  END IF;
  RETURN NEW;
END;
$$;

-- The backfill is a reviewed schema-only change; temporarily pause immutable-row triggers.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'connections','consents','accounts','transactions','source_observations',
    'classification_feedback','preferences','match_decisions','sync_runs',
    'profile_tombstones','match_decision_legs','observation_payloads','revocation_jobs',
    'classification_rules','rule_events','manual_accounts','manual_commands',
    'manual_balance_events','profile_settings','profile_settings_events',
    'identity_memberships','profile_encryption_keys','profile_key_tombstones'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN household_id text NOT NULL DEFAULT %L', table_name, '');
    EXECUTE format('ALTER TABLE %I DISABLE TRIGGER USER', table_name);
    EXECUTE format('UPDATE %I SET household_id = %L || profile_id', table_name, 'household:');
    EXECUTE format('ALTER TABLE %I ENABLE TRIGGER USER', table_name);
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY(household_id) REFERENCES households(id)', table_name, table_name || '_household_fk');
    IF table_name NOT IN ('profile_tombstones','revocation_jobs','profile_key_tombstones') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE', table_name, table_name || '_household_profile_fk');
    END IF;
    EXECUTE format('CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household()', table_name);
  END LOOP;
END;
$$;

ALTER TABLE accounts ADD CONSTRAINT accounts_household_id UNIQUE(household_id,id);
ALTER TABLE transactions ADD CONSTRAINT transactions_household_account_fk
  FOREIGN KEY(household_id,account_id) REFERENCES accounts(household_id,id) ON DELETE CASCADE;
ALTER TABLE transactions ADD COLUMN scope text NOT NULL DEFAULT 'personal'
  CONSTRAINT transactions_scope CHECK(scope IN ('personal','business'));
ALTER TABLE classification_rules ADD COLUMN scope text NOT NULL DEFAULT 'personal'
  CONSTRAINT classification_rules_scope CHECK(scope IN ('personal','business'));

CREATE TABLE account_members (
  household_id text NOT NULL DEFAULT '',
  account_id text NOT NULL,
  profile_id text NOT NULL,
  role text NOT NULL CHECK(role IN ('owner','editor','viewer')),
  created_at text NOT NULL,
  PRIMARY KEY(household_id,account_id,profile_id),
  FOREIGN KEY(household_id,account_id) REFERENCES accounts(household_id,id) ON DELETE CASCADE,
  FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE
);
CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON account_members
  FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household();
INSERT INTO account_members(household_id,account_id,profile_id,role,created_at)
  SELECT household_id,id,profile_id,'owner',balance_updated_at FROM accounts;
CREATE FUNCTION reserve_account_owner() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO account_members(household_id,account_id,profile_id,role,created_at)
    VALUES(NEW.household_id,NEW.id,NEW.profile_id,'owner',NEW.balance_updated_at);
  RETURN NEW;
END;
$$;
CREATE TRIGGER accounts_reserved_owner AFTER INSERT ON accounts
  FOR EACH ROW EXECUTE FUNCTION reserve_account_owner();

-- No context means zero visible rows. A trusted identity/maintenance role is explicit.
DO $$
DECLARE table_name text; profile_column text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'profiles','connections','consents','accounts','transactions','source_observations',
    'classification_feedback','preferences','match_decisions','sync_runs',
    'profile_tombstones','match_decision_legs','observation_payloads','revocation_jobs',
    'classification_rules','rule_events','manual_accounts','manual_commands',
    'manual_balance_events','profile_settings','profile_settings_events',
    'identity_memberships','profile_encryption_keys','profile_key_tombstones','account_members'
  ] LOOP
    profile_column := CASE WHEN table_name = 'profiles' THEN 'id' ELSE 'profile_id' END;
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY trusted_boundary ON %I TO lilleri_trusted USING (true) WITH CHECK (true)', table_name);
    -- Key journal scope allows own reads/staging only; completion stays trusted. Auth memberships have no runtime grants.
    IF table_name <> 'identity_memberships' THEN
      EXECUTE format('CREATE POLICY financial_scope ON %I TO lilleri_runtime USING (household_id = nullif(current_setting(%L,true),%L) AND %I = nullif(current_setting(%L,true),%L)) WITH CHECK (household_id = nullif(current_setting(%L,true),%L) AND %I = nullif(current_setting(%L,true),%L))',
        table_name, 'app.household_id', '', profile_column, 'app.profile_id', '', 'app.household_id', '', profile_column, 'app.profile_id', '');
      IF table_name IN ('account_members','profile_key_tombstones') THEN
        EXECUTE format('GRANT SELECT, INSERT ON %I TO lilleri_runtime', table_name);
      ELSE
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO lilleri_runtime', table_name);
      END IF;
    END IF;
  END LOOP;
END;
$$;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE households FORCE ROW LEVEL SECURITY;
CREATE POLICY trusted_boundary ON households TO lilleri_trusted USING (true) WITH CHECK (true);
CREATE POLICY household_scope ON households TO lilleri_runtime
  USING(id = nullif(current_setting('app.household_id',true),''));
GRANT SELECT ON households TO lilleri_runtime;
GRANT USAGE ON SCHEMA public TO lilleri_runtime;

-- The server sets this user context only after separately validating owner membership.
-- DELETE cascades credentials in the same financial-erasure transaction; other identity
-- columns/tables are inaccessible, and absence of the context denies the deletion.
ALTER TABLE identity_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_users FORCE ROW LEVEL SECURITY;
CREATE POLICY trusted_boundary ON identity_users TO lilleri_trusted USING(true) WITH CHECK(true);
CREATE POLICY authorised_identity_cleanup ON identity_users TO lilleri_runtime
  USING(id = nullif(current_setting('app.identity_user_id',true),''));
GRANT SELECT(id), DELETE ON identity_users TO lilleri_runtime;
