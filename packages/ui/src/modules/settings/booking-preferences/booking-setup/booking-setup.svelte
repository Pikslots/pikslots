<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import InfoCircle from '@tabler/icons-svelte/icons/info-circle';
	import Plus from '@tabler/icons-svelte/icons/plus';
	import Trash from '@tabler/icons-svelte/icons/trash';
	import type { CustomContactField } from '@pikslots/shared';
	import { businessStore } from '../../../core/store/business.svelte';
	import { createMutation } from '@tanstack/svelte-query';
	import { updateBusinessBookingSetup } from '../../../api/business/update.business.booking.setup.mutation';
	import type {
		BusinessUpdateBookingSetupInput,
		BusinessUpdateBookingSetupResult
	} from '../../../api/business/models/business-model';
	import type { BaseErrorResponse } from '@pikslots/shared';
	import type { AxiosError } from 'axios';
	import { toast } from 'svelte-sonner';

	const business = $derived(businessStore.selectedBusiness);

	// ── Sections ───────────────────────────────────────────────────
	let sections = $state([
		{ label: 'Book appointment', key: 'bookAppointmentSectionVisible', enabled: true },
		{ label: 'Book class', key: 'bookClassSectionVisible', enabled: true },
		{ label: 'About us', key: 'aboutUsSectionVisible', enabled: true },
		{ label: 'Our team', key: 'ourTeamSectionVisible', enabled: true },
		{ label: 'Services', key: 'servicesSectionVisible', enabled: true },
		{ label: 'Classes', key: 'classesSectionVisible', enabled: true }
	]);

	// ── Booking flow ───────────────────────────────────────────────
	let firstAvailable = $state(false);
	let skipTeamMembers = $state(false);
	let multipleServices = $state(false);
	let anyTeamMember = $state(false);
	let customerLogin = $state(false);
	let customerLoginRequired = $state(false);
	let accordionView = $state(false);
	let allowRescheduling = $state(false);
	let allowCancellations = $state(false);
	let bookNewButton = $state(false);

	// ── Contact fields ─────────────────────────────────────────────
	let contactFields = $state([
		{ label: 'Name', enabled: true, required: true, locked: true },
		{ label: 'Phone', enabled: false, required: false, locked: false },
		{ label: 'Email', enabled: true, required: true, locked: true },
		{ label: 'Address', enabled: false, required: false, locked: false }
	]);

	let customFields = $state<CustomContactField[]>([]);

	let editingFieldIndex = $state<number | null>(null);

	$effect(() => {
		if (business) {
			const s = business.bookingSetup;
			const cf = business.bookingContactFields;

			sections = [
				{
					label: 'Book appointment',
					key: 'bookAppointmentSectionVisible',
					enabled: s.bookAppointmentSectionVisible
				},
				{ label: 'Book class', key: 'bookClassSectionVisible', enabled: s.bookClassSectionVisible },
				{ label: 'About us', key: 'aboutUsSectionVisible', enabled: s.aboutUsSectionVisible },
				{ label: 'Our team', key: 'ourTeamSectionVisible', enabled: s.ourTeamSectionVisible },
				{ label: 'Services', key: 'servicesSectionVisible', enabled: s.servicesSectionVisible },
				{ label: 'Classes', key: 'classesSectionVisible', enabled: s.classesSectionVisible }
			];

			firstAvailable = s.showFirstAvailable;
			skipTeamMembers = s.skipTeamSelection;
			multipleServices = s.allowToBookMultipleServices;
			anyTeamMember = s.bypassTeamMemberSelection;
			customerLogin = s.customerLoginEnabled;
			customerLoginRequired = s.customerLoginRequired;
			accordionView = s.accordionView;
			allowRescheduling = s.allowRescheduling;
			allowCancellations = s.allowCancellations;
			bookNewButton = s.showBookNewButton;

			contactFields = [
				{ label: 'Name', enabled: cf.name.enabled, required: cf.name.required, locked: true },
				{ label: 'Phone', enabled: cf.phone.enabled, required: cf.phone.required, locked: false },
				{ label: 'Email', enabled: cf.email.enabled, required: cf.email.required, locked: false },
				{
					label: 'Address',
					enabled: cf.address.enabled,
					required: cf.address.required,
					locked: false
				}
			];

			customFields = cf.customFields.map((f) => ({ ...f }));
		}
	});

	const customFieldsChanged = $derived(
		!!business &&
			(customFields.length !== business.bookingContactFields.customFields.length ||
				customFields.some((f, i) => {
					const b = business.bookingContactFields.customFields[i];
					return !b || f.label !== b.label || f.enabled !== b.enabled || f.required !== b.required;
				}))
	);

	const isDirty = $derived(
		!!business &&
			(sections[0].enabled !== business.bookingSetup.bookAppointmentSectionVisible ||
				sections[1].enabled !== business.bookingSetup.bookClassSectionVisible ||
				sections[2].enabled !== business.bookingSetup.aboutUsSectionVisible ||
				sections[3].enabled !== business.bookingSetup.ourTeamSectionVisible ||
				sections[4].enabled !== business.bookingSetup.servicesSectionVisible ||
				sections[5].enabled !== business.bookingSetup.classesSectionVisible ||
				firstAvailable !== business.bookingSetup.showFirstAvailable ||
				skipTeamMembers !== business.bookingSetup.skipTeamSelection ||
				multipleServices !== business.bookingSetup.allowToBookMultipleServices ||
				anyTeamMember !== business.bookingSetup.bypassTeamMemberSelection ||
				customerLogin !== business.bookingSetup.customerLoginEnabled ||
				customerLoginRequired !== business.bookingSetup.customerLoginRequired ||
				accordionView !== business.bookingSetup.accordionView ||
				allowRescheduling !== business.bookingSetup.allowRescheduling ||
				allowCancellations !== business.bookingSetup.allowCancellations ||
				bookNewButton !== business.bookingSetup.showBookNewButton ||
				contactFields[0].required !== business.bookingContactFields.name.required ||
				contactFields[1].enabled !== business.bookingContactFields.phone.enabled ||
				contactFields[1].required !== business.bookingContactFields.phone.required ||
				contactFields[2].enabled !== business.bookingContactFields.email.enabled ||
				contactFields[2].required !== business.bookingContactFields.email.required ||
				contactFields[3].enabled !== business.bookingContactFields.address.enabled ||
				contactFields[3].required !== business.bookingContactFields.address.required ||
				customFieldsChanged)
	);

	const updateMutation = createMutation<
		BusinessUpdateBookingSetupResult,
		AxiosError<BaseErrorResponse>,
		BusinessUpdateBookingSetupInput
	>(() => ({
		mutationFn: updateBusinessBookingSetup
	}));

	$effect(() => {
		if (updateMutation.data) {
			businessStore.setSelectedBusiness(updateMutation.data);
			toast.success('Booking setup saved successfully.');
		}
		if (updateMutation.isError) {
			toast.error(
				updateMutation.error?.response?.data?.message ?? 'Failed to save. Please try again.'
			);
		}
	});

	function addCustomField() {
		customFields = [...customFields, { label: '', enabled: true, required: false }];
	}

	function removeCustomField(index: number) {
		customFields = customFields.filter((_, i) => i !== index);
	}

	function handleSave() {
		if (!business) return;
		updateMutation.mutate({
			id: business.id,
			bookAppointmentSectionVisible: sections[0].enabled,
			bookClassSectionVisible: sections[1].enabled,
			aboutUsSectionVisible: sections[2].enabled,
			ourTeamSectionVisible: sections[3].enabled,
			servicesSectionVisible: sections[4].enabled,
			classesSectionVisible: sections[5].enabled,
			showFirstAvailable: firstAvailable,
			skipTeamSelection: skipTeamMembers,
			allowToBookMultipleServices: multipleServices,
			bypassTeamMemberSelection: anyTeamMember,
			customerLoginEnabled: customerLogin,
			customerLoginRequired,
			hidePikslotsBranding: business.bookingSetup.hidePikslotsBranding,
			accordionView,
			allowRescheduling,
			allowCancellations,
			showBookNewButton: bookNewButton,
			nameEnabled: contactFields[0].enabled,
			nameRequired: contactFields[0].required,
			emailEnabled: contactFields[2].enabled,
			emailRequired: contactFields[2].required,
			phoneEnabled: contactFields[1].enabled,
			phoneRequired: contactFields[1].required,
			addressEnabled: contactFields[3].enabled,
			addressRequired: contactFields[3].required,
			customFields: customFields.map((f) => ({ ...f }))
		});
	}
