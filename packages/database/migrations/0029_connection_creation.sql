-- Durable, generation-specific synthetic connection creation and orphan compensation.
CREATE TABLE connection_creation_intents (
 id text PRIMARY KEY CHECK(length(id) BETWEEN 1 AND 200),
 household_id text NOT NULL DEFAULT '' REFERENCES households(id),
 profile_id text NOT NULL CHECK(length(profile_id) BETWEEN 1 AND 200),
 provider_id text NOT NULL CHECK(length(provider_id) BETWEEN 1 AND 200),
 institution_id text NOT NULL CHECK(length(institution_id) BETWEEN 1 AND 200),
 connection_id text NOT NULL CHECK(length(connection_id) BETWEEN 1 AND 200),
 consent_id text NOT NULL UNIQUE CHECK(length(consent_id) BETWEEN 1 AND 200),
 basis_digest text NOT NULL CHECK(basis_digest ~ '^[a-f0-9]{64}$'),
 state text NOT NULL CHECK(state IN('prepared','dispatching','applied','cancelled','compensating','compensated')),
 created_at text NOT NULL,
 dispatched_at text,
 deadline_at text NOT NULL,
 settled_at text,
 applied_at text,
 compensated_at text,
 revocation_job_id text,
 recovery_checked_at text,
 CHECK((state='applied')=(applied_at IS NOT NULL)),
 CHECK((state='compensated')=(compensated_at IS NOT NULL)),
 CHECK(dispatched_at IS NULL OR dispatched_at >= created_at),
 CHECK(settled_at IS NULL OR (dispatched_at IS NOT NULL AND settled_at >= dispatched_at)),
 CHECK(deadline_at > created_at)
);
CREATE UNIQUE INDEX connection_creation_exclusive ON connection_creation_intents(profile_id,provider_id,institution_id)
 WHERE state NOT IN('applied','compensated');
CREATE INDEX connection_creation_recovery ON connection_creation_intents(recovery_checked_at,created_at,id) WHERE state NOT IN('applied','compensated');
CREATE FUNCTION enforce_connection_creation_identity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected text;
BEGIN
 SELECT household_id INTO expected FROM public.profiles WHERE id=NEW.profile_id;
 IF expected IS NULL AND TG_OP='UPDATE' THEN expected:=OLD.household_id; END IF;
 IF expected IS NULL THEN RAISE EXCEPTION 'Creation profile is unavailable'; END IF;
 IF NEW.household_id='' THEN NEW.household_id:=expected; END IF;
 IF NEW.household_id IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Creation household mismatch'; END IF;
 IF TG_OP='UPDATE' AND ROW(NEW.id,NEW.household_id,NEW.profile_id,NEW.provider_id,NEW.institution_id,NEW.connection_id,NEW.consent_id,NEW.basis_digest,NEW.created_at,NEW.deadline_at)
 IS DISTINCT FROM ROW(OLD.id,OLD.household_id,OLD.profile_id,OLD.provider_id,OLD.institution_id,OLD.connection_id,OLD.consent_id,OLD.basis_digest,OLD.created_at,OLD.deadline_at) THEN RAISE EXCEPTION 'Creation identity is immutable'; END IF;
 IF TG_OP='UPDATE' AND OLD.state IN('applied','compensated') AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Creation terminal state is frozen'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER connection_creation_identity BEFORE INSERT OR UPDATE ON connection_creation_intents FOR EACH ROW EXECUTE FUNCTION enforce_connection_creation_identity();
ALTER TABLE connection_creation_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_creation_intents FORCE ROW LEVEL SECURITY;
CREATE POLICY trusted_boundary ON connection_creation_intents TO lilleri_trusted USING(true) WITH CHECK(true);
CREATE POLICY financial_scope ON connection_creation_intents TO lilleri_runtime
 USING(household_id=nullif(current_setting('app.household_id',true),'') AND profile_id=nullif(current_setting('app.profile_id',true),''))
 WITH CHECK(household_id=nullif(current_setting('app.household_id',true),'') AND profile_id=nullif(current_setting('app.profile_id',true),''));
GRANT SELECT,INSERT,UPDATE ON connection_creation_intents TO lilleri_runtime;
