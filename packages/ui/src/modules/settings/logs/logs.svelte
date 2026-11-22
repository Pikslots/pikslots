<script lang="ts">
	import * as Select from '$lib/components/ui/select/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { createQuery } from '@tanstack/svelte-query';
	import { businessStore } from '$stores/business.svelte';
	import { getAuditLogsQueryOptions } from '../../api/audit-log/get.audit.logs.query';
	import type { AuditLogModel } from '../../api/audit-log/models/audit-log-model';
	import { formatIsoInTimezone } from '@pikslots/datetime';
	import { getLocalTimeZone } from '@internationalized/date';
	import Search from '@tabler/icons-svelte/icons/search';
	import Plus from '@tabler/icons-svelte/icons/plus';
	import Pencil from '@tabler/icons-svelte/icons/pencil';
	import Trash from '@tabler/icons-svelte/icons/trash';
	import Login from '@tabler/icons-svelte/icons/login';
	import Logout from '@tabler/icons-svelte/icons/logout';
	import MailForward from '@tabler/icons-svelte/icons/mail-forward';
	import UserCheck from '@tabler/icons-svelte/icons/user-check';
	import Key from '@tabler/icons-svelte/icons/key';
	import UserPlus from '@tabler/icons-svelte/icons/user-plus';
	import UserMinus from '@tabler/icons-svelte/icons/user-minus';
	import BuildingStore from '@tabler/icons-svelte/icons/building-store';
	import Activity from '@tabler/icons-svelte/icons/activity';
	import type { Icon } from '@tabler/icons-svelte';
	import { resolve } from '$app/paths';

	// ── State ─────────────────────────────────────────────────────────────────

	let search = $state('');
	let entityTypeFilter = $state('all');
	let actionFilter = $state('all');

	// ── Queries ───────────────────────────────────────────────────────────────

	const auditLogsQuery = createQuery(() => ({
		...getAuditLogsQueryOptions({ businessId: businessStore.selectedBusiness?.id ?? '' }),
		enabled: !!businessStore.selectedBusiness?.id
	}));

	// ── Derived ───────────────────────────────────────────────────────────────

	const timezone = $derived(
		businessStore.selectedBusiness?.locationDetails.timeZone || getLocalTimeZone()
	);
	const logs = $derived(auditLogsQuery.data ?? []);

	function humanizeAction(action: string): string {
		return action
			.replace(/^audit\.log\./, '')
			.split('.')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ');
	}

	type ActionMeta = { icon: Icon; class: string };

	const CREATE_TONE =
		'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
	const UPDATE_TONE = 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400';
	const DELETE_TONE = 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400';
	const ACCESS_TONE = 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400';

	// Keyed by the trailing verb(s) of the action, so e.g. booking/class/service ".created" share a look
	const ACTION_META: [suffix: string, meta: ActionMeta][] = [
		['business.registered', { icon: BuildingStore, class: CREATE_TONE }],
		['invite.otp.requested', { icon: Key, class: ACCESS_TONE }],
		['invite.accepted', { icon: UserCheck, class: ACCESS_TONE }],
		['user.invited', { icon: MailForward, class: ACCESS_TONE }],
		['user.assigned', { icon: UserPlus, class: CREATE_TONE }],
		['user.unassigned', { icon: UserMinus, class: DELETE_TONE }],
		['login', { icon: Login, class: ACCESS_TONE }],
		['logout', { icon: Logout, class: ACCESS_TONE }],
		['created', { icon: Plus, class: CREATE_TONE }],
		['updated', { icon: Pencil, class: UPDATE_TONE }],
		['deleted', { icon: Trash, class: DELETE_TONE }]
	];

	function actionMeta(action: string): ActionMeta {
		return (
			ACTION_META.find(([suffix]) => action.endsWith(suffix))?.[1] ?? {
				icon: Activity,
				class: ''
			}
		);
	}

	function titleCase(value: string): string {
		return value.charAt(0).toUpperCase() + value.slice(1);
	}

	const entityTypeOptions = $derived([
		{ value: 'all', label: 'All types' },
		...Array.from(new Set(logs.map((log) => log.entityType))).map((type) => ({
			value: type,
			label: titleCase(type)
		}))
	]);

	const actionOptions = $derived([
		{ value: 'all', label: 'All actions' },
		...Array.from(new Set(logs.map((log) => log.action))).map((action) => ({
			value: action,
			label: humanizeAction(action)
		}))
	]);

	const filteredLogs = $derived(
		logs.filter((log) => {
			if (entityTypeFilter !== 'all' && log.entityType !== entityTypeFilter) return false;
			if (actionFilter !== 'all' && log.action !== actionFilter) return false;
			if (search && !searchableText(log).includes(search.toLowerCase())) return false;
			return true;
		})
	);

	type LogGroup = { dateLabel: string; entries: AuditLogModel[] };

	const groupedLogs = $derived.by((): LogGroup[] => {
		const groups: LogGroup[] = [];
		for (const log of filteredLogs) {
			const dateLabel = formatIsoInTimezone(
				log.occurredAt as unknown as string,
				timezone,
				'EEE d MMM yyyy'
			);
			const lastGroup = groups[groups.length - 1];
			if (lastGroup && lastGroup.dateLabel === dateLabel) {
				lastGroup.entries.push(log);
			} else {
				groups.push({ dateLabel, entries: [log] });
			}
		}
		return groups;
	});

	function formatTime(log: AuditLogModel): string {
		return formatIsoInTimezone(log.occurredAt as unknown as string, timezone, 'h:mm a');
	}

	function searchableText(log: AuditLogModel): string {
		const { user } = log;
		return [log.description, user?.firstName, user?.lastName, user?.email, user?.username]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();
	}

	function actorInitial(log: AuditLogModel): string {
		if (log.user) return log.user.firstName.charAt(0).toUpperCase();
		return log.userType === 'system' ? 'S' : 'U';
	}

	function actorLabel(log: AuditLogModel): string {
		if (log.user) return `${log.user.firstName} ${log.user.lastName}`;
		return log.userType === 'system' ? 'System' : 'Unknown user';
	}
