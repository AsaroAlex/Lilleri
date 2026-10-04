-- Frozen, source-scoped identity evidence. Hashes include profile/connection/account/provider scope.
CREATE TABLE sync_transaction_identities (
 transaction_id text PRIMARY KEY, household_id text NOT NULL DEFAULT '', profile_id text NOT NULL,
 connection_id text NOT NULL, account_id text NOT NULL, provider_id text NOT NULL,
 origin_consent_id text NOT NULL, origin_renewal_revision integer NOT NULL CHECK(origin_renewal_revision >= 0), fingerprint text NOT NULL CHECK(fingerprint ~ '^[a-f0-9]{64}$'),
 ordinal integer CHECK(ordinal > 0), created_at text NOT NULL,
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,connection_id,account_id) REFERENCES accounts(profile_id,connection_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,account_id,transaction_id) REFERENCES transactions(profile_id,account_id,id) ON DELETE CASCADE
);
CREATE INDEX sync_identity_fingerprint ON sync_transaction_identities(profile_id,connection_id,provider_id,fingerprint);
CREATE TABLE sync_transaction_aliases (
 household_id text NOT NULL DEFAULT '', profile_id text NOT NULL, connection_id text NOT NULL,
 account_id text NOT NULL, provider_id text NOT NULL, consent_id text NOT NULL, renewal_revision integer NOT NULL CHECK(renewal_revision >= 0),
 provider_record_id text NOT NULL, transaction_id text NOT NULL, created_at text NOT NULL,
 PRIMARY KEY(profile_id,connection_id,account_id,provider_id,consent_id,renewal_revision,provider_record_id),
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,connection_id,account_id) REFERENCES accounts(profile_id,connection_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,connection_id,consent_id) REFERENCES consents(profile_id,connection_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,account_id,transaction_id) REFERENCES transactions(profile_id,account_id,id) ON DELETE CASCADE
);
CREATE TABLE sync_identity_events (
 id text PRIMARY KEY, household_id text NOT NULL DEFAULT '', profile_id text NOT NULL,
 connection_id text NOT NULL, account_id text NOT NULL, transaction_id text NOT NULL,
 consent_id text NOT NULL, renewal_revision integer NOT NULL CHECK(renewal_revision >= 0), job_id text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('no_id_ordinal','provider_id_changed')), provider_record_id text,
 fingerprint text NOT NULL CHECK(fingerprint ~ '^[a-f0-9]{64}$'), ordinal integer CHECK(ordinal > 0), created_at text NOT NULL,
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,connection_id,account_id) REFERENCES accounts(profile_id,connection_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,account_id,transaction_id) REFERENCES transactions(profile_id,account_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,connection_id,consent_id,job_id) REFERENCES sync_jobs(profile_id,connection_id,consent_id,id) ON DELETE CASCADE
);
-- Parent/source erasure must remove evidence, while ordinary runtime writes cannot rewrite it.
CREATE FUNCTION protect_sync_identity_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 AND
    (NOT EXISTS(SELECT 1 FROM profiles WHERE id=OLD.profile_id)
     OR NOT EXISTS(SELECT 1 FROM accounts WHERE profile_id=OLD.profile_id AND id=OLD.account_id)
     OR NOT EXISTS(SELECT 1 FROM transactions WHERE profile_id=OLD.profile_id AND id=OLD.transaction_id)) THEN
  RETURN OLD;
 END IF;
 RAISE EXCEPTION 'Sync identity evidence is immutable until source erasure';
END;
$$;
DO $$ DECLARE table_name text; BEGIN
 FOREACH table_name IN ARRAY ARRAY['sync_transaction_identities','sync_transaction_aliases','sync_identity_events'] LOOP
  EXECUTE format('CREATE TRIGGER sync_identity_immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION protect_sync_identity_evidence()',table_name);
  EXECUTE format('CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household()',table_name);
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',table_name);
  EXECUTE format('CREATE POLICY trusted_boundary ON %I TO lilleri_trusted USING(true) WITH CHECK(true)',table_name);
  EXECUTE format('CREATE POLICY financial_scope ON %I TO lilleri_runtime USING(household_id=nullif(current_setting(''app.household_id'',true),'''') AND profile_id=nullif(current_setting(''app.profile_id'',true),'''')) WITH CHECK(household_id=nullif(current_setting(''app.household_id'',true),'''') AND profile_id=nullif(current_setting(''app.profile_id'',true),''''))',table_name);
  EXECUTE format('GRANT SELECT, INSERT ON %I TO lilleri_runtime',table_name);
 END LOOP;
END $$;
