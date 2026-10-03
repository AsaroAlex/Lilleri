ALTER TABLE mapped_import_provenance
  ADD COLUMN file_format text,
  ADD COLUMN workbook_digest text,
  ADD COLUMN worksheet text,
  ADD COLUMN header_row integer,
  ADD CONSTRAINT mapped_workbook_origin CHECK (
    (file_format IS NULL AND workbook_digest IS NULL AND worksheet IS NULL AND header_row IS NULL)
    OR (file_format IS NOT NULL AND file_format = 'xlsx'
      AND workbook_digest IS NOT NULL AND workbook_digest ~ '^[a-f0-9]{64}$'
      AND worksheet IS NOT NULL AND length(worksheet) BETWEEN 1 AND 128
      AND header_row IS NOT NULL AND header_row BETWEEN 1 AND 100
      AND row_number > header_row AND row_number <= 1100)
  );
