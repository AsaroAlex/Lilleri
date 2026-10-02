CREATE FUNCTION reject_observation_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Source observations are immutable'; END; $$;
CREATE TRIGGER source_observations_immutable BEFORE UPDATE ON source_observations FOR EACH ROW EXECUTE FUNCTION reject_observation_update();
-- Persist the stable transaction legs with each decision, scoped by the same profile.
CREATE TABLE match_decision_legs (profile_id text NOT NULL, match_id text NOT NULL, transaction_id text NOT NULL, PRIMARY KEY(profile_id,match_id,transaction_id), FOREIGN KEY(profile_id,match_id) REFERENCES match_decisions(profile_id,match_id) ON DELETE CASCADE, FOREIGN KEY(profile_id,transaction_id) REFERENCES transactions(profile_id,id) ON DELETE CASCADE);
