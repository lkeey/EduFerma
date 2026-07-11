CREATE TABLE "telegram_broadcast_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscriber_id" uuid NOT NULL,
	"broadcast_key" text NOT NULL,
	"chat_id" text NOT NULL,
	"message_text" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"provider_message_id" text,
	"last_error_code" text,
	"last_error_message" text,
	"sent_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_user_id" text NOT NULL,
	"chat_id" text NOT NULL,
	"chat_type" text DEFAULT 'private' NOT NULL,
	"username" text,
	"first_name" text,
	"last_name" text,
	"language_code" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	"last_start_at" timestamp with time zone,
	"last_command_at" timestamp with time zone,
	"source" text DEFAULT 'telegram_start' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "telegram_broadcast_outbox" ADD CONSTRAINT "telegram_broadcast_outbox_subscriber_id_telegram_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."telegram_subscribers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_broadcast_outbox_subscriber_broadcast_idx" ON "telegram_broadcast_outbox" USING btree ("subscriber_id","broadcast_key");--> statement-breakpoint
CREATE INDEX "telegram_broadcast_outbox_status_idx" ON "telegram_broadcast_outbox" USING btree ("status");--> statement-breakpoint
CREATE INDEX "telegram_broadcast_outbox_chat_idx" ON "telegram_broadcast_outbox" USING btree ("chat_id");--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_subscribers_chat_id_idx" ON "telegram_subscribers" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "telegram_subscribers_user_idx" ON "telegram_subscribers" USING btree ("telegram_user_id");--> statement-breakpoint
CREATE INDEX "telegram_subscribers_active_idx" ON "telegram_subscribers" USING btree ("is_active");