<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import Check from '@tabler/icons-svelte/icons/check';
	import ChevronDown from '@tabler/icons-svelte/icons/chevron-down';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Field, FieldGroup, FieldError } from '$lib/components/ui/field/index.js';
	import ArrowLeft from '@tabler/icons-svelte/icons/arrow-left';
	import Photo from '@tabler/icons-svelte/icons/photo';
	import Upload from '@tabler/icons-svelte/icons/upload';
	import { createQuery, createMutation } from '@tanstack/svelte-query';
	import { getClassGroupsByBusinessQueryOptions } from '../api/class-group/get.class.groups.by.business.query';
	import { registerClassMutationOptions } from '../api/class/register.class.mutation';
	import { businessStore } from '$stores/business.svelte';
	import type { ClassGroupModel } from '../api/class-group/models/class-group-model';
	import { superForm } from 'sveltekit-superforms';
	import { zod4 as zod } from 'sveltekit-superforms/adapters';
	import z from 'zod';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteSet } from 'svelte/reactivity';

	// ── Props ────────────────────────────────────────────────────────────────────

	interface Props {
		onBack?: () => void;
	}

	const { onBack }: Props = $props();

	// ── Schema ───────────────────────────────────────────────────────────────────

	const RegisterClassSchema = z.object({
		title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
		description: z.string().default(''),
		durationInMins: z.coerce.number().min(1, 'Duration must be at least 1 minute'),
		seats: z.coerce.number().min(1, 'At least 1 seat is required'),
		cost: z.coerce.number().min(0).default(0),
		businessId: z.string().min(1, 'No business selected'),
		isHiddenFromBookingPage: z.boolean().default(false)
	});

	// ── Mutation ─────────────────────────────────────────────────────────────────

	const registerMutation = createMutation(registerClassMutationOptions);

	// ── Superform ────────────────────────────────────────────────────────────────

	const { form, errors, enhance } = superForm(
		{
			title: '',
			description: '',
			durationInMins: 0,
			seats: 1,
			cost: 0,
			businessId: businessStore.selectedBusiness?.id ?? '',
			isHiddenFromBookingPage: false
		},
		{
			validators: zod(RegisterClassSchema),
			SPA: true,
			resetForm: false,
			onUpdate({ form }) {
				if (form.valid) {
					registerMutation.mutate({
						title: form.data.title,
						description: form.data.description,
						durationInMins: form.data.durationInMins,
						seats: form.data.seats,
						cost: Math.round(form.data.cost * 100),
						businessId: form.data.businessId,
						isHiddenFromBookingPage: form.data.isHiddenFromBookingPage,
						imagesUrls: [],
						associatedClassGroupIds: [...selectedGroupIds]
					});
				}
			}
		}
	);

	$effect(() => {
		$form.businessId = businessStore.selectedBusiness?.id ?? '';
	});

	$effect(() => {
		if (registerMutation.isSuccess) {
			toast.success('Class created successfully');
			goto(resolve('/home/services'));
		}
		if (registerMutation.isError) {
			toast.error(registerMutation.error?.response?.data?.message ?? 'Failed to create class');
			registerMutation.reset();
		}
	});

	// ── Queries ──────────────────────────────────────────────────────────────────

	const classGroupsQuery = createQuery(() => ({
		...getClassGroupsByBusinessQueryOptions(businessStore.selectedBusiness?.id ?? ''),
		enabled: !!businessStore.selectedBusiness?.id
	}));

	const classGroups = $derived<ClassGroupModel[]>(classGroupsQuery.data ?? []);

	// ── State ────────────────────────────────────────────────────────────────────

	const selectedGroupIds = new SvelteSet<string>();
	let groupComboOpen = $state(false);
	let imagePreview = $state<string | null>(null);

	// ── Derived ──────────────────────────────────────────────────────────────────

	const canCreate = $derived(
		$form.title.trim().length > 0 && Number($form.durationInMins) >= 1 && Number($form.seats) >= 1
	);

	// ── Handlers ─────────────────────────────────────────────────────────────────

	function toggleGroup(id: string) {
		if (selectedGroupIds.has(id)) selectedGroupIds.delete(id);
		else selectedGroupIds.add(id);
	}

	function handleImageChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		imagePreview = URL.createObjectURL(file);
	}
</script>

