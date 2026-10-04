CREATE TABLE pending_lifecycles (
 transaction_id text PRIMARY KEY, household_id text NOT NULL DEFAULT '', profile_id text NOT NULL,
 connection_id text NOT NULL, account_id text NOT NULL, replacement_transaction_id text,
 first_seen_at text NOT NULL, state text NOT NULL CHECK(state IN ('active','replaced','amount_change_review','expired','cancelled','reversed')),
 revision integer NOT NULL CHECK(revision BETWEEN 1 AND 2147483646), pending_revision integer NOT NULL CHECK(pending_revision>0), replacement_revision integer CHECK(replacement_revision>0), digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'),
 payload text NOT NULL, updated_at text NOT NULL, UNIQUE(profile_id,transaction_id),
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,connection_id,account_id) REFERENCES accounts(profile_id,connection_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,account_id,transaction_id) REFERENCES transactions(profile_id,account_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,account_id,replacement_transaction_id) REFERENCES transactions(profile_id,account_id,id) ON DELETE CASCADE
);
CREATE TABLE pending_lifecycle_events (
 id text PRIMARY KEY, household_id text NOT NULL DEFAULT '', profile_id text NOT NULL,
 connection_id text NOT NULL, account_id text NOT NULL, transaction_id text NOT NULL, replacement_transaction_id text,
 revision integer NOT NULL CHECK(revision BETWEEN 1 AND 2147483646), payload text NOT NULL, occurred_at text NOT NULL,
 UNIQUE(profile_id,transaction_id,revision),
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,connection_id,account_id) REFERENCES accounts(profile_id,connection_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,account_id,transaction_id) REFERENCES transactions(profile_id,account_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,account_id,replacement_transaction_id) REFERENCES transactions(profile_id,account_id,id) ON DELETE CASCADE
);
CREATE TABLE source_removal_decisions (
 transaction_id text PRIMARY KEY, household_id text NOT NULL DEFAULT '', profile_id text NOT NULL,
 connection_id text NOT NULL, account_id text NOT NULL,
 choice text NOT NULL CHECK(choice IN ('keep_manual','remove','undone')),
 revision integer NOT NULL CHECK(revision BETWEEN 2 AND 2147483646), transaction_revision integer NOT NULL CHECK(transaction_revision>0),
 presence_digest text NOT NULL CHECK(presence_digest ~ '^[a-f0-9]{64}$'), updated_at text NOT NULL,
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,connection_id,account_id) REFERENCES accounts(profile_id,connection_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,account_id,transaction_id) REFERENCES transactions(profile_id,account_id,id) ON DELETE CASCADE
);
CREATE TABLE source_removal_decision_events (
 id text PRIMARY KEY, household_id text NOT NULL DEFAULT '', profile_id text NOT NULL,
 connection_id text NOT NULL, account_id text NOT NULL, transaction_id text NOT NULL,
 revision integer NOT NULL CHECK(revision BETWEEN 2 AND 2147483646), payload text NOT NULL, occurred_at text NOT NULL,
 UNIQUE(profile_id,transaction_id,revision),
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,connection_id,account_id) REFERENCES accounts(profile_id,connection_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,account_id,transaction_id) REFERENCES transactions(profile_id,account_id,id) ON DELETE CASCADE
);
CREATE FUNCTION protect_pending_lifecycle_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' AND pg_trigger_depth()>1 AND (
  NOT EXISTS(SELECT 1 FROM profiles WHERE id=OLD.profile_id) OR
  NOT EXISTS(SELECT 1 FROM transactions WHERE profile_id=OLD.profile_id AND id=OLD.transaction_id) OR
  (TG_TABLE_NAME='pending_lifecycle_events' AND NOT EXISTS(
   SELECT 1 FROM transactions WHERE profile_id=OLD.profile_id AND id=(to_jsonb(OLD)->>'replacement_transaction_id')
  ) AND to_jsonb(OLD)->>'replacement_transaction_id' IS NOT NULL)
 ) THEN RETURN OLD; END IF;
 RAISE EXCEPTION 'Lifecycle history is immutable outside source or profile erasure';
END;
$$;
DO $$ DECLARE table_name text; BEGIN
 FOREACH table_name IN ARRAY ARRAY['pending_lifecycles','pending_lifecycle_events','source_removal_decisions','source_removal_decision_events'] LOOP
  EXECUTE format('CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household()',table_name);
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',table_name);
  EXECUTE format('CREATE POLICY trusted_boundary ON %I TO lilleri_trusted USING(true) WITH CHECK(true)',table_name);
  EXECUTE format('CREATE POLICY financial_scope ON %I TO lilleri_runtime USING(household_id=nullif(current_setting(%L,true),%L) AND profile_id=nullif(current_setting(%L,true),%L)) WITH CHECK(household_id=nullif(current_setting(%L,true),%L) AND profile_id=nullif(current_setting(%L,true),%L))',table_name,'app.household_id','','app.profile_id','','app.household_id','','app.profile_id','');
  IF table_name IN ('pending_lifecycle_events','source_removal_decision_events') THEN
   EXECUTE format('CREATE TRIGGER pending_history_immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION protect_pending_lifecycle_history()',table_name);
   EXECUTE format('GRANT SELECT,INSERT ON %I TO lilleri_runtime',table_name);
  ELSE
   EXECUTE format('GRANT SELECT,INSERT,UPDATE ON %I TO lilleri_runtime',table_name);
  END IF;
 END LOOP;
END $$;
