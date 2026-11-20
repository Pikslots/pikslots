<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import Copy from '@tabler/icons-svelte/icons/copy';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { updateUserWorkingHoursMutationOptions } from '../../../api/user/update.user.working.hours.mutation';
	import { authStore } from '$stores/auth.svelte';
	import { WEEKDAYS, halfHourTimes, fromHHmm, toHHmm } from '$utils/working-hours';
	import { toast } from 'svelte-sonner';
	import type { UserWorkingHoursResponse } from '@pikslots/shared';

	let { userWorkingHours }: { userWorkingHours: UserWorkingHoursResponse | undefined } = $props();

	const queryClient = useQueryClient();
	const workingHoursMutation = createMutation(() => updateUserWorkingHoursMutationOptions());

	type DaySchedule = { label: string; enabled: boolean; start: string; end: string };

	let days = $state<DaySchedule[]>([]);

	$effect(() => {
		if (!userWorkingHours) return;
		days = WEEKDAYS.map((day) => ({
			label: day.charAt(0).toUpperCase() + day.slice(1),
			enabled: userWorkingHours[day].enabled,
			start: fromHHmm(userWorkingHours[day].openTime),
			end: fromHHmm(userWorkingHours[day].closeTime)
		}));
	});

	const isWorkingHoursDirty = $derived.by(() => {
		if (!userWorkingHours || days.length === 0) return false;
		return WEEKDAYS.some(
			(day, i) =>
				days[i].enabled !== userWorkingHours[day].enabled ||
				days[i].start !== fromHHmm(userWorkingHours[day].openTime) ||
				days[i].end !== fromHHmm(userWorkingHours[day].closeTime)
		);
	});

	function copyToAll(index: number) {
		const source = days[index];
		days = days.map((d, i) => (i === index ? d : { ...d, start: source.start, end: source.end }));
	}

	function reset() {
		if (!userWorkingHours) return;
		days = WEEKDAYS.map((day) => ({
			label: day.charAt(0).toUpperCase() + day.slice(1),
			enabled: userWorkingHours[day].enabled,
			start: fromHHmm(userWorkingHours[day].openTime),
			end: fromHHmm(userWorkingHours[day].closeTime)
		}));
	}

	async function save() {
		const userId = authStore.getPayloadData()?.userId;
		if (!userId) return;
		await workingHoursMutation.mutateAsync({
			userId,
			...Object.fromEntries(
				WEEKDAYS.map((day, i) => [
					day,
					{
						enabled: days[i].enabled,
						openTime: toHHmm(days[i].start),
						closeTime: toHHmm(days[i].end)
					}
				])
			)
		} as Parameters<typeof workingHoursMutation.mutateAsync>[0]);
		await queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
		toast.success('Working hours updated successfully');
	}
</script>

<div class="flex w-full max-w-3xl flex-col px-4 sm:px-6">
	<p class="pt-4 pb-2 text-xs text-muted-foreground">
		What days and hours does your business operate? This determines your business availability.
	</p>
	<div class="flex flex-col divide-y divide-border/90">
		{#each days as day, i (day.label)}
			<div class="flex items-center gap-4 py-2">
				<Switch bind:checked={day.enabled} />
				<span class="w-28 text-xs font-medium">{day.label}</span>

				{#if day.enabled}
					<Select.Root type="single" bind:value={day.start}>
						<Select.Trigger class="w-28 text-xs">
							{day.start}
						</Select.Trigger>
						<Select.Content class="max-h-60 overflow-y-auto">
							{#each halfHourTimes as t (t)}
								<Select.Item value={t}>{t}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>

					<span class="text-muted-foreground">—</span>

					<Select.Root type="single" bind:value={day.end}>
						<Select.Trigger class="w-28 text-xs">
							{day.end}
						</Select.Trigger>
						<Select.Content class="max-h-60 overflow-y-auto">
							{#each halfHourTimes as t (t)}
								<Select.Item value={t}>{t}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>

					{#if i === 0}
						<Button
							variant="ghost"
							size="icon-sm"
							onclick={() => copyToAll(i)}
							title="Copy hours to all days"
							class="ml-auto"
						>
							<Copy size={15} />
						</Button>
					{/if}
				{:else}
					<span class="ml-auto rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground">
						Day off
					</span>
				{/if}
			</div>
		{/each}
	</div>

	<div class="flex items-center justify-end gap-2 py-4">
		<Button
			class="cursor-pointer"
			variant="ghost"
			onclick={reset}
			disabled={!isWorkingHoursDirty || workingHoursMutation.isPending}
		>
			Cancel
		</Button>
		<Button
			class="cursor-pointer"
			onclick={save}
			disabled={!isWorkingHoursDirty || workingHoursMutation.isPending}
		>
			{workingHoursMutation.isPending ? 'Saving…' : 'Save'}
		</Button>
	</div>
</div>
