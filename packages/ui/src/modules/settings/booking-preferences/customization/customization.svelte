<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import type { WeekDay } from '@pikslots/shared';
	import { businessStore } from '../../../core/store/business.svelte';
	import { createMutation } from '@tanstack/svelte-query';
	import { updateBusinessBookingCustomization } from '../../../api/business/update.business.booking.customization.mutation';
	import type {
		BusinessUpdateBookingCustomizationInput,
		BusinessUpdateBookingCustomizationResult
	} from '../../../api/business/models/business-model';
	import type { BaseErrorResponse } from '@pikslots/shared';
	import type { AxiosError } from 'axios';
	import { toast } from 'svelte-sonner';

	const business = $derived(businessStore.selectedBusiness);

	// ── General ────────────────────────────────────────────────────
	let language = $state('en');
	let timeFormat = $state<'12 hours' | '24 hours'>('12 hours');
	let weekStartsOn = $state<WeekDay>('monday');

	const languages: { value: string; label: string }[] = [
		{ value: 'en', label: 'English' },
		{ value: 'ru', label: 'Russian' }
	];

	const timeFormats: { value: '12 hours' | '24 hours'; label: string }[] = [
		{ value: '12 hours', label: '12 Hours' },
		{ value: '24 hours', label: '24 Hours' }
	];
	const weekDays: { value: WeekDay; label: string }[] = [
		{ value: 'monday', label: 'Monday' },
		{ value: 'sunday', label: 'Sunday' },
		{ value: 'saturday', label: 'Saturday' }
	];

	// ── Services and classes ───────────────────────────────────────
	let showPrices = $state(false);
	let showDuration = $state(false);
	let showBusinessHours = $state(false);
	let showLocalTime = $state(false);
	let bookAnotherButton = $state(false);

	// ── Labels ─────────────────────────────────────────────────────
	let labelService = $state('');
	let labelClass = $state('');
	let labelTeamMember = $state('');
	let labelCity = $state('');
	let labelState = $state('');
	let labelPostalCode = $state('');

	// ── Terms and conditions ───────────────────────────────────────
	let termsLabel = $state('');
	let termsLink = $state('');
	let requireAgreement = $state(false);

	// ── Confirmation redirect ──────────────────────────────────────
	let redirectLabel = $state('');
	let redirectLink = $state('');

	$effect(() => {
		console.log(business?.bookingLabelOverrides.termsAndConditions);
		if (business) {
			const c = business.bookingCustomization;
			const l = business.bookingLabelOverrides;

			language = c.language;
			timeFormat = c.timeFormat;
			weekStartsOn = c.weekStartsOn;
			showPrices = c.showServiceAndClassPrices;
			showDuration = c.showServiceAndClassDuration;
			showBusinessHours = c.showBusinessHours;
			showLocalTime = c.showLocalTime;
			bookAnotherButton = c.showBookAnotherAppointmentButton;

			labelService = l.service;
			labelClass = l.class;
			labelTeamMember = l.teamMember;
			labelCity = l.city;
			labelState = l.state;
			labelPostalCode = l.postalCode;

			termsLabel = l.termsAndConditions.label;
			termsLink = l.termsAndConditions.link;
			requireAgreement = l.termsAndConditions.requireTermsAcceptance;

			redirectLabel = l.redirection.label;
			redirectLink = l.redirection.link;
		}
	});

	const isDirty = $derived(
		!!business &&
			(language !== business.bookingCustomization.language ||
				timeFormat !== business.bookingCustomization.timeFormat ||
				weekStartsOn !== business.bookingCustomization.weekStartsOn ||
				showPrices !== business.bookingCustomization.showServiceAndClassPrices ||
				showDuration !== business.bookingCustomization.showServiceAndClassDuration ||
				showBusinessHours !== business.bookingCustomization.showBusinessHours ||
				showLocalTime !== business.bookingCustomization.showLocalTime ||
				bookAnotherButton !== business.bookingCustomization.showBookAnotherAppointmentButton ||
				labelService !== business.bookingLabelOverrides.service ||
				labelClass !== business.bookingLabelOverrides.class ||
				labelTeamMember !== business.bookingLabelOverrides.teamMember ||
				labelCity !== business.bookingLabelOverrides.city ||
				labelState !== business.bookingLabelOverrides.state ||
				labelPostalCode !== business.bookingLabelOverrides.postalCode ||
				termsLabel !== business.bookingLabelOverrides.termsAndConditions.label ||
				termsLink !== business.bookingLabelOverrides.termsAndConditions.link ||
				requireAgreement !==
					business.bookingLabelOverrides.termsAndConditions.requireTermsAcceptance ||
				redirectLabel !== business.bookingLabelOverrides.redirection.label ||
				redirectLink !== business.bookingLabelOverrides.redirection.link)
	);

	const updateMutation = createMutation<
		BusinessUpdateBookingCustomizationResult,
		AxiosError<BaseErrorResponse>,
		BusinessUpdateBookingCustomizationInput
	>(() => ({
		mutationFn: updateBusinessBookingCustomization
	}));

	$effect(() => {
		if (updateMutation.data) {
			businessStore.setSelectedBusiness(updateMutation.data);
			toast.success('Customization saved successfully.');
		}
		if (updateMutation.isError) {
			toast.error(
				updateMutation.error?.response?.data?.message ?? 'Failed to save. Please try again.'
			);
		}
	});

	function handleSave() {
		if (!business) return;
		updateMutation.mutate({
			id: business.id,
			language,
			timeFormat,
			weekStartsOn,
			showBookAnotherAppointmentButton: bookAnotherButton,
			showServiceAndClassPrices: showPrices,
			showServiceAndClassDuration: showDuration,
			showBusinessHours,
			showLocalTime,
			labelService,
			labelClass,
			labelTeamMember,
			labelCity,
			labelState,
			labelPostalCode,
			termsLabel,
			termsLink,
			requireTermsAcceptance: requireAgreement,
			redirectLabel,
			redirectLink
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
		<!-- Customization heading -->
		<h2 class="text-sm font-semibold">Customization</h2>

		<!-- General -->
		<div class="flex flex-col gap-3">
			<div class="flex flex-col gap-0.5">
				<span class="text-xs font-medium">General</span>
				<span class="text-xs text-muted-foreground"
					>Select standard display preferences for your Booking Page.</span
				>
			</div>

			<div class="flex flex-col gap-2.5">
				<!-- Preferred language -->
				<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
					<div class="flex flex-col gap-0.5">
						<span class="text-xs font-medium">Preferred language</span>
						<span class="text-xs text-muted-foreground"
							>This will be the default language of your Booking Page.</span
						>
					</div>
					{#if business === null}
						<Skeleton class="h-9 w-40 shrink-0 rounded-md" />
					{:else}
						<Select.Root type="single" bind:value={language}>
							<Select.Trigger class="w-40 shrink-0 text-xs">
								{languages.find((l) => l.value === language)?.label ?? language}
							</Select.Trigger>
							<Select.Content>
								{#each languages as l (l.value)}
									<Select.Item value={l.value}>{l.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					{/if}
				</div>

				<!-- Time format -->
				<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
					<div class="flex flex-col gap-0.5">
						<span class="text-xs font-medium">Time format</span>
						<span class="text-xs text-muted-foreground"
							>Display time in 12-hour AM/PM or 24-hour format.</span
						>
					</div>
					{#if business === null}
						<Skeleton class="h-9 w-40 shrink-0 rounded-md" />
					{:else}
						<Select.Root type="single" bind:value={timeFormat}>
							<Select.Trigger class="w-40 shrink-0 text-xs">
								{timeFormats.find((f) => f.value === timeFormat)?.label ?? timeFormat}
							</Select.Trigger>
							<Select.Content>
								{#each timeFormats as f (f.value)}
									<Select.Item value={f.value}>{f.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					{/if}
				</div>

				<!-- Week starts on -->
				<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
					<div class="flex flex-col gap-0.5">
						<span class="text-xs font-medium">Week starts on</span>
						<span class="text-xs text-muted-foreground"
							>Set the first day of the week as seen on your Booking Page.</span
						>
					</div>
					{#if business === null}
						<Skeleton class="h-9 w-40 shrink-0 rounded-md" />
					{:else}
						<Select.Root type="single" bind:value={weekStartsOn}>
							<Select.Trigger class="w-40 shrink-0 text-xs">
								{weekDays.find((d) => d.value === weekStartsOn)?.label ?? weekStartsOn}
							</Select.Trigger>
							<Select.Content>
								{#each weekDays as d (d.value)}
									<Select.Item value={d.value}>{d.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					{/if}
				</div>
			</div>
		</div>

		<!-- Services and classes -->
		<div class="flex flex-col gap-3">
			<div class="flex flex-col gap-0.5">
				<span class="text-xs font-medium">Services and classes</span>
				<span class="text-xs text-muted-foreground"
					>What will your visitors see when they browse your Booking Page?</span
				>
			</div>

			<div class="flex flex-col gap-2.5">
				{#if business === null}
					{#each Array(5) as _, i (i)}
						<div class="flex items-center gap-3">
							<Skeleton class="h-5 w-9 rounded-full" />
							<Skeleton class="h-3.5 w-40 rounded" />
						</div>
					{/each}
				{:else}
					<div class="flex items-center gap-3">
						<Switch bind:checked={showPrices} />
						<span class="text-xs">Service and class prices</span>
					</div>
					<div class="flex items-center gap-3">
						<Switch bind:checked={showDuration} />
						<span class="text-xs">Service and class duration</span>
					</div>
					<div class="flex items-center gap-3">
						<Switch bind:checked={showBusinessHours} />
						<span class="text-xs">Business hours</span>
					</div>
					<div class="flex items-center gap-3">
						<Switch bind:checked={showLocalTime} />
						<span class="text-xs">Local time</span>
					</div>
					<div class="flex items-center gap-3">
						<Switch bind:checked={bookAnotherButton} />
						<span class="text-xs">'Book another appointment' button</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Labels -->
		<div class="flex flex-col gap-3">
			<div class="flex flex-col gap-0.5">
				<span class="text-xs font-medium">Labels</span>
				<span class="text-xs text-muted-foreground"
					>Customize the section labels on your Booking Page.</span
				>
			</div>

			<div class="flex flex-col gap-3">
				<div class="grid grid-cols-2 gap-3">
					<div class="flex flex-col gap-1">
						<span class="text-xs text-muted-foreground">Display 'service' as</span>
						{#if business === null}
							<Skeleton class="h-9 w-full rounded-md" />
						{:else}
							<Input bind:value={labelService} class="text-xs" />
						{/if}
					</div>
					<div class="flex flex-col gap-1">
						<span class="text-xs text-muted-foreground">Display 'class' as</span>
						{#if business === null}
							<Skeleton class="h-9 w-full rounded-md" />
						{:else}
							<Input bind:value={labelClass} class="text-xs" />
						{/if}
					</div>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div class="flex flex-col gap-1">
						<span class="text-xs text-muted-foreground">Display 'team member' as</span>
						{#if business === null}
							<Skeleton class="h-9 w-full rounded-md" />
						{:else}
							<Input bind:value={labelTeamMember} class="text-xs" />
						{/if}
					</div>
					<div class="flex flex-col gap-1">
						<span class="text-xs text-muted-foreground">Display 'city' as</span>
						{#if business === null}
							<Skeleton class="h-9 w-full rounded-md" />
						{:else}
							<Input bind:value={labelCity} class="text-xs" />
						{/if}
					</div>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div class="flex flex-col gap-1">
						<span class="text-xs text-muted-foreground">Display 'state' as</span>
						{#if business === null}
							<Skeleton class="h-9 w-full rounded-md" />
						{:else}
							<Input bind:value={labelState} class="text-xs" />
						{/if}
					</div>
					<div class="flex flex-col gap-1">
						<span class="text-xs text-muted-foreground">Display 'postal code' as</span>
						{#if business === null}
							<Skeleton class="h-9 w-full rounded-md" />
						{:else}
							<Input bind:value={labelPostalCode} class="text-xs" />
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Terms and conditions -->
		<div class="flex flex-col gap-3">
			<div class="flex flex-col gap-0.5">
				<span class="text-xs font-medium">Terms and conditions</span>
				<span class="text-xs text-muted-foreground"
					>Have any T&Cs that need to be accepted before booking? Add them below.</span
				>
			</div>

			<div class="grid grid-cols-2 gap-3">
				<div class="flex flex-col gap-1">
					<span class="text-xs text-muted-foreground">Label</span>
					{#if business === null}
						<Skeleton class="h-9 w-full rounded-md" />
					{:else}
						<Input bind:value={termsLabel} class="text-xs" />
					{/if}
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs text-muted-foreground">Terms link</span>
					{#if business === null}
						<Skeleton class="h-9 w-full rounded-md" />
					{:else}
						<Input bind:value={termsLink} class="text-xs" />
					{/if}
				</div>
			</div>

			<div class="flex items-start gap-3">
				{#if business === null}
					<Skeleton class="mt-0.5 h-5 w-9 rounded-full" />
				{:else}
					<Switch
						bind:checked={requireAgreement}
						disabled={!termsLabel && !termsLink}
						class="mt-0.5"
					/>
				{/if}
				<div class="flex flex-col gap-0.5">
					<span class="text-xs text-muted-foreground">Require agreement</span>
					<span class="text-xs text-muted-foreground"
						>Display a checkbox to confirm customers accept your terms before booking.</span
					>
				</div>
			</div>
		</div>

		<!-- Confirmation redirect -->
		<div class="flex flex-col gap-3">
			<div class="flex flex-col gap-0.5">
				<span class="text-xs font-medium">Confirmation redirect</span>
				<span class="text-xs text-muted-foreground"
					>Send customers to your site, socials or somewhere else from the confirmation screen.</span
				>
			</div>

			<div class="grid grid-cols-2 gap-3">
				<div class="flex flex-col gap-1">
					<span class="text-xs text-muted-foreground">Label</span>
					{#if business === null}
						<Skeleton class="h-9 w-full rounded-md" />
					{:else}
						<Input bind:value={redirectLabel} class="text-xs" />
					{/if}
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs text-muted-foreground">Redirect link</span>
					{#if business === null}
						<Skeleton class="h-9 w-full rounded-md" />
					{:else}
						<Input bind:value={redirectLink} class="text-xs" />
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
