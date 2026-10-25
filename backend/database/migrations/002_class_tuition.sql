ALTER TABLE classes
  ADD COLUMN tuition_vnd INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT classes_tuition_vnd_check CHECK (tuition_vnd BETWEEN 0 AND 2000000000);
