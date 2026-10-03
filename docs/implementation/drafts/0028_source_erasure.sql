-- DRAFT: independent authenticated source erasure journal and signed post-erasure facts.
CREATE TABLE source_erasure_receipts (
 id text PRIMARY KEY, household_id text NOT NULL DEFAULT '' REFERENCES households(id), profile_id text NOT NULL, connection_id text NOT NULL,
 revision integer NOT NULL CHECK(revision BETWEEN 1 AND 2147483646), receipt jsonb NOT NULL,
 journal_key_id text NOT NULL CHECK(journal_key_id ~ '^[a-f0-9]{64}$'), digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'),
 staged_at text NOT NULL, applied_at text CHECK(applied_at IS NULL OR applied_at>=staged_at),
 UNIQUE(profile_id,connection_id,revision)
);
-- Deliberately independent of profile and connection cascades. Ciphertext remains unrecoverable
-- after profile-key destruction; minimal immutable metadata fences restored source copies.
CREATE TABLE source_fact_generations (
 household_id text NOT NULL DEFAULT '',profile_id text NOT NULL,connection_id text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('account','transaction','observation')),subject_id text NOT NULL,account_id text NOT NULL,
 proof jsonb NOT NULL,recorded_at text NOT NULL,
 PRIMARY KEY(profile_id,connection_id,kind,subject_id),
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,connection_id) REFERENCES connections(profile_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,connection_id,account_id) REFERENCES accounts(profile_id,connection_id,id) ON DELETE CASCADE
);
CREATE FUNCTION protect_source_erasure_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'applied_at')=(to_jsonb(OLD)-'applied_at')
    AND (OLD.applied_at IS NULL OR NEW.applied_at=OLD.applied_at) AND NEW.applied_at>=OLD.staged_at THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'Source erasure receipt is immutable';
END;
$$;
CREATE TRIGGER source_erasure_receipt_immutable BEFORE UPDATE OR DELETE ON source_erasure_receipts
 FOR EACH ROW EXECUTE FUNCTION protect_source_erasure_receipt();
CREATE FUNCTION enforce_source_receipt_household() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected text;
BEGIN
 SELECT household_id INTO expected FROM public.profiles WHERE id=NEW.profile_id;
 IF expected IS NULL AND TG_OP='UPDATE' THEN expected:=OLD.household_id; END IF;
 IF expected IS NULL THEN RAISE EXCEPTION 'Source receipt profile is unavailable'; END IF;
 IF NEW.household_id='' THEN NEW.household_id:=expected; END IF;
 IF NEW.household_id IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Source receipt household mismatch'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON source_erasure_receipts
 FOR EACH ROW EXECUTE FUNCTION enforce_source_receipt_household();
CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON source_fact_generations
 FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household();
DO $$ DECLARE table_name text; BEGIN
 FOREACH table_name IN ARRAY ARRAY['source_erasure_receipts','source_fact_generations'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',table_name);
  EXECUTE format('CREATE POLICY trusted_boundary ON %I TO lilleri_trusted USING(true) WITH CHECK(true)',table_name);
  EXECUTE format('CREATE POLICY financial_scope ON %I TO lilleri_runtime USING(household_id=nullif(current_setting(''app.household_id'',true),'''') AND profile_id=nullif(current_setting(''app.profile_id'',true),'''')) WITH CHECK(household_id=nullif(current_setting(''app.household_id'',true),'''') AND profile_id=nullif(current_setting(''app.profile_id'',true),''''))',table_name);
 END LOOP;
END $$;
GRANT SELECT,INSERT,UPDATE ON source_erasure_receipts TO lilleri_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON source_fact_generations TO lilleri_runtime;
