CREATE TABLE email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE,
  recipient_email VARCHAR(255) NOT NULL,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lease_until TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  first_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT email_outbox_attempts_check CHECK (attempts >= 0)
);

CREATE INDEX email_outbox_ready_idx ON email_outbox (available_at, created_at)
  WHERE sent_at IS NULL AND failed_at IS NULL;
