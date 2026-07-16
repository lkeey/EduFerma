import {
  CreatePublicationRequestSchema,
  CreatePublicationTargetRequestSchema,
  ProcessPublicationsRequestSchema,
  ProcessPublicationsResponseSchema,
  PublicationActionResponseSchema,
  PublicationDetailResponseSchema,
  PublicationListResponseSchema,
  PublicationProviderHealthResponseSchema,
  PublicationTargetMutationResponseSchema,
  PublicationTargetsResponseSchema,
  UpdatePublicationRequestSchema,
  UpdatePublicationTargetRequestSchema,
  type CreatePublicationRequest,
  type CreatePublicationTargetRequest,
  type ProcessPublicationsRequest,
  type UpdatePublicationRequest,
  type UpdatePublicationTargetRequest
} from "@eduferma/validators";
import { EduFermaApiClient } from "./client";

export class EduFermaPublicationsApiClient extends EduFermaApiClient {
  listTeacherPublications() {
    return this.get("/api/v1/teacher/publications").then((payload) => PublicationListResponseSchema.parse(payload));
  }

  createTeacherPublication(input: CreatePublicationRequest) {
    return this.post("/api/v1/teacher/publications", CreatePublicationRequestSchema.parse(input))
      .then((payload) => PublicationActionResponseSchema.parse(payload));
  }

  getTeacherPublication(postId: string) {
    return this.get(`/api/v1/teacher/publications/${encodeURIComponent(postId)}`)
      .then((payload) => PublicationDetailResponseSchema.parse(payload));
  }

  updateTeacherPublication(postId: string, input: UpdatePublicationRequest) {
    return this.patch(`/api/v1/teacher/publications/${encodeURIComponent(postId)}`, UpdatePublicationRequestSchema.parse(input))
      .then((payload) => PublicationActionResponseSchema.parse(payload));
  }

  publishTeacherPublication(postId: string, targetIds?: string[]) {
    return this.post(`/api/v1/teacher/publications/${encodeURIComponent(postId)}/publish`, targetIds ? { targetIds } : undefined)
      .then((payload) => PublicationActionResponseSchema.parse(payload));
  }

  scheduleTeacherPublication(postId: string, scheduledFor: string, targetIds?: string[]) {
    return this.post(`/api/v1/teacher/publications/${encodeURIComponent(postId)}/schedule`, { scheduledFor, targetIds })
      .then((payload) => PublicationActionResponseSchema.parse(payload));
  }

  cancelTeacherPublicationSchedule(postId: string) {
    return this.post(`/api/v1/teacher/publications/${encodeURIComponent(postId)}/cancel-schedule`)
      .then((payload) => PublicationActionResponseSchema.parse(payload));
  }

  retryTeacherPublication(postId: string, options?: { scheduledFor?: string | null; targetIds?: string[] }) {
    return this.post(`/api/v1/teacher/publications/${encodeURIComponent(postId)}/retry`, options)
      .then((payload) => PublicationActionResponseSchema.parse(payload));
  }

  listTeacherPublicationTargets() {
    return this.get("/api/v1/teacher/publication-targets").then((payload) => PublicationTargetsResponseSchema.parse(payload));
  }

  getTeacherPublicationProviderHealth() {
    return this.get("/api/v1/teacher/publication-targets/health")
      .then((payload) => PublicationProviderHealthResponseSchema.parse(payload));
  }

  listOwnerPublicationTargets() {
    return this.get("/api/v1/owner/publication-targets").then((payload) => PublicationTargetsResponseSchema.parse(payload));
  }

  createOwnerPublicationTarget(input: CreatePublicationTargetRequest) {
    return this.post("/api/v1/owner/publication-targets", CreatePublicationTargetRequestSchema.parse(input))
      .then((payload) => PublicationTargetMutationResponseSchema.parse(payload));
  }

  updateOwnerPublicationTarget(targetId: string, input: UpdatePublicationTargetRequest) {
    return this.patch(`/api/v1/owner/publication-targets/${encodeURIComponent(targetId)}`, UpdatePublicationTargetRequestSchema.parse(input))
      .then((payload) => PublicationTargetMutationResponseSchema.parse(payload));
  }

  processInternalPublications(input: ProcessPublicationsRequest = {}) {
    return this.post("/api/v1/internal/publications/process", ProcessPublicationsRequestSchema.parse(input))
      .then((payload) => ProcessPublicationsResponseSchema.parse(payload));
  }
}
