<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import Check from '@tabler/icons-svelte/icons/check';
	import { Button } from '$lib/components/ui/button/index.js';
	import { notificationsStore } from '$stores/notifications.svelte';
	import { notificationMeta, type NotificationItem } from './data';

	let { notification }: { notification: NotificationItem } = $props();

	const meta = $derived(notificationMeta[notification.kind] ?? notificationMeta.system);

	function openNotification() {
		goto(
			resolve('/home/notifications/[notificationId]', {
				notificationId: notification.id
			})
		);
		toast.dismiss(notification.id);
	}

	function markAsRead(event: MouseEvent) {
		event.stopPropagation();
		notificationsStore.markAsRead(notification.id);
		toast.dismiss(notification.id);
	}
</script>

<div
	role="button"
	tabindex="0"
	onclick={openNotification}
	onkeydown={(event) => {
		if (event.target !== event.currentTarget) return;

		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			openNotification();
		}
	}}
	class="flex w-[360px] max-w-[calc(100vw-2rem)] cursor-pointer items-start gap-3 rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg transition-colors outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
>
	<div class="flex size-9 shrink-0 items-center justify-center rounded-full {meta.className}">
		<meta.icon class="size-4" />
	</div>

	<div class="flex min-w-0 flex-1 flex-col gap-1">
		<span class="truncate text-sm font-medium">{notification.title}</span>
		<span class="line-clamp-2 text-xs text-muted-foreground">{notification.message}</span>

		<div class="mt-2 flex">
			<Button variant="outline" size="sm" onclick={markAsRead}>
				<Check class="size-3.5" />
				Mark as read
			</Button>
		</div>
	</div>
</div>
