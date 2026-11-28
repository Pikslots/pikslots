<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import SettingsSidebar from '$lib/components/settings-sidebar.svelte';
	import { settingsStore } from '$stores/settings.svelte.js';
	import { authStore } from '$stores/auth.svelte.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { slide } from 'svelte/transition';
	import PikslotHeader from './header/pikslot-header.svelte';
	import PikslotsSidebar from './sidebar/pikslots-sidebar.svelte';
	import PageSearch from '../search/page-search.svelte';
	import { getBusinessByIdQueryOptions } from '../../api/business/get.business.by.id.query';
	import { createQuery } from '@tanstack/svelte-query';
	import { businessStore } from '$stores/business.svelte';

	let { children } = $props();
	// The session carries the active business for every role; for platform owners it is the
	// business they last switched to, so it is restored here even where the switcher is hidden
	const businessFindByIdQuery = createQuery(() =>
		getBusinessByIdQueryOptions(
			authStore.isAuthenticated,
			authStore.getPayloadData()?.businessId ?? ''
		)
	);

	$effect(() => {
		if (!authStore.isInitializing && !authStore.isAuthenticated) goto(resolve('/login'));

		if (businessFindByIdQuery.data) businessStore.setSelectedBusiness(businessFindByIdQuery.data);
	});

	let wasInSettings = false;

	$effect(() => {
		const inSettings = $page.url.pathname.startsWith('/home/settings');

		if (inSettings && !wasInSettings) settingsStore.makeOpen();
		if (!inSettings && wasInSettings) settingsStore.close();

		wasInSettings = inSettings;
	});

	// Close the phone settings sheet once a settings link has navigated
	$effect(() => {
		void $page.url.pathname;
		settingsStore.mobileOpen = false;
	});
</script>

{#if !authStore.isInitializing && authStore.isAuthenticated}
	<Sidebar.Provider
		style="
		--sidebar-width: calc(var(--spacing) * 64);
		--header-height: calc(var(--spacing) * 12);
	"
	>
		<PikslotsSidebar variant="inset" />
		{#if settingsStore.open}
			<div class="hidden shrink-0 md:block" transition:slide={{ axis: 'x', duration: 200 }}>
				<SettingsSidebar />
			</div>
		{/if}
		<Sheet.Root bind:open={settingsStore.mobileOpen}>
			<Sheet.Content side="left" class="w-72 p-0 md:hidden">
				<Sheet.Title class="sr-only">Settings menu</Sheet.Title>
				<SettingsSidebar inSheet />
			</Sheet.Content>
		</Sheet.Root>
		<Sidebar.Inset class="min-w-0">
			<PikslotHeader />
			<div class="flex flex-1 flex-col">
				<div class="@container/main flex flex-1 flex-col gap-2">
					<div class="flex flex-col gap-4 px-2 py-4 md:gap-6 md:py-6">
						{@render children()}
					</div>
				</div>
			</div>
		</Sidebar.Inset>
	</Sidebar.Provider>
	<PageSearch />
{/if}
