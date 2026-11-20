<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import Plus from '@tabler/icons-svelte/icons/plus';
	import Trash from '@tabler/icons-svelte/icons/trash';
	import { WEEKDAYS, quarterHourTimes, fromHHmm, toHHmm } from '$utils/working-hours';
	import { SvelteSet } from 'svelte/reactivity';
	import type { UserWorkingHoursResponse, WeekDay } from '@pikslots/shared';
	import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { toast } from 'svelte-sonner';
	import { getBreaksByUserQueryOptions } from '../../../api/break/get.breaks.by.user.query';
	import { createBreakMutationOptions } from '../../../api/break/create.break.mutation';
	import { updateBreakMutationOptions } from '../../../api/break/update.break.mutation';
	import { deleteBreakMutationOptions } from '../../../api/break/delete.break.mutation';

	let {
		userWorkingHours,
		userId,
		businessId
	}: {
		userWorkingHours: UserWorkingHoursResponse | undefined;
		userId: string;
		businessId: string;
	} = $props();

	const queryClient = useQueryClient();

	const breaksQuery = createQuery(() => getBreaksByUserQueryOptions(userId, businessId));
	const createMut = createMutation(() => createBreakMutationOptions());
	const updateMut = createMutation(() => updateBreakMutationOptions());
	const deleteMut = createMutation(() => deleteBreakMutationOptions());

	type BreakEntry = { id?: string; start: string; end: string };
	type DayBreaks = {
		label: string;
		day: WeekDay;
		workday: boolean;
		enabled: boolean;
		breaks: BreakEntry[];
	};

	let breakDays = $state<DayBreaks[]>([]);

	function buildDayBreaks(): DayBreaks[] {
		if (!userWorkingHours) return [];
		const apiBreaks = breaksQuery.data ?? [];
		return WEEKDAYS.map((day) => {
			const dayBreaks = apiBreaks
				.filter((b) => b.day === day)
				.map((b) => ({ id: b.id, start: fromHHmm(b.startTime), end: fromHHmm(b.endTime) }));
			return {
				label: day.charAt(0).toUpperCase() + day.slice(1),
				day,
				workday: userWorkingHours[day].enabled,
				enabled: dayBreaks.length > 0,
				breaks: dayBreaks
			};
		});
	}

	$effect(() => {
		if (!userWorkingHours) return;
		void breaksQuery.data;
		breakDays = buildDayBreaks();
	});

	function addBreak(dayIndex: number) {
		breakDays[dayIndex].breaks.push({ start: '9:00 AM', end: '9:15 AM' });
	}

	function removeBreak(dayIndex: number, breakIndex: number) {
		breakDays[dayIndex].breaks.splice(breakIndex, 1);
	}

	function getConflictingIndices(breaks: BreakEntry[]): Set<number> {
		const conflicting = new SvelteSet<number>();
		for (let i = 0; i < breaks.length; i++) {
			if (toHHmm(breaks[i].start) >= toHHmm(breaks[i].end)) {
				conflicting.add(i);
			}
		}
		for (let i = 0; i < breaks.length; i++) {
			for (let j = i + 1; j < breaks.length; j++) {
				const aStart = toHHmm(breaks[i].start);
				const aEnd = toHHmm(breaks[i].end);
				const bStart = toHHmm(breaks[j].start);
				const bEnd = toHHmm(breaks[j].end);
				if (aStart < bEnd && aEnd > bStart) {
					conflicting.add(i);
					conflicting.add(j);
				}
			}
		}
		return conflicting;
	}

	const conflictsByDay = $derived.by(() =>
		breakDays.map((day) => {
			if (!day.enabled || day.breaks.length === 0) return new Set<number>();
			return getConflictingIndices(day.breaks);
		})
	);

	const hasConflicts = $derived(conflictsByDay.some((s) => s.size > 0));

	const isSaving = $derived(createMut.isPending || updateMut.isPending || deleteMut.isPending);

	async function save() {
		const apiBreaks = breaksQuery.data ?? [];
		const ops: Promise<unknown>[] = [];

		for (const day of breakDays) {
			const originalDayBreaks = apiBreaks.filter((b) => b.day === day.day);

			if (!day.enabled) {
				for (const orig of originalDayBreaks) {
					ops.push(deleteMut.mutateAsync(orig.id));
				}
				continue;
			}

			const currentIds = new Set(day.breaks.filter((b) => b.id).map((b) => b.id!));

			for (const orig of originalDayBreaks) {
				if (!currentIds.has(orig.id)) {
					ops.push(deleteMut.mutateAsync(orig.id));
				}
			}

			for (const brk of day.breaks) {
				const startTime = toHHmm(brk.start);
				const endTime = toHHmm(brk.end);

				if (!brk.id) {
					ops.push(createMut.mutateAsync({ day: day.day, startTime, endTime, userId, businessId }));
				} else {
					const orig = originalDayBreaks.find((b) => b.id === brk.id);
					if (orig && (orig.startTime !== startTime || orig.endTime !== endTime)) {
						ops.push(updateMut.mutateAsync({ breakId: brk.id, day: day.day, startTime, endTime }));
					}
				}
			}
		}

		try {
			await Promise.all(ops);
			await queryClient.invalidateQueries({ queryKey: ['breaks', 'user', userId] });
			toast.success('Breaks saved successfully');
		} catch {
			toast.error('Failed to save breaks');
		}
	}

	function reset() {
		breakDays = buildDayBreaks();
	}
