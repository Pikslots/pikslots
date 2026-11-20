<script lang="ts">
	import { LoaderCircle, CalendarX } from '@lucide/svelte';

	export type Slot = { startTime: string; endTime: string };

	let {
		slots,
		startTime,
		endTime,
		timezone,
		loading = false,
		disabled = false,
		onSelect
	}: {
		slots: Slot[];
		startTime: string;
		endTime: string;
		timezone: string;
		loading?: boolean;
		disabled?: boolean;
		onSelect: (slot: Slot) => void;
	} = $props();

	function formatTime(iso: string): string {
		const date = new Date(iso);
		if (!iso || isNaN(date.getTime())) return '';
		return new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			timeZone: timezone
		}).format(date);
	}

	// Keep the booking's current time pickable even when it isn't a free slot (edit flow)
	const options = $derived.by(() => {
		const list = slots.filter((s) => formatTime(s.startTime));
		if (formatTime(startTime) && !list.some((s) => s.startTime === startTime)) {
			list.unshift({ startTime, endTime });
		}
		return list;
	});

	const selectedRange = $derived(
		formatTime(startTime) && formatTime(endTime)
			? `${formatTime(startTime)} – ${formatTime(endTime)}`
			: ''
	);
</script>

<div
	class="transition-opacity duration-200"
	class:pointer-events-none={disabled}
	class:opacity-40={disabled}
>
	{#if loading}
		<div class="flex items-center gap-2 border border-dashed bg-muted/30 px-3 py-3">
			<LoaderCircle class="size-4 animate-spin text-muted-foreground" />
			<span class="text-xs text-muted-foreground">Finding available times...</span>
		</div>
	{:else if options.length === 0}
		<div
			class="flex items-center gap-2 border border-dashed px-3 py-3 {disabled
				? 'bg-muted/30'
				: 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30'}"
		>
			<CalendarX
				class="size-4 shrink-0 {disabled
					? 'text-muted-foreground'
					: 'text-amber-600 dark:text-amber-400'}"
			/>
			<span
				class="text-xs {disabled ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-300'}"
			>
				{disabled
					? 'Choose a service to see available times'
					: 'No free times on this day. Try another date.'}
			</span>
		</div>
	{:else}
		<div
			role="radiogroup"
			aria-label="Available times"
			class="grid max-h-44 grid-cols-3 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-4"
		>
			{#each options as slot (slot.startTime)}
				{@const selected = slot.startTime === startTime}
				<button
					type="button"
					role="radio"
					aria-checked={selected}
					class="border px-2 py-2 text-xs font-medium tabular-nums transition-colors {selected
						? 'border-primary bg-primary text-primary-foreground shadow-sm'
						: 'bg-background hover:border-primary/50 hover:bg-primary/5 dark:hover:border-chart-1/50'}"
					onclick={() => onSelect(slot)}
				>
					{formatTime(slot.startTime)}
				</button>
			{/each}
		</div>
		{#if selectedRange}
			<p class="mt-2 text-xs text-muted-foreground">
				Selected: <span class="font-medium text-foreground tabular-nums">{selectedRange}</span>
			</p>
		{/if}
	{/if}
</div>
