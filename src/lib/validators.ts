import { z } from 'zod';

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, 'First name must be at least 2 characters').max(80),
    lastName: z.string().trim().min(2, 'Last name must be at least 2 characters').max(80),
    email: z.string().trim().email('Please provide a valid email address').toLowerCase(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
      .regex(/[a-z]/, 'Password must include at least one lowercase letter')
      .regex(/[0-9]/, 'Password must include at least one number'),
    confirmPassword: z.string(),
    accountType: z.enum(['CANDIDATE', 'RECRUITER'], {
      errorMap: () => ({
        message: 'Public registration is restricted to CANDIDATE or RECRUITER accounts.',
      }),
    }),
    phone: z.string().trim().max(30).optional().or(z.literal('')),
    // Recruiter-specific fields
    companyName: z.string().trim().max(120).optional(),
    companyWebsite: z.string().trim().max(250).optional().or(z.literal('')),
    companyDescription: z.string().trim().max(3000).optional(),
    industry: z.string().trim().max(100).optional(),
    companySize: z.string().trim().max(40).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .superRefine((data, ctx) => {
    if (data.accountType === 'RECRUITER') {
      if (!data.companyName || data.companyName.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Company name is required for Recruiter accounts',
          path: ['companyName'],
        });
      }
      if (!data.companyDescription || data.companyDescription.length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Company description (min 10 characters) is required',
          path: ['companyDescription'],
        });
      }
      if (!data.industry || data.industry.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Industry is required for Recruiter accounts',
          path: ['industry'],
        });
      }
      if (!data.companySize) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Company size is required for Recruiter accounts',
          path: ['companySize'],
        });
      }
    }
  });

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email is required').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Valid email is required').toLowerCase(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(16, 'Invalid reset token'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const jobUpsertSchema = z.object({
  title: z.string().trim().min(3, 'Job title is required').max(140),
  description: z.string().trim().min(20, 'Job description must be at least 20 characters'),
  responsibilities: z.array(z.string().trim().min(1)).default([]),
  qualifications: z.array(z.string().trim().min(1)).default([]),
  preferredQualifications: z.array(z.string().trim().min(1)).default([]),
  benefits: z.array(z.string().trim().min(1)).default([]),
  technicalSkills: z.array(z.string().trim().min(1)).min(1, 'Add at least one required skill'),
  softSkills: z.array(z.string().trim().min(1)).default([]),
  experienceLevel: z
    .enum(['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE'])
    .default('MID'),
  minYearsExperience: z.coerce.number().int().min(0).max(30).default(2),
  educationRequirement: z.string().trim().max(200).optional().nullable(),
  employmentType: z
    .enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE'])
    .default('FULL_TIME'),
  location: z.string().trim().min(2, 'Location is required').max(140),
  workMode: z.enum(['REMOTE', 'HYBRID', 'ONSITE', 'FLEXIBLE']).default('HYBRID'),
  salaryMin: z.coerce.number().int().min(0).optional().nullable(),
  salaryMax: z.coerce.number().int().min(0).optional().nullable(),
  salaryCurrency: z.string().trim().max(10).default('USD'),
  requiredLanguages: z.array(z.string().trim().min(1)).default(['English']),
  status: z.enum(['DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED']).default('PUBLISHED'),
  deadline: z.string().optional().nullable(),
  aiGenerated: z.boolean().optional().default(false),
  humanApproved: z.boolean().optional().default(true),
});

export const applicationCreateSchema = z.object({
  jobId: z.string().min(3),
  coverLetter: z.string().trim().max(4000).optional().or(z.literal('')),
  cvDocumentId: z.string().optional().nullable(),
});

export const applicationStatusUpdateSchema = z.object({
  status: z.enum([
    'SUBMITTED',
    'UNDER_REVIEW',
    'SHORTLISTED',
    'INTERVIEW_SCHEDULED',
    'INTERVIEW_COMPLETED',
    'OFFERED',
    'HIRED',
    'REJECTED',
    'WITHDRAWN',
  ]),
  rejectionReason: z.string().trim().max(2000).optional().nullable(),
  candidateFeedback: z.string().trim().max(2000).optional().nullable(),
  privateNotes: z.string().trim().max(3000).optional().nullable(),
});

export const interviewCreateSchema = z.object({
  applicationId: z.string().min(3),
  title: z.string().trim().min(3).max(160),
  type: z.enum(['ONLINE', 'IN_PERSON', 'TECHNICAL', 'HR', 'FINAL']).default('ONLINE'),
  scheduledAt: z.string().min(8),
  durationMinutes: z.coerce.number().int().min(15).max(240).default(45),
  meetingLink: z.string().trim().max(300).optional().or(z.literal('')),
  location: z.string().trim().max(200).optional().or(z.literal('')),
  instructions: z.string().trim().max(2000).optional().or(z.literal('')),
  interviewers: z.array(z.string().trim().min(1)).default([]),
});

export const messageSendSchema = z.object({
  conversationId: z.string().optional(),
  recipientUserId: z.string().optional(),
  jobId: z.string().optional().nullable(),
  subject: z.string().trim().max(180).optional(),
  content: z.string().trim().min(1, 'Message cannot be empty').max(4000),
});
