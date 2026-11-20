<script lang="ts">
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Plus from '@tabler/icons-svelte/icons/plus';
	import type { UserRole } from '@pikslots/shared';
	import { authStore } from '$stores/auth.svelte';
	import { quickActions } from '../../nav-menu/quick-actions';
	import { settingsStore } from '$stores/settings.svelte.js';
	import AdjustmentsHorizontal from '@tabler/icons-svelte/icons/adjustments-horizontal';

	const inSettings = $derived($page.url.pathname.startsWith('/home/settings'));

	const pageTitle = $derived.by(() => {
		const segments = $page.url.pathname.split('/').filter(Boolean);
		if (segments[1] === 'notifications' && segments.length > 2) return 'Notification';
		return segments.pop()?.replace(/-/g, ' ') ?? 'Home';
	});

	const currentUserRole = $derived(authStore.getPayloadData());

	function isItemAllowed(roles: UserRole[] | null): boolean {
		if (!currentUserRole) return false;
		if (!roles) return true;
		return roles.includes(currentUserRole.role);
	}

	const mainOptions = $derived(quickActions.filter((item) => isItemAllowed(item?.roles ?? null)));
</script>

<header
	class="sticky top-0 z-20 flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-md transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)"
>
	<div class="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
		<Sidebar.Trigger class="-ms-1" />
		<Separator orientation="vertical" class="mx-2 data-[orientation=vertical]:h-4" />
		<h1 class="truncate text-base font-semibold tracking-tight capitalize">{pageTitle}</h1>

		{#if inSettings}
			<Button
				variant="outline"
				size="sm"
				class="ml-2 md:hidden"
				onclick={() => (settingsStore.mobileOpen = true)}
			>
				<AdjustmentsHorizontal class="size-4" />
				Menu
			</Button>
		{/if}

		<div class="ml-auto">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button
							class="size-10 rounded-full shadow-md shadow-primary/30 transition-transform hover:scale-105 hover:bg-primary/90 focus-visible:ring-0 focus-visible:ring-offset-0"
							{...props}
						>
							<Plus size={16} class="size-4" />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end" class="w-48">
					<!-- eslint-disable svelte/no-navigation-without-resolve -- some of these action routes (bookings/new, settings/team/invite, customers/new) aren't built yet, so resolve() can't type-check them -->
					{#each mainOptions as action (action.href)}
						<DropdownMenu.Item class="cursor-pointer gap-2.5" onclick={() => goto(action.href)}>
							<action.icon size={15} class="text-muted-foreground" />
							{action.label}
						</DropdownMenu.Item>
					{/each}
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</div>
</header>
