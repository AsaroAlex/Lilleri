-- Profile settings are local synthetic preferences, not identity, paid grants or consent.
CREATE TABLE profile_settings (
  profile_id text PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  locale text NOT NULL CONSTRAINT profile_settings_locale CHECK (locale = 'it-IT'),
  revision integer NOT NULL CONSTRAINT profile_settings_revision CHECK (revision > 0),
  updated_at text NOT NULL
);

CREATE TABLE profile_settings_events (
  id text PRIMARY KEY,
  profile_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  revision integer NOT NULL CONSTRAINT profile_settings_events_revision CHECK (revision > 1),
  before_values jsonb NOT NULL,
  after_values jsonb NOT NULL,
  created_at text NOT NULL,
  CONSTRAINT profile_settings_events_profile_revision UNIQUE (profile_id, revision)
);

CREATE FUNCTION protect_profile_settings_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Profile settings events are immutable';
END;
$$;
CREATE TRIGGER profile_settings_event_immutable
  BEFORE UPDATE ON profile_settings_events
  FOR EACH ROW EXECUTE FUNCTION protect_profile_settings_event();
