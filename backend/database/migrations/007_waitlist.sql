CREATE TABLE class_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'offered', 'accepted', 'cancelled', 'expired')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  offered_at TIMESTAMPTZ,
  offer_expires_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  CONSTRAINT class_waitlist_offer_fields_check CHECK (
    (status = 'offered' AND offered_at IS NOT NULL AND offer_expires_at IS NOT NULL)
    OR status <> 'offered'
  )
);

CREATE UNIQUE INDEX class_waitlist_one_active_per_user_idx
  ON class_waitlist (class_id, user_id) WHERE status IN ('waiting', 'offered');
CREATE INDEX class_waitlist_fifo_idx
  ON class_waitlist (class_id, joined_at, id) WHERE status = 'waiting';
CREATE INDEX class_waitlist_offers_expiry_idx
  ON class_waitlist (offer_expires_at) WHERE status = 'offered';

CREATE OR REPLACE FUNCTION validate_enrollment_capacity()
RETURNS TRIGGER AS $$
DECLARE
  class_capacity INTEGER;
  class_start_date TIMESTAMPTZ;
  enrollment_count INTEGER;
  offered_count INTEGER;
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
  SELECT COUNT(*) INTO offered_count FROM class_waitlist
  WHERE class_id = NEW.class_id AND status = 'offered' AND offer_expires_at > NOW();
  IF enrollment_count + offered_count >= class_capacity THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CLASS_FULL';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_class_capacity_update()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  IF NEW.max_students = OLD.max_students THEN RETURN NEW; END IF;
  SELECT
    (SELECT COUNT(*) FROM enrollments
     WHERE class_id = NEW.id AND (payment_status = 'paid' OR
       (payment_status = 'pending' AND payment_expires_at > NOW())))
    +
    (SELECT COUNT(*) FROM class_waitlist
     WHERE class_id = NEW.id AND status = 'offered' AND offer_expires_at > NOW())
  INTO active_count;
  IF NEW.max_students < active_count THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'CAPACITY_BELOW_CURRENT_ENROLLMENTS',
      CONSTRAINT = 'classes_capacity_not_below_enrollments';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
