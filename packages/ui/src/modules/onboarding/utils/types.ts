export type UserRole = 'platform_owner' | 'admin' | 'staff';

export type BusinessIndustry =
	| 'salon_and_beauty'
	| 'health_and_wellness'
	| 'fitness'
	| 'medical'
	| 'education'
	| 'legal'
	| 'financial'
	| 'hospitality'
	| 'retail'
	| 'other';

export interface FullName {
	first_name: string;
	last_name: string;
}

export interface PlatformOwner {
	id: string;
	username: string;
	password: string;
	business_id: string;
	first_name: string;
	last_name: string;
	email: string;
	phone?: string;
	role: UserRole;
	booking_url: string;
}

export interface Business {
	id: string;
	owner_id: string;
	slug: string;
	name: string;
	industry: BusinessIndustry;
	default_time_zone: string;
}
