-- Authentication-only atomic quotas. Keys are HMACs, never e-mail/IP/session tokens.
-- The financial runtime role deliberately receives no access to this table.
CREATE TABLE identity_request_quotas (
  key_hash text PRIMARY KEY CHECK (key_hash ~ '^[a-f0-9]{64}$'),
  count integer NOT NULL CHECK (count > 0),
  expires_at timestamptz NOT NULL
);
CREATE INDEX identity_request_quotas_expiry ON identity_request_quotas(expires_at);
