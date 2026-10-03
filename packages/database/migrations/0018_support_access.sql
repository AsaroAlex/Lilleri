-- Local masked diagnostics only. No emergency financial-content bypass is enabled.
CREATE TABLE support_access_grants (
  id text PRIMARY KEY,
  household_id text NOT NULL DEFAULT '' REFERENCES households(id),
  profile_id text NOT NULL,
  ticket_id text NOT NULL CHECK (ticket_id ~ '^TKT_[A-Z0-9]{8,32}$'),
  reason text NOT NULL CHECK (reason IN ('sync_issue','data_rights','security_issue')),
  granted_at text NOT NULL,
  expires_at text NOT NULL,
  revoked_at text,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  UNIQUE(profile_id,id),
  FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
  CHECK(expires_at::timestamptz > granted_at::timestamptz AND expires_at::timestamptz <= granted_at::timestamptz + interval '15 minutes')
);
CREATE TABLE support_access_requests (
  id text PRIMARY KEY,
  household_id text NOT NULL DEFAULT '' REFERENCES households(id),
  profile_id text NOT NULL,
  grant_id text NOT NULL,
  requested_by text NOT NULL CHECK(requested_by ~ '^op_[a-f0-9]{32}$'),
  reason text NOT NULL CHECK(reason IN ('service_outage','security_incident')),
  requested_at text NOT NULL,
  expires_at text NOT NULL,
  UNIQUE(profile_id,id),
  FOREIGN KEY(profile_id,grant_id) REFERENCES support_access_grants(profile_id,id) ON DELETE CASCADE,
  FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
  CHECK(expires_at::timestamptz > requested_at::timestamptz AND expires_at::timestamptz <= requested_at::timestamptz + interval '15 minutes')
);
CREATE TABLE support_access_approvals (
  id text PRIMARY KEY,
  household_id text NOT NULL DEFAULT '' REFERENCES households(id),
  profile_id text NOT NULL,
  request_id text NOT NULL,
  approved_by text NOT NULL CHECK(approved_by ~ '^op_[a-f0-9]{32}$'),
  approved_at text NOT NULL,
  UNIQUE(profile_id,request_id,approved_by),
  FOREIGN KEY(profile_id,request_id) REFERENCES support_access_requests(profile_id,id) ON DELETE CASCADE,
  FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE
);
CREATE TABLE support_access_events (
  id text PRIMARY KEY,
  household_id text NOT NULL DEFAULT '' REFERENCES households(id),
  profile_id text NOT NULL,
  grant_id text NOT NULL,
  request_id text,
  action text NOT NULL CHECK(action IN ('granted','revoked','break_glass_requested','break_glass_approved','masked_view_read','break_glass_read')),
  actor_kind text NOT NULL CHECK(actor_kind IN ('user','operator')),
  operator_id text CHECK(operator_id ~ '^op_[a-f0-9]{32}$'),
  occurred_at text NOT NULL,
  FOREIGN KEY(profile_id,grant_id) REFERENCES support_access_grants(profile_id,id) ON DELETE CASCADE,
  FOREIGN KEY(profile_id,request_id) REFERENCES support_access_requests(profile_id,id) ON DELETE CASCADE,
  FOREIGN KEY(household_id,profile_id) REFERENCES profiles(household_id,id) ON DELETE CASCADE,
  CHECK((actor_kind='user' AND operator_id IS NULL AND action IN ('granted','revoked')) OR (actor_kind='operator' AND operator_id IS NOT NULL AND action NOT IN ('granted','revoked')))
);

CREATE FUNCTION protect_support_access_grant() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.profile_id IS DISTINCT FROM OLD.profile_id
     OR NEW.household_id IS DISTINCT FROM OLD.household_id OR NEW.ticket_id IS DISTINCT FROM OLD.ticket_id
     OR NEW.reason IS DISTINCT FROM OLD.reason OR NEW.granted_at IS DISTINCT FROM OLD.granted_at
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at OR OLD.revoked_at IS NOT NULL
     OR NEW.revoked_at IS NULL OR NEW.revision <> OLD.revision + 1 THEN
    RAISE EXCEPTION 'Support grants only permit one audited revocation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER support_access_grant_revoke_only BEFORE UPDATE ON support_access_grants
  FOR EACH ROW EXECUTE FUNCTION protect_support_access_grant();

