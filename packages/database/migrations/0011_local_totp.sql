-- Better Auth's supported TOTP and encrypted one-use backup-code persistence.
ALTER TABLE identity_users ADD COLUMN two_factor_enabled boolean NOT NULL DEFAULT false;
CREATE TABLE identity_two_factors (
  id text PRIMARY KEY,
  user_id text NOT NULL UNIQUE REFERENCES identity_users(id) ON DELETE CASCADE,
  secret text NOT NULL, backup_codes text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  failed_verification_count integer NOT NULL DEFAULT 0 CHECK (failed_verification_count >= 0),
  locked_until timestamptz
);
