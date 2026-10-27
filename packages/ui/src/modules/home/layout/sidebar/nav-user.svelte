<script lang="ts">
	import CreditCardIcon from '@tabler/icons-svelte/icons/credit-card';
	import DotsVerticalIcon from '@tabler/icons-svelte/icons/dots-vertical';
	import LogoutIcon from '@tabler/icons-svelte/icons/logout';
	import MoonIcon from '@tabler/icons-svelte/icons/moon';
	import NotificationIcon from '@tabler/icons-svelte/icons/notification';
	import UserCircleIcon from '@tabler/icons-svelte/icons/user-circle';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { notificationsStore } from '$stores/notifications.svelte';
	import { themeStore } from '$stores/theme.svelte.js';
	import { authStore } from '$stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { createQuery } from '@tanstack/svelte-query';
	import { getUserProfileQueryOptions } from '../../../api/user/get.user.profile.query';
	import { logoutUser } from '../../../api/user/logout.user.mutation';
	import type { UserRole } from '@pikslots/shared';

	const userProfileQuery = createQuery(() => getUserProfileQueryOptions());
	const currentUserRole = $derived(authStore.getPayloadData());

	const sidebar = Sidebar.useSidebar();
	const logOut = async () => {
		const result = await logoutUser();
		if (result.message === 'success') {
			authStore.clearSession();
			goto(resolve('/login'));
		}
		goto(resolve('/login'));
	};

	const isItemAllowed = (role: UserRole | null) => {
		if (role) {
			if (role !== 'Platform Owner' && role !== 'Business Owner' && role !== 'Admin') return false;
			return true;
		}
	};
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		{#if userProfileQuery.isLoading}
			<div class="flex items-center gap-2 px-2 py-1.5">
				<Skeleton class="size-8 rounded-lg" />
				<div class="grid flex-1 gap-1">
					<Skeleton class="h-3 w-24" />
					<Skeleton class="h-3 w-32" />
				</div>
			</div>
		{:else if userProfileQuery.data}
			{@const user = userProfileQuery.data}
			{@const fullName = `${user.name.firstName} ${user.name.lastName}`}
			{@const initials = `${user.name.firstName[0]}${user.name.lastName[0]}`}
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Sidebar.MenuButton
							{...props}
							size="lg"
							class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<Avatar.Root class="size-8 rounded-lg grayscale">
								<Avatar.Image src={user.avatarUrl ?? ''} alt={fullName} />
								<Avatar.Fallback class="rounded-lg">{initials}</Avatar.Fallback>
							</Avatar.Root>
							<div class="grid flex-1 text-start text-sm leading-tight">
								<span class="truncate font-medium">{fullName}</span>
								<span class="truncate text-xs text-muted-foreground">{user.email}</span>
							</div>
							<DotsVerticalIcon class="ms-auto size-4" />
						</Sidebar.MenuButton>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content
					class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
					side={sidebar.isMobile ? 'bottom' : 'right'}
					align="end"
					sideOffset={4}
				>
					<DropdownMenu.Label class="p-0 font-normal">
						<div class="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
							<Avatar.Root class="size-8 rounded-lg">
								<Avatar.Image src={user.avatarUrl ?? ''} alt={fullName} />
								<Avatar.Fallback class="rounded-lg">{initials}</Avatar.Fallback>
							</Avatar.Root>
							<div class="grid flex-1 text-start text-sm leading-tight">
								<span class="truncate font-medium">{fullName}</span>
								<span class="truncate text-xs text-muted-foreground">{user.email}</span>
							</div>
						</div>
					</DropdownMenu.Label>
					<DropdownMenu.Separator />
					<DropdownMenu.Group>
						<DropdownMenu.Item onclick={() => goto(resolve('/home/settings/profile'))}>
							<UserCircleIcon />
							Profile
						</DropdownMenu.Item>
						{#if isItemAllowed(currentUserRole?.role ?? null)}
							<DropdownMenu.Item>
								<CreditCardIcon />
								Billing
							</DropdownMenu.Item>
						{/if}
						<DropdownMenu.Item onclick={() => goto(resolve('/home/notifications'))}>
							<NotificationIcon />
							Notifications
							{#if notificationsStore.unreadCount > 0}
								<Badge
									aria-label="{notificationsStore.unreadCount} unread notifications"
									class="ml-auto h-5 min-w-5 justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white"
								>
									{notificationsStore.unreadCount}
								</Badge>
							{/if}
						</DropdownMenu.Item>
					</DropdownMenu.Group>
					<DropdownMenu.Separator />
					<DropdownMenu.Item class="flex items-center justify-between" closeOnSelect={false}>
						<div class="flex items-center gap-2">
							<MoonIcon />
							Dark mode
						</div>
						<Switch
							checked={themeStore.current === 'dark'}
							onCheckedChange={(checked) => themeStore.set(checked ? 'dark' : 'light')}
						/>
					</DropdownMenu.Item>
					<DropdownMenu.Separator />
					<DropdownMenu.Item onclick={logOut}>
						<LogoutIcon />
						Log out
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		{/if}
	</Sidebar.MenuItem>
</Sidebar.Menu>
