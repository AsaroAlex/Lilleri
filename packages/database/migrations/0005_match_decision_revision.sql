-- Preserve existing decisions at revision 1; future commands increment atomically.
ALTER TABLE match_decisions
  ADD COLUMN revision integer NOT NULL DEFAULT 1,
  ADD CONSTRAINT match_decisions_positive_revision CHECK (revision > 0);
