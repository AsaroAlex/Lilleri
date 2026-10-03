CREATE TABLE merchant_aliases (
 id text PRIMARY KEY, household_id text NOT NULL DEFAULT '', profile_id text NOT NULL,
 key_digest text NOT NULL CHECK(key_digest ~ '^[a-f0-9]{64}$'),
 normalized_key text NOT NULL, merchant_id text NOT NULL, display_name text NOT NULL,
 revision integer NOT NULL CHECK(revision BETWEEN 1 AND 2147483646), archived boolean NOT NULL DEFAULT false,
 created_at text NOT NULL, updated_at text NOT NULL,
 UNIQUE(profile_id,id), UNIQUE(profile_id,key_digest),
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE
);
CREATE TABLE owned_categories (
 id text PRIMARY KEY, household_id text NOT NULL DEFAULT '', profile_id text NOT NULL,
 canonical_code text NOT NULL, taxonomy_version text NOT NULL, label text NOT NULL, icon text NOT NULL,
 parent_id text, position integer NOT NULL CHECK(position BETWEEN 0 AND 2147483646), hidden boolean NOT NULL DEFAULT false,
 revision integer NOT NULL CHECK(revision BETWEEN 1 AND 2147483646), archived boolean NOT NULL DEFAULT false,
 created_at text NOT NULL, updated_at text NOT NULL,
 UNIQUE(profile_id,id),
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,parent_id) REFERENCES owned_categories(profile_id,id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE category_assignments (
 household_id text NOT NULL DEFAULT '', profile_id text NOT NULL, transaction_id text NOT NULL,
 category_id text NOT NULL, revision integer NOT NULL CHECK(revision BETWEEN 1 AND 2147483646),
 snapshot jsonb NOT NULL, updated_at text NOT NULL,
 PRIMARY KEY(profile_id,transaction_id),
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,transaction_id) REFERENCES transactions(profile_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,category_id) REFERENCES owned_categories(profile_id,id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE merchant_alias_events (
 id text PRIMARY KEY, household_id text NOT NULL DEFAULT '', profile_id text NOT NULL,
 alias_id text NOT NULL, revision integer NOT NULL CHECK(revision BETWEEN 1 AND 2147483646),
 action text NOT NULL CHECK(action IN ('created','updated','archived','undone')),
 snapshot jsonb NOT NULL, occurred_at text NOT NULL,
 UNIQUE(profile_id,alias_id,revision),
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,alias_id) REFERENCES merchant_aliases(profile_id,id) ON DELETE CASCADE
);
CREATE TABLE owned_category_events (
 id text PRIMARY KEY, household_id text NOT NULL DEFAULT '', profile_id text NOT NULL,
 category_id text NOT NULL, revision integer NOT NULL CHECK(revision BETWEEN 1 AND 2147483646),
 action text NOT NULL CHECK(action IN ('created','updated','archived','merged','undone')),
 snapshot jsonb NOT NULL, occurred_at text NOT NULL,
 UNIQUE(profile_id,category_id,revision),
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,category_id) REFERENCES owned_categories(profile_id,id) ON DELETE CASCADE
);
CREATE TABLE category_assignment_events (
 id text PRIMARY KEY, household_id text NOT NULL DEFAULT '', profile_id text NOT NULL,
 transaction_id text NOT NULL, revision integer NOT NULL CHECK(revision BETWEEN 1 AND 2147483646),
 snapshot jsonb NOT NULL, occurred_at text NOT NULL,
 UNIQUE(profile_id,transaction_id,revision),
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,transaction_id) REFERENCES transactions(profile_id,id) ON DELETE CASCADE
);
CREATE FUNCTION protect_owned_recognition_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id = OLD.profile_id) THEN RETURN OLD; END IF;
  IF TG_TABLE_NAME = 'merchant_alias_events' THEN
   IF NOT EXISTS(SELECT 1 FROM merchant_aliases WHERE profile_id=OLD.profile_id AND id=OLD.alias_id) THEN RETURN OLD; END IF;
  ELSIF TG_TABLE_NAME = 'owned_category_events' THEN
   IF NOT EXISTS(SELECT 1 FROM owned_categories WHERE profile_id=OLD.profile_id AND id=OLD.category_id) THEN RETURN OLD; END IF;
  ELSIF TG_TABLE_NAME = 'category_assignment_events' THEN
   IF NOT EXISTS(SELECT 1 FROM transactions WHERE profile_id=OLD.profile_id AND id=OLD.transaction_id) THEN RETURN OLD; END IF;
  END IF;
 END IF;
 RAISE EXCEPTION 'Owned recognition history is immutable outside parent erasure';
END;
$$;
DO $$
DECLARE table_name text;
BEGIN
 FOREACH table_name IN ARRAY ARRAY['merchant_aliases','owned_categories','category_assignments','merchant_alias_events','owned_category_events','category_assignment_events'] LOOP
  EXECUTE format('CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household()',table_name);
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',table_name);
  EXECUTE format('CREATE POLICY trusted_boundary ON %I TO lilleri_trusted USING(true) WITH CHECK(true)',table_name);
  EXECUTE format('CREATE POLICY financial_scope ON %I TO lilleri_runtime USING(household_id=nullif(current_setting(%L,true),%L) AND profile_id=nullif(current_setting(%L,true),%L)) WITH CHECK(household_id=nullif(current_setting(%L,true),%L) AND profile_id=nullif(current_setting(%L,true),%L))',table_name,'app.household_id','','app.profile_id','','app.household_id','','app.profile_id','');
 END LOOP;
 FOREACH table_name IN ARRAY ARRAY['merchant_alias_events','owned_category_events','category_assignment_events'] LOOP
  EXECUTE format('CREATE TRIGGER recognition_history_immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION protect_owned_recognition_history()',table_name);
 END LOOP;
END;
$$;
GRANT SELECT, INSERT, UPDATE ON merchant_aliases,owned_categories,category_assignments TO lilleri_runtime;
GRANT SELECT, INSERT ON merchant_alias_events,owned_category_events,category_assignment_events TO lilleri_runtime;
