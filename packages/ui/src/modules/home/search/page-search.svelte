<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { searchStore } from '$stores/search.svelte.js';
	import { authStore } from '$stores/auth.svelte.js';
	import { getSearchPages, type SearchPage } from '../nav-menu/search-pages';

	let query = $state('');
	let inputRef = $state<HTMLInputElement | null>(null);

	const pages = $derived(getSearchPages(authStore.getPayloadData()?.role));
	const groups = $derived(
		[
			{ label: 'Pages', items: pages.filter((page) => page.group === 'Pages') },
			{ label: 'Settings', items: pages.filter((page) => page.group === 'Settings') }
		].filter((group) => group.items.length > 0)
	);

	$effect(() => {
		if (searchStore.open) {
			inputRef?.focus();
		} else {
			query = '';
		}
	});

	function select(page: SearchPage) {
		searchStore.close();
		goto(page.url);
	}

	function handleKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			searchStore.toggle();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<Sheet.Root bind:open={() => searchStore.open, (open) => (searchStore.open = open)}>
	<Sheet.Content
		side="top"
		showCloseButton={false}
		class="bg-transparent p-3 shadow-none data-[side=top]:border-b-0 sm:p-4"
	>
		<Sheet.Header class="sr-only">
			<Sheet.Title>Search pages</Sheet.Title>
			<Sheet.Description>Search for a page to navigate to.</Sheet.Description>
		</Sheet.Header>
		<div class="mx-auto w-full max-w-2xl">
			<Command.Root
				label="Search pages"
				class="rounded-2xl border shadow-sm [&_[data-slot=command-input-wrapper]]:border-b-0 [&_[data-slot=command-input-wrapper]]:p-2 [&_[data-slot=input-group]]:rounded-xl"
			>
				<Command.Input
					bind:ref={inputRef}
					bind:value={query}
					placeholder="Search pages..."
					class="h-10 text-sm"
				/>
				<Command.List class="max-h-[60vh] p-1">
					<Command.Empty>No pages found.</Command.Empty>
					{#each groups as group (group.label)}
						<Command.Group heading={group.label}>
							{#each group.items as page (page.url)}
								<Command.Item
									value={`${page.group}:${page.label}`}
									keywords={[page.label, page.group, ...page.keywords]}
									onSelect={() => select(page)}
								>
									<page.icon class="text-muted-foreground" />
									<div class="flex flex-col">
										<span>{page.label}</span>
										<span class="text-xs text-muted-foreground">{page.description}</span>
									</div>
								</Command.Item>
							{/each}
						</Command.Group>
					{/each}
				</Command.List>
			</Command.Root>
		</div>
	</Sheet.Content>
</Sheet.Root>
