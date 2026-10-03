-- Encrypted actual choices and captured local facts; independently reviewed before promotion.
ALTER TABLE source_erasure_receipts ADD CONSTRAINT source_erasure_receipts_profile_id_unique UNIQUE(profile_id,id);
CREATE TABLE understanding_preferences (
 profile_id text PRIMARY KEY,
 household_id text NOT NULL DEFAULT '',
 revision integer NOT NULL CHECK(revision>1),
 payload text NOT NULL CHECK(payload LIKE 'lilleri:v1:%'),
 digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'),
 updated_at text NOT NULL,
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE
);
CREATE TABLE understanding_preference_events (
 id text PRIMARY KEY,
 profile_id text NOT NULL,
 household_id text NOT NULL DEFAULT '',
 revision integer NOT NULL CHECK(revision>1),
 action text NOT NULL CHECK(action IN('changed','undone','source_erased')),
 payload text CHECK(payload LIKE 'lilleri:v1:%'),
 digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'),
 source_receipt_id text,
 occurred_at text NOT NULL,
 UNIQUE(profile_id,revision),
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,source_receipt_id) REFERENCES source_erasure_receipts(profile_id,id),
 CHECK(payload IS NOT NULL OR source_receipt_id IS NOT NULL),
 CHECK(action<>'source_erased' OR source_receipt_id IS NOT NULL)
);
CREATE TABLE understanding_monthly_snapshots (
 id text PRIMARY KEY,
 profile_id text NOT NULL,
 household_id text NOT NULL DEFAULT '',
 month text NOT NULL CHECK(month ~ '^[0-9]{4}-[0-9]{2}$'),
 captured_at text NOT NULL,
 input_digest text NOT NULL CHECK(input_digest ~ '^[a-f0-9]{64}$'),
 digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'),
 payload text CHECK(payload LIKE 'lilleri:v1:%'),
 source_receipt_id text,
 UNIQUE(profile_id,id),
 UNIQUE(profile_id,month,input_digest),
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,source_receipt_id) REFERENCES source_erasure_receipts(profile_id,id),
 CHECK((payload IS NULL)=(source_receipt_id IS NOT NULL))
);
CREATE TABLE understanding_references (
 profile_id text NOT NULL,
 household_id text NOT NULL DEFAULT '',
 target_kind text NOT NULL CHECK(target_kind IN('preference_state','preference_event','monthly_snapshot')),
 target_id text NOT NULL,
 account_id text NOT NULL,
 transaction_id text,
 connection_id text NOT NULL,
 subject_kind text NOT NULL CHECK(subject_kind IN('account','transaction')),
 subject_id text NOT NULL,
 erasure_revision integer NOT NULL CHECK(erasure_revision>=0),
 PRIMARY KEY(profile_id,target_kind,target_id,subject_kind,subject_id),
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
 FOREIGN KEY(profile_id,connection_id,account_id) REFERENCES accounts(profile_id,connection_id,id) DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(profile_id,transaction_id) REFERENCES transactions(profile_id,id) DEFERRABLE INITIALLY DEFERRED,
 CHECK((subject_kind='account' AND subject_id=account_id AND transaction_id IS NULL) OR (subject_kind='transaction' AND subject_id=transaction_id))
);
CREATE INDEX understanding_snapshot_history ON understanding_monthly_snapshots(profile_id,captured_at DESC,id DESC);
CREATE INDEX understanding_reference_source ON understanding_references(profile_id,connection_id,erasure_revision);

