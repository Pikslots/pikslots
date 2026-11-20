<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import type { BusinessResponse } from '@pikslots/shared';
	import { authStore } from '$stores/auth.svelte';
	import { businessStore } from '$stores/business.svelte';
	import { Button } from '$lib/components/ui/button';
	import NewBusinessDialog from './new-business-dialog.svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import { getAllBusinessesQueryOptions } from '../../../../api/business/get.all.businesses.query';

	let newBusinessDialogOpen = $state(false);
	let callToGetAllBusinesses = $state(false);

	const businessesQuery = createQuery(() => getAllBusinessesQueryOptions(callToGetAllBusinesses));
	const sidebar = useSidebar();
	let activeBusiness = $derived(businessStore.selectedBusiness);

	const onBusinessChange = (business: BusinessResponse) => {
		businessStore.setSelectedBusiness(business);
	};

	const newBusinessDialog = () => {
		newBusinessDialogOpen = true;
	};

	$effect(() => {
		if (authStore.getPayloadData()?.role === 'Platform Owner') callToGetAllBusinesses = true;
	});
</script>

<NewBusinessDialog bind:open={newBusinessDialogOpen} refetchAllBusiness={businessesQuery.refetch} />

{#if authStore.getPayloadData()?.role === 'Platform Owner'}
	<Sidebar.Menu>
		<Sidebar.MenuItem>
			<DropdownMenu.Root
				onOpenChange={() =>
					authStore.getPayloadData()?.role === 'Platform Owner' && businessesQuery.refetch()}
			>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Sidebar.MenuButton
							{...props}
							class=" cursor-pointer   data-[state=open]:bg-sidebar-accent data-[state=open]:font-extrabold data-[state=open]:text-sidebar-accent-foreground"
						>
							<div
								class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground"
							>
								{activeBusiness?.name[0].toUpperCase()}
							</div>
							<div class="grid flex-1 text-start text-xs leading-tight">
								<span class="truncate font-medium">
									{activeBusiness?.name}
								</span>
								<span class="truncate text-xs">{activeBusiness?.industry}</span>
							</div>
							<ChevronsUpDownIcon class="ms-auto" />
						</Sidebar.MenuButton>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content
					class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
					align="start"
					side={sidebar.isMobile ? 'bottom' : 'right'}
					sideOffset={4}
				>
					<DropdownMenu.Label class="text-xs text-muted-foreground">Businesses</DropdownMenu.Label>
					{#each businessesQuery.data as business (business.name)}
						<DropdownMenu.Item
							onSelect={() => onBusinessChange(business)}
							class="cursor-pointer gap-2 p-2"
						>
							<div
								class="flex size-6 items-center justify-center rounded-md border text-xs font-medium"
							>
								{business.name[0].toUpperCase()}
							</div>
							<span class="flex-1 truncate">{business.name}</span>
							<Button
								class="ml-auto size-6 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
								variant="ghost"
								size="icon"
								title="Edit business"
								onclick={(e) => e.stopPropagation()}
							></Button>
						</DropdownMenu.Item>
					{/each}
					<DropdownMenu.Separator />
					<DropdownMenu.Item onclick={newBusinessDialog} class="cursor-pointer gap-2 p-2">
						<div class="flex size-6 items-center justify-center rounded-md border bg-transparent">
							<PlusIcon class="size-4" />
						</div>
						<div class="font-medium text-muted-foreground">New Business</div>
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</Sidebar.MenuItem>
	</Sidebar.Menu>
{/if}
