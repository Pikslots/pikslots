<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Field, FieldError } from '$lib/components/ui/field/index.js';
	import X from '@tabler/icons-svelte/icons/x';
	import { FolderCog } from '@lucide/svelte';
	import Search from '@tabler/icons-svelte/icons/search';
	import Adjustments from '@tabler/icons-svelte/icons/adjustments';
	import type { ServiceModel } from '../../api/service/models/service-model';
	import type { ServiceGroupModel } from '../../api/service-group/models/service-group-model';
	import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { editServiceGroupMutationOptions } from '../../api/service-group/edit.service.group.mutation';
	import { getServicesByGroupQueryOptions } from '../../api/service-group-assignment/get.services.by.group.query';
	import { businessStore } from '$stores/business.svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zod4 as zod } from 'sveltekit-superforms/adapters';
	import z from 'zod';
	import { toast } from 'svelte-sonner';
	import { SvelteSet } from 'svelte/reactivity';

	interface Props {
		open: boolean;
		group: ServiceGroupModel | null;
		services: ServiceModel[];
	}

	let { open = $bindable(false), group = $bindable(null), services }: Props = $props();

	// ── Schema ───────────────────────────────────────────────────────────────────

	const EditServiceGroupSchema = z.object({
		name: z.string().min(1, 'Title is required')
	});

	// ── Queries ──────────────────────────────────────────────────────────────────

	const servicesByGroupQuery = createQuery(() => getServicesByGroupQueryOptions(group?.id ?? null));

	// Pre-fill selected services when query loads
	$effect(() => {
		if (servicesByGroupQuery.data) {
			selectedIds.clear();
			for (const s of servicesByGroupQuery.data) selectedIds.add(s.id);
		}
	});

	// Pre-fill form name when group changes
	$effect(() => {
		if (group) {
			$form.name = group.name;
		}
	});

	// ── Mutation ─────────────────────────────────────────────────────────────────

	const queryClient = useQueryClient();
	const editMutation = createMutation(() => editServiceGroupMutationOptions());

	// ── Superform ────────────────────────────────────────────────────────────────

	const { form, errors, enhance } = superForm(
		{ name: '' },
		{
			validators: zod(EditServiceGroupSchema),
			SPA: true,
			resetForm: false,
			onUpdate({ form }) {
				if (form.valid && group) {
					editMutation.mutate({
						serviceGroupId: group.id,
						name: form.data.name,
						businessId: businessStore.selectedBusiness?.id ?? '',
						serviceIds: [...selectedIds]
					});
				}
			}
		}
	);

	$effect(() => {
		if (editMutation.isSuccess) {
			toast.success('Service group updated');
			queryClient.invalidateQueries({ queryKey: ['service-groups'] });
			queryClient.invalidateQueries({
				queryKey: ['service-group-assignments', 'by-group', group?.id]
			});
			open = false;
			editMutation.reset();
		}
		if (editMutation.isError) {
			toast.error(editMutation.error?.response?.data?.message ?? 'Failed to update service group');
			editMutation.reset();
		}
	});

	// ── State ────────────────────────────────────────────────────────────────────

	let serviceSearch = $state('');
	const selectedIds = new SvelteSet<string>();

	const filteredServices = $derived(
		services.filter((s) => s.title.toLowerCase().includes(serviceSearch.toLowerCase()))
	);

	const allSelected = $derived(
		filteredServices.length > 0 && filteredServices.every((s) => selectedIds.has(s.id))
	);

	const someSelected = $derived(
		filteredServices.some((s) => selectedIds.has(s.id)) && !allSelected
	);

	function toggleSelectAll() {
		if (allSelected) {
			filteredServices.forEach((s) => selectedIds.delete(s.id));
		} else {
			filteredServices.forEach((s) => selectedIds.add(s.id));
		}
	}

	function toggleService(id: string) {
		if (selectedIds.has(id)) {
			selectedIds.delete(id);
		} else {
			selectedIds.add(id);
		}
	}

	function handleCancel() {
		open = false;
	}

	function formatDuration(mins: number): string {
		if (mins < 60) return `${mins} mins`;
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return m > 0 ? `${h} hr ${m} mins` : `${h} hr`;
	}

	function formatCost(cost: number): string {
		return cost === 0 ? 'Free' : `$${(cost / 100).toFixed(2)}`;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay
			class="fixed inset-0 z-50 bg-black/10 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 supports-backdrop-filter:backdrop-blur-xs"
		/>
		<Dialog.Content
			class="fixed top-1/2 left-1/2 z-50 flex max-h-[85svh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-0 overflow-hidden bg-popover text-popover-foreground shadow-xl ring-1 ring-foreground/10 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
		>
			<form use:enhance class="flex min-h-0 flex-1 flex-col">
				<!-- Header -->
				<div class="flex items-center justify-between gap-3 border-b px-5 py-4">
					<div class="flex min-w-0 items-center gap-3">
						<span
							class="flex size-9 shrink-0 items-center justify-center bg-primary/10 text-primary dark:bg-primary/30 dark:text-chart-1"
						>
							<FolderCog class="size-4.5" />
						</span>
						<div class="min-w-0">
							<Dialog.Title class="text-base font-semibold">Edit service group</Dialog.Title>
							<Dialog.Description class="text-xs text-muted-foreground"
								>Rename the group or change its services</Dialog.Description
							>
						</div>
					</div>
					<Dialog.Close>
						{#snippet child({ props })}
							<button
								type="button"
								aria-label="Close"
								class="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
								{...props}
							>
								<X size={18} />
							</button>
						{/snippet}
					</Dialog.Close>
				</div>

				<div class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
					<!-- Name field -->
					<Field>
						<Label class="text-sm font-medium">Title <span class="text-destructive">*</span></Label>
						<Input bind:value={$form.name} placeholder="Enter group title" class="" />
						<FieldError errors={$errors.name?.map((e) => ({ message: e }))} />
					</Field>

					<!-- Services section -->
					<div class="flex min-h-0 flex-1 flex-col gap-2">
						<Label class="text-sm font-medium">Services</Label>

						<!-- Search -->
						<div class="relative">
							<Search
								size={15}
								class="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
							/>
							<Input bind:value={serviceSearch} placeholder="Search" class="h-8 pl-9" />
						</div>

						<!-- Select all row -->
						<div class="flex items-center justify-between px-1 py-1">
							<button type="button" class="flex items-center gap-2.5" onclick={toggleSelectAll}>
								<Checkbox checked={allSelected} indeterminate={someSelected} class="rounded-sm" />
								<span class="text-sm">Select all</span>
							</button>
							<span class="text-sm text-muted-foreground"
								>{selectedIds.size}/{filteredServices.length}</span
							>
						</div>

						<!-- Service list -->
						<div class="flex flex-col gap-1.5">
							{#if servicesByGroupQuery.isPending}
								<p class="px-1 py-2 text-xs text-muted-foreground">Loading services...</p>
							{:else}
								{#each filteredServices as service (service.id)}
									<button
										type="button"
										onclick={() => toggleService(service.id)}
										class="flex items-center gap-3 border px-3 py-2.5 text-left transition-colors hover:bg-accent/40 has-data-checked:border-primary/40 has-data-checked:bg-primary/5 dark:has-data-checked:border-chart-1/40"
									>
										<Checkbox checked={selectedIds.has(service.id)} class="shrink-0 rounded-sm" />
										<div
											class="flex size-9 shrink-0 items-center justify-center bg-primary/10 text-primary dark:bg-primary/30 dark:text-chart-1"
										>
											<Adjustments size={16} />
										</div>
										<div class="flex flex-col">
											<span class="text-sm font-medium">{service.title}</span>
											<span class="text-xs text-muted-foreground">
												{formatDuration(service.durationInMins)} · {formatCost(service.cost)}
											</span>
										</div>
									</button>
								{/each}
							{/if}
						</div>
					</div>
				</div>

				<!-- Footer -->
				<div class="flex items-center justify-end gap-2 border-t bg-muted/30 px-5 py-3">
					<Button type="button" variant="ghost" onclick={handleCancel}>Cancel</Button>
					<Button type="submit" disabled={!$form.name.trim() || editMutation.isPending}>
						{editMutation.isPending ? 'Saving...' : 'Save'}
					</Button>
				</div>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
