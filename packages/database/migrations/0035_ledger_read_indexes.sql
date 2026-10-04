-- The owned read projection uses exact financial DATEs, with undated entries last.
-- No plaintext search index or derived cross-profile financial content is stored.
CREATE INDEX transactions_profile_financial_day
  ON transactions(profile_id, (coalesce(booked_on, authorized_on, DATE '0001-01-01')) DESC, id);
CREATE INDEX transactions_profile_account_financial_day
  ON transactions(profile_id, account_id, (coalesce(booked_on, authorized_on, DATE '0001-01-01')) DESC, id);
CREATE INDEX transactions_profile_currency_financial_day
  ON transactions(profile_id, currency, (coalesce(booked_on, authorized_on, DATE '0001-01-01')) DESC, id);
