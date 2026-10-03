-- Display locale is a profile preference; preserve all existing financial facts and audit values.
ALTER TABLE profile_settings DROP CONSTRAINT profile_settings_locale;
ALTER TABLE profile_settings
  ADD CONSTRAINT profile_settings_locale CHECK (locale IN ('it-IT', 'en-GB'));
