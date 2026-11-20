<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Select from '$lib/components/ui/select/index.js';

	let fromDate = $state('2026-05-23');
	let toDate = $state('2026-05-23');
	let serviceFilter = $state('all');
	let teamMemberFilter = $state('all');
	let generated = $state(false);

	const services = [
		{ value: 'all', label: 'All services/classes/...' },
		{ value: 'haircut', label: 'Haircut' },
		{ value: 'massage', label: 'Massage' }
	];

	const teamMembers = [
		{ value: 'all', label: 'All team members' },
		{ value: 'afaq', label: 'Afaq Javed' }
	];
</script>

<div class="flex h-full flex-col">
	<!-- Page header -->
	<div class="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
		<h1 class="text-base font-semibold">Reports</h1>
	</div>

	<div class="flex flex-col gap-4 px-6 py-4">
		<!-- Filters row -->
		<div class="flex items-center gap-3">
			<input
				type="date"
				bind:value={fromDate}
				class="h-9 rounded-md border border-input bg-background px-3 text-xs shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
			/>

			<input
				type="date"
				bind:value={toDate}
				class="h-9 rounded-md border border-input bg-background px-3 text-xs shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
			/>

			<Select.Root type="single" bind:value={serviceFilter}>
				<Select.Trigger class="w-48 text-xs">
					{services.find((s) => s.value === serviceFilter)?.label}
				</Select.Trigger>
				<Select.Content>
					{#each services as s (s.value)}
						<Select.Item value={s.value}>{s.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>

			<Select.Root type="single" bind:value={teamMemberFilter}>
				<Select.Trigger class="w-44 text-xs">
					{teamMembers.find((m) => m.value === teamMemberFilter)?.label}
				</Select.Trigger>
				<Select.Content>
					{#each teamMembers as m (m.value)}
						<Select.Item value={m.value}>{m.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>

			<Button onclick={() => (generated = true)}>Generate</Button>
		</div>

		<!-- Empty state -->
		{#if !generated}
			<div class="flex flex-1 flex-col items-center justify-center gap-1 py-48 text-center">
				<span class="text-lg font-semibold">Select a date range</span>
				<span class="text-xs text-muted-foreground">
					A report will display for this date range when you click 'Generate'.
				</span>
			</div>
		{/if}
	</div>
</div>
