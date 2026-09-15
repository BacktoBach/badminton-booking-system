CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  token_version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_name_not_blank_check CHECK (LENGTH(BTRIM(name)) >= 2),
  CONSTRAINT users_email_normalized_check CHECK (email = LOWER(BTRIM(email))),
  CONSTRAINT users_role_check CHECK (role IN ('admin', 'user')),
  CONSTRAINT users_token_version_check CHECK (token_version >= 0)
);

CREATE UNIQUE INDEX users_email_lower_unique ON users (LOWER(email));

CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  coach_name VARCHAR(100) NOT NULL,
  level VARCHAR(20) NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  schedule VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  max_students INTEGER NOT NULL,
  created_by_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT classes_title_not_blank_check CHECK (LENGTH(BTRIM(title)) >= 3),
  CONSTRAINT classes_description_not_blank_check CHECK (LENGTH(BTRIM(description)) >= 10),
  CONSTRAINT classes_coach_name_not_blank_check CHECK (LENGTH(BTRIM(coach_name)) >= 2),
  CONSTRAINT classes_schedule_not_blank_check CHECK (LENGTH(BTRIM(schedule)) >= 3),
  CONSTRAINT classes_location_not_blank_check CHECK (LENGTH(BTRIM(location)) >= 3),
  CONSTRAINT classes_level_check CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  CONSTRAINT classes_max_students_check CHECK (max_students BETWEEN 1 AND 500),
  CONSTRAINT classes_created_by_id_fkey
    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX classes_start_date_idx ON classes (start_date);
CREATE INDEX classes_level_start_date_idx ON classes (level, start_date);
CREATE INDEX classes_created_by_id_idx ON classes (created_by_id);
CREATE INDEX classes_title_trgm_idx ON classes USING GIN (title gin_trgm_ops);

CREATE TABLE enrollments (
  class_id UUID NOT NULL,
  user_id UUID NOT NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT enrollments_pkey PRIMARY KEY (class_id, user_id),
  CONSTRAINT enrollments_class_id_fkey
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT enrollments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX enrollments_user_id_enrolled_at_idx ON enrollments (user_id, enrolled_at);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER classes_set_updated_at
BEFORE UPDATE ON classes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION validate_enrollment_capacity()
RETURNS TRIGGER AS $$
DECLARE
  class_capacity INTEGER;
  class_start_date TIMESTAMPTZ;
  enrollment_count INTEGER;
BEGIN
  SELECT max_students, start_date
  INTO class_capacity, class_start_date
  FROM classes
  WHERE id = NEW.class_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF class_start_date <= NOW() THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CLASS_ALREADY_STARTED';
  END IF;

  SELECT COUNT(*)
  INTO enrollment_count
  FROM enrollments
  WHERE class_id = NEW.class_id;

  IF enrollment_count >= class_capacity THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CLASS_FULL';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enrollments_validate_capacity
BEFORE INSERT ON enrollments
FOR EACH ROW EXECUTE FUNCTION validate_enrollment_capacity();

CREATE OR REPLACE FUNCTION validate_class_capacity_update()
RETURNS TRIGGER AS $$
DECLARE
  enrollment_count INTEGER;
BEGIN
  IF NEW.max_students = OLD.max_students THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO enrollment_count
  FROM enrollments
  WHERE class_id = NEW.id;

  IF NEW.max_students < enrollment_count THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'CAPACITY_BELOW_CURRENT_ENROLLMENTS',
      CONSTRAINT = 'classes_capacity_not_below_enrollments';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER classes_validate_capacity_update
BEFORE UPDATE OF max_students ON classes
FOR EACH ROW EXECUTE FUNCTION validate_class_capacity_update();
