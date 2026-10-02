-- A new synthetic grant reuses account/transaction identities while retaining past consents.
ALTER TABLE consents DROP CONSTRAINT consents_profile_id_connection_id_key;
CREATE UNIQUE INDEX consents_one_active_grant ON consents(profile_id,connection_id) WHERE revoked_at IS NULL;
