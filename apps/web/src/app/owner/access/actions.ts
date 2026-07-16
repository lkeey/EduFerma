"use server";

import { redirect } from "next/navigation";
import {
  ApproveAccessRequestSchema,
  RejectAccessRequestSchema,
  UpdateOwnerUserAccessRequestSchema
} from "@eduferma/validators";
import { getCurrentServiceUser } from "@/server/auth/session";
import { getServices } from "@/server/services";

function redirectWithStatus(returnTo: string, key: "saved" | "error", value: string) {
  const url = new URL(returnTo, "http://localhost");
  url.searchParams.set(key, value);
  redirect(`${url.pathname}${url.search}`);
}

async function requireOwnerContext() {
  const user = await getCurrentServiceUser();
  if (!user) {
    redirect("/sign-in");
  }
  if (user.role !== "owner") {
    redirect("/forbidden");
  }
  return { user };
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = getRequiredString(formData, key).trim();
  return value || undefined;
}

export async function approveAccessRequestAction(formData: FormData) {
  const returnTo = getRequiredString(formData, "returnTo") || "/owner/access";
  const requestId = getRequiredString(formData, "requestId");

  try {
    const context = await requireOwnerContext();
    const input = ApproveAccessRequestSchema.parse({
      role: getRequiredString(formData, "role"),
      reason: getRequiredString(formData, "reason"),
      ownerConfirmation: getOptionalString(formData, "ownerConfirmation")
    });
    await getServices().owner.approveAccessRequest(context, requestId, input);
    redirectWithStatus(returnTo, "saved", "approved");
  } catch (error) {
    redirectWithStatus(returnTo, "error", error instanceof Error ? error.message : "Approval failed");
  }
}

export async function rejectAccessRequestAction(formData: FormData) {
  const returnTo = getRequiredString(formData, "returnTo") || "/owner/access";
  const requestId = getRequiredString(formData, "requestId");

  try {
    const context = await requireOwnerContext();
    const input = RejectAccessRequestSchema.parse({
      reason: getRequiredString(formData, "reason")
    });
    await getServices().owner.rejectAccessRequest(context, requestId, input);
    redirectWithStatus(returnTo, "saved", "rejected");
  } catch (error) {
    redirectWithStatus(returnTo, "error", error instanceof Error ? error.message : "Rejection failed");
  }
}

export async function updateUserAccessAction(formData: FormData) {
  const returnTo = getRequiredString(formData, "returnTo") || "/owner/access";
  const userId = getRequiredString(formData, "userId");
  const isActiveValue = getRequiredString(formData, "isActive");

  try {
    const context = await requireOwnerContext();
    const input = UpdateOwnerUserAccessRequestSchema.parse({
      role: getOptionalString(formData, "role"),
      isActive: isActiveValue ? isActiveValue === "true" : undefined,
      reason: getRequiredString(formData, "reason"),
      ownerConfirmation: getOptionalString(formData, "ownerConfirmation")
    });
    await getServices().owner.updateUserAccess(context, userId, input);
    redirectWithStatus(returnTo, "saved", "updated");
  } catch (error) {
    redirectWithStatus(returnTo, "error", error instanceof Error ? error.message : "Update failed");
  }
}
