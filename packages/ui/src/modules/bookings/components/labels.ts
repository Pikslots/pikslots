export const PREDEFINED_LABELS = [
	'Confirmed',
	'Pending',
	'Cancelled',
	'Completed',
	'No Show'
] as const;

export const LABEL_COLORS: Record<string, string> = {
	Confirmed: '#22c55e',
	Pending: '#f59e0b',
	Cancelled: '#ef4444',
	Completed: '#3b82f6',
	'No Show': '#a855f7'
};
