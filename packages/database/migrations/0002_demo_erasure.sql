-- A small tombstone prevents demo bootstrap from undoing an explicit erasure on restart.
CREATE TABLE profile_tombstones (profile_id text PRIMARY KEY, erased_at text NOT NULL);
