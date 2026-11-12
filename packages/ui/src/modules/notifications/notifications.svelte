<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import PikslotEmpty from '$lib/components/pikslot-empty.svelte';
	import Bell from '@tabler/icons-svelte/icons/bell';
	import Checks from '@tabler/icons-svelte/icons/checks';
	import { notificationsStore } from '$stores/notifications.svelte';
	import { formatRelativeTime, notificationMeta, type NotificationItem } from './data';

	type Filter = 'all' | 'unread' | 'read';

	const filters: { value: Filter; label: string }[] = [
		{ value: 'all', label: 'All' },
		{ value: 'unread', label: 'Unread' },
		{ value: 'read', label: 'Read' }
	];

	let filter = $state<Filter>('all');

	const unreadCount = $derived(notificationsStore.unreadCount);
	const filteredNotifications = $derived(
		notificationsStore.notifications.filter((notification) => {
			if (filter === 'unread') return !notification.read;
			if (filter === 'read') return notification.read;
			return true;
		})
	);

	function markAllAsRead() {
		notificationsStore.markAllAsRead();
	}

	function openNotification(notification: NotificationItem) {
		notificationsStore.markAsRead(notification.id);
		goto(
			resolve('/home/notifications/[notificationId]', {
				notificationId: notification.id
			})
		);
	}
</script>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-5">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex flex-col gap-0.5">
			<h1 class="text-lg font-semibold">Notifications</h1>
			<p class="text-xs text-muted-foreground">
				See what's happening across your business in one place.
			</p>
		</div>
		<Button
			variant="outline"
			size="sm"
			class="gap-1.5 self-start sm:self-auto"
			disabled={unreadCount === 0}
			onclick={markAllAsRead}
		>
			<Checks class="size-4" />
			Mark all as read
		</Button>
	</div>

	<div class="flex items-center gap-1 border-b">
		{#each filters as item (item.value)}
			<button
				type="button"
				aria-pressed={filter === item.value}
				class="flex items-center gap-1.5 border-b-2 px-3 pb-2 text-sm transition-colors {filter ===
				item.value
					? 'border-foreground font-medium text-foreground'
					: 'border-transparent text-muted-foreground hover:text-foreground'}"
				onclick={() => (filter = item.value)}
			>
				{item.label}
				{#if item.value === 'unread' && unreadCount > 0}
					<Badge variant="secondary" class="h-4 min-w-4 justify-center px-1 text-[10px]">
						{unreadCount}
					</Badge>
				{/if}
			</button>
		{/each}
	</div>

	{#if filteredNotifications.length === 0}
		<div class="py-8">
			<PikslotEmpty
				icon={Bell}
				title={filter === 'unread' ? "You're all caught up" : 'Nothing here right now'}
				description={filter === 'unread'
					? 'You have no unread notifications. New updates will appear here.'
					: 'Notifications you have already read will appear here.'}
			/>
		</div>
	{:else}
		<div class="overflow-hidden rounded-lg border">
			{#each filteredNotifications as notification (notification.id)}
				{@const meta = notificationMeta[notification.kind]}
				<button
					type="button"
					class="relative flex w-full items-start gap-3 border-b px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-muted/50 {notification.read
						? ''
						: 'bg-primary/3'}"
					onclick={() => openNotification(notification)}
				>
					<div
						class="flex size-9 shrink-0 items-center justify-center rounded-full {meta.className}"
					>
						<meta.icon class="size-4" />
					</div>

					<div class="flex min-w-0 flex-1 flex-col gap-1">
						<div class="flex flex-wrap items-center gap-2">
							<span class="text-sm font-medium">{notification.title}</span>
							<Badge variant="outline">{meta.label}</Badge>
							{#if !notification.read}
								<span class="size-2 rounded-full bg-primary" aria-label="Unread"></span>
							{/if}
						</div>
						<span class="text-xs text-muted-foreground">{notification.message}</span>
					</div>

					<span class="shrink-0 text-xs text-muted-foreground">
						{formatRelativeTime(notification.createdAt)}
					</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
