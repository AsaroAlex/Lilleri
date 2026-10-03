-- Local immutable history belongs to its exact FK parent. Ordinary revocation,
-- archiving and user commands keep history; actual parent erasure cascades it.
-- The nested-trigger guard admits FK cascades, never direct child-table DELETE.
-- Existing privileges, FORCE RLS and composite scope constraints stay in force.

CREATE OR REPLACE FUNCTION protect_consent_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    IF NOT EXISTS(SELECT 1 FROM profiles WHERE id = OLD.profile_id)
       OR NOT EXISTS(SELECT 1 FROM connections WHERE profile_id = OLD.profile_id AND id = OLD.connection_id)
       OR NOT EXISTS(SELECT 1 FROM consents WHERE profile_id = OLD.profile_id AND connection_id = OLD.connection_id AND id = OLD.consent_id) THEN
      RETURN OLD;
    END IF;
  END IF;
  RAISE EXCEPTION 'Consent events are append-only outside parent erasure';
END;
$$;

CREATE OR REPLACE FUNCTION protect_notification_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    IF NOT EXISTS(SELECT 1 FROM profiles WHERE id = OLD.profile_id) THEN RETURN OLD; END IF;
    IF OLD.notification_id IS NOT NULL AND
       NOT EXISTS(SELECT 1 FROM notifications WHERE profile_id = OLD.profile_id AND id = OLD.notification_id) THEN
      RETURN OLD;
    END IF;
  END IF;
  RAISE EXCEPTION 'Notification history is immutable outside parent erasure';
END;
$$;

CREATE OR REPLACE FUNCTION protect_csv_mapping_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    IF NOT EXISTS(SELECT 1 FROM profiles WHERE id = OLD.profile_id) THEN RETURN OLD; END IF;
    IF TG_TABLE_NAME = 'csv_mapping_events' THEN
      IF NOT EXISTS(SELECT 1 FROM saved_csv_mappings WHERE profile_id = OLD.profile_id AND account_id = OLD.account_id AND id = OLD.mapping_id) THEN
        RETURN OLD;
      END IF;
    ELSIF TG_TABLE_NAME = 'mapped_import_provenance' THEN
      IF NOT EXISTS(SELECT 1 FROM source_observations WHERE profile_id = OLD.profile_id AND id = OLD.observation_id)
         OR NOT EXISTS(SELECT 1 FROM transactions WHERE profile_id = OLD.profile_id AND account_id = OLD.account_id AND id = OLD.transaction_id) THEN
        RETURN OLD;
      END IF;
    END IF;
  END IF;
  RAISE EXCEPTION 'CSV import history is append-only outside parent erasure';
END;
$$;