</script>

<div class="flex h-full flex-col">
	<!-- Page header -->
	<div class="border-b px-6 py-4">
		<h1 class="text-base font-semibold">Activity</h1>
		<p class="text-xs text-muted-foreground">View your most recent account activity.</p>
	</div>

	<div class="flex flex-1 flex-col gap-4 overflow-hidden px-6 py-4">
		<!-- Filters row -->
		<div class="flex items-center gap-3">
			<div class="relative flex-1">
				<Input
					bind:value={search}
					placeholder="Search activity"
					class="pl-9 text-xs"
					disabled={!businessStore.selectedBusiness?.id}
				/>
				<Search size={14} class="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
			</div>

			<Select.Root type="single" bind:value={entityTypeFilter}>
				<Select.Trigger class="w-40 text-xs">
					{entityTypeOptions.find((o) => o.value === entityTypeFilter)?.label}
				</Select.Trigger>
				<Select.Content>
					{#each entityTypeOptions as option (option.value)}
						<Select.Item value={option.value}>{option.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>

			<Select.Root type="single" bind:value={actionFilter}>
				<Select.Trigger class="w-48 text-xs">
					{actionOptions.find((o) => o.value === actionFilter)?.label}
				</Select.Trigger>
				<Select.Content>
					{#each actionOptions as option (option.value)}
						<Select.Item value={option.value}>{option.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<!-- Content -->
		<ScrollArea class="min-h-0 flex-1">
			{#if auditLogsQuery.isPending}
				<div class="flex flex-col gap-3 pr-4">
					{#each Array(6) as _, i (i)}
						<div class="flex items-center gap-3">
							<Skeleton class="h-4 w-14" />
							<Skeleton class="size-6 rounded-full" />
							<Skeleton class="h-4 flex-1" />
						</div>
					{/each}
				</div>
			{:else if auditLogsQuery.isError}
				<div class="flex flex-col items-center justify-center gap-1 py-32 text-center">
					<span class="text-xs font-semibold">Failed to load activity</span>
					<span class="text-xs text-muted-foreground">Please try again later.</span>
				</div>
			{:else if groupedLogs.length === 0}
				<div class="flex flex-col items-center justify-center gap-1 py-32 text-center">
					<span class="text-xs font-semibold">No activity yet</span>
					<span class="text-xs text-muted-foreground">
						Activity on your account will show up here.
					</span>
				</div>
			{:else}
				<div class="flex flex-col gap-6 pr-4 pb-4">
					<!-- Column headers -->
					<div
						class="flex items-center gap-3 border-b pb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
					>
						<span class="w-16 shrink-0">Time</span>
						<span class="w-[15rem] shrink-0">Performed by</span>
						<span class="flex-1 border-l pl-3">Action</span>
					</div>
					{#each groupedLogs as group (group.dateLabel)}
						<div class="flex flex-col gap-2">
							<h2 class="text-sm font-semibold">{group.dateLabel}</h2>
							<div class="flex flex-col">
								{#each group.entries as log (log.id)}
									{@const meta = actionMeta(log.action)}
									<div class="flex items-start gap-3 border-b py-2.5 last:border-b-0">
										<span class="w-16 shrink-0 pt-0.5 text-xs text-muted-foreground"
											>{formatTime(log)}</span
										>
										<!-- Who performed it -->
										<div class="flex w-[15rem] shrink-0 items-start gap-3">
											<Avatar.Root size="sm" class="shrink-0">
												<Avatar.Fallback>{actorInitial(log)}</Avatar.Fallback>
											</Avatar.Root>
											<div class="flex min-w-0 flex-col pt-0.5 text-xs">
												<span class="truncate font-medium">{actorLabel(log)}</span>
												{#if log.user}
													<a
														href="{resolve('/home/settings/team')}?userId={log.user.id}"
														class="truncate text-muted-foreground hover:text-foreground hover:underline"
														title="View {actorLabel(log)} in team"
													>
														{log.user.email}
													</a>
												{/if}
											</div>
										</div>
										<!-- What they did -->
										<div class="flex min-w-0 flex-1 flex-col items-start gap-1 border-l pl-3">
											<Badge variant="outline" class={meta.class}>
												<meta.icon />
												{humanizeAction(log.action)}
											</Badge>
											<p class="text-xs text-muted-foreground">{log.description}</p>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</ScrollArea>
	</div>
</div>