CREATE FUNCTION enforce_understanding_reference() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE valid boolean;
BEGIN
 IF TG_OP='UPDATE' THEN RAISE EXCEPTION 'Understanding references are immutable'; END IF;
 IF TG_OP='DELETE' THEN
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=OLD.profile_id) OR OLD.target_kind='preference_state' THEN RETURN OLD; END IF;
  IF OLD.target_kind='preference_event' THEN
   SELECT NOT EXISTS(SELECT 1 FROM understanding_preference_events WHERE id=OLD.target_id AND profile_id=OLD.profile_id AND payload IS NOT NULL) INTO valid;
  ELSE
   SELECT NOT EXISTS(SELECT 1 FROM understanding_monthly_snapshots WHERE id=OLD.target_id AND profile_id=OLD.profile_id AND payload IS NOT NULL) INTO valid;
  END IF;
  IF valid THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'Understanding evidence references cannot be removed';
 END IF;
 IF NEW.target_kind='preference_state' THEN
  SELECT EXISTS(SELECT 1 FROM understanding_preferences WHERE profile_id=NEW.profile_id AND NEW.target_id=NEW.profile_id) INTO valid;
 ELSIF NEW.target_kind='preference_event' THEN
  SELECT EXISTS(SELECT 1 FROM understanding_preference_events WHERE profile_id=NEW.profile_id AND id=NEW.target_id AND payload IS NOT NULL) INTO valid;
 ELSE
  SELECT EXISTS(SELECT 1 FROM understanding_monthly_snapshots WHERE profile_id=NEW.profile_id AND id=NEW.target_id AND payload IS NOT NULL) INTO valid;
 END IF;
 IF NOT valid THEN RAISE EXCEPTION 'Understanding target ownership mismatch'; END IF;
 IF NEW.transaction_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM transactions WHERE profile_id=NEW.profile_id AND id=NEW.transaction_id AND account_id=NEW.account_id AND connection_id=NEW.connection_id) THEN RAISE EXCEPTION 'Understanding transaction membership mismatch'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER understanding_reference_guard BEFORE INSERT OR UPDATE OR DELETE ON understanding_references FOR EACH ROW EXECUTE FUNCTION enforce_understanding_reference();
CREATE FUNCTION protect_understanding_history() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE eligible boolean;
BEGIN
 IF TG_OP='DELETE' AND NOT EXISTS(SELECT 1 FROM profiles WHERE id=OLD.profile_id) THEN RETURN OLD; END IF;
 IF TG_OP='UPDATE' AND OLD.payload IS NOT NULL AND NEW.payload IS NULL AND OLD.source_receipt_id IS NULL AND NEW.source_receipt_id IS NOT NULL
  AND (to_jsonb(OLD)-'payload'-'source_receipt_id')=(to_jsonb(NEW)-'payload'-'source_receipt_id') THEN
  SELECT EXISTS(SELECT 1 FROM source_erasure_receipts e JOIN understanding_references r ON r.profile_id=e.profile_id AND r.connection_id=e.connection_id AND r.erasure_revision<e.revision
   WHERE e.id=NEW.source_receipt_id AND e.profile_id=OLD.profile_id AND r.target_id=OLD.id
   AND r.target_kind=CASE WHEN TG_TABLE_NAME='understanding_preference_events' THEN 'preference_event' ELSE 'monthly_snapshot' END) INTO eligible;
  IF eligible THEN RETURN NEW; END IF;
 END IF;
 RAISE EXCEPTION 'Understanding history is immutable outside verified source redaction or profile erasure';
END;
$$;
CREATE TRIGGER understanding_event_immutable BEFORE UPDATE OR DELETE ON understanding_preference_events FOR EACH ROW EXECUTE FUNCTION protect_understanding_history();
CREATE TRIGGER understanding_snapshot_immutable BEFORE UPDATE OR DELETE ON understanding_monthly_snapshots FOR EACH ROW EXECUTE FUNCTION protect_understanding_history();
DO $$
DECLARE table_name text;
BEGIN
 FOREACH table_name IN ARRAY ARRAY['understanding_preferences','understanding_preference_events','understanding_monthly_snapshots','understanding_references'] LOOP
  EXECUTE format('CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household()',table_name);
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',table_name);
  EXECUTE format('CREATE POLICY trusted_boundary ON %I TO lilleri_trusted USING(true) WITH CHECK(true)',table_name);
  EXECUTE format('CREATE POLICY financial_scope ON %I TO lilleri_runtime USING(household_id=nullif(current_setting(%L,true),%L) AND profile_id=nullif(current_setting(%L,true),%L)) WITH CHECK(household_id=nullif(current_setting(%L,true),%L) AND profile_id=nullif(current_setting(%L,true),%L))',table_name,'app.household_id','','app.profile_id','','app.household_id','','app.profile_id','');
  EXECUTE format('GRANT SELECT,INSERT,UPDATE ON %I TO lilleri_runtime',table_name);
 END LOOP;
END;
$$;
GRANT DELETE ON understanding_references TO lilleri_runtime;
