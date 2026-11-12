<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { WithoutChildren } from '$lib/utils.js';
	import type { ComponentProps } from 'svelte';
	import type { Icon } from '@tabler/icons-svelte';
	import type { ResolvedPathname } from '$app/types';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';

	let {
		items,
		...restProps
	}: {
		items: {
			title: string;
			url: ResolvedPathname | '#';
			icon: Icon;
			onclick?: () => void;
			shortcut?: boolean;
			badge?: () => number;
		}[];
	} & WithoutChildren<ComponentProps<typeof Sidebar.Group>> = $props();

	const isMac = $derived(browser && /Mac|iPhone|iPad|iPod/.test(navigator.platform));

	function isActive(url: string): boolean {
		return $page.url.pathname === url || $page.url.pathname.startsWith(url + '/');
	}
</script>

<Sidebar.Group {...restProps}>
	<Sidebar.GroupContent>
		<Sidebar.Menu>
			{#each items as item (item.title)}
				<Sidebar.MenuItem>
					<Sidebar.MenuButton isActive={isActive(item.url)}
						>>
						{#snippet child({ props })}
							{#if item.url !== '#'}
								<a href={item.url} {...props} onclick={item.onclick}>
									<item.icon />
									<span>{item.title}</span>
									{#if item.badge && item.badge() > 0}
										<Badge
											aria-label="{item.badge()} unread notifications"
											class="ml-auto h-5 min-w-5 justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white"
										>
											{item.badge()}
										</Badge>
									{/if}
									{#if item.shortcut}
										<span class="ml-auto text-xs text-muted-foreground"
											>{isMac ? '⌘K' : 'Ctrl K'}</span
										>
									{/if}
								</a>
							{:else}
								<button type="button" {...props} onclick={item.onclick}>
									<item.icon />
									<span>{item.title}</span>
									{#if item.badge && item.badge() > 0}
										<Badge
											aria-label="{item.badge()} unread notifications"
											class="ml-auto h-5 min-w-5 justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white"
										>
											{item.badge()}
										</Badge>
									{/if}
									{#if item.shortcut}
										<span class="ml-auto text-xs text-muted-foreground"
											>{isMac ? '⌘K' : 'Ctrl K'}</span
										>
									{/if}
								</button>
							{/if}
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			{/each}
		</Sidebar.Menu>
	</Sidebar.GroupContent>
</Sidebar.Group>
