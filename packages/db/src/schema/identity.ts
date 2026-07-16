import { AnyPgColumn, boolean, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { appRole, invitationStatus, leadStatus, timestamps } from "./shared";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id"),
    authProviderUserId: text("auth_provider_user_id"),
    email: text("email").notNull(),
    displayName: text("display_name"),
    role: appRole("role").notNull().default("student"),
    isActive: boolean("is_active").notNull().default(true),
    blockedAt: timestamp("blocked_at", { withTimezone: true }),
    blockedByUserId: uuid("blocked_by_user_id").references((): AnyPgColumn => users.id),
    blockReason: text("block_reason"),
    ...timestamps
  },
  (table) => ({
    clerkUserIdIdx: uniqueIndex("users_clerk_user_id_idx").on(table.clerkUserId),
    emailIdx: uniqueIndex("users_email_idx").on(table.email)
  })
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    role: appRole("role").notNull().default("student"),
    status: invitationStatus("status").notNull().default("pending"),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id),
    acceptedByUserId: uuid("accepted_by_user_id").references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => ({
    emailStatusIdx: index("invitations_email_status_idx").on(table.email, table.status)
  })
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    subjectUserId: uuid("subject_user_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    actionIdx: index("audit_events_action_idx").on(table.action, table.createdAt)
  })
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name"),
    contact: text("contact").notNull(),
    source: text("source").notNull().default("telegram"),
    status: leadStatus("status").notNull().default("new"),
    message: text("message"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps
  },
  (table) => ({
    contactIdx: index("leads_contact_idx").on(table.contact)
  })
);
