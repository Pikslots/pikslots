<script lang="ts">
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import { createQuery } from '@tanstack/svelte-query';
	import { CircleCheck, LoaderCircle, Search, X } from '@lucide/svelte';
	import { debounceCustomerSearchQueryOptions } from '../../api/customer/debounce.customer.search.query';

	let {
		businessId,
		customerId = $bindable(''),
		search = $bindable(''),
		invalid = false
	}: {
		businessId: string;
		customerId: string;
		search: string;
		invalid?: boolean;
	} = $props();

	let debouncedSearch = $state('');

	$effect(() => {
		const value = search;
		const timer = setTimeout(() => (debouncedSearch = value), 500);
		return () => clearTimeout(timer);
	});

	const searchQuery = createQuery(() => ({
		...debounceCustomerSearchQueryOptions(businessId, debouncedSearch),
		enabled: !!businessId && debouncedSearch.trim().length > 0 && !customerId
	}));

	const results = $derived(searchQuery.data ?? []);
	const showResults = $derived(search.trim().length > 0 && !customerId);

	function select(id: string, name: string) {
		customerId = id;
		search = name;
		debouncedSearch = '';
	}

	function clear() {
		customerId = '';
		search = '';
		debouncedSearch = '';
	}

	// Focusing a picked customer starts a fresh search
	function onFocus() {
		if (customerId) clear();
	}

	const initials = (first: string, last: string) =>
		`${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
</script>

<div class="relative">
	<InputGroup.Root>
		<InputGroup.Addon>
			{#if customerId}
				<CircleCheck class="text-emerald-600 dark:text-emerald-400" />
			{:else}
				<Search />
			{/if}
		</InputGroup.Addon>
		<InputGroup.Input
			type="text"
			placeholder="Search by name, email or phone..."
			aria-invalid={invalid || undefined}
			bind:value={search}
			onfocus={onFocus}
		/>
		{#if customerId || search.trim().length > 0}
			<InputGroup.Addon align="inline-end">
				<InputGroup.Button size="icon-xs" aria-label="Clear customer" onclick={clear}>
					<X />
				</InputGroup.Button>
			</InputGroup.Addon>
		{/if}
	</InputGroup.Root>

	{#if showResults}
		<div class="mt-1 max-h-52 w-full overflow-y-auto border bg-popover shadow-sm">
			{#if searchQuery.isPending}
				<div class="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground">
					<LoaderCircle class="size-3.5 animate-spin" /> Searching...
				</div>
			{:else if results.length === 0}
				<div class="px-3 py-2.5 text-xs text-muted-foreground">No customers found</div>
			{:else}
				{#each results as customer (customer.id)}
					<button
						type="button"
						class="flex w-full items-center gap-3 border-b px-3 py-2 text-left last:border-b-0 hover:bg-accent hover:text-accent-foreground"
						onclick={() => select(customer.id, `${customer.firstName} ${customer.lastName}`)}
					>
						<span
							class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary dark:bg-primary/30 dark:text-chart-1"
						>
							{initials(customer.firstName, customer.lastName)}
						</span>
						<span class="min-w-0">
							<span class="block truncate text-sm">{customer.firstName} {customer.lastName}</span>
							{#if customer.email}
								<span class="block truncate text-xs text-muted-foreground">{customer.email}</span>
							{/if}
						</span>
					</button>
				{/each}
			{/if}
		</div>
	{/if}
</div>
