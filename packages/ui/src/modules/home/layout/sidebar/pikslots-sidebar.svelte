<script lang="ts">
	import PikslotsLogo from '$lib/components/pikslots-logo.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';
	import { resolve } from '$app/paths';
	import { navPrimary, navSecondary } from '../../nav-menu/menu';
	import NavPrimary from './nav-primary.svelte';
	import NavSecondary from './nav-secondary.svelte';
	import NavUser from './nav-user.svelte';
	import BusinessSwitcher from './business-switcher/business-switcher.svelte';
	import { authStore } from '$stores/auth.svelte';
	import type { UserRole } from '@pikslots/shared';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { themeStore } from '$stores/theme.svelte.js';
	import MoonIcon from '@tabler/icons-svelte/icons/moon';

	let { ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();

	const currentUserRole = $derived(authStore.getPayloadData());

	function isItemAllowed(roles: UserRole[] | null): boolean {
		if (!currentUserRole) return false;
		if (!roles) return true;
		return roles.includes(currentUserRole.role);
	}

	const mainOptions = $derived(navPrimary.filter((item) => isItemAllowed(item?.roles ?? null)));
</script>

<Sidebar.Root collapsible="offcanvas" {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton
					class="h-auto px-2 py-1.5 text-2xl hover:bg-transparent active:bg-transparent"
				>
					{#snippet child({ props })}
						<a href={resolve('/home')} {...props}><PikslotsLogo /></a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
		<BusinessSwitcher />
	</Sidebar.Header>
	<Sidebar.Content>
		<!-- <NavMain items={data.navMain} /> -->
		<NavPrimary items={mainOptions} />
		<NavSecondary items={navSecondary} class="mt-auto">
			<Sidebar.MenuItem>
				<Sidebar.MenuButton
					aria-pressed={themeStore.current === 'dark'}
					onclick={() => themeStore.set(themeStore.current === 'dark' ? 'light' : 'dark')}
				>
					<MoonIcon />
					<span>Dark mode</span>
					<Switch
						class="pointer-events-none ml-auto"
						tabindex={-1}
						aria-hidden="true"
						checked={themeStore.current === 'dark'}
					/>
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</NavSecondary>
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser />
	</Sidebar.Footer>
</Sidebar.Root>
