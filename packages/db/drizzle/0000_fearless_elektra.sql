CREATE TYPE "public"."app_role" AS ENUM('owner', 'tutor', 'student', 'guardian');--> statement-breakpoint
CREATE TYPE "public"."assignment_status" AS ENUM('draft', 'assigned', 'submitted', 'reviewed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."attempt_status" AS ENUM('started', 'submitted', 'checked', 'needs_review');--> statement-breakpoint
CREATE TYPE "public"."consent_status" AS ENUM('granted', 'pending', 'revoked', 'not_required');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'converted', 'closed');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('active', 'draft', 'archived', 'needs_review');--> statement-breakpoint
CREATE TABLE "assignment_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"points" integer DEFAULT 1 NOT NULL,
	"reveal_answer_after_submit" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tutor_user_id" uuid,
	"title" text NOT NULL,
	"status" "assignment_status" DEFAULT 'draft' NOT NULL,
	"due_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_task_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"submitted_answer" text,
	"is_correct" boolean,
	"status" "attempt_status" DEFAULT 'started' NOT NULL,
	"checked_by_user_id" uuid,
	"submitted_at" timestamp with time zone,
	"checked_at" timestamp with time zone,
	"feedback" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"subject_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"role" "app_role" DEFAULT 'student' NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"invited_by_user_id" uuid,
	"accepted_by_user_id" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"contact" text NOT NULL,
	"source" text DEFAULT 'telegram' NOT NULL,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tutor_user_id" uuid,
	"title" text NOT NULL,
	"starts_at" timestamp with time zone,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"notes" text,
	"status" text DEFAULT 'planned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"consent_status" "consent_status" DEFAULT 'pending' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_mastery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"skill_atom" text NOT NULL,
	"prototype_id" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"level" text DEFAULT 'new' NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"tutor_user_id" uuid,
	"public_code" text NOT NULL,
	"display_name" text NOT NULL,
	"learning_track" text NOT NULL,
	"goal_summary" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" text NOT NULL,
	"learning_track" text NOT NULL,
	"exam" text,
	"task_number" text,
	"topic" text,
	"prototype_id" text,
	"skill_atoms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"difficulty_level" text DEFAULT 'unknown' NOT NULL,
	"source_name" text NOT NULL,
	"source_url" text,
	"source_task_id" text,
	"statement_md" text NOT NULL,
	"answer_json" jsonb,
	"answer_hash" text,
	"solution_md" text,
	"verification_status" text DEFAULT 'unknown' NOT NULL,
	"license_status" text DEFAULT 'unknown' NOT NULL,
	"status" "task_status" DEFAULT 'draft' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"role" "app_role" DEFAULT 'student' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignment_tasks" ADD CONSTRAINT "assignment_tasks_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_tasks" ADD CONSTRAINT "assignment_tasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_tutor_user_id_users_id_fk" FOREIGN KEY ("tutor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_assignment_task_id_assignment_tasks_id_fk" FOREIGN KEY ("assignment_task_id") REFERENCES "public"."assignment_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_checked_by_user_id_users_id_fk" FOREIGN KEY ("checked_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_subject_user_id_users_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_tutor_user_id_users_id_fk" FOREIGN KEY ("tutor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_results" ADD CONSTRAINT "public_results_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_mastery" ADD CONSTRAINT "skill_mastery_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_tutor_user_id_users_id_fk" FOREIGN KEY ("tutor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assignment_tasks_assignment_position_idx" ON "assignment_tasks" USING btree ("assignment_id","position");--> statement-breakpoint
CREATE INDEX "assignments_student_status_idx" ON "assignments" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "attempts_student_idx" ON "attempts" USING btree ("student_id","submitted_at");--> statement-breakpoint
CREATE INDEX "audit_events_action_idx" ON "audit_events" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "invitations_email_status_idx" ON "invitations" USING btree ("email","status");--> statement-breakpoint
CREATE INDEX "leads_contact_idx" ON "leads" USING btree ("contact");--> statement-breakpoint
CREATE INDEX "lessons_student_starts_idx" ON "lessons" USING btree ("student_id","starts_at");--> statement-breakpoint
CREATE INDEX "public_results_published_idx" ON "public_results" USING btree ("published","consent_status");--> statement-breakpoint
CREATE UNIQUE INDEX "skill_mastery_student_skill_idx" ON "skill_mastery" USING btree ("student_id","skill_atom");--> statement-breakpoint
CREATE UNIQUE INDEX "students_public_code_idx" ON "students" USING btree ("public_code");--> statement-breakpoint
CREATE INDEX "students_tutor_idx" ON "students" USING btree ("tutor_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_task_id_idx" ON "tasks" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "tasks_prototype_idx" ON "tasks" USING btree ("learning_track","prototype_id");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_user_id_idx" ON "users" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");