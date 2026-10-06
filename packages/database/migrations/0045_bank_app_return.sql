-- A bank authorisation started in the native app returns to the app (lilleri://app?bank=…)
-- instead of the web application; the value is fixed per authorisation, never taken from the
-- callback request.
ALTER TABLE bank_authorizations ADD COLUMN return_to text NOT NULL DEFAULT 'web' CHECK(return_to IN ('web','app'));
