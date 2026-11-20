<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import AddTimeoff from '../dialogs/add-timeoff.svelte';
	import EditTimeoff from '../dialogs/edit-timeoff.svelte';
	import Plus from '@tabler/icons-svelte/icons/plus';
	import Pencil from '@tabler/icons-svelte/icons/pencil';
	import Trash from '@tabler/icons-svelte/icons/trash';
	import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { toast } from 'svelte-sonner';
	import { diffInCalendarDays, formatIsoInTimezone } from '@pikslots/datetime';
	import { authStore } from '$stores/auth.svelte';
	import type { FindTimeoffByIdResponse } from '@pikslots/shared';
	import { getTimeoffsByUserQueryOptions } from '../../../api/timeoff/get.timeoffs.by.user.query';
	import { deleteTimeoffMutationOptions } from '../../../api/timeoff/delete.timeoff.mutation';

	const userId = authStore.getPayloadData()?.userId ?? '';
	const businessId = authStore.getPayloadData()?.businessId ?? '';

	const queryClient = useQueryClient();

	const timeoffsQuery = createQuery(() => getTimeoffsByUserQueryOptions(userId, businessId));
	const deleteMutation = createMutation(() => deleteTimeoffMutationOptions());

	let hoveredId = $state<string | null>(null);
	let dialogOpen = $state(false);
	let editDialogOpen = $state(false);
	let editingTimeoff = $state<FindTimeoffByIdResponse | null>(null);

	function openEditDialog(entry: FindTimeoffByIdResponse) {
		editingTimeoff = entry;
		editDialogOpen = true;
	}

	function toDays(startDateTime: string, endDateTime: string, allDay: boolean, timeZone: string) {
		if (allDay) {
			return diffInCalendarDays(startDateTime, endDateTime, timeZone);
		}
		const start = new Date(startDateTime);
		const end = new Date(endDateTime);
		const msPerDay = 24 * 60 * 60 * 1000;
		return Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerDay) + 1);
	}

	function formatDateRange(entry: {
		startDateTime: string;
		endDateTime: string;
		allDay: boolean;
		timeZone: string;
	}) {
		const startDateStr = formatIsoInTimezone(entry.startDateTime, entry.timeZone);

		if (entry.allDay) {
			const days = diffInCalendarDays(entry.startDateTime, entry.endDateTime, entry.timeZone);
			if (days <= 1) return startDateStr;
			const endDateStr = formatIsoInTimezone(entry.endDateTime, entry.timeZone);
			return `${startDateStr} - ${endDateStr}`;
		}

		const endDateStr = formatIsoInTimezone(entry.endDateTime, entry.timeZone);
		const startTimeStr = formatIsoInTimezone(entry.startDateTime, entry.timeZone, 'h:mm a');
		const endTimeStr = formatIsoInTimezone(entry.endDateTime, entry.timeZone, 'h:mm a');

		return startDateStr === endDateStr
			? `${startDateStr}, ${startTimeStr} - ${endTimeStr}`
			: `${startDateStr} ${startTimeStr} - ${endDateStr} ${endTimeStr}`;
	}

	function removeTimeOff(id: string) {
		deleteMutation.mutate(id, {
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ['timeoffs', 'user', userId, businessId] });
				toast.success('Time off removed');
			},
			onError: () => {
				toast.error('Failed to remove time off');
			}
		});
	}
</script>

<div class="flex w-full max-w-3xl flex-col px-4 sm:px-6">
	<div class="pt-4 pb-2">
		<Button
			variant="link"
			class="h-auto gap-1.5 p-0 text-xs font-medium"
			onclick={() => (dialogOpen = true)}
		>
			<Plus size={14} />
			Add time off
		</Button>
	</div>

	<div class="flex flex-col divide-y divide-border/90">
		{#if timeoffsQuery.isLoading}
			<p class="py-3 text-xs text-muted-foreground">Loading time offs…</p>
		{:else if timeoffsQuery.isError}
			<p class="py-3 text-xs text-destructive">Failed to load time offs.</p>
		{:else if (timeoffsQuery.data ?? []).length === 0}
			<p class="py-3 text-xs text-muted-foreground">No time offs added yet.</p>
		{:else}
			{#each timeoffsQuery.data ?? [] as entry (entry.id)}
				<div
					class="flex items-center justify-between py-3"
					role="group"
					onmouseenter={() => (hoveredId = entry.id)}
					onmouseleave={() => (hoveredId = null)}
				>
					<div class="flex flex-col gap-0.5">
						<span class="text-xs font-medium">{entry.title}</span>
						<span class="text-xs text-muted-foreground">
							{formatDateRange(entry)}
						</span>
					</div>

					<div class="flex items-center gap-2">
						{#if hoveredId === entry.id}
							<Button variant="ghost" size="icon-sm" onclick={() => openEditDialog(entry)}>
								<Pencil size={14} />
							</Button>
							<Button
								variant="ghost"
								size="icon-sm"
								onclick={() => removeTimeOff(entry.id)}
								class="text-muted-foreground hover:text-destructive"
							>
								<Trash size={14} />
							</Button>
						{:else}
							{@const days = toDays(
								entry.startDateTime,
								entry.endDateTime,
								entry.allDay,
								entry.timeZone
							)}
							<span class="text-xs text-muted-foreground">
								{days}
								{days === 1 ? 'Day' : 'Days'}
							</span>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<AddTimeoff bind:open={dialogOpen} {userId} {businessId} />
<EditTimeoff bind:open={editDialogOpen} timeoff={editingTimeoff} {userId} {businessId} />
