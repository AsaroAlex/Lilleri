CREATE TABLE classification_rules (
  id text PRIMARY KEY,
  profile_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  conditions jsonb NOT NULL CHECK (jsonb_typeof(conditions) = 'object'),
  category_id text NOT NULL CHECK (category_id IN ('income','groceries','shopping','food','transport','utilities','subscriptions','health','travel','transfer','uncategorised')),
  priority integer NOT NULL CHECK (priority BETWEEN 0 AND 100),
  enabled text NOT NULL DEFAULT 'no' CHECK (enabled IN ('yes','no')),
  archived text NOT NULL DEFAULT 'no' CHECK (archived IN ('yes','no')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at text NOT NULL,
  updated_at text NOT NULL,
  CONSTRAINT classification_rules_profile_id UNIQUE (profile_id,id),
  CONSTRAINT classification_rules_archived_disabled CHECK (archived = 'no' OR enabled = 'no')
);
CREATE TABLE rule_events (
  id text PRIMARY KEY,
  profile_id text NOT NULL,
  rule_id text NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  action text NOT NULL CHECK (action IN ('created','edited','applied','disabled','archived','undone')),
  before jsonb,
  affected_transaction_ids jsonb NOT NULL CHECK (jsonb_typeof(affected_transaction_ids) = 'array'),
  created_at text NOT NULL,
  CONSTRAINT rule_events_rule_fk FOREIGN KEY (profile_id,rule_id) REFERENCES classification_rules(profile_id,id) ON DELETE CASCADE,
  CONSTRAINT rule_events_revision UNIQUE (profile_id,rule_id,revision)
);
