<script lang="ts">
	import type { Icon } from '@tabler/icons-svelte';
	import type { ResolvedPathname } from '$app/types';

	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { page } from '$app/stores';
	import { settingsStore } from '$stores/settings.svelte';

	let { items }: { items: { name: string; url: ResolvedPathname; icon: Icon }[] } = $props();

	// const sidebar = Sidebar.useSidebar();

	function matches(url: string): boolean {
		return $page.url.pathname === url || $page.url.pathname.startsWith(url + '/');
	}

	// Only the most specific match is active, so /home doesn't light up on /home/bookings
	const activeUrl = $derived(
		items
			.map((item) => item.url)
			.filter(matches)
			.sort((a, b) => b.length - a.length)[0]
	);

	function isActive(url: string): boolean {
		return url === activeUrl;
	}
</script>

<Sidebar.Group class="group-data-[collapsible=icon]:hidden">
	<Sidebar.GroupLabel>Manage</Sidebar.GroupLabel>
	<Sidebar.Menu>
		{#each items as item (item.name)}
			<Sidebar.MenuItem>
				<Sidebar.MenuButton isActive={isActive(item.url)}>
					{#snippet child({ props })}
						<a {...props} href={item.url} onclick={() => settingsStore.close()}>
							<item.icon />
							<span>{item.name}</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		{/each}
	</Sidebar.Menu>
</Sidebar.Group>
