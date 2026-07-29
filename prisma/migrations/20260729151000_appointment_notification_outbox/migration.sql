-- Appointment notification outbox. Deploy with OPERATIONAL_EMAIL_NOTIFICATIONS_ENABLED=false.
ALTER TABLE "salons"
  ADD COLUMN "owner_email_notifications_enabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "appointments"
  ADD COLUMN "notification_revision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "schedule_revision" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "appointment_notification_events" (
  "id" TEXT NOT NULL,
  "salon_id" TEXT NOT NULL,
  "appointment_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "event_key" TEXT NOT NULL,
  "schedule_revision" INTEGER,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "appointment_notification_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "appointment_notification_events_type_check"
    CHECK ("type" IN ('created', 'cancelled', 'rescheduled', 'reminder_24h')),
  CONSTRAINT "appointment_notification_events_status_check"
    CHECK ("status" IN ('pending', 'processing', 'completed', 'partial_failed'))
);

CREATE TABLE "appointment_notification_deliveries" (
  "id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "roles" TEXT[] NOT NULL,
  "recipient_email" TEXT,
  "recipient_masked" TEXT,
  "recipient_key" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "result_code" TEXT,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "started_at" TIMESTAMP(3),
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "appointment_notification_deliveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "appointment_notification_deliveries_roles_check"
    CHECK (cardinality("roles") > 0 AND "roles" <@ ARRAY['client', 'owner', 'specialist']::TEXT[]),
  CONSTRAINT "appointment_notification_deliveries_status_check"
    CHECK ("status" IN ('pending', 'sending', 'sent', 'skipped', 'failed')),
  CONSTRAINT "appointment_notification_deliveries_attempt_count_check"
    CHECK ("attempt_count" >= 0),
  CONSTRAINT "appointment_notification_deliveries_final_email_check"
    CHECK ("status" IN ('pending', 'sending') OR "recipient_email" IS NULL)
);

CREATE UNIQUE INDEX "appointments_id_salon_id_key"
  ON "appointments"("id", "salon_id");
CREATE UNIQUE INDEX "appointment_notification_events_event_key_key"
  ON "appointment_notification_events"("event_key");
CREATE INDEX "appointment_notification_events_status_available_at_idx"
  ON "appointment_notification_events"("status", "available_at");
CREATE INDEX "appointment_notification_events_salon_id_created_at_idx"
  ON "appointment_notification_events"("salon_id", "created_at");
CREATE INDEX "appointment_notification_events_appointment_id_created_at_idx"
  ON "appointment_notification_events"("appointment_id", "created_at");

CREATE UNIQUE INDEX "appointment_notification_deliveries_event_id_recipient_key_key"
  ON "appointment_notification_deliveries"("event_id", "recipient_key");
CREATE INDEX "appointment_notification_deliveries_status_created_at_idx"
  ON "appointment_notification_deliveries"("status", "created_at");
CREATE INDEX "appointment_notification_deliveries_event_id_idx"
  ON "appointment_notification_deliveries"("event_id");

ALTER TABLE "appointment_notification_events"
  ADD CONSTRAINT "appointment_notification_events_salon_id_fkey"
  FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointment_notification_events"
  ADD CONSTRAINT "appointment_notification_events_appointment_id_salon_id_fkey"
  FOREIGN KEY ("appointment_id", "salon_id") REFERENCES "appointments"("id", "salon_id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointment_notification_deliveries"
  ADD CONSTRAINT "appointment_notification_deliveries_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "appointment_notification_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
