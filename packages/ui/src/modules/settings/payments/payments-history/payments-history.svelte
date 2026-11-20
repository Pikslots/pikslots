<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import Search from '@tabler/icons-svelte/icons/search';

	let searchQuery = $state('');
	let fromDate = $state('2026-05-17');
	let toDate = $state('2026-05-23');

	// Mock empty state — replace with real data
	const payments: never[] = [];
</script>

<div class="flex flex-col">
	<!-- Page header -->
	<div class="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
		<h1 class="text-base font-semibold">Payments</h1>
	</div>

	<div class="flex flex-col gap-4 px-6 py-4">
		<h2 class="text-sm font-semibold">Payment history</h2>

		<!-- Filters row -->
		<div class="flex items-center gap-3">
			<div class="relative flex-1">
				<Input
					bind:value={searchQuery}
					placeholder="Search by date, service or customer"
					class="pl-9 text-xs"
				/>
				<Search size={14} class="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground" />
			</div>

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

			<Button>Generate</Button>
		</div>

		<!-- Empty state -->
		{#if payments.length === 0}
			<div class="flex flex-1 flex-col items-center justify-center gap-1 py-32 text-center">
				<span class="text-xs font-semibold">No payments to display</span>
				<span class="text-xs text-muted-foreground">Try a different date range.</span>
			</div>
		{/if}
	</div>
</div>
