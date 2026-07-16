CREATE TYPE "public"."access_request_kind" AS ENUM('access', 'guardian', 'student', 'teacher', 'tutor', 'observer');--> statement-breakpoint
CREATE TYPE "public"."access_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."import_job_status" AS ENUM('draft', 'uploaded', 'analyzing', 'review_ready', 'applying', 'applied', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."import_row_status" AS ENUM('pending', 'parsed', 'needs_review', 'ready', 'duplicate', 'applied', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."plan_adjustment_status" AS ENUM('proposed', 'approved', 'rejected', 'applied');--> statement-breakpoint
CREATE TYPE "public"."plan_change_event_status" AS ENUM('pending', 'recorded', 'approved', 'rejected', 'applied');--> statement-breakpoint
CREATE TYPE "public"."plan_change_event_type" AS ENUM('created', 'updated', 'review_requested', 'approved', 'applied', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('draft', 'active', 'superseded', 'archived');--> statement-breakpoint
CREATE TYPE "public"."publication_event_type" AS ENUM('created', 'updated', 'scheduled', 'schedule_cancelled', 'publish_started', 'published', 'delivery_failed', 'retried');--> statement-breakpoint
CREATE TYPE "public"."publication_target_status" AS ENUM('draft', 'active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."publication_target_type" AS ENUM('telegram', 'vk');--> statement-breakpoint
CREATE TYPE "public"."social_delivery_status" AS ENUM('pending', 'scheduled', 'sent', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."social_post_status" AS ENUM('draft', 'scheduled', 'publishing', 'published', 'failed');--> statement-breakpoint
CREATE TYPE "public"."social_post_target_status" AS ENUM('pending', 'scheduled', 'publishing', 'published', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."source_evidence_kind" AS ENUM('document', 'screenshot', 'url', 'note', 'archive');--> statement-breakpoint
CREATE TYPE "public"."source_evidence_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid,
	"requested_by_user_id" uuid,
	"import_kind" text DEFAULT 'task_bank_sync' NOT NULL,
	"status" "import_job_status" DEFAULT 'draft' NOT NULL,
	"dry_run" boolean DEFAULT true NOT NULL,
	"source_type" text,
	"source_url" text,
	"original_filename" text,
	"storage_key" text,
	"input_file_path" text,
	"input_checksum" text,
	"sha256" text,
	"byte_size" integer,
	"content_type" text,
	"license_status" text DEFAULT 'unknown' NOT NULL,
	"parser_version" text,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone,
	"analyzed_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"source_id" uuid,
	"task_id" uuid,
	"row_no" integer NOT NULL,
	"source_row_id" text,
	"source_task_id" text,
	"status" "import_row_status" DEFAULT 'pending' NOT NULL,
	"error_code" text,
	"error_message" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"normalized_task" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid,
	"import_row_id" uuid,
	"task_id" uuid,
	"kind" "source_evidence_kind" NOT NULL,
	"status" "source_evidence_status" DEFAULT 'pending' NOT NULL,
	"label" text NOT NULL,
	"url" text,
	"storage_path" text,
	"storage_key" text,
	"checksum" text,
	"byte_size" integer,
	"content_type" text,
	"license_status" text DEFAULT 'unknown' NOT NULL,
	"parser_version" text,
	"imported_at" timestamp with time zone,
	"captured_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "access_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_subject" text NOT NULL,
	"requested_by_user_id" uuid,
	"target_user_id" uuid,
	"student_id" uuid,
	"request_kind" "access_request_kind" DEFAULT 'access' NOT NULL,
	"requested_role" "app_role",
	"requester_email" text NOT NULL,
	"requester_name" text,
	"relationship_label" text,
	"note_md" text,
	"status" "access_request_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"decision_note_md" text,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"change_event_id" uuid,
	"proposed_by_user_id" uuid,
	"reviewed_by_user_id" uuid,
	"adjustment_type" text NOT NULL,
	"title" text NOT NULL,
	"details_md" text,
	"status" "plan_adjustment_status" DEFAULT 'proposed' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"scheduled_for" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_change_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"event_type" "plan_change_event_type" NOT NULL,
	"status" "plan_change_event_status" DEFAULT 'recorded' NOT NULL,
	"summary" text NOT NULL,
	"diff_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"approved_at" timestamp with time zone,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publication_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"social_post_id" uuid,
	"social_post_target_id" uuid,
	"social_delivery_id" uuid,
	"actor_user_id" uuid,
	"event_type" "publication_event_type" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publication_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"target_type" "publication_target_type" NOT NULL,
	"status" "publication_target_status" DEFAULT 'draft' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"social_post_target_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"attempt_no" integer DEFAULT 1 NOT NULL,
	"provider" text NOT NULL,
	"provider_message_id" text,
	"status" "social_delivery_status" DEFAULT 'pending' NOT NULL,
	"claimed_at" timestamp with time zone,
	"claimed_by" text,
	"next_attempt_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"error_code" text,
	"error_message" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_post_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"social_post_id" uuid NOT NULL,
	"publication_target_id" uuid NOT NULL,
	"post_revision" integer DEFAULT 1 NOT NULL,
	"status" "social_post_target_status" DEFAULT 'pending' NOT NULL,
	"scheduled_for" timestamp with time zone,
	"published_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_user_id" uuid,
	"learning_plan_id" uuid,
	"duplicate_of_post_id" uuid,
	"revision" integer DEFAULT 1 NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"body_md" text NOT NULL,
	"audience" text,
	"content_hash" text,
	"status" "social_post_status" DEFAULT 'draft' NOT NULL,
	"scheduled_for" timestamp with time zone,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"publish_allowed" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "time_spent_sec" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_plans" ADD COLUMN "goal_summary" text;--> statement-breakpoint
ALTER TABLE "learning_plans" ADD COLUMN "deadline" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "learning_plans" ADD COLUMN "sessions_per_week" integer;--> statement-breakpoint
ALTER TABLE "learning_plans" ADD COLUMN "session_duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "learning_plans" ADD COLUMN "rationale" text;--> statement-breakpoint
ALTER TABLE "learning_plans" ADD COLUMN "version_status" "plan_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_plans" ADD COLUMN "revision_of_plan_id" uuid;--> statement-breakpoint
ALTER TABLE "learning_plans" ADD COLUMN "is_latest" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_plans" ADD COLUMN "published_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "learning_plans" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "learning_plans" ADD COLUMN "superseded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "learning_plans" ADD COLUMN "change_summary" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "blocked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "blocked_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "block_reason" text;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_job_id_import_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."import_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_evidence" ADD CONSTRAINT "source_evidence_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_evidence" ADD CONSTRAINT "source_evidence_import_row_id_import_rows_id_fk" FOREIGN KEY ("import_row_id") REFERENCES "public"."import_rows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_evidence" ADD CONSTRAINT "source_evidence_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_adjustments" ADD CONSTRAINT "plan_adjustments_plan_id_learning_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."learning_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_adjustments" ADD CONSTRAINT "plan_adjustments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_adjustments" ADD CONSTRAINT "plan_adjustments_change_event_id_plan_change_events_id_fk" FOREIGN KEY ("change_event_id") REFERENCES "public"."plan_change_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_adjustments" ADD CONSTRAINT "plan_adjustments_proposed_by_user_id_users_id_fk" FOREIGN KEY ("proposed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_adjustments" ADD CONSTRAINT "plan_adjustments_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_change_events" ADD CONSTRAINT "plan_change_events_plan_id_learning_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."learning_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_change_events" ADD CONSTRAINT "plan_change_events_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_change_events" ADD CONSTRAINT "plan_change_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_events" ADD CONSTRAINT "publication_events_social_post_id_social_posts_id_fk" FOREIGN KEY ("social_post_id") REFERENCES "public"."social_posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_events" ADD CONSTRAINT "publication_events_social_post_target_id_social_post_targets_id_fk" FOREIGN KEY ("social_post_target_id") REFERENCES "public"."social_post_targets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_events" ADD CONSTRAINT "publication_events_social_delivery_id_social_deliveries_id_fk" FOREIGN KEY ("social_delivery_id") REFERENCES "public"."social_deliveries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_events" ADD CONSTRAINT "publication_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_deliveries" ADD CONSTRAINT "social_deliveries_social_post_target_id_social_post_targets_id_fk" FOREIGN KEY ("social_post_target_id") REFERENCES "public"."social_post_targets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_post_targets" ADD CONSTRAINT "social_post_targets_social_post_id_social_posts_id_fk" FOREIGN KEY ("social_post_id") REFERENCES "public"."social_posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_post_targets" ADD CONSTRAINT "social_post_targets_publication_target_id_publication_targets_id_fk" FOREIGN KEY ("publication_target_id") REFERENCES "public"."publication_targets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_learning_plan_id_learning_plans_id_fk" FOREIGN KEY ("learning_plan_id") REFERENCES "public"."learning_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_duplicate_of_post_id_social_posts_id_fk" FOREIGN KEY ("duplicate_of_post_id") REFERENCES "public"."social_posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_jobs_source_status_idx" ON "import_jobs" USING btree ("source_id","status");--> statement-breakpoint
CREATE INDEX "import_jobs_status_created_idx" ON "import_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "import_rows_job_row_idx" ON "import_rows" USING btree ("job_id","row_no");--> statement-breakpoint
CREATE INDEX "import_rows_status_idx" ON "import_rows" USING btree ("status");--> statement-breakpoint
CREATE INDEX "import_rows_source_task_idx" ON "import_rows" USING btree ("source_id","source_task_id");--> statement-breakpoint
CREATE INDEX "source_evidence_source_kind_idx" ON "source_evidence" USING btree ("source_id","kind");--> statement-breakpoint
CREATE INDEX "source_evidence_row_idx" ON "source_evidence" USING btree ("import_row_id");--> statement-breakpoint
CREATE INDEX "source_evidence_task_status_idx" ON "source_evidence" USING btree ("task_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "access_requests_clerk_subject_idx" ON "access_requests" USING btree ("clerk_subject");--> statement-breakpoint
CREATE INDEX "access_requests_requester_email_idx" ON "access_requests" USING btree ("requester_email");--> statement-breakpoint
CREATE INDEX "access_requests_student_status_idx" ON "access_requests" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "access_requests_pending_idx" ON "access_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "plan_adjustments_plan_status_idx" ON "plan_adjustments" USING btree ("plan_id","status");--> statement-breakpoint
CREATE INDEX "plan_adjustments_student_status_idx" ON "plan_adjustments" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "plan_adjustments_event_idx" ON "plan_adjustments" USING btree ("change_event_id");--> statement-breakpoint
CREATE INDEX "plan_change_events_plan_created_idx" ON "plan_change_events" USING btree ("plan_id","created_at");--> statement-breakpoint
CREATE INDEX "plan_change_events_student_status_idx" ON "plan_change_events" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "publication_events_post_created_idx" ON "publication_events" USING btree ("social_post_id","created_at");--> statement-breakpoint
CREATE INDEX "publication_events_target_created_idx" ON "publication_events" USING btree ("social_post_target_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "publication_targets_slug_idx" ON "publication_targets" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "publication_targets_type_status_idx" ON "publication_targets" USING btree ("target_type","status");--> statement-breakpoint
CREATE UNIQUE INDEX "social_deliveries_target_attempt_idx" ON "social_deliveries" USING btree ("social_post_target_id","attempt_no");--> statement-breakpoint
CREATE UNIQUE INDEX "social_deliveries_idempotency_key_idx" ON "social_deliveries" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "social_deliveries_status_idx" ON "social_deliveries" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "social_post_targets_post_target_revision_idx" ON "social_post_targets" USING btree ("social_post_id","publication_target_id","post_revision");--> statement-breakpoint
CREATE INDEX "social_post_targets_status_scheduled_idx" ON "social_post_targets" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "social_posts_status_scheduled_idx" ON "social_posts" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "social_posts_learning_plan_idx" ON "social_posts" USING btree ("learning_plan_id");--> statement-breakpoint
ALTER TABLE "learning_plans" ADD CONSTRAINT "learning_plans_revision_of_plan_id_learning_plans_id_fk" FOREIGN KEY ("revision_of_plan_id") REFERENCES "public"."learning_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_plans" ADD CONSTRAINT "learning_plans_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_blocked_by_user_id_users_id_fk" FOREIGN KEY ("blocked_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attempts_assignment_task_attempt_no_idx" ON "attempts" USING btree ("assignment_task_id","attempt_no");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_plan_lessons_plan_lesson_no_idx" ON "learning_plan_lessons" USING btree ("plan_id","lesson_no");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_plans_student_version_idx" ON "learning_plans" USING btree ("student_id","version_no");--> statement-breakpoint
CREATE INDEX "learning_plans_latest_idx" ON "learning_plans" USING btree ("student_id","is_latest");--> statement-breakpoint
CREATE INDEX "learning_plans_revision_idx" ON "learning_plans" USING btree ("revision_of_plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prototypes_prototype_id_idx" ON "prototypes" USING btree ("prototype_id");--> statement-breakpoint
CREATE INDEX "schedule_events_student_starts_idx" ON "schedule_events" USING btree ("student_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "skill_atoms_skill_atom_idx" ON "skill_atoms" USING btree ("skill_atom");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_source_id_idx" ON "sources" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "sources_license_idx" ON "sources" USING btree ("license_status");--> statement-breakpoint
CREATE INDEX "tasks_canonical_hash_idx" ON "tasks" USING btree ("canonical_hash");--> statement-breakpoint
CREATE INDEX "tasks_source_lookup_idx" ON "tasks" USING btree ("source_name","source_task_id");--> statement-breakpoint
CREATE INDEX "tasks_track_exam_number_idx" ON "tasks" USING btree ("learning_track","exam","task_number");