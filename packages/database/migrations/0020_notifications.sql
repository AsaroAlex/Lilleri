CREATE TABLE notification_preferences (
  profile_id text PRIMARY KEY,
  household_id text NOT NULL DEFAULT '' REFERENCES households(id),
  values jsonb NOT NULL CHECK(jsonb_typeof(values)='object'),
  revision integer NOT NULL CHECK(revision>0),
  updated_at text NOT NULL,
  FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE
);
CREATE TABLE notifications (
  id text PRIMARY KEY,
  profile_id text NOT NULL,
  household_id text NOT NULL DEFAULT '' REFERENCES households(id),
  kind text NOT NULL CHECK(kind IN ('inbox','consent_reminder','balance_mismatch','connection_expired','connection_paused','summary_ready','security_notice','export_ready','deletion_status','rights_action')),
  text_version text NOT NULL CHECK(text_version='notification-text-v1'),
  dedup_key text NOT NULL CHECK(dedup_key ~ '^[a-f0-9]{64}$'),
  permission_revision integer CHECK(permission_revision>0),
  connection_id text,
  consent_id text,
  source_generation text CHECK(source_generation ~ '^[a-f0-9]{64}$'),
  source_action text CHECK(source_action IN ('renew_consent','perform_sca','renew_session','reconnect')),
  source_deadline text,
  offset_seconds integer CHECK(offset_seconds BETWEEN 1 AND 2592000),
  due_at text NOT NULL,
  status text NOT NULL CHECK(status IN ('queued','delivered','cancelled','suppressed')),
  created_at text NOT NULL,
  delivered_at text,
  seen_at text,
  revision integer NOT NULL CHECK(revision>0),
  UNIQUE(profile_id,id), UNIQUE(profile_id,dedup_key),
  FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
  FOREIGN KEY(profile_id,connection_id) REFERENCES connections(profile_id,id) ON DELETE CASCADE,
  FOREIGN KEY(profile_id,connection_id,consent_id) REFERENCES consents(profile_id,connection_id,id) ON DELETE CASCADE,
  CHECK((kind='consent_reminder' AND connection_id IS NOT NULL AND consent_id IS NOT NULL AND source_generation IS NOT NULL AND source_action IS NOT NULL AND source_deadline IS NOT NULL AND offset_seconds IS NOT NULL)
     OR (kind<>'consent_reminder' AND source_action IS NULL AND source_deadline IS NULL AND offset_seconds IS NULL)),
  CHECK(source_generation IS NULL OR (connection_id IS NOT NULL AND consent_id IS NOT NULL)),
  CHECK((kind IN ('security_notice','export_ready','deletion_status','rights_action') AND permission_revision IS NULL) OR (kind NOT IN ('security_notice','export_ready','deletion_status','rights_action') AND permission_revision IS NOT NULL)),
  CHECK((status='delivered' AND delivered_at IS NOT NULL) OR (status<>'delivered' AND delivered_at IS NULL)),
  CHECK(seen_at IS NULL OR status='delivered')
);
CREATE TABLE notification_events (
  id text PRIMARY KEY,
  profile_id text NOT NULL,
  household_id text NOT NULL DEFAULT '' REFERENCES households(id),
  notification_id text,
  action text NOT NULL CHECK(action IN ('preferences_changed','queued','delivered','cancelled','suppressed','seen')),
  revision integer NOT NULL CHECK(revision>0),
  before_values jsonb,
  after_values jsonb,
  occurred_at text NOT NULL,
  FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
  FOREIGN KEY(profile_id,notification_id) REFERENCES notifications(profile_id,id) ON DELETE CASCADE,
  CHECK((action='preferences_changed' AND notification_id IS NULL AND before_values IS NOT NULL AND after_values IS NOT NULL)
     OR (action<>'preferences_changed' AND notification_id IS NOT NULL AND before_values IS NULL AND after_values IS NULL))
);
CREATE FUNCTION protect_notification_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' AND NOT EXISTS(SELECT 1 FROM profiles WHERE id=OLD.profile_id) THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'Notification history is immutable until profile erasure';
END;
$$;
CREATE TRIGGER notification_event_immutable BEFORE UPDATE OR DELETE ON notification_events
  FOR EACH ROW EXECUTE FUNCTION protect_notification_history();
CREATE FUNCTION protect_notification_state() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.profile_id IS DISTINCT FROM OLD.profile_id OR NEW.household_id IS DISTINCT FROM OLD.household_id
     OR NEW.kind IS DISTINCT FROM OLD.kind OR NEW.text_version IS DISTINCT FROM OLD.text_version OR NEW.dedup_key IS DISTINCT FROM OLD.dedup_key
     OR NEW.permission_revision IS DISTINCT FROM OLD.permission_revision OR NEW.connection_id IS DISTINCT FROM OLD.connection_id OR NEW.consent_id IS DISTINCT FROM OLD.consent_id
     OR NEW.source_generation IS DISTINCT FROM OLD.source_generation OR NEW.source_action IS DISTINCT FROM OLD.source_action
     OR NEW.source_deadline IS DISTINCT FROM OLD.source_deadline OR NEW.offset_seconds IS DISTINCT FROM OLD.offset_seconds
     OR NEW.due_at IS DISTINCT FROM OLD.due_at OR NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.revision<>OLD.revision+1
     OR NOT ((OLD.status='queued' AND NEW.status IN ('delivered','cancelled','suppressed') AND NEW.seen_at IS NULL)
       OR (OLD.status='delivered' AND NEW.status='delivered' AND OLD.seen_at IS NULL AND NEW.seen_at IS NOT NULL AND NEW.delivered_at=OLD.delivered_at)) THEN
    RAISE EXCEPTION 'Notification state transition is unavailable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER notification_state_monotonic BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION protect_notification_state();
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['notification_preferences','notifications','notification_events'] LOOP
    EXECUTE format('CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household()',table_name);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',table_name);
    EXECUTE format('CREATE POLICY trusted_boundary ON %I TO lilleri_trusted USING(true) WITH CHECK(true)',table_name);
    EXECUTE format('CREATE POLICY financial_scope ON %I TO lilleri_runtime USING(household_id=nullif(current_setting(%L,true),%L) AND profile_id=nullif(current_setting(%L,true),%L)) WITH CHECK(household_id=nullif(current_setting(%L,true),%L) AND profile_id=nullif(current_setting(%L,true),%L))',table_name,'app.household_id','','app.profile_id','','app.household_id','','app.profile_id','');
    EXECUTE format('GRANT SELECT,INSERT ON %I TO lilleri_runtime',table_name);
  END LOOP;
END;
$$;
GRANT UPDATE ON notification_preferences,notifications TO lilleri_runtime;
CREATE INDEX notification_queue_profile_due ON notifications(profile_id,status,due_at,id);
