ALTER TABLE classes
  ADD COLUMN cancelled_at TIMESTAMPTZ;

ALTER TABLE enrollments
  ADD COLUMN refund_status TEXT,
  ADD COLUMN refund_reference TEXT,
  ADD COLUMN refunded_at TIMESTAMPTZ,
  ADD COLUMN refunded_by UUID REFERENCES users(id),
  ADD CONSTRAINT enrollments_refund_status_check
    CHECK (refund_status IN ('pending', 'refunded'));

CREATE INDEX enrollments_pending_refunds_idx ON enrollments (class_id)
  WHERE refund_status = 'pending';

CREATE OR REPLACE FUNCTION reject_cancelled_class_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR NEW.payment_status IN ('paid', 'pending'))
     AND EXISTS (SELECT 1 FROM classes WHERE id = NEW.class_id AND cancelled_at IS NOT NULL) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CLASS_CANCELLED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enrollments_reject_cancelled_class
BEFORE INSERT OR UPDATE OF payment_status ON enrollments
FOR EACH ROW EXECUTE FUNCTION reject_cancelled_class_enrollment();
