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
	import { registerBookingMutationOptions } from '../../api/booking/register.booking.mutation';
	import { getServicesByBusinessQueryOptions } from '../../api/service/get.services.by.business.query';
	import { getFreeSlotsForUserQueryOptions } from '../../api/public-booking-page/get.free.slots.query';
	import { businessStore } from '$stores/business.svelte';
	import { authStore } from '$stores/auth.svelte';
	import {
		CalendarDays,
		CalendarPlus,
		ChevronDown,
		Clock,
		LoaderCircle,
		MessageSquare,
		UserRound
	} from '@lucide/svelte';
	import { getLocalTimeZone, today, type DateValue } from '@internationalized/date';
	import axios from 'axios';
	import { superForm } from 'sveltekit-superforms';
	import { zod4 as zod } from 'sveltekit-superforms/adapters';
	import { CreateBookingSchema } from '../validations/create-booking-schema';
	import { formatCost, formatDuration } from '$utils/format-time-duration';
	import { untrack, tick } from 'svelte';
	import { getServicesByUserQueryOptions } from '../../api/service-user-assignment/get.services.by.user.query';
	import SlotPicker, { type Slot } from '../components/slot-picker.svelte';
	import LabelPicker from '../components/label-picker.svelte';
	import CustomerSearch from '../components/customer-search.svelte';

	let {
		open = $bindable(false),
		selectedUserId,
		initialBookingDate,
		selectedUserRole
	}: {
		open: boolean;
		selectedUserId: string;
		initialBookingDate?: DateValue;
		selectedUserRole: string;
	} = $props();

	const queryClient = useQueryClient();
	const jwtPayload = $derived(authStore.getPayloadData());
	const businessId = $derived(businessStore.selectedBusiness?.id || '');
	const businessCurrency = $derived(businessStore.selectedBusiness?.locationDetails.currency);
	const assigneeUserId = $derived(selectedUserId || jwtPayload?.userId || '');

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

	// const classesQuery = createQuery(() => ({
	// 	...getClassesByBusinessQueryOptions(businessId),
	// 	enabled: !!businessId
	// }));

	// _________ Customer Search _____________________
	let customerSearch = $state('');

	// _____ register_booking_mutation_____________________________

	const registerMutation = createMutation(registerBookingMutationOptions);

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
			validators: zod(CreateBookingSchema),
			SPA: true,
			resetForm: false,
			onUpdate: async ({ form }) => {
				if (form.valid) {
					const service = services.find((s) => s.id === form.data.serviceId);
					if (!service || !businessId) {
						toast.error('Please refresh the website and try again');
						return;
					}

					const costCents =
						overrideCost !== '' ? Math.round(parseFloat(overrideCost) * 100) : service.cost;
					const durationMins =
						overrideDuration !== ''
							? durationUnit === 'hrs'
								? Math.round(parseFloat(overrideDuration) * 60)
								: parseInt(overrideDuration, 10)
							: service.durationInMins;

					registerMutation.mutate({
						bookingDate: bookingDate.toString(),
						bookingStartTime: form.data.startTime,
						bookingEndTime: form.data.endTime,
						businessId,
						serviceId: form.data.serviceId,
						userId: assigneeUserId,
						customerId: form.data.customerId,
						...(selectedLabel.trim() ? { label: selectedLabel.trim() } : {}),
						...(bookingNotes.trim() ? { notes: bookingNotes.trim() } : {}),
						serviceSnapshot: {
							title: service.title,
							durationInMins: durationMins,
							cost: costCents,
							colorCode: service.colorCode
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
		if (registerMutation.isSuccess) {
			queryClient.invalidateQueries({ queryKey: ['bookings-by-business-for-user'] });
			toast.success('Booking created successfully');
			open = false;
			resetForm();
			registerMutation.reset();
		}

		if (registerMutation.isError) {
			const error = registerMutation.error;
			if (axios.isAxiosError(error)) {
				toast.error(error?.response?.data?.message ?? 'Failed to create booking');
			}
		}
	});

	$effect(() => {
		if (open && initialBookingDate) {
			bookingDate = initialBookingDate;
		}
	});

	$effect(() => {
		if (open && services.length > 0) {
			tick().then(() => {
				serviceSelectOpen = true;
			});
		}
	});

	// Pre-select the first free slot, and move off a slot that isn't free on the new date
	$effect(() => {
		const slots = freeSlots;
		untrack(() => {
			if (slots.some((s) => s.startTime === $form.startTime)) return;
			$form.startTime = slots[0]?.startTime ?? '';
			$form.endTime = slots[0]?.endTime ?? '';
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
			icon={CalendarPlus}
			title="New appointment"
			description="Pick a service, a time and a customer. Done in seconds."
		/>

		<form method="POST" use:enhance class="flex min-h-0 flex-1 flex-col">
			<Tabs.Root bind:value={bookingType} class="flex min-h-0 w-full flex-1 flex-col gap-0">
				<div class="flex items-center justify-between gap-2 px-5 pt-3">
					<Tabs.List variant="line" class="justify-start px-0">
						<Tabs.Trigger value="service" class="cursor-pointer">Service</Tabs.Trigger>
						<!-- <Tabs.Trigger value="class">Classes</Tabs.Trigger> -->
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

				<!-- ── Classes Tab ─────────────────────────────────────────────── -->
				<!-- <Tabs.Content value="class">
					<FieldGroup>
						<Field>
							<FieldLabel>Class <span class="text-destructive">*</span></FieldLabel>
							<Select.Root type="single" bind:value={$form.classId}>
								<Select.Trigger class="w-full" disabled={classes.length === 0}>
									{$form.classId ? selectedClass?.title : 'Select a class'}
								</Select.Trigger>
								<Select.Content>
									{#if classes.length === 0}
										<Select.Item disabled value="No class available"
											>No classes available</Select.Item
										>
									{:else}
										{#each classes as cls (cls.id)}
											<Select.Item value={cls.id}>
												{cls.title} - {cls.durationInMins} mins - {cls.seats} seats - ${cls.cost}
											</Select.Item>
										{/each}
									{/if}
								</Select.Content>
							</Select.Root>
						</Field>

						<Field>
							<FieldLabel>Customer <span class="text-destructive">*</span></FieldLabel>
							<Select.Root type="single" bind:value={$form.customerId}>
								<Select.Trigger class="w-full" disabled={customers.length === 0}>
									{$form.customerId
										? `${selectedCustomer?.firstName} ${selectedCustomer?.lastName}`
										: 'Select a customer'}
								</Select.Trigger>
								<Select.Content>
									{#if customers.length === 0}
										<Select.Item disabled value="No customer available"
											>No customers available</Select.Item
										>
									{:else}
										{#each customers as customer (customer.id)}
											<Select.Item value={customer.id}>
												{customer.firstName}
												{customer.lastName}
											</Select.Item>
										{/each}
									{/if}
								</Select.Content>
							</Select.Root>
						</Field>

						<Field>
							<FieldLabel>Date & Time</FieldLabel>
							<div class="grid grid-cols-3 gap-3">
								<div class="col-span-1">
									<FieldLabel class="text-xs">Date</FieldLabel>
									<Popover.Root bind:open={bookingDateOpen}>
										<Popover.Trigger class="w-full">
											{#snippet child({ props })}
												<Button
													{...props}
													variant="outline"
													class="w-full justify-between font-normal"
												>
													{formatDate(bookingDate)}
													<CalendarIcon class="text-muted-foreground" />
												</Button>
											{/snippet}
										</Popover.Trigger>
										<Popover.Content class="w-auto p-0" align="start">
											<Calendar
												type="single"
												value={bookingDate}
												captionLayout="dropdown"
												minValue={today(getLocalTimeZone())}
												onValueChange={(value) => {
													if (!value) return;
													bookingDate = value;
													bookingDateOpen = false;
												}}
											/>
										</Popover.Content>
									</Popover.Root>
								</div>
								<Field>
									<FieldLabel class="text-xs"
										>Start time <span class="text-destructive">*</span></FieldLabel
									>
									<Input type="time" bind:value={$form.startTime} />
								</Field>
								<Field>
									<FieldLabel class="text-xs"
										>End time <span class="text-destructive">*</span></FieldLabel
									>
									<Input type="time" bind:value={$form.endTime} />
								</Field>
							</div>
						</Field>

						{#if selectedClass}
							<div class="rounded-md bg-muted p-3 text-sm">
								<p class="font-medium">{selectedClass.title}</p>
								<p class="text-muted-foreground">
									Duration: {selectedClass.durationInMins} mins | Seats: {selectedClass.seats} | Cost:
									${selectedClass.cost}
								</p>
							</div>
						{/if}

						<p class="text-xs text-muted-foreground">Class booking support coming soon.</p>
					</FieldGroup>
				</Tabs.Content> -->
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
						<span class="text-destructive">Please add a label before booking</span>
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
						disabled={registerMutation.isPending}
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
							disabled={registerMutation.isPending}
						>
							{#if registerMutation.isPending}
								<LoaderCircle class="animate-spin" /> Creating...
							{:else}
								<CalendarPlus /> Create booking
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
