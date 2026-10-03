-- No FK to profiles/connections: erasure must preserve minimal provider acknowledgement routing.
CREATE TABLE revocation_jobs (
  id text PRIMARY KEY,
  profile_id text NOT NULL,
  connection_id text NOT NULL,
  provider_id text NOT NULL,
  consent_id text NOT NULL,
  state text NOT NULL CHECK (state IN ('pending', 'running', 'completed', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at text NOT NULL,
  next_attempt_at text NOT NULL,
  deadline_at text NOT NULL,
  lease_token text,
  lease_expires_at text,
  completed_at text,
  last_error_code text CHECK (last_error_code IN
    ('provider_unavailable', 'provider_unknown', 'deadline_exceeded', 'attempts_exhausted')),
  CONSTRAINT revocation_jobs_consent UNIQUE (profile_id, connection_id, consent_id),
  CONSTRAINT revocation_jobs_lease CHECK (
    (state = 'running') = (lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)
  )
);
CREATE INDEX revocation_jobs_claim ON revocation_jobs (state, next_attempt_at, lease_expires_at);
CREATE INDEX revocation_jobs_profile ON revocation_jobs (profile_id, connection_id, state);
