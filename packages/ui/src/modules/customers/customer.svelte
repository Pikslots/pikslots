<script lang="ts">
	import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { ConfirmDialog } from '$lib/components/ui/confirm-dialog/index.js';
	import { businessStore } from '$stores/business.svelte';
	import { getCustomersByBusinessQueryOptions } from '../api/customer/get.customers.by.business.query';
	import { getCustomerByIdQueryOptions } from '../api/customer/get.customer.by.id.query';
	import { deleteCustomerMutationOptions } from '../api/customer/delete.customer.mutation';
	import { exportCustomers } from '../api/customer/export.customers';
	import type { PartialCustomerModel } from '../api/customer/models/customer-model';
	import { toast } from 'svelte-sonner';
	import Plus from '@tabler/icons-svelte/icons/plus';
	import Search from '@tabler/icons-svelte/icons/search';
	import Pencil from '@tabler/icons-svelte/icons/pencil';
	import DotsVertical from '@tabler/icons-svelte/icons/dots-vertical';
	import ChevronDown from '@tabler/icons-svelte/icons/chevron-down';
	import Trash from '@tabler/icons-svelte/icons/trash';
	import CalendarPlus from '@tabler/icons-svelte/icons/calendar-plus';
	import { IconFileExport, IconFileImport } from '@tabler/icons-svelte';
	import AddNewCustomer from './dialog/add-new-customer.svelte';
	import EditCustomer from './dialog/edit-customer.svelte';
	import CustomerAboutTab from './tabs/customer-about-tab.svelte';
	import CustomerNotesTab from './tabs/customer-notes-tab.svelte';
	import CustomerAppointmentsTab from './tabs/customer-appointments-tab.svelte';
	import CustomerUpdatesTab from './tabs/customer-updates-tab.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';

	// ── State ─────────────────────────────────────────────────────────────────

	let search = $state('');
	let selectedCustomerId = $state<string | null>(null);
	let activeTab = $state('about');
	let addCustomerOpen = $state(false);
	let editCustomerOpen = $state(false);
	let deleteCustomerId = $state<string | null>(null);
	let deleteCustomerName = $state<string>('');
	let exportingCustomers = $state(false);

	$effect(() => {
		if ($page.url.searchParams.get('add') === 'true') {
			addCustomerOpen = true;
			goto(resolve('/home/customers'), { replaceState: true, keepFocus: true });
		}
	});

	// ── Queries ───────────────────────────────────────────────────────────────

	const customersQuery = createQuery(() => ({
		...getCustomersByBusinessQueryOptions(businessStore.selectedBusiness?.id ?? ''),
		enabled: !!businessStore.selectedBusiness?.id
	}));

	const selectedCustomerQuery = createQuery(() => ({
		...getCustomerByIdQueryOptions(selectedCustomerId ?? ''),
		enabled: !!selectedCustomerId
	}));

	// ── Derived ───────────────────────────────────────────────────────────────

	const filteredCustomers = $derived(
		(customersQuery.data ?? []).filter((c) =>
			`${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase())
		)
	);

	const selectedCustomer = $derived(selectedCustomerQuery.data ?? null);

	// ── Mutations ─────────────────────────────────────────────────────────────

	const queryClient = useQueryClient();

	const deleteCustomerMutation = createMutation(() => ({
		...deleteCustomerMutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['customers', businessStore.selectedBusiness?.id]
			});
			if (deleteCustomerId) {
				queryClient.removeQueries({ queryKey: ['customer', deleteCustomerId] });
			}
			if (selectedCustomerId === deleteCustomerId) selectedCustomerId = null;
			deleteCustomerId = null;
			deleteCustomerName = '';
			toast.success('Customer deleted');
		},
		onError: () => toast.error('Failed to delete customer')
	}));

	// ── Helpers ───────────────────────────────────────────────────────────────

	function getInitial(customer: PartialCustomerModel): string {
		return customer.firstName.charAt(0).toUpperCase();
	}

	function confirmDelete(customer: PartialCustomerModel) {
		deleteCustomerId = customer.id;
		deleteCustomerName = `${customer.firstName} ${customer.lastName}`;
	}

	async function handleExportCustomers() {
		const businessId = businessStore.selectedBusiness?.id;

		if (!businessId) {
			toast.error('Select a business before exporting customers');
			return;
		}

		exportingCustomers = true;

		try {
			await exportCustomers(businessId);
			toast.success('Customers exported');
		} catch {
			toast.error('Failed to export customers');
		} finally {
			exportingCustomers = false;
		}
	}

	// ── Effect ───────────────────────────────────────────────────────────────
	$effect(() => {
		if (customersQuery.data && customersQuery.data.length > 0 && !selectedCustomerId) {
			selectedCustomerId = customersQuery.data[0].id;
		}
	});
</script>

<div class="flex h-full overflow-hidden">
	<!-- ── Left panel ──────────────────────────────────────────────────────── -->
	<div class="flex w-62.5 shrink-0 flex-col border-r">
		<!-- Header -->
		<div class="flex items-center justify-between px-4 py-3">
			<h2 class="text-base font-semibold">Customers</h2>
			<Button onclick={() => (addCustomerOpen = true)}><Plus />Add</Button>
		</div>

		<!-- Tabs row: All | Options -->
		<div class="flex items-center gap-4 border-b px-4 pb-0">
			<button class="border-b-2 border-foreground pb-2 text-sm font-medium"> All </button>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<button
							{...props}
							class="ml-auto flex items-center gap-1 pb-2 text-sm text-muted-foreground hover:text-foreground"
						>
							Options <ChevronDown class="size-3" />
						</button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="start" class="w-40 cursor-pointer">
					<DropdownMenu.Item class="cursor-pointer"
						><IconFileImport></IconFileImport>Import Customers</DropdownMenu.Item
					>
					<DropdownMenu.Item
						class="cursor-pointer"
						disabled={exportingCustomers}
						onclick={handleExportCustomers}
						><IconFileExport></IconFileExport>{exportingCustomers
							? 'Exporting...'
							: 'Export Customers'}</DropdownMenu.Item
					>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>

		<!-- Search -->
		<div class="px-4 py-2">
			<div class="relative">
				<Search class="absolute top-2 left-2.5 size-3.5 text-muted-foreground" />
				<Input bind:value={search} placeholder="Search" class="pl-8" />
			</div>
		</div>

		<!-- Customer list -->
		<div class="flex-1 overflow-y-auto">
			{#if customersQuery.isPending}
				<div class="flex items-center justify-center py-8 text-xs text-muted-foreground">
					Loading...
				</div>
			{:else if filteredCustomers.length === 0}
				<div class="flex items-center justify-center py-8 text-xs text-muted-foreground">
					No customers found
				</div>
			{:else}
				{#each filteredCustomers as customer (customer.id)}
					<div class="mx-auto w-55">
						<button
							onclick={() => {
								selectedCustomerId = customer.id;
								activeTab = 'about';
							}}
							class="flex w-full items-center gap-3 px-2 py-2.5 transition-colors
							{selectedCustomer?.id === customer.id ? 'bg-muted' : 'hover:bg-muted/50'}"
						>
							<Avatar.Root size="sm">
								{#if customer.profileImageUrl}
									<Avatar.Image
										src={customer.profileImageUrl}
										alt="{customer.firstName} {customer.lastName}"
									/>
								{/if}
								<Avatar.Fallback>{getInitial(customer)}</Avatar.Fallback>
							</Avatar.Root>
							<span class="text-sm">{customer.firstName} {customer.lastName}</span>
						</button>
					</div>
				{/each}
			{/if}
		</div>
	</div>

	<!-- ── Right panel ─────────────────────────────────────────────────────── -->
	{#if selectedCustomerId && selectedCustomerQuery.isPending}
		<div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
			Loading...
		</div>
	{:else if selectedCustomer}
		{@const customer = selectedCustomer}
		<div class="flex flex-1 flex-col overflow-hidden">
			<!-- Detail header -->
			<div class="flex items-center gap-3 px-6 py-4">
				<Avatar.Root class="size-12 text-base">
					{#if customer.profileImageUrl}
						<Avatar.Image
							src={customer.profileImageUrl}
							alt="{customer.firstName} {customer.lastName}"
						/>
					{/if}
					<Avatar.Fallback class="text-base">{getInitial(customer)}</Avatar.Fallback>
				</Avatar.Root>
				<span class="text-base font-semibold">{customer.firstName} {customer.lastName}</span>

				<div class="ml-auto flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						class="size-8"
						onclick={() => (editCustomerOpen = true)}
					>
						<Pencil class="size-4" />
					</Button>

					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button variant="ghost" size="icon" class="size-8" {...props}>
									<DotsVertical class="size-4" />
								</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							<DropdownMenu.Item
								class="text-destructive focus:text-destructive"
								onclick={() => confirmDelete(customer)}
							>
								<Trash class="size-4" />
								Delete customer
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>

					<Button
						variant="outline"
						size="sm"
						class="gap-1.5"
						onclick={() => goto(resolve('/home/bookings?create=true'))}
					>
						<CalendarPlus class="size-4" />
						Book appointment
					</Button>
				</div>
			</div>

			<!-- Tabs -->
			<Tabs.Root bind:value={activeTab} class="flex flex-1 flex-col overflow-hidden">
				<Tabs.List variant="line" class="h-auto justify-start rounded-none px-6">
					<Tabs.Trigger value="about" class="pb-2">About</Tabs.Trigger>
					<Tabs.Trigger value="notes" class="pb-2">Notes</Tabs.Trigger>
					<Tabs.Trigger value="appointments" class="pb-2">Appointments</Tabs.Trigger>
					<Tabs.Trigger value="updates" class="pb-2">Updates</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="about" class="flex-1 overflow-y-auto px-6 py-4">
					<CustomerAboutTab {customer} />
				</Tabs.Content>

				<Tabs.Content value="notes" class="flex-1 overflow-y-auto px-6 py-4">
					<CustomerNotesTab {customer} />
				</Tabs.Content>

				<Tabs.Content value="appointments" class="flex-1 overflow-y-auto px-6 py-4">
					<CustomerAppointmentsTab {customer} />
				</Tabs.Content>

				<Tabs.Content value="updates" class="flex-1 overflow-y-auto px-6 py-4">
					<CustomerUpdatesTab {customer} />
				</Tabs.Content>
			</Tabs.Root>
		</div>
	{:else}
		<div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
			Select a customer to view details
		</div>
	{/if}
</div>

<!-- Add customer dialog -->
<AddNewCustomer bind:open={addCustomerOpen} />

<!-- Edit customer dialog -->
{#if selectedCustomer}
	<EditCustomer bind:open={editCustomerOpen} customer={selectedCustomer} />
{/if}

<!-- Delete confirm dialog -->
<ConfirmDialog
	open={!!deleteCustomerId}
	title="Delete customer"
	description="Are you sure you want to delete {deleteCustomerName}? This action cannot be undone."
	confirmLabel="Delete"
	onConfirm={() => {
		if (!deleteCustomerId || !businessStore.selectedBusiness?.id) return;
		deleteCustomerMutation.mutate({
			customerId: deleteCustomerId,
			businessId: businessStore.selectedBusiness.id
		});
	}}
	onCancel={() => {
		deleteCustomerId = null;
		deleteCustomerName = '';
	}}
/>