CREATE FUNCTION protect_support_access_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND NOT EXISTS(SELECT 1 FROM profiles WHERE id=OLD.profile_id) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Support access history is immutable outside profile erasure';
END;
$$;
CREATE TRIGGER support_request_immutable BEFORE UPDATE OR DELETE ON support_access_requests
  FOR EACH ROW EXECUTE FUNCTION protect_support_access_history();
CREATE TRIGGER support_approval_immutable BEFORE UPDATE OR DELETE ON support_access_approvals
  FOR EACH ROW EXECUTE FUNCTION protect_support_access_history();
CREATE TRIGGER support_event_immutable BEFORE UPDATE OR DELETE ON support_access_events
  FOR EACH ROW EXECUTE FUNCTION protect_support_access_history();

CREATE FUNCTION validate_support_approval() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE requested support_access_requests; grant_record support_access_grants; approval_count integer;
BEGIN
  SELECT * INTO requested FROM support_access_requests WHERE profile_id=NEW.profile_id AND id=NEW.request_id FOR UPDATE;
  SELECT * INTO grant_record FROM support_access_grants WHERE profile_id=requested.profile_id AND id=requested.grant_id;
  IF requested.id IS NULL OR requested.requested_by=NEW.approved_by
     OR grant_record.revoked_at IS NOT NULL
     OR NEW.approved_at::timestamptz >= requested.expires_at::timestamptz
     OR NEW.approved_at::timestamptz >= grant_record.expires_at::timestamptz THEN
    RAISE EXCEPTION 'Support approval is unavailable';
  END IF;
  SELECT count(*) INTO approval_count FROM support_access_approvals WHERE profile_id=NEW.profile_id AND request_id=NEW.request_id;
  IF approval_count >= 2 THEN RAISE EXCEPTION 'Support approval already complete'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER support_approval_validation BEFORE INSERT ON support_access_approvals
  FOR EACH ROW EXECUTE FUNCTION validate_support_approval();

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['support_access_grants','support_access_requests','support_access_approvals','support_access_events'] LOOP
    EXECUTE format('CREATE TRIGGER reserved_household BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION enforce_reserved_household()',table_name);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',table_name);
    EXECUTE format('CREATE POLICY trusted_boundary ON %I TO lilleri_trusted USING(true) WITH CHECK(true)',table_name);
    EXECUTE format('CREATE POLICY financial_scope ON %I TO lilleri_runtime USING(household_id=nullif(current_setting(%L,true),%L) AND profile_id=nullif(current_setting(%L,true),%L)) WITH CHECK(household_id=nullif(current_setting(%L,true),%L) AND profile_id=nullif(current_setting(%L,true),%L))',table_name,'app.household_id','','app.profile_id','','app.household_id','','app.profile_id','');
    EXECUTE format('GRANT SELECT ON %I TO lilleri_runtime',table_name);
  END LOOP;
END;
$$;
GRANT INSERT,UPDATE ON support_access_grants TO lilleri_runtime;
-- User audit INSERT is restricted separately. Operators use the trusted boundary, never HTTP.
CREATE POLICY user_event_insert ON support_access_events FOR INSERT TO lilleri_runtime
  WITH CHECK(actor_kind='user' AND operator_id IS NULL AND action IN ('granted','revoked')
    AND household_id=nullif(current_setting('app.household_id',true),'')
    AND profile_id=nullif(current_setting('app.profile_id',true),''));
-- A permissive general policy would bypass the INSERT actor restriction; replace it with SELECT only.
DROP POLICY financial_scope ON support_access_events;
CREATE POLICY financial_scope ON support_access_events FOR SELECT TO lilleri_runtime
  USING(household_id=nullif(current_setting('app.household_id',true),'') AND profile_id=nullif(current_setting('app.profile_id',true),''));
GRANT INSERT ON support_access_events TO lilleri_runtime;
