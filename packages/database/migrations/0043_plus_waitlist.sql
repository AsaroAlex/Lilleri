-- "Plus Fondatori" waiting list: the profile owner asked to be told once, by e-mail, when Plus
-- (bank connections) can be bought. Written only by the trusted boundary; the profile may read
-- its own row. Deleting the profile deletes the request. No e-mail address is copied here: it is
-- read from the owner's verified identity when the single notice is sent.
CREATE TABLE plus_waitlist (
 profile_id text PRIMARY KEY, household_id text NOT NULL DEFAULT '',
 joined_at text NOT NULL, notified_at text,
 FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE
);
CREATE INDEX plus_waitlist_queue ON plus_waitlist(joined_at,profile_id) WHERE notified_at IS NULL;
CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON plus_waitlist FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household();
ALTER TABLE plus_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE plus_waitlist FORCE ROW LEVEL SECURITY;
CREATE POLICY trusted_boundary ON plus_waitlist TO lilleri_trusted USING(true) WITH CHECK(true);
CREATE POLICY financial_scope ON plus_waitlist FOR SELECT TO lilleri_runtime USING(household_id=nullif(current_setting('app.household_id',true),'') AND profile_id=nullif(current_setting('app.profile_id',true),''));
GRANT SELECT ON plus_waitlist TO lilleri_runtime;
