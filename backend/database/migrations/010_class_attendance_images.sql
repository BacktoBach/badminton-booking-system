ALTER TABLE classes
  ADD COLUMN image_url TEXT,
  ADD COLUMN image_public_id TEXT;

CREATE TABLE class_attendance (
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (class_id, user_id),
  FOREIGN KEY (class_id, user_id) REFERENCES enrollments(class_id, user_id) ON DELETE CASCADE
);
