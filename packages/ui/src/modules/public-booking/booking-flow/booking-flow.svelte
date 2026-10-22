<script lang="ts">
	import ArrowLeft from '@tabler/icons-svelte/icons/arrow-left';
	import X from '@tabler/icons-svelte/icons/x';
	import SelectServiceStep from './steps/select-service-step.svelte';
	import SelectTeamMemberStep from './steps/select-team-member-step.svelte';
	import SelectDatetimeStep from './steps/select-datetime-step.svelte';
	import ContactDetailsStep from './steps/contact-details-step.svelte';
	import ConfirmationStep from './steps/confirmation-step.svelte';
	import UngroupedSerivice from './steps/select-ungrouped-service.svelte';
	import { resolveTeamStep } from './resolve-team-step';
	import type { BookingFlowState } from './booking-flow-state.svelte';
	import type {
		PublicBusiness,
		PublicService,
		PublicServiceGroup,
		PublicSlot,
		PublicTeamMember
	} from '../types';
	import FlowerFilled from '@tabler/icons-svelte/icons/flower-filled';

	let {
		flow,
		business,
		serviceGroups,
		ungroupedService,
		teamMembers,
		onClose
	}: {
		flow: BookingFlowState;
		business: PublicBusiness;
		serviceGroups: PublicServiceGroup[];
		ungroupedService: PublicService[];
		teamMembers: PublicTeamMember[];
		onClose: () => void;
	} = $props();

	const teamStep = $derived(resolveTeamStep(business, teamMembers, flow.selectedService));

	// Both entry points (picking a service directly, or picking a team member
	// first) route through the 'team-member' step — auto-advance past it here
	// whenever it isn't actually needed, so the logic lives in one place.
	$effect(() => {
		if (flow.step === 'team-member' && teamStep.skip) {
			if (!flow.selectedTeamMember) flow.selectedTeamMember = teamStep.defaultMember;
			flow.advance('datetime');
		}
	});

	/** filter team member services */
	const filterServiceGroups = $derived(
		flow.selectedTeamMember?.serviceIds && flow.selectedTeamMember.serviceIds.length > 0
			? handleTeamMemberServices(flow.selectedTeamMember.serviceIds, serviceGroups)
			: serviceGroups
	);

	/** filter ungroupedServices */
	const filterUngroupedServices = $derived(
		flow.selectedTeamMember?.serviceIds && flow.selectedTeamMember.serviceIds.length > 0
			? ungroupedService.filter((service) =>
					flow.selectedTeamMember!.serviceIds!.includes(service.id)
				)
			: ungroupedService
	);

	/**
	 * filter unrealted team member with selected service
	 */
	const filterTeamMember = $derived(
		flow.selectedService && flow.selectedService.id
			? teamMembers.filter((member) => member.serviceIds?.includes(flow.selectedService!.id))
			: null
	);

	const selectedMemberName = $derived(
		flow.selectedTeamMember
			? `${flow.selectedTeamMember.name.firstName} ${flow.selectedTeamMember.name.lastName}`
			: ''
	);

	const memberHasNoServices = $derived(
		!!flow.selectedTeamMember && !flow.selectedTeamMember?.serviceIds?.length
	);

	function handleServiceSelected(service: PublicService) {
		flow.selectedService = service;
		flow.goTo(flow.selectedTeamMember ? 'datetime' : 'team-member');
	}

	function handleTeamMemberSelected(member: PublicTeamMember | null) {
		if (member !== null) {
			flow.selectedTeamMember = member;
			flow.goTo('member-service');
		} else {
			let defaultNumber = Math.floor(Math.random() * teamMembers.length - 1) + 1;
			flow.selectedTeamMember = teamMembers[defaultNumber];
			flow.goTo('datetime');
		}
	}

	/** parse user (team member) services */
	function handleTeamMemberServices(
		serviceIds: string[],
		allServices: PublicServiceGroup[]
	): PublicServiceGroup[] {
		if (!serviceIds || serviceIds.length === 0) return [];
		return allServices
			.map((group) => ({
				...group,
				services: group.services.filter((service) => serviceIds.includes(service.id))
			}))
			.filter((group) => group.services.length > 0);
	}

	function handleDatetimeSelected(date: string, slot: PublicSlot) {
		flow.selectedDate = date;
		flow.selectedSlot = slot;
		flow.goTo('contact');
	}

	function handleContactSubmit(bookingReference: string) {
		flow.bookingReference = bookingReference;
		flow.goTo('confirmation');
	}

	function handleBack() {
		if (!flow.back()) onClose();
	}

	function handleBookAnother() {
		onClose();
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between">
		<button
			type="button"
			onclick={handleBack}
			class="flex cursor-pointer items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
		>
			<ArrowLeft size={16} />
			Back
		</button>
		{#if flow.step !== 'confirmation'}
			<button
				type="button"
				onclick={onClose}
				class="cursor-pointer text-muted-foreground hover:text-foreground"
			>
				<X size={18} />
			</button>
		{/if}
	</div>

	{#if flow.step === 'service' || flow.step === 'member-service'}
		{#if serviceGroups && serviceGroups.length > 0 && !memberHasNoServices}
			<SelectServiceStep
				serviceGroups={flow.selectedTeamMember ? filterServiceGroups : serviceGroups}
				label={business.bookingLabelOverrides.service}
				currency={business.locationDetails.currency}
				showPrices={business.bookingCustomization.showServiceAndClassPrices}
				showDuration={business.bookingCustomization.showServiceAndClassDuration}
				unavailable={!business.bookingSetup.bookAppointmentSectionVisible}
				onSelect={handleServiceSelected}
			/>
		{:else if ungroupedService && ungroupedService.length > 0 && !memberHasNoServices}
			<UngroupedSerivice
				services={flow.selectedTeamMember ? filterUngroupedServices : ungroupedService}
				label={business.bookingLabelOverrides.service}
				currency={business.locationDetails.currency}
				showPrices={business.bookingCustomization.showServiceAndClassPrices}
				showDuration={business.bookingCustomization.showServiceAndClassDuration}
				unavailable={!business.bookingSetup.bookAppointmentSectionVisible}
				onSelect={handleServiceSelected}
			/>
		{:else if memberHasNoServices}
			<SelectServiceStep
				serviceGroups={[]}
				label={business.bookingLabelOverrides.service}
				currency={business.locationDetails.currency}
				showPrices={business.bookingCustomization.showServiceAndClassPrices}
				showDuration={business.bookingCustomization.showServiceAndClassDuration}
				unavailable={!business.bookingSetup.bookAppointmentSectionVisible}
				memberHasNoServices
				memberName={selectedMemberName}
				onSelect={handleServiceSelected}
			/>
		{/if}
	{:else if flow.step === 'team-member'}
		<SelectTeamMemberStep
			teamMembers={filterTeamMember ? filterTeamMember : teamMembers}
			{business}
			label={business.bookingLabelOverrides.teamMember}
			unavailable={!business.bookingSetup.bookAppointmentSectionVisible}
			onSelect={handleTeamMemberSelected}
		/>
	{:else if flow.step === 'datetime' && flow.selectedService}
		<SelectDatetimeStep
			durationInMins={flow.selectedService.durationInMins}
			bufferTimeInMins={flow.selectedService.bufferTimeInMins}
			businessHours={business.businessHours}
			timeZone={business.locationDetails.timeZone}
			serviceId={flow.selectedService.id}
			userId={flow.selectedTeamMember?.id ?? 'admin123'}
			{business}
			onSelect={handleDatetimeSelected}
		/>
	{:else if flow.step === 'contact' && flow.selectedService && flow.selectedSlot && flow.selectedDate && flow.selectedTeamMember}
		<ContactDetailsStep
			contact={flow.contact}
			{business}
			fields={business.bookingContactFields}
			onSubmit={handleContactSubmit}
			brandColor={business.brandApperanceDetails.brandColor}
			buttonShape={business.brandApperanceDetails.brandButtonShape}
			service={flow.selectedService}
			slot={flow.selectedSlot}
			bookingDate={flow.selectedDate}
			teamMember={flow.selectedTeamMember}
		/>
	{:else if flow.step === 'confirmation' && flow.selectedService && flow.selectedSlot && flow.bookingReference}
		<ConfirmationStep
			service={flow.selectedService}
			teamMember={flow.selectedTeamMember}
			slot={flow.selectedSlot}
			timeZone={business.locationDetails.timeZone}
			bookingReference={flow.bookingReference}
			showBookAnotherAppointmentButton={business.bookingCustomization
				.showBookAnotherAppointmentButton}
			{business}
			onBookAnother={handleBookAnother}
		/>
	{/if}
</div>
