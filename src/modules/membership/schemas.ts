import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.string().url().max(500).optional(),
);

export const applicationDraftSchema = z.object({
  membershipTypeId: z.string().uuid(),
  trackIds: z.array(z.string().uuid()).max(8).default([]),
  headline: z.string().trim().min(2).max(200),
  summary: z.string().trim().min(10).max(2000),
  motivation: z.string().trim().min(10).max(2000),
  experience: z.string().trim().min(10).max(4000),
  linkedinUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  githubUrl: optionalUrl,
  additionalNotes: z.string().trim().max(2000).optional(),
});

export const applicationUpdateSchema = applicationDraftSchema.partial().extend({
  applicationId: z.string().uuid(),
});

export const reviewDecisionSchema = z.object({
  applicationId: z.string().uuid(),
  reason: z.string().trim().min(3).max(2000).optional(),
  internalNotes: z.string().trim().max(4000).optional(),
  trackIds: z.array(z.string().uuid()).max(8).optional(),
});

export const rejectOrChangesSchema = reviewDecisionSchema.extend({
  reason: z.string().trim().min(3).max(2000),
});

export const assignReviewerSchema = z.object({
  applicationId: z.string().uuid(),
  reviewerId: z.string().uuid(),
});

export const directIssueSchema = z.object({
  targetUserId: z.string().uuid(),
  membershipTypeId: z.string().uuid(),
  trackIds: z.array(z.string().uuid()).max(8).default([]),
  reason: z.string().trim().min(5).max(2000),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().nullable().optional(),
});

export const lifecycleChangeSchema = z.object({
  membershipId: z.string().uuid(),
  reason: z.string().trim().min(3).max(2000),
});

export const membershipTypePatchSchema = z.object({
  typeId: z.string().uuid(),
  nameAr: z.string().trim().min(2).max(200).optional(),
  nameEn: z.string().trim().min(2).max(200).optional(),
  descriptionAr: z.string().trim().max(2000).nullable().optional(),
  descriptionEn: z.string().trim().max(2000).nullable().optional(),
  isEnabled: z.boolean().optional(),
  applicationsOpen: z.boolean().optional(),
  invitationOnly: z.boolean().optional(),
  visibility: z.enum(["public", "members", "private"]).optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  validityMode: z.enum(["lifetime", "fixed_days"]).optional(),
  validityDays: z.number().int().positive().nullable().optional(),
  renewalRequired: z.boolean().optional(),
});

export const trackPatchSchema = z.object({
  trackId: z.string().uuid(),
  nameAr: z.string().trim().min(2).max(200).optional(),
  nameEn: z.string().trim().min(2).max(200).optional(),
  descriptionAr: z.string().trim().max(2000).nullable().optional(),
  descriptionEn: z.string().trim().max(2000).nullable().optional(),
  isEnabled: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

export type ApplicationDraftInput = z.infer<typeof applicationDraftSchema>;
