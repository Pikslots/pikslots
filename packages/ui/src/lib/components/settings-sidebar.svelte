<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';

	import type { UserRole } from '@pikslots/shared';

	import BuildingStore from '@tabler/icons-svelte/icons/building-store';
	import User from '@tabler/icons-svelte/icons/user';
	import Users from '@tabler/icons-svelte/icons/users';
	import AdjustmentsHorizontal from '@tabler/icons-svelte/icons/adjustments-horizontal';
	import CalendarCog from '@tabler/icons-svelte/icons/calendar-cog';
	import Cash from '@tabler/icons-svelte/icons/cash';
	import ChartBar from '@tabler/icons-svelte/icons/chart-bar';
	import CreditCard from '@tabler/icons-svelte/icons/credit-card';
	import Bell from '@tabler/icons-svelte/icons/bell';
	import Star from '@tabler/icons-svelte/icons/star';
	import Lock from '@tabler/icons-svelte/icons/lock';
	import ChevronDown from '@tabler/icons-svelte/icons/chevron-down';
	import LayoutSidebarLeftCollapse from '@tabler/icons-svelte/icons/layout-sidebar-left-collapse';
	import { settingsStore } from '$stores/settings.svelte.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { authStore } from '$stores/auth.svelte';

	type SubItem = { roles?: UserRole[]; label: string; href: ResolvedPathname };

	type MenuItem = {
		label: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon: any;
		href?: ResolvedPathname | '#';
		activePrefix?: string;
		children?: SubItem[];
		roles?: UserRole[];
	};

	type MenuGroup = {
		label?: string;
		items: MenuItem[];
	};

	const currentUserRole = $derived(authStore.getPayloadData());
	const privilegedRoles: UserRole[] = ['Platform Owner', 'Business Owner', 'Admin'];

	const menuGroups: MenuGroup[] = $derived([
		{
			items: [
				currentUserRole?.role === 'Standard' || currentUserRole?.role === 'Enhanced'
					? {
							label: 'Your brand',
							icon: BuildingStore,
							href: resolve('/home/settings/your-brand')
						}
					: {
							label: 'Your brand',
							icon: BuildingStore,
							activePrefix: '/home/settings/brand',
							roles: privilegedRoles,
							children: [
								{ label: 'Brand details', href: resolve('/home/settings/brand/brand-details') },
								{ label: 'Appearance', href: resolve('/home/settings/brand/appearance') },
								{ label: 'Contact details', href: resolve('/home/settings/brand/contact') },
								{ label: 'Location', href: resolve('/home/settings/brand/location') },
								{ label: 'Business Hours', href: resolve('/home/settings/brand/business-hours') },
								{ label: 'Your links', href: resolve('/home/settings/brand/links') }
							]
						},
				{ label: 'Your profile', icon: User, href: resolve('/home/settings/profile') },
				{
					label: 'Your team',
					icon: Users,
					href: resolve('/home/settings/team'),
					roles: privilegedRoles
				},
				{
					label: 'General',
					icon: AdjustmentsHorizontal,
					href: resolve('/home/settings/general'),
					roles: privilegedRoles
				}
			]
		},
		{
			label: 'Manage',
			items: [
				{
					label: 'Booking preferences',
					icon: CalendarCog,
					activePrefix: '/home/settings/booking-preferences',
					roles: privilegedRoles,
					children: [
						{
							label: 'Booking policies',
							href: resolve('/home/settings/booking-preferences/booking-policies')
						},
						{
							label: 'Booking setup',
							href: resolve('/home/settings/booking-preferences/booking-setup')
						},
						{
							label: 'Customization',
							href: resolve('/home/settings/booking-preferences/customization')
						},
						{
							label: 'Booking page visibility',
							href: resolve('/home/settings/booking-preferences/booking-page-visibility')
						}
					]
				},
				// { label: 'Your branded app', icon: DeviceMobile, href: '#' },
				// {
				// 	label: 'Payments',
				// 	icon: Cash,
				// 	activePrefix: '/home/settings/payments',
				// 	roles: privilegedRoles,
				// 	children: [
				// 		{
				// 			label: 'Payment integrations',
				// 			href: resolve('/home/settings/payments/payment-integrations')
				// 		},
				// 		{
				// 			label: 'Booking Page payments',
				// 			href: resolve('/home/settings/payments/booking-page-payments')
				// 		},
				// 		{
				// 			label: 'Payments history',
				// 			href: resolve('/home/settings/payments/payments-history')
				// 		}
				// 	]
				// },
				// {
				// 	label: 'Reports',
				// 	icon: ChartBar,
				// 	href: resolve('/home/settings/reports'),
				// 	roles: privilegedRoles
				// },
				// { label: 'Billing', icon: CreditCard, href: '#', roles: privilegedRoles },
				{
					label: 'Notifications',
					icon: Bell,
					activePrefix: '/home/settings/notifications',
					children: [
						{
							label: 'Your notifications',
							href: resolve('/home/settings/notifications/your-notifications')
						},
						{
							roles: privilegedRoles,
							label: 'Team notifications',
							href: resolve('/home/settings/notifications/team-notifications')
						},
						{
							roles: privilegedRoles,
							label: 'Customer notifications',
							href: resolve('/home/settings/notifications/customer-notifications')
						},
						{
							roles: privilegedRoles,
							label: 'Customization',
							href: resolve('/home/settings/notifications/customization')
						}
					]
				}
				// {
				// 	label: 'Reviews',
				// 	icon: Star,
				// 	href: resolve('/home/settings/reviews'),
				// 	roles: privilegedRoles
				// },
				// {
				// 	label: 'Security',
				// 	icon: Lock,
				// 	href: resolve('/home/settings/security'),
				// 	roles: privilegedRoles
				// }
			]
		}
	]);

	let openState = $state<Record<string, boolean>>({
		'Your brand': $page.url.pathname.startsWith('/home/settings/brand'),
		'Booking preferences': $page.url.pathname.startsWith('/home/settings/booking-preferences'),
		Payments: $page.url.pathname.startsWith('/home/settings/payments'),
		Notifications: $page.url.pathname.startsWith('/home/settings/notifications')
	});

	$effect(() => {
		const path = $page.url.pathname;
		if (path.startsWith('/home/settings/brand')) openState['Your brand'] = true;
		if (path.startsWith('/home/settings/booking-preferences'))
			openState['Booking preferences'] = true;
		if (path.startsWith('/home/settings/payments')) openState['Payments'] = true;
		if (path.startsWith('/home/settings/notifications')) openState['Notifications'] = true;
	});

	function isItemActive(item: MenuItem): boolean {
		if (item.activePrefix) return $page.url.pathname.startsWith(item.activePrefix);
		if (item.href && item.href !== '#') return $page.url.pathname === item.href;
		return false;
	}

	function isItemAllowed(item: MenuItem | SubItem): boolean {
		if (!currentUserRole) return false;
		if (!item.roles) return true;
		return item.roles.includes(currentUserRole.role);
	}

	const filteredMenuGroups = $derived(
		menuGroups
			.map((group) => ({
				...group,
				items: group.items.filter((item) => isItemAllowed(item))
			}))
			.filter((group) => group.items.length > 0)
	);
