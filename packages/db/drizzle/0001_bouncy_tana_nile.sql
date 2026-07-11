ALTER TYPE "public"."app_role" ADD VALUE 'teacher' BEFORE 'tutor';--> statement-breakpoint
CREATE TABLE "attempt_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_plan_lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"lesson_no" integer NOT NULL,
	"planned_date" timestamp with time zone,
	"title" text NOT NULL,
	"lesson_goal" text,
	"topics_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"task_numbers_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"prototype_ids_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"skill_atoms_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"teacher_notes" text,
	"student_summary" text,
	"status" text DEFAULT 'planned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"version_no" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"learning_track" text NOT NULL,
	"exam_year" integer,
	"target_score" integer,
	"target_grade" text,
	"strategy" text NOT NULL,
	"plan_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mistake_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"attempt_id" uuid,
	"mistake_tag" text NOT NULL,
	"notes_md" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prototypes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prototype_id" text NOT NULL,
	"title" text NOT NULL,
	"task_number" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"assignment_id" uuid,
	"title" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"meeting_url" text,
	"notes_md" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_atoms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"skill_atom" text NOT NULL,
	"title" text NOT NULL,
	"topic" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" text NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"license_status" text DEFAULT 'unknown' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"target_score" integer,
	"target_grade" text,
	"target_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_prototype_mastery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"prototype_id" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"confidence" integer DEFAULT 0 NOT NULL,
	"risk_flag" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_skill_atoms" (
	"task_id" uuid NOT NULL,
	"skill_atom_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_student_links" (
	"teacher_user_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignment_tasks" ADD COLUMN "order_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "assignment_tasks" ADD COLUMN "required" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "description_md" text;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "assignment_id" uuid;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "task_id" uuid;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "attempt_no" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "answer_json" jsonb;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "score_awarded" integer;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "check_status" text DEFAULT 'pending_review' NOT NULL;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "started_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "feedback_md" text;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "mistake_tags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "exam_year" integer;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "current_level" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "target_score" integer;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "target_grade" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "target_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "canonical_hash" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "exam_year" integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "subject" text DEFAULT 'informatics' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "subtopic" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_provider_user_id" text;--> statement-breakpoint
ALTER TABLE "attempt_events" ADD CONSTRAINT "attempt_events_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_plan_lessons" ADD CONSTRAINT "learning_plan_lessons_plan_id_learning_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."learning_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_plans" ADD CONSTRAINT "learning_plans_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mistake_events" ADD CONSTRAINT "mistake_events_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mistake_events" ADD CONSTRAINT "mistake_events_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_goals" ADD CONSTRAINT "student_goals_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_prototype_mastery" ADD CONSTRAINT "student_prototype_mastery_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_skill_atoms" ADD CONSTRAINT "task_skill_atoms_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_skill_atoms" ADD CONSTRAINT "task_skill_atoms_skill_atom_id_skill_atoms_id_fk" FOREIGN KEY ("skill_atom_id") REFERENCES "public"."skill_atoms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_student_links" ADD CONSTRAINT "teacher_student_links_teacher_user_id_users_id_fk" FOREIGN KEY ("teacher_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_student_links" ADD CONSTRAINT "teacher_student_links_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "student_prototype_mastery_idx" ON "student_prototype_mastery" USING btree ("student_id","prototype_id");--> statement-breakpoint
CREATE UNIQUE INDEX "task_skill_atoms_idx" ON "task_skill_atoms" USING btree ("task_id","skill_atom_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_student_links_idx" ON "teacher_student_links" USING btree ("teacher_user_id","student_id");--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;