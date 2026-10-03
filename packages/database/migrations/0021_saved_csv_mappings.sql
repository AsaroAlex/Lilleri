CREATE TABLE saved_csv_mappings (
  id text PRIMARY KEY,
  household_id text NOT NULL DEFAULT '',
  profile_id text NOT NULL,
  account_id text NOT NULL,
  name text NOT NULL CHECK(length(name) BETWEEN 1 AND 4096),
  definition jsonb NOT NULL,
  revision integer NOT NULL CHECK(revision BETWEEN 1 AND 2147483646),
  archived boolean NOT NULL DEFAULT false,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  UNIQUE(profile_id,account_id,id),
  FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
  FOREIGN KEY(profile_id,account_id) REFERENCES accounts(profile_id,id) ON DELETE CASCADE
);
CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON saved_csv_mappings
  FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household();

CREATE TABLE csv_mapping_events (
  id text PRIMARY KEY,
  household_id text NOT NULL DEFAULT '',
  profile_id text NOT NULL,
  account_id text NOT NULL,
  mapping_id text NOT NULL,
  revision integer NOT NULL CHECK(revision BETWEEN 1 AND 2147483646),
  action text NOT NULL CHECK(action IN ('created','updated','archived','restored')),
  snapshot jsonb NOT NULL,
  created_at text NOT NULL,
  FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
  FOREIGN KEY(profile_id,account_id,mapping_id) REFERENCES saved_csv_mappings(profile_id,account_id,id) ON DELETE CASCADE,
  UNIQUE(profile_id,mapping_id,revision)
);
CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON csv_mapping_events
  FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household();

CREATE TABLE mapped_import_provenance (
  household_id text NOT NULL DEFAULT '',
  profile_id text NOT NULL,
  account_id text NOT NULL,
  observation_id text NOT NULL,
  transaction_id text NOT NULL,
  file_digest text NOT NULL CHECK(file_digest ~ '^[a-f0-9]{64}$'),
  mapping_digest text NOT NULL CHECK(mapping_digest ~ '^[a-f0-9]{64}$'),
  row_number integer NOT NULL CHECK(row_number BETWEEN 1 AND 262144),
  identity text NOT NULL CHECK(identity IN ('external','file_content_ordinal')),
  value_on date,
  created_at text NOT NULL,
  PRIMARY KEY(profile_id,observation_id),
  FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
  FOREIGN KEY(profile_id,observation_id) REFERENCES source_observations(profile_id,id) ON DELETE CASCADE,
  FOREIGN KEY(profile_id,account_id,transaction_id) REFERENCES transactions(profile_id,account_id,id) ON DELETE CASCADE
);
CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON mapped_import_provenance
  FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household();

CREATE FUNCTION protect_csv_mapping_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' OR EXISTS(SELECT 1 FROM profiles WHERE id = OLD.profile_id) THEN
    RAISE EXCEPTION 'CSV import history is append-only until profile erasure';
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER csv_mapping_event_immutable BEFORE UPDATE OR DELETE ON csv_mapping_events
  FOR EACH ROW EXECUTE FUNCTION protect_csv_mapping_history();
CREATE TRIGGER mapped_import_provenance_immutable BEFORE UPDATE OR DELETE ON mapped_import_provenance
  FOR EACH ROW EXECUTE FUNCTION protect_csv_mapping_history();

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['saved_csv_mappings','csv_mapping_events','mapped_import_provenance'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',table_name);
    EXECUTE format('CREATE POLICY trusted_boundary ON %I TO lilleri_trusted USING(true) WITH CHECK(true)',table_name);
    EXECUTE format('CREATE POLICY financial_scope ON %I TO lilleri_runtime USING(household_id=nullif(current_setting(%L,true),%L) AND profile_id=nullif(current_setting(%L,true),%L)) WITH CHECK(household_id=nullif(current_setting(%L,true),%L) AND profile_id=nullif(current_setting(%L,true),%L))',table_name,'app.household_id','','app.profile_id','','app.household_id','','app.profile_id','');
  END LOOP;
END;
$$;
GRANT SELECT, INSERT, UPDATE ON saved_csv_mappings TO lilleri_runtime;
GRANT SELECT, INSERT ON csv_mapping_events, mapped_import_provenance TO lilleri_runtime;
