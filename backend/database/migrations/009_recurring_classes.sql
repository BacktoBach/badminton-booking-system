ALTER TABLE classes ADD COLUMN series_id UUID;
CREATE INDEX classes_series_id_idx ON classes (series_id) WHERE series_id IS NOT NULL;
