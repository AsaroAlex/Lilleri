-- A local source has no banking grant. Its explicit balance events never count as spending.
ALTER TABLE transactions ADD CONSTRAINT transactions_profile_account_id UNIQUE(profile_id,account_id,id);
CREATE TABLE manual_accounts (
  profile_id text NOT NULL,
  account_id text NOT NULL,
  opening_on text NOT NULL CHECK(opening_on ~ '^\d{4}-\d{2}-\d{2}$'),
  opening_balance_minor bigint NOT NULL,
  revision integer NOT NULL CHECK(revision > 0),
  PRIMARY KEY(profile_id,account_id),
  FOREIGN KEY(profile_id,account_id) REFERENCES accounts(profile_id,id) ON DELETE CASCADE
);
CREATE TABLE manual_commands (
  profile_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_id text NOT NULL CHECK(length(request_id) BETWEEN 16 AND 128),
  request_hash text NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'),
  operation text NOT NULL CHECK(operation IN ('account','entry','import','adjustment','reversal')),
  response jsonb NOT NULL CHECK(jsonb_typeof(response)='object'),
  created_at text NOT NULL,
  PRIMARY KEY(profile_id,request_id)
);
CREATE TABLE manual_balance_events (
  id text PRIMARY KEY,
  profile_id text NOT NULL,
  account_id text NOT NULL,
  request_id text NOT NULL,
  operation text NOT NULL CHECK(operation IN ('opening','entry','import','adjustment','reversal')),
  transaction_id text,
  before_minor bigint NOT NULL,
  after_minor bigint NOT NULL,
  account_revision integer NOT NULL CHECK(account_revision > 0),
  reason text NOT NULL CHECK(length(reason) BETWEEN 1 AND 200),
  created_at text NOT NULL,
  FOREIGN KEY(profile_id,account_id) REFERENCES manual_accounts(profile_id,account_id) ON DELETE CASCADE,
  FOREIGN KEY(profile_id,request_id) REFERENCES manual_commands(profile_id,request_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY(profile_id,account_id,transaction_id) REFERENCES transactions(profile_id,account_id,id) ON DELETE CASCADE,
  CONSTRAINT manual_balance_events_revision UNIQUE(profile_id,account_id,account_revision),
  CONSTRAINT manual_balance_events_transaction CHECK((operation IN ('entry','import','reversal'))=(transaction_id IS NOT NULL))
);
CREATE FUNCTION manual_audit_no_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Manual audit events are immutable'; END;
$$;
CREATE TRIGGER manual_commands_no_update BEFORE UPDATE ON manual_commands FOR EACH ROW EXECUTE FUNCTION manual_audit_no_update();
CREATE TRIGGER manual_balance_events_no_update BEFORE UPDATE ON manual_balance_events FOR EACH ROW EXECUTE FUNCTION manual_audit_no_update();