</script>

<div class="flex w-full max-w-3xl flex-col px-4 sm:px-6">
	<div class="flex flex-col divide-y divide-border/90 pt-4 pb-2">
		{#each breakDays as day, di (day.label)}
			<div class="flex flex-col py-2">
				<div class="flex items-center gap-4">
					<Switch
						bind:checked={day.enabled}
						disabled={!day.workday || breaksQuery.isLoading}
						class={!day.workday ? 'opacity-40' : ''}
					/>

					<span class="w-28 text-xs font-medium {!day.workday ? 'text-muted-foreground' : ''}">
						{day.label}
					</span>

					{#if !day.workday}
						<span class="ml-auto text-xs text-muted-foreground">Day off</span>
					{:else if day.enabled && day.breaks.length === 0}
						<span class="ml-auto text-xs text-muted-foreground">No breaks</span>
						<Button variant="ghost" size="icon-sm" onclick={() => addBreak(di)} class="ml-2">
							<Plus size={14} />
						</Button>
					{:else if !day.enabled}
						<span class="ml-auto text-xs text-muted-foreground">No breaks</span>
					{/if}
				</div>

				{#if day.enabled && day.breaks.length > 0}
					<div class="mt-1 flex flex-col gap-1 pl-[calc(1.25rem+1rem+7rem)]">
						{#each day.breaks as brk, bi (bi)}
							{@const isConflict = conflictsByDay[di]?.has(bi)}
							<div class="flex items-center gap-2">
								<Select.Root type="single" bind:value={brk.start}>
									<Select.Trigger
										class="w-28 text-xs {isConflict
											? 'border-destructive ring-1 ring-destructive focus:ring-destructive'
											: ''}"
									>
										{brk.start}
									</Select.Trigger>
									<Select.Content class="max-h-60 overflow-y-auto">
										{#each quarterHourTimes as t (t)}
											<Select.Item value={t}>{t}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>

								<span class="text-muted-foreground">—</span>

								<Select.Root type="single" bind:value={brk.end}>
									<Select.Trigger
										class="w-28 text-xs {isConflict
											? 'border-destructive ring-1 ring-destructive focus:ring-destructive'
											: ''}"
									>
										{brk.end}
									</Select.Trigger>
									<Select.Content class="max-h-60 overflow-y-auto">
										{#each quarterHourTimes as t (t)}
											<Select.Item value={t}>{t}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>

								{#if bi === day.breaks.length - 1}
									<Button variant="ghost" size="icon-sm" onclick={() => addBreak(di)}>
										<Plus size={14} />
									</Button>
								{:else}
									<Button
										variant="ghost"
										size="icon-sm"
										onclick={() => removeBreak(di, bi)}
										class="text-muted-foreground hover:text-destructive"
									>
										<Trash size={14} />
									</Button>
								{/if}
							</div>
						{/each}

						{#if conflictsByDay[di]?.size > 0}
							<p class="text-xs text-destructive">
								Break slots overlap — adjust the times to resolve the conflict.
							</p>
						{/if}
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<div class="flex items-center justify-end gap-2 py-2">
		{#if hasConflicts}
			<p class="mr-auto text-xs text-destructive">Fix conflicting break slots to save.</p>
		{/if}
		<Button variant="ghost" onclick={reset} disabled={isSaving}>Cancel</Button>
		<Button onclick={save} disabled={isSaving || breaksQuery.isLoading || hasConflicts}>
			{isSaving ? 'Saving…' : 'Save'}
		</Button>
	</div>
</div>
