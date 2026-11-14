<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import CheckIcon from '@lucide/svelte/icons/check';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import type { BusinessResponse } from '@pikslots/shared';
	import { authStore } from '$stores/auth.svelte';
	import { businessStore } from '$stores/business.svelte';
	import { Button } from '$lib/components/ui/button';
	import NewBusinessDialog from './new-business-dialog.svelte';
	import { createMutation, createQuery } from '@tanstack/svelte-query';
	import { getAllBusinessesQueryOptions } from '../../../../api/business/get.all.businesses.query';
	import { switchBusinessMutationOptions } from '../../../../api/user/switch.business.mutation';
	import { toast } from 'svelte-sonner';

	let newBusinessDialogOpen = $state(false);
	let callToGetAllBusinesses = $state(false);

	const businessesQuery = createQuery(() => getAllBusinessesQueryOptions(callToGetAllBusinesses));
	const switchBusinessMutation = createMutation(switchBusinessMutationOptions);
	const sidebar = useSidebar();
	let activeBusiness = $derived(businessStore.selectedBusiness);

	const onBusinessChange = (business: BusinessResponse) => {
		if (activeBusiness?.id === business.id) return;

		const previousBusiness = activeBusiness;
		businessStore.setSelectedBusiness(business);

		switchBusinessMutation.mutate(
			{ businessId: business.id },
			{
				onSuccess: (result) => {
					authStore.updateBusinessId(result.businessId);
					toast.success('Business switched');
				},
				onError: (error) => {
					if (previousBusiness) businessStore.setSelectedBusiness(previousBusiness);
					toast.error(error?.response?.data?.message ?? 'Failed to switch business');
				}
			}
		);
	};

	const newBusinessDialog = () => {
		newBusinessDialogOpen = true;
	};

	$effect(() => {
		if (authStore.getPayloadData()?.role === 'Platform Owner') callToGetAllBusinesses = true;

		if (!businessStore.hasSelectedBusiness && businessesQuery.data.length > 0) {
			const sessionBusinessId = authStore.getPayloadData()?.businessId;
			const sessionBusiness = businessesQuery.data.find(
				(business) => business.id === sessionBusinessId
			);
			businessStore.setSelectedBusiness(sessionBusiness ?? businessesQuery.data[0]);
		}
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
					class="flex max-h-(--bits-dropdown-menu-content-available-height) w-(--bits-dropdown-menu-anchor-width) min-w-56 flex-col rounded-lg"
					align="start"
					side={sidebar.isMobile ? 'bottom' : 'right'}
					sideOffset={4}
				>
					<DropdownMenu.Label class="shrink-0 text-xs text-muted-foreground">
						Businesses
					</DropdownMenu.Label>
					<div
						class="scrollbar dark:scrollbar-track-dark light:scrollbar-track-gray-200 min-h-0 flex-1 scrollbar-thin scrollbar-thumb-gray-500 overflow-y-auto overscroll-contain"
					>
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
								{#if activeBusiness?.id === business.id}
									<CheckIcon class="ml-auto size-4 shrink-0 text-primary" />
								{/if}
								<Button
									class="ml-auto size-6 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
									variant="ghost"
									size="icon"
									title="Edit business"
									onclick={(e) => e.stopPropagation()}
								></Button>
							</DropdownMenu.Item>
						{/each}
					</div>
					<DropdownMenu.Separator class="shrink-0" />
					<DropdownMenu.Item onclick={newBusinessDialog} class="shrink-0 cursor-pointer gap-2 p-2">
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
