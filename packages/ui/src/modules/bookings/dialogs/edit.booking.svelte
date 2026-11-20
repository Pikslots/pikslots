<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import { Field, FieldGroup, FieldLabel, FieldError } from '$lib/components/ui/field/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import DialogHeading from '$lib/components/dialog-heading.svelte';
	import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { toast } from 'svelte-sonner';
	import { editBookingMutationOptions } from '../../api/booking/edit.booking.mutation';
	import { getServicesByBusinessQueryOptions } from '../../api/service/get.services.by.business.query';
	import { getFreeSlotsForUserQueryOptions } from '../../api/public-booking-page/get.free.slots.query';
	import { businessStore } from '$stores/business.svelte';
	import {
		CalendarDays,
		CalendarCog,
		ChevronDown,
		Clock,
		LoaderCircle,
		MessageSquare,
		UserRound
	} from '@lucide/svelte';
	import { getLocalTimeZone, today, type DateValue, parseDate } from '@internationalized/date';
	import axios from 'axios';
	import { superForm } from 'sveltekit-superforms';
	import { zod4 as zod } from 'sveltekit-superforms/adapters';
	import { EditBookingSchema } from '../validations/edit-booking-schema';
	import { formatCost, formatDuration } from '$utils/format-time-duration';
	import { untrack, tick } from 'svelte';
	import { getServicesByUserQueryOptions } from '../../api/service-user-assignment/get.services.by.user.query';
	import SlotPicker, { type Slot } from '../components/slot-picker.svelte';
	import LabelPicker from '../components/label-picker.svelte';
	import CustomerSearch from '../components/customer-search.svelte';
	import type { BookingEvent } from './view.booking.svelte';

	let {
		open = $bindable(false),
		booking,
		selectedUserId,
		selectedUserRole
	}: {
		open: boolean;
		booking: BookingEvent | null;
		selectedUserId: string;
		selectedUserRole: string;
	} = $props();

	const queryClient = useQueryClient();
	const businessId = $derived(businessStore.selectedBusiness?.id || '');
	const businessCurrency = $derived(businessStore.selectedBusiness?.locationDetails.currency);
	const assigneeUserId = $derived(selectedUserId || '');

	// ── Label ──────────────────────────────────────────────────────────────────
	let selectedLabel = $state('');
	let labelError = $state(false);

	$effect(() => {
		if (selectedLabel) labelError = false;
	});

	// ── Cost / Duration overrides ──────────────────────────────────────────────
	let overrideCost = $state<string>('');
	let overrideDuration = $state<string>('');
	let durationUnit = $state<'mins' | 'hrs'>('mins');
	let serviceSelectOpen = $state(false);
	let bookingNotes = $state('');

	// ______ service Query _______________________________
	const isElevatedRole = $derived(
		selectedUserRole === 'Platform Owner' || selectedUserRole === 'Business Owner'
	);

	const elevatedServicesQuery = createQuery(() => ({
		...getServicesByBusinessQueryOptions(businessId),
		enabled: isElevatedRole && !!businessId
	}));

	const assignedServicesQuery = createQuery(() => ({
		...getServicesByUserQueryOptions(assigneeUserId),
		enabled: !isElevatedRole && !!assigneeUserId
	}));

	const services = $derived(
		isElevatedRole ? (elevatedServicesQuery.data ?? []) : (assignedServicesQuery.data ?? [])
	);

	// _________ Customer Search _____________________
	let customerSearch = $state('');

	// _____ edit_booking_mutation_____________________________

	const editMutation = createMutation(editBookingMutationOptions);

	let bookingDate = $state<DateValue>(today(getLocalTimeZone()));
	let bookingDateOpen = $state<boolean>(false);
	let bookingType = $state<string>('service');
	const businessTimezone = $derived(
		businessStore.selectedBusiness?.locationDetails.timeZone || getLocalTimeZone()
	);

	const dateString = $derived(
		`${bookingDate.year}-${String(bookingDate.month).padStart(2, '0')}-${String(bookingDate.day).padStart(2, '0')}`
	);

	// ── Superform ────────────────────────────────────────────────────────────────

	const { form, errors, enhance, submit, reset } = superForm(
		{
			serviceId: '',
			classId: '',
			customerId: '',
			startTime: '',
			endTime: ''
		},
		{
			validators: zod(EditBookingSchema),
			SPA: true,
			resetForm: false,
			onUpdate: async ({ form }) => {
				if (form.valid && booking) {
					const service = services.find((s) => s.id === form.data.serviceId);
					if (!service) {
						toast.error('Please refresh the website and try again');
						return;
					}

					editMutation.mutate({
						bookingId: booking.id,
						input: {
							bookingDate: bookingDate.toString(),
							bookingStartTime: form.data.startTime,
							bookingEndTime: form.data.endTime,
							serviceId: form.data.serviceId,
							userId: assigneeUserId,
							customerId: form.data.customerId,
							...(selectedLabel.trim() ? { label: selectedLabel.trim() } : {}),
							...(bookingNotes.trim() ? { notes: bookingNotes.trim() } : {})
						}
					});
				}
			}
		}
	);

	const selectedService = $derived(services.find((s) => s.id === $form.serviceId));

	$effect(() => {
		const _serviceId = $form.serviceId;
		untrack(() => {
			if (selectedService) {
				overrideCost = (selectedService?.cost / 100).toFixed(2) ?? '';
				overrideDuration =
					durationUnit === 'mins'
						? String(selectedService.durationInMins)
						: String((selectedService.durationInMins / 60).toFixed(1));
			} else {
				overrideCost = '';
				overrideDuration = '';
			}
		});
	});

	// ── Free Slots Query ─────────────────────────────────────────────────────────

	const freeSlotsQuery = createQuery(() => ({
		...getFreeSlotsForUserQueryOptions({
			userId: assigneeUserId,
			businessId,
			date: dateString,
			durationInMins: selectedService?.durationInMins ?? 60,
			bufferTimeInMins: selectedService?.bufferTimeInMins ?? 0,
			businessTimezone
		}),
		enabled: !!businessId && !!assigneeUserId && !!selectedService && dateString.length > 0,
		placeholderData: (keepPreviousData) => keepPreviousData
	}));

	const freeSlots = $derived(freeSlotsQuery.data ?? []);

	/** Resets all form fields, overrides, label, and customer state to defaults. */
	function resetForm() {
		bookingDate = today(getLocalTimeZone());
		bookingType = 'service';
		customerSearch = '';
		selectedLabel = '';
		labelError = false;
		overrideCost = '';
		overrideDuration = '';
		durationUnit = 'mins';
		bookingNotes = '';
		reset({
			data: {
				serviceId: '',
				classId: '',
				customerId: '',
				startTime: '',
				endTime: ''
			}
		});
	}

	/** Formats a DateValue into a human-readable date string (e.g. "Mon, 12 Oct 2026"). */
	function formatDate(value: DateValue) {
		return value.toDate(getLocalTimeZone()).toLocaleDateString('en-GB', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	/** Checks whether a given date falls on Saturday or Sunday. */
	function isWeekend(date: DateValue) {
		const day = date.toDate(getLocalTimeZone()).getDay();
		return day === 0 || day === 6;
	}

	/** Picking a slot sets both start and end time. */
	function onSlotSelect(slot: Slot) {
		$form.startTime = slot.startTime;
		$form.endTime = slot.endTime;
	}

	$effect(() => {
		if (editMutation.isSuccess) {
			queryClient.invalidateQueries({ queryKey: ['bookings-by-business-for-user'] });
			toast.success('Booking updated successfully');
			open = false;
			resetForm();
			editMutation.reset();
		}

		if (editMutation.isError) {
			const error = editMutation.error;
			if (axios.isAxiosError(error)) {
				toast.error(error?.response?.data?.message ?? 'Failed to update booking');
			}
		}
	});

	// Pre-fill form when dialog opens with booking data
	$effect(() => {
		if (open && booking) {
			bookingDate = parseDate(booking.bookingDate.split('T')[0]);
			$form.serviceId = booking.serviceId;
			$form.customerId = booking.customerId;
			$form.startTime = booking.start.toISOString();
			$form.endTime = booking.end.toISOString();
			selectedLabel = booking.label ?? '';
			bookingNotes = booking.notes ?? '';

			// Pre-fill customer search display
			if (booking.guests.length > 0) {
				customerSearch = booking.guests[0].name;
			}
		}
	});

	$effect(() => {
		if (open && services.length > 0) {
			tick().then(() => {
				serviceSelectOpen = true;
			});
		}
	});

	$effect(() => {
		const slots = freeSlots;
		untrack(() => {
			if (slots.length > 0 && !$form.startTime) {
				$form.startTime = slots[0].startTime;
				$form.endTime = slots[0].endTime;
			}
		});
	});
</script>

<Dialog.Root
	bind:open
	onOpenChange={(v) => {
		if (!v) resetForm();
	}}
>
	<Dialog.Content class="flex max-h-[92svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
		<DialogHeading
			icon={CalendarCog}
			title="Edit appointment"
			description="Move it, change the service or update the details."
		/>

		<form method="POST" use:enhance class="flex min-h-0 flex-1 flex-col">
			<Tabs.Root bind:value={bookingType} class="flex min-h-0 w-full flex-1 flex-col gap-0">
				<div class="flex items-center justify-between gap-2 px-5 pt-3">
					<Tabs.List variant="line" class="justify-start px-0">
						<Tabs.Trigger value="service" class="cursor-pointer">Service</Tabs.Trigger>
					</Tabs.List>
					<LabelPicker bind:value={selectedLabel} invalid={labelError} />
				</div>

				<!-- ── Services Tab ────────────────────────────────────────────── -->

				<Tabs.Content value="service" class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
					<FieldGroup class="gap-5">
						<Field>
							<FieldLabel class="flex items-center gap-1.5">
								<span
									class="inline-block size-3 shrink-0 rounded-full"
									style="background-color: {selectedService?.colorCode ||
										booking?.color ||
										'var(--muted-foreground)'}"
								></span>
								Service <span class="text-destructive">*</span>
							</FieldLabel>
							<Select.Root type="single" bind:value={$form.serviceId} bind:open={serviceSelectOpen}>
								<Select.Trigger
									class="w-full"
									disabled={services.length === 0}
									aria-invalid={$errors.serviceId ? true : undefined}
								>
									{$form.serviceId ? selectedService?.title : 'Select a service'}
								</Select.Trigger>
								<Select.Content>
									{#if services.length === 0}
										<Select.Item disabled value="No service available"
											>No services available</Select.Item
										>
									{:else}
										{#each services as service (service.id)}
											<Select.Item value={service.id}>
												<span
													class="size-2.5 shrink-0 rounded-full"
													style="background-color: {service.colorCode}"
												></span>
												<span class="flex-1 truncate">{service.title}</span>
												<span class="text-muted-foreground">
													{formatDuration(service.durationInMins)} · {formatCost(
														service.cost / 100,
														businessCurrency || '$'
													)}
												</span>
											</Select.Item>
										{/each}
									{/if}
								</Select.Content>
							</Select.Root>
							<FieldError errors={$errors.serviceId?.map((e) => ({ message: e }))} />
						</Field>

						{#if selectedService}
							<div class="grid grid-cols-2 gap-3">
								<Field>
									<FieldLabel>Price</FieldLabel>
									<InputGroup.Root>
										<InputGroup.Addon>
											<InputGroup.Text>{businessCurrency || '$'}</InputGroup.Text>
										</InputGroup.Addon>
										<InputGroup.Input
											type="number"
											step="0.01"
											min="0"
											placeholder={(selectedService.cost / 100).toFixed(2)}
											bind:value={overrideCost}
										/>
									</InputGroup.Root>
								</Field>
								<Field>
									<FieldLabel>Duration</FieldLabel>
									<div class="flex">
										<InputGroup.Root class="min-w-0 flex-1">
											<InputGroup.Addon><Clock /></InputGroup.Addon>
											<InputGroup.Input
												type="number"
												step="1"
												min="1"
												placeholder={durationUnit === 'mins'
													? String(selectedService.durationInMins)
													: String((selectedService.durationInMins / 60).toFixed(1))}
												bind:value={overrideDuration}
											/>
										</InputGroup.Root>
										<Select.Root type="single" bind:value={durationUnit}>
											<Select.Trigger class="w-18 shrink-0 border-l-0">
												{durationUnit === 'mins' ? 'Mins' : 'Hrs'}
											</Select.Trigger>
											<Select.Content>
												<Select.Item value="mins">Mins</Select.Item>
												<Select.Item value="hrs">Hrs</Select.Item>
											</Select.Content>
										</Select.Root>
									</div>
								</Field>
							</div>
						{/if}

						<Field>
							<FieldLabel class="flex items-center gap-1.5">
								<CalendarDays class="size-3.5" /> Date &amp; time
								<span class="text-destructive">*</span>
							</FieldLabel>
							<Popover.Root bind:open={bookingDateOpen}>
								<Popover.Trigger class="w-full">
									{#snippet child({ props })}
										<Button {...props} variant="outline" class="w-full justify-between font-normal">
											{formatDate(bookingDate)}
											<ChevronDown class="text-muted-foreground" />
										</Button>
									{/snippet}
								</Popover.Trigger>
								<Popover.Content class="w-auto p-0" align="start">
									<Calendar
										type="single"
										value={bookingDate}
										captionLayout="dropdown"
										minValue={today(getLocalTimeZone())}
										isDateDisabled={selectedService ? isWeekend : undefined}
										onValueChange={(value) => {
											if (!value) return;
											bookingDate = value;
											bookingDateOpen = false;
										}}
									/>
								</Popover.Content>
							</Popover.Root>
							<SlotPicker
								slots={freeSlots}
								startTime={$form.startTime}
								endTime={$form.endTime}
								timezone={businessTimezone}
								loading={freeSlotsQuery.isFetching && !!selectedService}
								disabled={!selectedService}
								onSelect={onSlotSelect}
							/>
							<FieldError
								errors={($errors.startTime ?? $errors.endTime)?.map((e) => ({ message: e }))}
							/>
						</Field>

						<Field>
							<FieldLabel class="flex items-center gap-1.5">
								<UserRound class="size-3.5" /> Customer <span class="text-destructive">*</span>
							</FieldLabel>
							<CustomerSearch
								{businessId}
								bind:customerId={$form.customerId}
								bind:search={customerSearch}
								invalid={!!$errors.customerId}
							/>
							<FieldError errors={$errors.customerId?.map((e) => ({ message: e }))} />
						</Field>

						<Field>
							<FieldLabel class="flex items-center gap-1.5">
								<MessageSquare class="size-3.5" /> Notes
								<span class="font-normal text-muted-foreground">(optional)</span>
							</FieldLabel>
							<Textarea
								class="min-h-20 resize-none"
								placeholder="Anything to remember for this appointment..."
								bind:value={bookingNotes}
							/>
						</Field>
					</FieldGroup>
				</Tabs.Content>
			</Tabs.Root>

			<div
				class="flex flex-col-reverse gap-2 border-t bg-muted/30 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
			>
				<p
					class="text-xs text-muted-foreground {labelError && !selectedLabel.trim()
						? ''
						: 'hidden sm:block'}"
				>
					{#if labelError && !selectedLabel.trim()}
						<span class="text-destructive">Please add a label before saving</span>
					{:else}
						<span class="text-destructive">*</span> Required
					{/if}
				</p>
				<div class="flex gap-2">
					<Button
						type="button"
						variant="ghost"
						class="flex-1 sm:flex-none"
						onclick={() => (open = false)}
						disabled={editMutation.isPending}
					>
						Cancel
					</Button>
					{#if bookingType === 'service'}
						<Button
							type="button"
							class="flex-1 sm:flex-none"
							onclick={() => {
								if (!selectedLabel.trim()) {
									labelError = true;
									return;
								}
								labelError = false;
								submit();
							}}
							disabled={editMutation.isPending}
						>
							{#if editMutation.isPending}
								<LoaderCircle class="animate-spin" /> Saving...
							{:else}
								Save changes
							{/if}
						</Button>
					{:else}
						<Button type="button" disabled>Coming Soon</Button>
					{/if}
				</div>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