</script>

<div class="flex flex-col">
	<!-- Page header -->
	<div class="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
		<h1 class="text-base font-semibold">Booking preferences</h1>
		<Button size="sm" onclick={handleSave} disabled={!isDirty || updateMutation.isPending}>
			{updateMutation.isPending ? 'Saving...' : 'Save'}
		</Button>
	</div>

	<div class="flex w-full max-w-3xl flex-col gap-6 px-4 py-4 sm:px-6">
		<!-- Booking setup heading -->
		<h2 class="text-sm font-semibold">Booking setup</h2>

		<!-- Sections -->
		<div class="flex flex-col gap-3">
			<div class="flex flex-col gap-0.5">
				<span class="text-xs font-medium">Sections</span>
				<span class="text-xs text-muted-foreground"
					>What sections will be visible to your Booking Page visitors?</span
				>
			</div>
			<div class="flex flex-col gap-2.5">
				{#if business === null}
					{#each Array(6) as _, i (i)}
						<div class="flex items-center gap-3">
							<Skeleton class="h-5 w-9 rounded-full" />
							<Skeleton class="h-3.5 w-28 rounded" />
						</div>
					{/each}
				{:else}
					{#each sections as section (section.label)}
						<div class="flex items-center gap-3">
							<Switch bind:checked={section.enabled} />
							<span class="text-xs">{section.label}</span>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Booking flow -->
		<div class="flex flex-col gap-3">
			<div class="flex flex-col gap-0.5">
				<span class="text-xs font-medium">Booking flow</span>
				<span class="text-xs text-muted-foreground"
					>Streamline the scheduling experience to fill your calendar faster.</span
				>
			</div>

			<div class="flex flex-col gap-2.5">
				{#if business === null}
					{#each Array(9) as _, i (i)}
						<div class="flex items-center gap-3">
							<Skeleton class="h-5 w-9 rounded-full" />
							<Skeleton class="h-3.5 w-36 rounded" />
						</div>
					{/each}
				{:else}
					<!-- First available appointment
					<!-- <div class="flex items-center gap-3">
						<Switch bind:checked={firstAvailable} />
						<span class="text-xs">First available appointment</span>
						<InfoCircle size={14} class="text-muted-foreground" />
					</div> -->

					<!-- Skip team members -->
					<div class="flex items-center gap-3">
						<Switch bind:checked={skipTeamMembers} />
						<span class="text-xs">Skip team members</span>
						<div class="group relative">
							<InfoCircle size={14} class="cursor-help text-muted-foreground" />

							<div
								class="absolute bottom-full left-1/2 z-50 mt-2
                   hidden w-48 -translate-x-1/2
                   rounded-md bg-popover px-3 py-2
                   text-xs text-popover-foreground
                   shadow-md group-hover:block"
							>
								This allows customers to book with any available team member.
							</div>
						</div>
					</div>

					<!-- Provide multiple services -->
					<!-- <div class="flex items-center gap-3">
						<Switch bind:checked={multipleServices} />
						<span class="text-xs">Provide multiple services</span>
						<InfoCircle size={14} class="text-muted-foreground" />
					</div> -->

					<!-- Any team member -->
					<div class="flex items-center gap-3">
						<Switch bind:checked={anyTeamMember} />
						<span class="text-xs">Any team member</span>
						<div class="group relative">
							<InfoCircle size={14} class="cursor-help text-muted-foreground" />

							<div
								class="absolute bottom-full left-1/2 z-50 mt-2
					   hidden w-48 -translate-x-1/2
					   rounded-md bg-popover px-3 py-2
					   text-xs text-popover-foreground
					   shadow-md group-hover:block"
							>
								This allows customers to pick any team member for their booking.
							</div>
						</div>
					</div>

					<!-- Customer login + Required -->
					<!-- <div class="flex items-center gap-3">
						<Switch bind:checked={customerLogin} />
						<span class="text-xs">Customer login</span>
						<InfoCircle size={14} class="text-muted-foreground" />
						<div class="ml-auto flex items-center gap-2">
							<span class="text-xs text-muted-foreground">Required</span>
							<Switch bind:checked={customerLoginRequired} disabled={!customerLogin} />
						</div>
					</div> -->

					<!-- Accordion view -->
					<div class="flex items-center gap-3">
						<Switch bind:checked={accordionView} />
						<span class="text-xs">Accordion view</span>
						<div class="group relative">
							<InfoCircle size={14} class="cursor-help text-muted-foreground" />

							<div
								class="absolute bottom-full left-1/2 z-50 mt-2
					   hidden w-48 -translate-x-1/2
					   rounded-md bg-popover px-3 py-2
					   text-xs text-popover-foreground
					   shadow-md group-hover:block"
							>
								Shows booking steps in an accordion layout for a compact experience.
							</div>
						</div>
					</div>

					<!-- Allow online rescheduling -->
					<div class="flex items-center gap-3">
						<Switch bind:checked={allowRescheduling} />
						<span class="text-xs">Allow online rescheduling</span>
						<div class="group relative">
							<InfoCircle size={14} class="cursor-help text-muted-foreground" />

							<div
								class="absolute bottom-full left-1/2 z-50 mt-2
					   hidden w-48 -translate-x-1/2
					   rounded-md bg-popover px-3 py-2
					   text-xs text-popover-foreground
					   shadow-md group-hover:block"
							>
								This lets customers reschedule their existing bookings online.
							</div>
						</div>
					</div>

					<!-- Allow online cancellations -->
					<div class="flex items-center gap-3">
						<Switch bind:checked={allowCancellations} />
						<span class="text-xs">Allow online cancellations</span>
						<div class="group relative">
							<InfoCircle size={14} class="cursor-help text-muted-foreground" />

							<div
								class="absolute bottom-full left-1/2 z-50 mt-2
					   hidden w-48 -translate-x-1/2
					   rounded-md bg-popover px-3 py-2
					   text-xs text-popover-foreground
					   shadow-md group-hover:block"
							>
								This lets customers cancel their existing bookings online.
							</div>
						</div>
					</div>

					<!-- 'Book new appointment' button -->
					<div class="flex items-center gap-3">
						<Switch bind:checked={bookNewButton} />
						<span class="text-xs">'Book new appointment' button</span>
						<div class="group relative">
							<InfoCircle size={14} class="cursor-help text-muted-foreground" />

							<div
								class="absolute bottom-full left-1/2 z-50 mt-2
					   hidden w-48 -translate-x-1/2
					   rounded-md bg-popover px-3 py-2
					   text-xs text-popover-foreground
					   shadow-md group-hover:block"
							>
								This shows a button for customers to book a new appointment after completing one.
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Contact fields -->
		<div class="flex flex-col gap-3">
			<div class="flex flex-col gap-0.5">
				<span class="text-xs font-medium">Contact fields</span>
				<span class="text-xs text-muted-foreground"
					>What form fields will display when customers book online?</span
				>
			</div>

			<div class="flex flex-col gap-2.5">
				{#if business === null}
					{#each Array(4) as _, i (i)}
						<div class="flex items-center gap-3">
							<Skeleton class="h-5 w-9 rounded-full" />
							<Skeleton class="h-3.5 w-20 rounded" />
							<div class="ml-auto flex items-center gap-2">
								<Skeleton class="h-3.5 w-14 rounded" />
								<Skeleton class="h-5 w-9 rounded-full" />
							</div>
						</div>
					{/each}
				{:else}
					{#each contactFields as field (field.label)}
						<div class="flex items-center gap-3">
							<Switch bind:checked={field.enabled} disabled={field.locked} />
							<span class="text-xs {field.locked ? 'text-muted-foreground' : ''}"
								>{field.label}</span
							>
							<div class="mr-9 ml-auto flex items-center gap-2">
								<span class="text-xs text-muted-foreground">Required</span>
								<Switch
									bind:checked={field.required}
									disabled={!field.enabled || field.locked}
									class={!field.enabled || field.locked ? 'opacity-40' : ''}
								/>
							</div>
						</div>
					{/each}

					{#each customFields as field, i (i)}
						<div class="flex flex-wrap items-center gap-3">
							<Switch bind:checked={field.enabled} />
							{#if editingFieldIndex === i}
								<Input
									type="text"
									bind:value={field.label}
									placeholder="Field label"
									class="h-8 w-48 text-xs"
									onblur={() => (editingFieldIndex = null)}
									onkeydown={(e) => {
										if (e.key === 'Enter') editingFieldIndex = null;
									}}
								/>
							{:else}
								<button
									type="button"
									class="cursor-pointer text-xs"
									onclick={() => (editingFieldIndex = i)}
								>
									{field.label || 'Add Field....'}
								</button>
							{/if}
							<div class="ml-auto flex items-center gap-2">
								<span class="text-xs text-muted-foreground">Required</span>
								<Switch
									bind:checked={field.required}
									disabled={!field.enabled}
									class={!field.enabled ? 'opacity-40' : ''}
								/>
								<Button
									variant="ghost"
									size="icon"
									class="h-7 w-7 text-muted-foreground hover:text-destructive "
									onclick={() => removeCustomField(i)}
									aria-label="Remove field"
								>
									<Trash size={14} />
								</Button>
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<Button
				variant="ghost"
				class="w-fit gap-1.5 px-0 text-xs font-medium"
				onclick={addCustomField}
			>
				<Plus size={14} />
				Add field
			</Button>
		</div>
	</div>
</div>
