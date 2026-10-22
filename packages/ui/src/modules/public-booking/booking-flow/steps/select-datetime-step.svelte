<script lang="ts">
	import { Calendar, Day as CalendarDay } from '$lib/components/ui/calendar/index.js';
	import { getLocalTimeZone, today, type DateValue } from '@internationalized/date';
	import type { BusinessHours, WeekDay } from '@pikslots/shared';
	import type { PublicBusiness, PublicSlot } from '../../types';
	import type { WeekdayKey } from '$utils/working-hours';

	const WEEKDAY_TO_NUMBER: Record<WeekDay, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
		sunday: 0,
		monday: 1,
		tuesday: 2,
		wednesday: 3,
		thursday: 4,
		friday: 5,
		saturday: 6
	};
	import { getAvailableDatesQueryOptions } from '../../../api/public-booking-page/get.available.dates.query';
	import { createQuery } from '@tanstack/svelte-query';
	import { getFreeSlotsForUserQueryOptions } from '../../../api/public-booking-page/get.free.slots.query';

	let {
		durationInMins,
		bufferTimeInMins,
		businessHours,
		timeZone,
		serviceId,
		userId,
		business,
		onSelect
	}: {
		durationInMins: number;
		bufferTimeInMins: number;
		businessHours: BusinessHours;
		timeZone: string;
		userId: string;
		serviceId: string;
		business: PublicBusiness;
		onSelect: (date: string, slot: PublicSlot) => void;
	} = $props();

	let selectedDate = $state<DateValue>(today(getLocalTimeZone()));
	let selectedSlotStart = $state<string | null>(null);

	const timeFormat = $derived(business.bookingCustomization.timeFormat);
	// _____available Dates________________________

	const getAvailableDates = createQuery(() => ({
		...getAvailableDatesQueryOptions({
			userId,
			businessId: business.id,
			serviceId,
			businessTimezone: timeZone
		}),
		enabled: !!business && !!userId && !!serviceId
	}));

	const dates = $derived(getAvailableDates.data?.dates);

	//  ______free Slots_________________________

	const dateString = $derived(
		`${selectedDate.year}-${String(selectedDate.month).padStart(2, '0')}-${String(selectedDate.day).padStart(2, '0')}`
	);

	const getFreeSlots = createQuery(() => ({
		...getFreeSlotsForUserQueryOptions({
			userId,
			businessId: business.id,
			date: dateString,
			durationInMins,
			bufferTimeInMins,
			businessTimezone: timeZone
		}),
		enabled: dateString.length > 0 && !!userId && !!business,
		placeholderData: (keepPreviousData) => keepPreviousData
	}));

	const slots = $derived(getFreeSlots.data ?? []);

	// ________

	const brandColor = $derived(business.brandApperanceDetails.brandColor);
	const selectedDateStyle = $derived(`background-color: ${brandColor};`);

	function formatDateKey(date: DateValue): string {
		return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
	}

	function isDateDisabled(date: DateValue): boolean {
		if (dates && !dates.includes(formatDateKey(date))) {
			return true;
		}
		const jsDate = date.toDate(getLocalTimeZone());
		const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' })
			.format(jsDate)
			.toLowerCase() as WeekdayKey;
		return !businessHours[weekday]?.enabled;
	}

	// format time slots
	function formatSlotTime(iso: string): string {
		return new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: timeFormat === '12 hours',
			timeZone
		}).format(new Date(iso));
	}

	function selectSlot(slot: PublicSlot) {
		selectedSlotStart = slot.startTime;
		onSelect(dateString, slot);
	}

	$effect(() => {
		// Selecting a new date invalidates the previously chosen slot.
		void dateString;
		selectedSlotStart = null;
	});
</script>

{#snippet calendarDay({ day: dateValue, outsideMonth }: { day: DateValue; outsideMonth: boolean })}
	<!-- selected date color change according to the brandcolor -->
	<CalendarDay
		class="rounded-2xl  shadow-sm"
		style={!outsideMonth && selectedDate && dateValue.compare(selectedDate) === 0
			? selectedDateStyle
			: ''}
	/>
{/snippet}

<div class="flex flex-col gap-4">
	{#if getAvailableDates.isPending && !!userId && !!business.id && serviceId}
		<div class="flex flex-col items-center justify-center gap-2 py-16 text-center">
			<p class="text-sm text-muted-foreground">Checking availability...</p>
		</div>
	{:else if dates && dates.length > 0}
		<h2 class="text-lg font-semibold">Select a date &amp; time</h2>

		<div class="flex flex-col gap-6 md:flex-row">
			<Calendar
				type="single"
				bind:value={selectedDate}
				minValue={today(getLocalTimeZone())}
				weekStartsOn={WEEKDAY_TO_NUMBER[business.bookingCustomization.weekStartsOn]}
				preventDeselect
				{isDateDisabled}
				class="rounded-2xl border shadow-sm"
				day={calendarDay}
			/>
			<div class="flex min-w-48 flex-1 flex-col gap-2">
				<span class="text-xs font-medium text-muted-foreground">
					Times shown in {timeZone}
				</span>
				{#if slots.length === 0}
					<p class="py-6 text-sm text-muted-foreground">No availability on this day.</p>
				{:else}
					<div
						class:opacity-40={getFreeSlots.isFetching}
						class="scrollbar dark:scrollbar-track-dark light:scrollbar-track-gray-200 grid
					 max-h-80 scrollbar-thin scrollbar-thumb-gray-500 grid-cols-2 gap-2 overflow-y-auto pr-1"
					>
						{#each slots as slot (slot.startTime)}
							<button
								type="button"
								onclick={() => selectSlot(slot)}
								class="cursor-pointer border px-3 py-2 text-sm {selectedSlotStart === slot.startTime
									? 'border-primary bg-primary text-primary-foreground'
									: 'hover:border-foreground'}"
							>
								{formatSlotTime(slot.startTime)}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<div class="flex flex-col items-center justify-center gap-2 py-16 text-center">
			<p class="text-xl font-medium text-muted-foreground">
				Sorry, this service is not available for now.
			</p>
			<p class="text-xs text-muted-foreground/80">
				Please check back later or choose a different service.
			</p>
		</div>
	{/if}
</div>
