import { z } from "zod";

export const activateProfileSchema = z.object({
  availability: z.string().max(500).optional(),
  skills: z.array(z.string().max(80)).max(20).optional(),
  interests: z.array(z.string().max(80)).max(20).optional(),
  locationPreference: z.enum(["remote", "onsite", "hybrid", "any"]).optional(),
  city: z.string().max(120).optional(),
  preferredTrackIds: z.array(z.string().uuid()).max(8).optional(),
});

export const updateProfileSchema = activateProfileSchema.partial();

export const opportunityInputSchema = z.object({
  titleAr: z.string().min(3).max(200),
  titleEn: z.string().min(3).max(200),
  descriptionAr: z.string().max(5000).optional(),
  descriptionEn: z.string().max(5000).optional(),
  trackId: z.string().uuid().optional(),
  requiredSkills: z.array(z.string().max(80)).max(20).optional(),
  locationType: z.enum(["remote", "onsite", "hybrid"]).default("remote"),
  locationTextAr: z.string().max(300).optional(),
  locationTextEn: z.string().max(300).optional(),
  city: z.string().max(120).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  applicationDeadline: z.string().datetime().optional(),
  maxParticipants: z.number().int().min(1).max(500).optional(),
  expectedHours: z.number().min(0.5).max(500).optional(),
  visibility: z.enum(["public", "members"]).default("public"),
});

export const applicationInputSchema = z.object({
  opportunityId: z.string().uuid(),
  motivation: z.string().min(20).max(2000),
  relevantExperience: z.string().max(2000).optional(),
  availabilityNote: z.string().max(500).optional(),
});

export const hourSubmissionSchema = z.object({
  opportunityId: z.string().uuid().optional(),
  participationId: z.string().uuid().optional(),
  hours: z.number().min(0.25).max(24),
  activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(10).max(2000),
  evidenceMediaId: z.string().uuid().optional(),
});

export const hourReviewSchema = z.object({
  entryId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  reviewNotes: z.string().max(1000).optional(),
});

export const hourAdjustmentSchema = z.object({
  entryId: z.string().uuid(),
  deltaHours: z.number().min(-24).max(24).refine((v) => v !== 0),
  reason: z.string().min(10).max(1000),
});

export const attendanceSchema = z.object({
  participationId: z.string().uuid(),
  status: z.enum(["pending", "attended", "partial", "absent", "excused"]),
  notes: z.string().max(500).optional(),
});

export const progressionAssignSchema = z.object({
  volunteerProfileId: z.string().uuid(),
  level: z.enum([
    "volunteer",
    "active_volunteer",
    "distinguished_volunteer",
    "volunteer_leader",
    "community_ambassador",
  ]),
  reason: z.string().min(5).max(500),
});
