import type { Icon } from '@tabler/icons-svelte';
import type { ResolvedPathname } from '$app/types';

import CalendarCheck from '@tabler/icons-svelte/icons/calendar-check';
import Users from '@tabler/icons-svelte/icons/users';
import Cash from '@tabler/icons-svelte/icons/cash';
import Bell from '@tabler/icons-svelte/icons/bell';

export type NotificationKind = 'booking' | 'team' | 'payment' | 'system';

export type NotificationItem = {
	id: string;
	kind: NotificationKind;
	title: string;
	message: string;
	body: string[];
	createdAt: string;
	read: boolean;
	href?: ResolvedPathname;
};

export const notificationMeta: Record<
	NotificationKind,
	{ label: string; icon: Icon; className: string }
> = {
	booking: {
		label: 'Booking',
		icon: CalendarCheck,
		className: 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
	},
	team: {
		label: 'Team',
		icon: Users,
		className: 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
	},
	payment: {
		label: 'Payment',
		icon: Cash,
		className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
	},
	system: {
		label: 'System',
		icon: Bell,
		className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
	}
};

export function formatRelativeTime(iso: string): string {
	const diffMs = Date.now() - new Date(iso).getTime();
	const minutes = Math.max(0, Math.round(diffMs / 60_000));
	if (minutes < 1) return 'Just now';
	if (minutes < 60) return `${minutes}m ago`;

	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h ago`;

	const days = Math.round(hours / 24);
	if (days < 7) return `${days}d ago`;

	return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function formatFullTime(iso: string): string {
	return new Date(iso).toLocaleString('en-GB', {
		dateStyle: 'medium',
		timeStyle: 'short'
	});
}
