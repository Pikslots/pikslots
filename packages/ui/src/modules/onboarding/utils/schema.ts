import { z } from 'zod';
import type { BusinessIndustry } from '@pikslots/shared';

export const ownerSchema = z.object({
	username: z
		.string()
		.min(3, 'Username must be at least 3 characters')
		.max(30, 'Username must be at most 30 characters')
		.regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
	password: z
		.string()
		.min(8, 'Password must be at least 8 characters')
		.max(100, 'Password is too long'),
	first_name: z.string().min(1, 'First name is required').max(50),
	last_name: z.string().min(1, 'Last name is required').max(50),
	email: z.string().email('Please enter a valid email address	'),
	phone: z.preprocess(
		(value) => (value === null || value === '' ? undefined : value),
		z
			.number()
			.refine((value) => value.toString().length >= 10, 'Phone number must be at least 10 digits!')
			.refine((value) => value.toString().length <= 15, 'Phone number must be at most 15 digits!')
			.optional()
	)
});

export type OwnerFormValues = z.infer<typeof ownerSchema>;

const BUSINESS_INDUSTRIES = [
	'salon_and_beauty',
	'health_and_wellness',
	'fitness',
	'medical',
	'education',
	'legal',
	'financial',
	'hospitality',
	'retail',
	'other'
] as const satisfies readonly BusinessIndustry[];

export const businessSchema = z.object({
	name: z.string().min(1, 'Business name is required').max(100),
	slug: z
		.string()
		.min(3, 'Slug must be at least 3 characters')
		.max(50, 'Slug must be at most 50 characters')
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens'),
	industry: z.enum(BUSINESS_INDUSTRIES),
	default_time_zone: z.string().min(1, 'Please select a timezone')
});

export type BusinessFormValues = z.infer<typeof businessSchema>;

// Owner and business field names don't overlap, so both shapes merge into one flat form
export const onboardingSchema = ownerSchema.extend(businessSchema.shape);

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export const loginSchema = z.object({
	identifier: z.string().min(1, 'Email or username is required'),
	password: z.string().min(1, 'Password is required')
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const industries: { value: BusinessIndustry; label: string }[] = [
	{ value: 'salon_and_beauty', label: 'Salon & Beauty' },
	{ value: 'health_and_wellness', label: 'Health & Wellness' },
	{ value: 'fitness', label: 'Fitness' },
	{ value: 'medical', label: 'Medical' },
	{ value: 'education', label: 'Education' },
	{ value: 'legal', label: 'Legal' },
	{ value: 'financial', label: 'Financial' },
	{ value: 'hospitality', label: 'Hospitality' },
	{ value: 'retail', label: 'Retail' },
	{ value: 'other', label: 'Other' }
];
