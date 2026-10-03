-- AES-GCM envelopes replace plaintext reasons; the application still limits input to 200 characters.
ALTER TABLE manual_balance_events DROP CONSTRAINT manual_balance_events_reason_check;
ALTER TABLE manual_balance_events ADD CONSTRAINT manual_balance_events_reason_check
  CHECK (length(reason) BETWEEN 1 AND 4096);
