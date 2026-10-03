-- Keep canonical provenance immutable while raw synthetic content expires separately.
-- The original ingest instant, not migration execution, starts the 30-day window.
ALTER TABLE source_observations ADD CONSTRAINT source_observations_profile_id UNIQUE(profile_id,id);
CREATE TABLE observation_payloads (
  profile_id text NOT NULL,
  observation_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY(profile_id,observation_id),
  FOREIGN KEY(profile_id,observation_id) REFERENCES source_observations(profile_id,id) ON DELETE CASCADE
);
INSERT INTO observation_payloads(profile_id,observation_id,expires_at,payload)
SELECT profile_id,id,observed_at::timestamptz + INTERVAL '720 hours',payload FROM source_observations;
ALTER TABLE source_observations DROP COLUMN payload;
CREATE INDEX observation_payloads_profile_expiry ON observation_payloads(profile_id,expires_at,observation_id);
