import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseValidDate, sanitizeHttpUrl } from '@/lib/utils';

/**
 * Safely parses a JSON request body, returning a clean 400 Bad Request response
 * instead of throwing an unhandled SyntaxError (500) on empty or malformed payloads.
 */
export async function parseJsonBody<T = Record<string, any>>(
  req: NextRequest
): Promise<
  | { data: T; errorResponse?: undefined }
  | { data?: undefined; errorResponse: NextResponse }
> {
  try {
    const raw = await req.json();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {
        errorResponse: NextResponse.json(
          { error: 'Request body must be a valid JSON object.' },
          { status: 400 }
        ),
      };
    }
    return { data: raw as T };
  } catch {
    return {
      errorResponse: NextResponse.json(
        { error: 'Malformed or empty JSON request body.' },
        { status: 400 }
      ),
    };
  }
}

export const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password cannot exceed 128 characters')
  .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
  .regex(/[a-z]/, 'Password must include at least one lowercase letter')
  .regex(/[0-9]/, 'Password must include at least one number');

const optionalHttpUrlSchema = z
  .string()
  .trim()
  .max(300)
  .optional()
  .or(z.literal(''))
  .refine((val) => !val || sanitizeHttpUrl(val) !== null, {
    message: 'Please provide a valid HTTP/HTTPS URL',
  });

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, 'First name must be at least 2 characters').max(80),
    lastName: z.string().trim().min(2, 'Last name must be at least 2 characters').max(80),
    email: z.string().trim().email('Please provide a valid email address').toLowerCase(),
    password: strongPasswordSchema,
    confirmPassword: z.string(),
    accountType: z.enum(['CANDIDATE', 'RECRUITER'], {
      errorMap: () => ({
        message: 'Public registration is restricted to CANDIDATE or RECRUITER accounts.',
      }),
    }),
    phone: z.string().trim().max(30).optional().or(z.literal('')),
    // Recruiter-specific fields
    companyName: z.string().trim().max(120).optional(),
    companyWebsite: optionalHttpUrlSchema,
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
  password: z.string().min(1, 'Password is required').max(256),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Valid email is required').toLowerCase(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(16, 'Invalid reset token').max(256),
    password: strongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const jobUpsertSchema = z
  .object({
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
    salaryMin: z.coerce.number().int().min(0).max(10_000_000).optional().nullable(),
    salaryMax: z.coerce.number().int().min(0).max(10_000_000).optional().nullable(),
    salaryCurrency: z.string().trim().max(10).default('USD'),
    requiredLanguages: z.array(z.string().trim().min(1)).default(['English']),
    status: z.enum(['DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED']).default('PUBLISHED'),
    deadline: z
      .string()
      .optional()
      .nullable()
      .refine((val) => !val || parseValidDate(val) !== null, {
        message: 'Invalid application deadline date',
      }),
    aiGenerated: z.boolean().optional().default(false),
    humanApproved: z.boolean().optional().default(true),
  })
  .refine(
    (d) =>
      d.salaryMin === null ||
      d.salaryMin === undefined ||
      d.salaryMax === null ||
      d.salaryMax === undefined ||
      d.salaryMax >= d.salaryMin,
    {
      message: 'Maximum salary must be greater than or equal to minimum salary',
      path: ['salaryMax'],
    }
  );

export const applicationCreateSchema = z.object({
  jobId: z.string().trim().min(3),
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
  applicationId: z.string().trim().min(3),
  title: z.string().trim().min(3).max(160),
  type: z.enum(['ONLINE', 'IN_PERSON', 'TECHNICAL', 'HR', 'FINAL']).default('ONLINE'),
  scheduledAt: z
    .string()
    .min(8)
    .refine((val) => parseValidDate(val) !== null, {
      message: 'Please provide a valid scheduled date and time',
    }),
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
