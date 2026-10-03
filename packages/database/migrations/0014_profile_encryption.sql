-- Wrapped DEKs only. Wrapping keys belong to an independently managed key provider.
CREATE TABLE profile_encryption_keys (
  profile_id text PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  key_id text NOT NULL CONSTRAINT profile_encryption_keys_key_id UNIQUE,
  wrapped_key text NOT NULL,
  created_at text NOT NULL
);

-- No profile FK: a cascade and a restored old profile must not remove this deletion fence.
CREATE TABLE profile_key_tombstones (
  profile_id text PRIMARY KEY,
  key_id text,
  staged_at text NOT NULL,
  destroyed_at text,
  CONSTRAINT profile_key_tombstones_destroyed_after_stage
    CHECK (destroyed_at IS NULL OR destroyed_at >= staged_at)
);

CREATE FUNCTION protect_profile_key_tombstone() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Key deletion tombstones cannot be deleted';
  END IF;
  IF NEW.profile_id IS DISTINCT FROM OLD.profile_id
     OR NEW.key_id IS DISTINCT FROM OLD.key_id
     OR NEW.staged_at IS DISTINCT FROM OLD.staged_at
     OR (OLD.destroyed_at IS NOT NULL AND NEW.destroyed_at IS DISTINCT FROM OLD.destroyed_at)
     OR (OLD.destroyed_at IS NULL AND NEW.destroyed_at IS NULL) THEN
    RAISE EXCEPTION 'Key deletion tombstones are monotonic';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER profile_key_tombstone_monotonic
  BEFORE UPDATE OR DELETE ON profile_key_tombstones
  FOR EACH ROW EXECUTE FUNCTION protect_profile_key_tombstone();
