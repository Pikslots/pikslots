<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import Check from '@tabler/icons-svelte/icons/check';
	import ChevronDown from '@tabler/icons-svelte/icons/chevron-down';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Field, FieldGroup, FieldError } from '$lib/components/ui/field/index.js';
	import ArrowLeft from '@tabler/icons-svelte/icons/arrow-left';
	import Photo from '@tabler/icons-svelte/icons/photo';
	import Upload from '@tabler/icons-svelte/icons/upload';
	import InfoCircle from '@tabler/icons-svelte/icons/info-circle';
	import { createQuery, createMutation } from '@tanstack/svelte-query';
	import { getUsersInsideBusinessQueryOptions } from '../api/user/get.users.inside.business.query';
	import { getServiceGroupsByBusinessQueryOptions } from '../api/service-group/get.service.groups.by.business.query';
	import { registerServiceMutationOptions } from '../api/service/register.service.mutation';
	import { businessStore } from '$stores/business.svelte';
	import type { BusinessUserModel } from '../api/user/models/user-model';
	import type { ServiceGroupModel } from '../api/service-group/models/service-group-model';
	import { superForm } from 'sveltekit-superforms';
	import { zod4 as zod } from 'sveltekit-superforms/adapters';
	import z from 'zod';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteSet } from 'svelte/reactivity';
	import { color } from '../core/store/utlis/color';
	import * as Select from '$lib/components/ui/select/index.js';
	import EditServiceAvatar from './dialog/update-service-image-dialog.svelte';
	import { uploadAvatarMutationOptions } from '../api/s3/upload.avatar.mutation';

	// ── Props ────────────────────────────────────────────────────────────────────

	interface Props {
		onBack?: () => void;
	}

	const { onBack }: Props = $props();

	//____var____________________________
	const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
	const MAX_SIZE_MB = 10;

	// ── Schema ───────────────────────────────────────────────────────────────────

	const RegisterServiceSchema = z.object({
		title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
		description: z.string().default(''),
		durationInMins: z.coerce.number().min(1, 'Duration must be at least 1 minute'),
		bufferTimeInMins: z.coerce.number().min(0).default(0),
		cost: z.coerce.number().min(0).default(0),
		businessId: z.string().min(1, 'No business selected'),
		colorCode: z.string().min(1).max(10).default('#363030'),
		isHiddenFromBookingPage: z.boolean().default(false)
	});

	// ── Mutation ─────────────────────────────────────────────────────────────────

	const uploadMutation = createMutation(uploadAvatarMutationOptions);
	const registerMutation = createMutation(registerServiceMutationOptions);

	// ── Superform ────────────────────────────────────────────────────────────────

	const { form, errors, enhance } = superForm(
		{
			title: '',
			description: '',
			durationInMins: 0,
			bufferTimeInMins: 0,
			cost: 0,
			businessId: businessStore.selectedBusiness?.id ?? '',
			isHiddenFromBookingPage: false,
			colorCode: '#363030'
		},
		{
			validators: zod(RegisterServiceSchema),
			SPA: true,
			resetForm: false,
			onUpdate: async ({ form }) => {
				if (form.valid) {
					if (selectedMemberIds.size === 0) {
						teamError = true;
						return;
					}
					let avatarKey = '';
					if (imagePreview) {
						URL.revokeObjectURL(imagePreview);
					}
					if (imageFile && businessStore.selectedBusiness?.slug) {
						avatarKey = await uploadMutation.mutateAsync({
							folder: 'service',
							file: imageFile,
							businessSlug: businessStore.selectedBusiness.slug,
							type: 'service_avatar',
							id: null
						});
					}
					await registerMutation.mutate({
						title: form.data.title,
						description: form.data.description,
						durationInMins: form.data.durationInMins,
						bufferTimeInMins: form.data.bufferTimeInMins,
						cost: Math.round(form.data.cost * 100),
						businessId: form.data.businessId,
						isHiddenFromBookingPage: form.data.isHiddenFromBookingPage,
						serviceAvatar: avatarKey ?? '',
						associatedUsers: [...selectedMemberIds],
						associatedServiceGroups: [...selectedGroupIds],
						colorCode: form.data.colorCode
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
			toast.success('Service created successfully');
			goto(resolve('/home/services'));
		}
		if (registerMutation.isError) {
			toast.error(registerMutation.error?.response?.data?.message ?? 'Failed to create service');
			registerMutation.reset();
		}
	});

	// ── Queries ──────────────────────────────────────────────────────────────────

	const userQuery = createQuery(() => ({
		...getUsersInsideBusinessQueryOptions(businessStore.selectedBusiness?.id ?? ''),
		enabled: !!businessStore.selectedBusiness?.id
	}));

	const serviceGroupsQuery = createQuery(() => ({
		...getServiceGroupsByBusinessQueryOptions(businessStore.selectedBusiness?.id ?? ''),
		enabled: !!businessStore.selectedBusiness?.id
	}));

	const teamMembers = $derived<BusinessUserModel[]>(userQuery.data ?? []);
	const serviceGroups = $derived<ServiceGroupModel[]>(serviceGroupsQuery.data ?? []);

	// ── State ────────────────────────────────────────────────────────────────────

	const selectedMemberIds = new SvelteSet<string>();
	const selectedGroupIds = new SvelteSet<string>();
	let groupComboOpen = $state(false);
	let imageFile = $state<File | null>(null);
	let imagePreview = $state<string | null>(null);
	let teamSearch = $state('');
	let teamError = $state(false);
	let DialogOpen = $state<boolean>(false);
	let fileInput: HTMLInputElement;

	// ── Derived ──────────────────────────────────────────────────────────────────

	const canCreate = $derived(
		$form.title.trim().length > 0 && Number($form.durationInMins) >= 1 && selectedMemberIds.size > 0
	);

	const showTeamRequired = $derived(
		selectedMemberIds.size === 0 &&
			(teamError || ($form.title.trim().length > 0 && Number($form.durationInMins) >= 1))
	);
	const isSaving = $derived(uploadMutation.isPending || registerMutation.isPending);

	const filteredTeam = $derived(
		teamMembers.filter((m) =>
			`${m.name.firstName} ${m.name.lastName}`.toLowerCase().includes(teamSearch.toLowerCase())
		)
	);

	const allSelected = $derived(
		teamMembers.length > 0 && selectedMemberIds.size === teamMembers.length
	);
	const currency = $derived(businessStore.selectedBusiness?.locationDetails?.currency);

	const someSelected = $derived(selectedMemberIds.size > 0 && !allSelected);

	// ── Handlers ─────────────────────────────────────────────────────────────────

	function HandleOnSave(file: File | null) {
		imageFile = file;
	}

	function toggleGroup(id: string) {
		if (selectedGroupIds.has(id)) selectedGroupIds.delete(id);
		else selectedGroupIds.add(id);
	}

	function toggleMember(id: string) {
		if (selectedMemberIds.has(id)) selectedMemberIds.delete(id);
		else selectedMemberIds.add(id);
		teamError = false;
	}

	function toggleAll() {
		if (allSelected) {
			selectedMemberIds.clear();
		} else {
			for (const m of teamMembers) selectedMemberIds.add(m.id);
		}
		teamError = false;
	}

	function handleImageChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;

		if (!ACCEPTED_TYPES.includes(file.type)) {
			toast.error('Only JPG, JPEG and PNG files are allowed');
			return;
		}
		if (file.size > MAX_SIZE_MB * 1024 * 1024) {
			toast.error(`File must be under ${MAX_SIZE_MB}MB`);
			return;
		}

		imageFile = file;
		if (imagePreview) {
			URL.revokeObjectURL(imagePreview);
		}
		imagePreview = URL.createObjectURL(file);
		DialogOpen = true;
	}
</script>

<EditServiceAvatar
	bind:open={DialogOpen}
	bind:previewUrl={imagePreview}
	initialFile={imageFile}
	onSave={HandleOnSave}
	onClose={() => (imageFile = null)}
/>

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
				<h1 class="truncate text-base leading-tight font-semibold">New service</h1>
				<p class="hidden truncate text-xs text-muted-foreground sm:block">
					Add something customers can book in a few clicks
				</p>
			</div>
		</div>
		<Button type="submit" size="sm" disabled={!canCreate || isSaving}>
			{registerMutation.isPending ? 'Creating...' : 'Create'}
		</Button>
	</div>

	<!-- ── Body ─────────────────────────────────────────────────────────────────── -->
	<div class="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
		<!-- Left column -->
		<div class="flex flex-1 flex-col gap-6 px-4 py-6 md:px-6 lg:overflow-y-auto">
			<!-- Service details heading -->
			<div>
				<h3 class="text-base font-semibold">Service details</h3>
				<p class="text-xs text-muted-foreground">What customers see when they book</p>
			</div>

			<!-- Image upload -->
			<div class="flex items-start gap-4">
				<div
					class="flex size-24 shrink-0 items-center justify-center overflow-hidden border border-dashed bg-muted/50"
				>
					{#if imagePreview}
						<img src={imagePreview} alt="Service" class="h-full w-full object-cover" />
					{:else}
						<Photo size={24} class="text-muted-foreground" />
					{/if}
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-sm font-medium">Service image</span>
					<span class="text-xs text-muted-foreground">Up to 5 MB in size</span>
					<div>
						<input
							bind:this={fileInput}
							type="file"
							accept=".jpg,.jpeg,.png"
							class="hidden"
							onchange={handleImageChange}
						/>
						<Button
							variant="outline"
							size="sm"
							class="mt-1 cursor-pointer gap-2"
							tabindex={-1}
							onclick={() => fileInput.click()}
						>
							<Upload size={14} />
							Upload
						</Button>
					</div>
				</div>
			</div>

			<FieldGroup>
				<!-- Title -->
				<Field>
					<Label for="title">Title <span class="text-destructive">*</span></Label>
					<div class="flex w-full gap-x-2">
						<Input
							id="title"
							bind:value={$form.title}
							placeholder="For example, &quot;Introductory call&quot;"
							class=" focus-visible:ring-primary"
						/>
						<FieldError errors={$errors.title?.map((e) => ({ message: e }))} />

						<!-- color code -->
						<Select.Root type="single" bind:value={$form.colorCode}>
							<Select.Trigger aria-label="Calendar color">
								<div
									class="h-5 min-w-5 rounded-full"
									style:background-color={$form.colorCode}
								></div>
							</Select.Trigger>
							<Select.Content>
								<div class="grid grid-cols-5 gap-1 p-1">
									{#each color as code, index (index)}
										<Select.Item
											id={code}
											value={code}
											class="flex  w-auto cursor-pointer items-center justify-center rounded-full border-2
												  border-transparent p-1 transition-all duration-500 ease-in-out hover:border-[#95c2a2]"
										>
											<div
												class="h-5 w-5 rounded-full shadow-xl"
												style:background-color={code}
											></div>
										</Select.Item>
									{/each}
								</div>
							</Select.Content>
						</Select.Root>
					</div>
				</Field>

				<!-- Description -->
				<Field>
					<Label for="description">Description</Label>
					<textarea
						id="description"
						bind:value={$form.description}
						placeholder="Describe your service to Booking Page visitors"
						class="flex min-h-24 w-full border border-input bg-transparent px-2.5 py-2 text-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
					></textarea>
				</Field>

				<!-- Duration / Buffer / Cost -->
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

					<!-- Buffer time -->
					<Field class="flex-1">
						<Label for="buffer" class="flex items-center gap-1">
							Buffer time
							<InfoCircle size={13} class="text-muted-foreground" />
						</Label>
						<div class="relative">
							<Input
								id="buffer"
								type="number"
								min="0"
								bind:value={$form.bufferTimeInMins}
								placeholder="Enter buffer time"
								class="[appearance:textfield] pr-12 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
							/>
							<span
								class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground"
								>mins</span
							>
						</div>
						<FieldError errors={$errors.bufferTimeInMins?.map((e) => ({ message: e }))} />
					</Field>

					<!-- Cost -->
					<Field class="flex-1">
						<Label for="cost">Cost</Label>
						<div class="relative">
							<span
								class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted-foreground"
								>{currency ?? 'PKR'}</span
							>
							<Input
								id="cost"
								type="number"
								min="0"
								bind:value={$form.cost}
								placeholder="Enter cost"
								class="[appearance:textfield] pl-10 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
							/>
						</div>
						<FieldError errors={$errors.cost?.map((e) => ({ message: e }))} />
					</Field>
				</div>
			</FieldGroup>

			<!-- Groups combobox -->
			<div class="flex flex-col gap-1.5">
				<Label>Service Groups</Label>
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
										Select service groups
									{:else}
										{serviceGroups
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
									{#each serviceGroups as group (group.id)}
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
						>When set to hidden, a service is not visible on your Booking Page.</span
					>
				</div>
			</div>
		</div>

		<!-- Divider -->
		<Separator orientation="vertical" class="hidden lg:block" />

		<!-- Right column — Team -->
		<div
			class="flex w-full shrink-0 flex-col gap-3 border-t bg-muted/20 px-4 py-6 md:px-6 lg:w-80 lg:overflow-y-auto lg:border-t-0"
		>
			<div>
				<h3 class="text-base font-semibold">
					Team <span class="text-destructive">*</span>
				</h3>
				<p class="mt-0.5 text-xs text-muted-foreground">Who will provide this service?</p>
				{#if showTeamRequired}
					<FieldError errors={[{ message: 'Select at least one team member' }]} />
				{/if}
			</div>

			<!-- Team search -->
			<div class="relative">
				<svg
					class="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
					width="13"
					height="13"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
				</svg>
				<Input bind:value={teamSearch} placeholder="Search" class="pl-8 text-sm" />
			</div>

			<!-- Select all -->
			<div class="flex items-center gap-2.5">
				<Checkbox
					id="select-all"
					checked={allSelected}
					indeterminate={someSelected}
					onCheckedChange={toggleAll}
					class="rounded"
				/>
				<label for="select-all" class="cursor-pointer text-sm">Select all</label>
			</div>

			<Separator />

			<!-- Team member list -->
			<div class="flex flex-col gap-1">
				{#each filteredTeam as member (member.id)}
					<div class="flex items-center gap-2.5 px-2 py-1.5 transition-colors hover:bg-accent">
						<Checkbox
							id="member-{member.id}"
							checked={selectedMemberIds.has(member.id)}
							onCheckedChange={() => toggleMember(member.id)}
							class="rounded"
						/>
						<Avatar.Root class="size-7 text-xs">
							{#if member.avatarUrl}
								<Avatar.Image
									src={member.avatarUrl}
									alt="{member.name.firstName} {member.name.lastName}"
								/>
							{/if}
							<Avatar.Fallback class="bg-primary text-[11px] text-primary-foreground">
								{member.name.firstName[0]}{member.name.lastName[0]}
							</Avatar.Fallback>
						</Avatar.Root>
						<label for="member-{member.id}" class="cursor-pointer text-sm"
							>{member.name.firstName} {member.name.lastName}</label
						>
					</div>
				{/each}
			</div>
		</div>
	</div>
</form>
