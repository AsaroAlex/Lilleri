-- Bind financial idempotency caches to their authenticated source generation.
ALTER TABLE source_fact_generations DROP CONSTRAINT source_fact_generations_kind_check;
ALTER TABLE source_fact_generations ADD CONSTRAINT source_fact_generations_kind_check
 CHECK(kind IN ('account','transaction','observation','manual_command'));
ALTER TABLE manual_commands ADD COLUMN source_account_id text;
ALTER TABLE manual_commands ADD COLUMN source_connection_id text;
ALTER TABLE manual_commands ADD CONSTRAINT manual_commands_source_pair
 CHECK((source_account_id IS NULL)=(source_connection_id IS NULL));
ALTER TABLE manual_commands ADD CONSTRAINT manual_commands_owned_source
 FOREIGN KEY(profile_id,source_connection_id,source_account_id)
 REFERENCES accounts(profile_id,connection_id,id) ON DELETE CASCADE;
-- Existing NULL rows remain explicit legacy records. New signed commands require both owned fields.
