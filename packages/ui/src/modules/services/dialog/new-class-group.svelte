<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Field, FieldError } from '$lib/components/ui/field/index.js';
	import X from '@tabler/icons-svelte/icons/x';
	import { FolderPlus } from '@lucide/svelte';
	import Search from '@tabler/icons-svelte/icons/search';
	import School from '@tabler/icons-svelte/icons/school';
	import type { ClassModel } from '../../api/class/models/class-model';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { registerClassGroupMutationOptions } from '../../api/class-group/register.class.group.mutation';
	import { businessStore } from '$stores/business.svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zod4 as zod } from 'sveltekit-superforms/adapters';
	import z from 'zod';
	import { toast } from 'svelte-sonner';
	import { SvelteSet } from 'svelte/reactivity';

	interface Props {
		open: boolean;
		classes: ClassModel[];
	}

	let { open = $bindable(false), classes }: Props = $props();

	// ── Schema ───────────────────────────────────────────────────────────────────

	const NewClassGroupSchema = z.object({
		name: z.string().min(1, 'Title is required')
	});

	// ── Mutation ─────────────────────────────────────────────────────────────────

	const queryClient = useQueryClient();
	const registerMutation = createMutation(() => registerClassGroupMutationOptions());

	// ── Superform ────────────────────────────────────────────────────────────────

	const { form, errors, enhance } = superForm(
		{ name: '' },
		{
			validators: zod(NewClassGroupSchema),
			SPA: true,
			resetForm: false,
			onUpdate({ form }) {
				if (form.valid) {
					registerMutation.mutate({
						name: form.data.name,
						businessId: businessStore.selectedBusiness?.id ?? '',
						associatedClasses: [...selectedIds]
					});
				}
			}
		}
	);

	$effect(() => {
		if (registerMutation.isSuccess) {
			toast.success('Class group created');
			queryClient.invalidateQueries({ queryKey: ['class-groups'] });
			open = false;
			reset();
			registerMutation.reset();
		}
		if (registerMutation.isError) {
			toast.error(
				registerMutation.error?.response?.data?.message ?? 'Failed to create class group'
			);
			registerMutation.reset();
		}
	});

	// ── State ────────────────────────────────────────────────────────────────────

	let classSearch = $state('');
	const selectedIds = new SvelteSet<string>();

	const filteredClasses = $derived(
		classes.filter((c) => c.title.toLowerCase().includes(classSearch.toLowerCase()))
	);

	const allSelected = $derived(
		filteredClasses.length > 0 && filteredClasses.every((c) => selectedIds.has(c.id))
	);

	const someSelected = $derived(filteredClasses.some((c) => selectedIds.has(c.id)) && !allSelected);

	function toggleSelectAll() {
		if (allSelected) {
			filteredClasses.forEach((c) => selectedIds.delete(c.id));
		} else {
			filteredClasses.forEach((c) => selectedIds.add(c.id));
		}
	}

	function toggleClass(id: string) {
		if (selectedIds.has(id)) {
			selectedIds.delete(id);
		} else {
			selectedIds.add(id);
		}
	}

	function handleCancel() {
		reset();
		open = false;
	}

	function reset() {
		$form.name = '';
		classSearch = '';
		selectedIds.clear();
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

<Dialog.Root
	bind:open
	onOpenChange={(v) => {
		if (!v) reset();
	}}
>
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
							<FolderPlus class="size-4.5" />
						</span>
						<div class="min-w-0">
							<Dialog.Title class="text-base font-semibold">New class group</Dialog.Title>
							<Dialog.Description class="text-xs text-muted-foreground"
								>Bundle classes so customers find them faster</Dialog.Description
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
					<!-- Title field -->
					<Field>
						<Label class="text-sm font-medium">Title <span class="text-destructive">*</span></Label>
						<Input bind:value={$form.name} placeholder="Enter group title" class="" />
						<FieldError errors={$errors.name?.map((e) => ({ message: e }))} />
					</Field>

					<!-- Classes section -->
					<div class="flex min-h-0 flex-1 flex-col gap-2">
						<Label class="text-sm font-medium">Classes</Label>

						<!-- Search -->
						<div class="relative">
							<Search
								size={15}
								class="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
							/>
							<Input bind:value={classSearch} placeholder="Search" class="h-8 pl-9" />
						</div>

						<!-- Select all row -->
						<div class="flex items-center justify-between px-1 py-1">
							<button type="button" class="flex items-center gap-2.5" onclick={toggleSelectAll}>
								<Checkbox checked={allSelected} indeterminate={someSelected} class="rounded-sm" />
								<span class="text-sm">Select all</span>
							</button>
							<span class="text-sm text-muted-foreground"
								>{selectedIds.size}/{filteredClasses.length}</span
							>
						</div>

						<!-- Class list -->
						<div class="flex flex-col gap-1.5">
							{#each filteredClasses as cls (cls.id)}
								<button
									type="button"
									onclick={() => toggleClass(cls.id)}
									class="flex items-center gap-3 border px-3 py-2.5 text-left transition-colors hover:bg-accent/40 has-data-checked:border-primary/40 has-data-checked:bg-primary/5 dark:has-data-checked:border-chart-1/40"
								>
									<Checkbox checked={selectedIds.has(cls.id)} class="shrink-0 rounded-sm" />
									<div
										class="flex size-9 shrink-0 items-center justify-center bg-primary/10 text-primary dark:bg-primary/30 dark:text-chart-1"
									>
										<School size={16} />
									</div>
									<div class="flex flex-col">
										<span class="text-sm font-medium">{cls.title}</span>
										<span class="text-xs text-muted-foreground">
											{formatDuration(cls.durationInMins)} · {formatCost(cls.cost)}
										</span>
									</div>
								</button>
							{/each}
						</div>
					</div>
				</div>

				<!-- Footer -->
				<div class="flex items-center justify-end gap-2 border-t bg-muted/30 px-5 py-3">
					<Button type="button" variant="ghost" onclick={handleCancel}>Cancel</Button>
					<Button type="submit" disabled={!$form.name.trim() || registerMutation.isPending}>
						{registerMutation.isPending ? 'Creating...' : 'Create'}
					</Button>
				</div>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
