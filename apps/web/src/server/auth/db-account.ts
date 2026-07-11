import { and, eq, or } from "drizzle-orm";
import {
  buildProvisionedServiceUser,
  isOwnerBootstrapEmail,
  normalizeAccessEmail,
  type AuthenticatedIdentity,
  type ProvisionedAccount,
  type ProvisionedServiceUser
} from "@eduferma/core";
import { getDb, invitations, users } from "@eduferma/db";

type DbUser = typeof users.$inferSelect;

export type AccountAccessResult =
  | { ok: true; user: ProvisionedServiceUser }
  | { ok: false; reason: "not_provisioned" | "inactive" };

export async function resolveDbAccountAccess(identity: AuthenticatedIdentity): Promise<AccountAccessResult> {
  const db = getDb();
  const email = normalizeAccessEmail(identity.email);
  const existing = await db.query.users.findFirst({
    where: (row) =>
      or(eq(row.authProviderUserId, identity.providerUserId), eq(row.clerkUserId, identity.providerUserId), eq(row.email, email))
  });

  if (!existing) {
    if (!isOwnerBootstrapEmail(email, process.env.OWNER_EMAIL)) {
      return { ok: false, reason: "not_provisioned" };
    }

    const [owner] = await db
      .insert(users)
      .values({
        email,
        clerkUserId: identity.providerUserId,
        authProviderUserId: identity.providerUserId,
        displayName: identity.name,
        role: "owner",
        isActive: true
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          clerkUserId: identity.providerUserId,
          authProviderUserId: identity.providerUserId,
          displayName: identity.name,
          role: "owner",
          isActive: true,
          updatedAt: new Date()
        }
      })
      .returning();

    return { ok: true, user: buildProvisionedServiceUser(identity, toProvisionedAccount(owner))! };
  }

  if (!existing.isActive) {
    return { ok: false, reason: "inactive" };
  }

  const linked = await linkProviderIdentityIfNeeded(existing, identity);
  await markPendingInvitationAccepted(linked, email);
  const user = buildProvisionedServiceUser(identity, toProvisionedAccount(linked));

  return user ? { ok: true, user } : { ok: false, reason: "inactive" };
}

async function linkProviderIdentityIfNeeded(user: DbUser, identity: AuthenticatedIdentity): Promise<DbUser> {
  const set: Partial<typeof users.$inferInsert> = {};
  if (!user.clerkUserId) set.clerkUserId = identity.providerUserId;
  if (!user.authProviderUserId) set.authProviderUserId = identity.providerUserId;
  if (!user.displayName && identity.name) set.displayName = identity.name;
  if (Object.keys(set).length === 0) return user;

  const [updated] = await getDb()
    .update(users)
    .set({ ...set, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();

  return updated ?? user;
}

async function markPendingInvitationAccepted(user: DbUser, email: string) {
  await getDb()
    .update(invitations)
    .set({ status: "accepted", acceptedByUserId: user.id, updatedAt: new Date() })
    .where(and(eq(invitations.email, email), eq(invitations.status, "pending")));
}

function toProvisionedAccount(user: DbUser): ProvisionedAccount {
  return {
    dbUserId: user.id,
    providerUserId: user.authProviderUserId,
    clerkUserId: user.clerkUserId,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    isActive: user.isActive
  };
}
