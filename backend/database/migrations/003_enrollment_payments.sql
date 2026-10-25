ALTER TABLE enrollments
  ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'paid',
  ADD COLUMN amount_vnd INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN payment_code TEXT,
  ADD COLUMN payment_expires_at TIMESTAMPTZ,
  ADD COLUMN paid_at TIMESTAMPTZ,
  ADD COLUMN provider_reference TEXT,
  ADD CONSTRAINT enrollments_payment_status_check
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'expired', 'needs_review', 'cancelled')),
  ADD CONSTRAINT enrollments_amount_vnd_check CHECK (amount_vnd BETWEEN 0 AND 2000000000),
  ADD CONSTRAINT enrollments_pending_details_check CHECK (
    payment_status <> 'pending' OR
    (amount_vnd > 0 AND payment_code IS NOT NULL AND payment_expires_at IS NOT NULL)
  );

UPDATE enrollments SET paid_at = enrolled_at WHERE payment_status = 'paid';

CREATE UNIQUE INDEX enrollments_payment_code_unique
  ON enrollments (payment_code) WHERE payment_code IS NOT NULL;
CREATE INDEX enrollments_active_reservations_idx
  ON enrollments (class_id, payment_expires_at)
  WHERE payment_status = 'pending';

CREATE TABLE sepay_events (
  provider_event_id BIGINT PRIMARY KEY,
  payment_code TEXT,
  amount_vnd BIGINT NOT NULL,
  account_number TEXT NOT NULL,
  content TEXT NOT NULL,
  reference_code TEXT,
  outcome TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sepay_events_amount_check CHECK (amount_vnd > 0)
);

CREATE INDEX sepay_events_outcome_idx ON sepay_events (outcome, received_at);

CREATE OR REPLACE FUNCTION validate_enrollment_capacity()
RETURNS TRIGGER AS $$
DECLARE
  class_capacity INTEGER;
  class_start_date TIMESTAMPTZ;
  enrollment_count INTEGER;
BEGIN
  SELECT max_students, start_date INTO class_capacity, class_start_date
  FROM classes WHERE id = NEW.class_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF class_start_date <= NOW() THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CLASS_ALREADY_STARTED';
  END IF;
  IF NEW.payment_status NOT IN ('paid', 'pending') OR
     (NEW.payment_status = 'pending' AND NEW.payment_expires_at <= NOW()) THEN
    RETURN NEW;
  END IF;
  SELECT COUNT(*) INTO enrollment_count FROM enrollments
  WHERE class_id = NEW.class_id
    AND (payment_status = 'paid' OR
         (payment_status = 'pending' AND payment_expires_at > NOW()))
    AND (TG_OP = 'INSERT' OR user_id <> NEW.user_id);
  IF enrollment_count >= class_capacity THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CLASS_FULL';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER enrollments_validate_capacity ON enrollments;
CREATE TRIGGER enrollments_validate_capacity
BEFORE INSERT OR UPDATE OF payment_status, payment_expires_at ON enrollments
FOR EACH ROW EXECUTE FUNCTION validate_enrollment_capacity();

CREATE OR REPLACE FUNCTION validate_class_capacity_update()
RETURNS TRIGGER AS $$
DECLARE enrollment_count INTEGER;
BEGIN
  IF NEW.max_students = OLD.max_students THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO enrollment_count FROM enrollments
  WHERE class_id = NEW.id
    AND (payment_status = 'paid' OR
         (payment_status = 'pending' AND payment_expires_at > NOW()));
  IF NEW.max_students < enrollment_count THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'CAPACITY_BELOW_CURRENT_ENROLLMENTS',
      CONSTRAINT = 'classes_capacity_not_below_enrollments';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
