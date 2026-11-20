import CalendarPlus from '@tabler/icons-svelte/icons/calendar-plus';
import UsersPlus from '@tabler/icons-svelte/icons/users-plus';
import Briefcase from '@tabler/icons-svelte/icons/briefcase';
import UserPlus from '@tabler/icons-svelte/icons/user-plus';
import School from '@tabler/icons-svelte/icons/school';
import type { Icon } from '@tabler/icons-svelte';
import type { UserRole } from '@pikslots/shared';
import { privilegedRoles } from './search-pages';

/** Shortcuts shown in the header "+" menu and on the home welcome banner */
export const quickActions: { label: string; icon: Icon; href: string; roles?: UserRole[] }[] = [
	{ label: 'New booking', icon: CalendarPlus, href: '/home/bookings?create=true' },
	{
		label: 'Add team member',
		icon: UsersPlus,
		href: '/home/settings/team?invite=true',
		roles: privilegedRoles
	},
	{ label: 'Create service', icon: Briefcase, href: '/home/services/new', roles: privilegedRoles },
	{
		label: 'Add customer',
		icon: UserPlus,
		href: '/home/customers?add=true',
		roles: privilegedRoles
	},
	{
		label: 'Create class',
		icon: School,
		href: '/home/services/classes/new',
		roles: privilegedRoles
	}
];