<form use:enhance class="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col">
	<!-- ── Top bar ──────────────────────────────────────────────────────────────── -->
	<div
		class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur-md md:px-6"
	>
		<div class="flex items-center gap-3">
			<button
				type="button"
				onclick={onBack}
				aria-label="Back"
				class="flex size-8 shrink-0 items-center justify-center border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
			>
				<ArrowLeft size={18} />
			</button>
			<div class="min-w-0">
				<h1 class="truncate text-base leading-tight font-semibold">New class</h1>
				<p class="hidden truncate text-xs text-muted-foreground sm:block">
					Set up a group session customers can join
				</p>
			</div>
		</div>
		<Button type="submit" size="sm" disabled={!canCreate || registerMutation.isPending}>
			{registerMutation.isPending ? 'Creating...' : 'Create'}
		</Button>
	</div>

	<!-- ── Body ─────────────────────────────────────────────────────────────────── -->
	<div class="flex flex-1 overflow-y-auto px-4 py-6 md:px-6">
		<div class="mx-auto flex w-full max-w-3xl flex-col gap-6">
			<!-- Class details heading -->
			<div>
				<h3 class="text-base font-semibold">Class details</h3>
				<p class="text-xs text-muted-foreground">What customers see when they join</p>
			</div>

			<!-- Image upload -->
			<div class="flex items-start gap-4">
				<div
					class="flex size-24 shrink-0 items-center justify-center overflow-hidden border border-dashed bg-muted/50"
				>
					{#if imagePreview}
						<img src={imagePreview} alt="Class" class="h-full w-full object-cover" />
					{:else}
						<Photo size={24} class="text-muted-foreground" />
					{/if}
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-sm font-medium">Class image</span>
					<span class="text-xs text-muted-foreground">Up to 5 MB in size</span>
					<label>
						<input type="file" accept="image/*" class="hidden" onchange={handleImageChange} />
						<Button variant="outline" size="sm" class="mt-1 cursor-pointer gap-2" tabindex={-1}>
							<Upload size={14} />
							Upload
						</Button>
					</label>
				</div>
			</div>

			<FieldGroup>
				<!-- Title -->
				<Field>
					<Label for="title">Title <span class="text-destructive">*</span></Label>
					<Input
						id="title"
						bind:value={$form.title}
						placeholder="For example, &quot;Morning Yoga&quot;"
						class="focus-visible:ring-primary"
					/>
					<FieldError errors={$errors.title?.map((e) => ({ message: e }))} />
				</Field>

				<!-- Description -->
				<Field>
					<Label for="description">Description</Label>
					<textarea
						id="description"
						bind:value={$form.description}
						placeholder="Describe your class to Booking Page visitors"
						class="flex min-h-24 w-full border border-input bg-transparent px-2.5 py-2 text-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
					></textarea>
				</Field>

				<!-- Duration / Seats / Cost -->
				<div class="grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
					<!-- Duration -->
					<Field class="flex-1">
						<Label for="duration">Duration <span class="text-destructive">*</span></Label>
						<div class="relative">
							<Input
								id="duration"
								type="number"
								min="1"
								bind:value={$form.durationInMins}
								placeholder="Enter duration"
								class="[appearance:textfield] pr-12 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
							/>
							<span
								class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground"
								>mins</span
							>
						</div>
						<FieldError errors={$errors.durationInMins?.map((e) => ({ message: e }))} />
					</Field>

					<!-- Seats -->
					<Field class="flex-1">
						<Label for="seats">Seats <span class="text-destructive">*</span></Label>
						<Input
							id="seats"
							type="number"
							min="1"
							bind:value={$form.seats}
							placeholder="Enter seats"
							class="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
						/>
						<FieldError errors={$errors.seats?.map((e) => ({ message: e }))} />
					</Field>

					<!-- Cost -->
					<Field class="flex-1">
						<Label for="cost">Cost</Label>
						<div class="relative">
							<span
								class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted-foreground"
								>Rs</span
							>
							<Input
								id="cost"
								type="number"
								min="0"
								bind:value={$form.cost}
								placeholder="Enter cost"
								class="[appearance:textfield] pl-8 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
							/>
						</div>
						<FieldError errors={$errors.cost?.map((e) => ({ message: e }))} />
					</Field>
				</div>
			</FieldGroup>

			<!-- Class groups combobox -->
			<div class="flex flex-col gap-1.5">
				<Label>Class Groups</Label>
				<Popover.Root bind:open={groupComboOpen}>
					<Popover.Trigger>
						{#snippet child({ props })}
							<button
								type="button"
								{...props}
								class="flex h-8 w-full items-center justify-between gap-2 border border-input bg-transparent px-2.5 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
							>
								<span
									class="truncate text-left {selectedGroupIds.size === 0
										? 'text-muted-foreground'
										: ''}"
								>
									{#if selectedGroupIds.size === 0}
										Select class groups
									{:else}
										{classGroups
											.filter((g) => selectedGroupIds.has(g.id))
											.map((g) => g.name)
											.join(', ')}
									{/if}
								</span>
								<ChevronDown size={14} class="shrink-0 text-muted-foreground" />
							</button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-64 p-0" align="start">
						<Command.Root>
							<Command.Input placeholder="Search groups..." />
							<Command.List>
								<Command.Empty>No groups found.</Command.Empty>
								<Command.Group>
									{#each classGroups as group (group.id)}
										<Command.Item value={group.name} onSelect={() => toggleGroup(group.id)}>
											<Check
												size={14}
												class="mr-2 shrink-0 {selectedGroupIds.has(group.id)
													? 'opacity-100'
													: 'opacity-0'}"
											/>
											{group.name}
										</Command.Item>
									{/each}
								</Command.Group>
							</Command.List>
						</Command.Root>
					</Popover.Content>
				</Popover.Root>
			</div>

			<!-- Set to hidden toggle -->
			<div class="flex items-center gap-3 border bg-muted/30 p-4">
				<Switch id="hidden" bind:checked={$form.isHiddenFromBookingPage} />
				<div class="flex flex-col">
					<Label for="hidden" class="cursor-pointer text-sm font-medium">Set to hidden</Label>
					<span class="text-xs text-muted-foreground"
						>When set to hidden, a class is not visible on your Booking Page.</span
					>
				</div>
			</div>
		</div>
	</div>
</form>
