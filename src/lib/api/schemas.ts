import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  college: z.string().max(200).optional(),
  answers: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).optional(),
  turnstileToken: z.string().optional(),
});

export const formSubmitSchema = z.object({
  answers: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])),
  respondentEmail: z.string().email().optional(),
  respondentName: z.string().max(120).optional(),
  turnstileToken: z.string().optional(),
});

export const collegeLeadSchema = z.object({
  college: z.string().min(1).max(200),
  contactName: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  role: z.string().max(80).optional(),
  message: z.string().max(2000).optional(),
  turnstileToken: z.string().optional(),
});

export const joinLeadSchema = z.object({
  fullName: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  college: z.string().max(200).optional(),
  year: z.string().max(40).optional(),
  interests: z.array(z.string()).optional(),
  message: z.string().max(2000).optional(),
  chapterSlug: z.string().max(80).optional(),
  turnstileToken: z.string().optional(),
});
