-- Local synthetic identity only. Real-data authentication remains separately gated.
CREATE TABLE identity_users (
  id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false, image text,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  adult_attested boolean NOT NULL CHECK (adult_attested),
  terms_version text NOT NULL
);
CREATE TABLE identity_sessions (
  id text PRIMARY KEY, token text NOT NULL UNIQUE,
  user_id text NOT NULL REFERENCES identity_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL, ip_address text, user_agent text
);
CREATE INDEX identity_sessions_user ON identity_sessions(user_id);
CREATE TABLE identity_accounts (
  id text PRIMARY KEY, account_id text NOT NULL, provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES identity_users(id) ON DELETE CASCADE,
  access_token text, refresh_token text, id_token text,
  access_token_expires_at timestamptz, refresh_token_expires_at timestamptz,
  scope text, password text, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
);
CREATE INDEX identity_accounts_user ON identity_accounts(user_id);
CREATE TABLE identity_verifications (
  id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL,
  expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
);
CREATE INDEX identity_verifications_identifier ON identity_verifications(identifier);
CREATE TABLE identity_passkeys (
  id text PRIMARY KEY, name text, public_key text NOT NULL,
  user_id text NOT NULL REFERENCES identity_users(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE, counter integer NOT NULL CHECK (counter >= 0),
  device_type text NOT NULL, backed_up boolean NOT NULL, transports text,
  created_at timestamptz, aaguid text
);
CREATE INDEX identity_passkeys_user ON identity_passkeys(user_id);
CREATE TABLE identity_memberships (
  user_id text NOT NULL REFERENCES identity_users(id) ON DELETE CASCADE,
  profile_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','editor','viewer')),
  created_at timestamptz NOT NULL, PRIMARY KEY(user_id,profile_id)
);
CREATE TABLE identity_acceptances (
  user_id text NOT NULL REFERENCES identity_users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('adult_attestation','terms')),
  text_version text NOT NULL, accepted_at timestamptz NOT NULL,
  PRIMARY KEY(user_id,kind)
);
CREATE TABLE identity_step_ups (
  session_id text PRIMARY KEY REFERENCES identity_sessions(id) ON DELETE CASCADE,
  verified_at timestamptz NOT NULL
);
