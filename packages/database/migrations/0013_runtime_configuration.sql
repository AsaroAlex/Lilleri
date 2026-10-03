-- Global operational configuration contains bounded booleans/counts/durations only.
-- Operator identity/reasons are enumerated purpose codes, never emails/free text/secrets.
CREATE TABLE runtime_configuration_versions (
  revision integer PRIMARY KEY CONSTRAINT runtime_configuration_revision CHECK (revision > 0),
  schema_version integer NOT NULL CONSTRAINT runtime_configuration_schema_version CHECK (schema_version = 1),
  values jsonb NOT NULL CHECK (jsonb_typeof(values) = 'object'),
  digest text NOT NULL CONSTRAINT runtime_configuration_digest CHECK (digest ~ '^[0-9a-f]{64}$'),
  previous_revision integer REFERENCES runtime_configuration_versions(revision),
  rollback_revision integer REFERENCES runtime_configuration_versions(revision),
  action text NOT NULL CHECK (action IN ('bootstrap', 'update', 'rollback')),
  actor text NOT NULL CHECK (actor IN ('bootstrap', 'local_operator', 'deployment')),
  reason text NOT NULL CHECK (reason IN ('initial_setup', 'tuning', 'incident', 'release', 'rollback')),
  created_at text NOT NULL,
  CONSTRAINT runtime_configuration_audit CHECK (
    (revision = 1 AND previous_revision IS NULL AND rollback_revision IS NULL
      AND action = 'bootstrap' AND actor = 'bootstrap' AND reason = 'initial_setup')
    OR
    (revision > 1 AND previous_revision IS NOT NULL AND previous_revision = revision - 1
      AND actor <> 'bootstrap' AND
      ((action = 'update' AND rollback_revision IS NULL AND reason IN ('tuning', 'incident', 'release'))
       OR (action = 'rollback' AND rollback_revision IS NOT NULL AND rollback_revision < revision
         AND reason = 'rollback')))
  )
);
CREATE TABLE runtime_configuration_head (
  singleton text PRIMARY KEY CONSTRAINT runtime_configuration_singleton CHECK (singleton = 'runtime'),
  active_revision integer NOT NULL REFERENCES runtime_configuration_versions(revision)
);

CREATE FUNCTION protect_runtime_configuration_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Runtime configuration revisions are immutable';
END;
$$;
CREATE TRIGGER runtime_configuration_version_immutable
  BEFORE UPDATE OR DELETE ON runtime_configuration_versions
  FOR EACH ROW EXECUTE FUNCTION protect_runtime_configuration_version();

CREATE FUNCTION protect_runtime_configuration_head() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Runtime configuration head cannot be deleted';
  END IF;
  IF NEW.singleton <> OLD.singleton OR NEW.active_revision <> OLD.active_revision + 1 THEN
    RAISE EXCEPTION 'Runtime configuration head must advance one audited revision';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER runtime_configuration_head_monotonic
  BEFORE UPDATE OR DELETE ON runtime_configuration_head
  FOR EACH ROW EXECUTE FUNCTION protect_runtime_configuration_head();