</script>

<aside
	class="flex h-svh w-64 shrink-0 flex-col border-r border-l bg-sidebar text-sidebar-foreground"
>
	<div
		class="flex shrink-0 items-center gap-2 border-b px-4 py-3"
		style="height: var(--header-height)"
	>
		<button
			onclick={() => settingsStore.toggle()}
			class="-ms-1 inline-flex size-7 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
		>
			<LayoutSidebarLeftCollapse size={18} />
		</button>
		<span class="text-sm font-semibold">Settings</span>
	</div>

	<ScrollArea class="min-h-0 flex-1">
		<div class="flex flex-col gap-1 py-2">
			{#each filteredMenuGroups as group (group.label ?? '__default')}
				<Sidebar.Group>
					{#if group.label}
						<Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
					{/if}
					<Sidebar.Menu>
						{#each group.items as item (item.label)}
							<Sidebar.MenuItem>
								{#if item.children}
									<Sidebar.MenuButton
										isActive={isItemActive(item)}
										onclick={() => (openState[item.label] = !openState[item.label])}
									>
										<item.icon />
										<span>{item.label}</span>
										<ChevronDown
											class="ml-auto transition-transform duration-200 {openState[item.label]
												? 'rotate-180'
												: ''}"
										/>
									</Sidebar.MenuButton>
									{#if openState[item.label]}
										<Sidebar.MenuSub>
											{#each item.children.filter(isItemAllowed) as sub (sub.href)}
												<Sidebar.MenuSubItem>
													<Sidebar.MenuSubButton isActive={$page.url.pathname === sub.href}>
														{#snippet child({ props })}
															<a href={sub.href} {...props}>{sub.label}</a>
														{/snippet}
													</Sidebar.MenuSubButton>
												</Sidebar.MenuSubItem>
											{/each}
										</Sidebar.MenuSub>
									{/if}
								{:else}
									<Sidebar.MenuButton isActive={isItemActive(item)}>
										{#snippet child({ props })}
											{#if item.href && item.href !== '#'}
												<a href={item.href} {...props}>
													<item.icon /><span>{item.label}</span>
												</a>
											{:else}
												<a {...props} style="cursor:not-allowed; opacity: 60%;">
													<item.icon /><span>{item.label}</span>
												</a>
											{/if}
										{/snippet}
									</Sidebar.MenuButton>
								{/if}
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.Group>
			{/each}
		</div>
	</ScrollArea>
</aside>
