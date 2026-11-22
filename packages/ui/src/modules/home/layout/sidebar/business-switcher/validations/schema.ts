import z from 'zod';

const INDUSTRIES = [
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
] as const;

export const CreateBusinessFormSchema = z.object({
	businessName: z.string().min(1, 'Business name is required'),
	slug: z
		.string()
		.min(1, 'Slug is required')
		.regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens'),
	industry: z.enum(INDUSTRIES, { error: 'Please select an industry' }),
	defaultTimeZone: z.string().optional()
});
