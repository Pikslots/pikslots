<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { createQuery } from '@tanstack/svelte-query';
	import { today, toZoned, type CalendarDate } from '@internationalized/date';
	import { formatIsoInTimezone } from '@pikslots/datetime';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { CalendarCheck, CalendarClock, Clock, UsersRound, ArrowRight } from '@lucide/svelte';
	import { businessStore } from '$stores/business.svelte';
	import { authStore } from '$stores/auth.svelte';
	import { formatCost } from '$utils/format-time-duration';
	import { getBookingsByBusinessForUserQueryOptions } from '../api/booking/get.bookings.by.business.for.user.query';
	import { getCustomersByBusinessQueryOptions } from '../api/customer/get.customers.by.business.query';

	const PAST_DAYS = 7;
	const UPCOMING_DAYS = 7;

	const jwtPayload = $derived(authStore.getPayloadData());
	const businessId = $derived(businessStore.selectedBusiness?.id ?? '');
	const timezone = $derived(
		businessStore.selectedBusiness?.locationDetails.timeZone ||
			Intl.DateTimeFormat().resolvedOptions().timeZone
	);
	const currency = $derived(businessStore.selectedBusiness?.locationDetails?.currency ?? '');

	// One window covering last week (for the chart) and the coming week (for stats and "up next")
	const todayDate = $derived(today(timezone));
	const days = $derived(
		Array.from({ length: PAST_DAYS + UPCOMING_DAYS }, (_, i) =>
			todayDate.add({ days: i - (PAST_DAYS - 1) })
		)
	);
	const toIso = (date: CalendarDate) => toZoned(date, timezone).toDate().toISOString();
	const rangeStart = $derived(toIso(days[0]));
	const rangeEnd = $derived(toIso(days[days.length - 1].add({ days: 1 })));
	const weekEnd = $derived(toIso(todayDate.add({ days: UPCOMING_DAYS })));

	const bookingsQuery = createQuery(() => ({
		...getBookingsByBusinessForUserQueryOptions(
			businessId,
			jwtPayload?.userId ?? '',
			rangeStart,
			rangeEnd,
			timezone
		),
		enabled: !!businessId && !!jwtPayload?.userId
	}));

	const customersQuery = createQuery(() => ({
		...getCustomersByBusinessQueryOptions(businessId),
		enabled: !!businessId
	}));

	const ms = (iso: string) => new Date(iso).getTime();
	const bookings = $derived(
		[...(bookingsQuery.data ?? [])].sort((a, b) => ms(a.bookingStartTime) - ms(b.bookingStartTime))
	);
	const dayKey = (iso: string) => formatIsoInTimezone(iso, timezone, 'yyyy-MM-dd');
	const todayKey = $derived(todayDate.toString());

	const now = Date.now();
	const todaysBookings = $derived(bookings.filter((b) => dayKey(b.bookingStartTime) === todayKey));
	const nextWeekBookings = $derived(
		bookings.filter(
			(b) => ms(b.bookingStartTime) >= ms(toIso(todayDate)) && ms(b.bookingStartTime) < ms(weekEnd)
		)
	);
	const upcoming = $derived(bookings.filter((b) => ms(b.bookingEndTime) > now).slice(0, 5));

	const minutesBooked = $derived(
		nextWeekBookings.reduce((sum, b) => sum + b.serviceSnapshot.durationInMins, 0)
	);
	const valueBooked = $derived(
		nextWeekBookings.reduce((sum, b) => sum + b.serviceSnapshot.cost, 0) / 100
	);

	const perDay = $derived(
		days.map((date) => ({
			date,
			key: date.toString(),
			weekday: formatIsoInTimezone(toIso(date), timezone, 'ccccc'),
			count: bookings.filter((b) => dayKey(b.bookingStartTime) === date.toString()).length
		}))
	);
	const maxPerDay = $derived(Math.max(1, ...perDay.map((d) => d.count)));

	const customerName = (id: string) => {
		const customer = customersQuery.data?.find((c) => c.id === id);
		return customer ? `${customer.firstName} ${customer.lastName}` : 'Customer';
	};

	function relativeDay(iso: string): string {
		const key = dayKey(iso);
		if (key === todayKey) return 'Today';
		if (key === todayDate.add({ days: 1 }).toString()) return 'Tomorrow';
		return formatIsoInTimezone(iso, timezone, 'ccc d MMM');
	}

	const isLoading = $derived(bookingsQuery.isPending);

	const stats = $derived([
		{
			label: "Today's appointments",
			value: String(todaysBookings.length),
			hint: todaysBookings.length ? 'Your day is lined up' : 'A quiet day so far',
			icon: CalendarCheck
		},
		{
			label: 'Booked next 7 days',
			value: String(nextWeekBookings.length),
			hint:
				valueBooked > 0 ? `${formatCost(valueBooked, currency)} in bookings` : 'No bookings yet',
			icon: CalendarClock
		},
		{
			label: 'Hours booked',
			value: (minutesBooked / 60).toFixed(minutesBooked % 60 === 0 ? 0 : 1),
			hint: 'Scheduled over the next 7 days',
			icon: Clock
		},
		{
			label: 'Customers',
			value: customersQuery.data ? String(customersQuery.data.length) : '—',
			hint: 'In your customer list',
			icon: UsersRound
		}
	]);
</script>

<section class="grid grid-cols-2 gap-3 px-4 sm:gap-4 lg:grid-cols-4 lg:px-6">
	{#each stats as stat (stat.label)}
		<Card.Root class="gap-3 py-4 transition-shadow hover:shadow-md">
			<Card.Content class="flex flex-col gap-3 px-4">
				<div class="flex items-center justify-between gap-2">
					<span class="text-xs font-medium text-muted-foreground sm:text-sm">{stat.label}</span>
					<span
						class="flex size-8 shrink-0 items-center justify-center bg-primary/10 text-primary dark:bg-primary/30 dark:text-chart-1"
					>
						<stat.icon class="size-4" />
					</span>
				</div>
				{#if isLoading}
					<Skeleton class="h-8 w-16" />
				{:else}
					<span class="text-2xl font-bold tracking-tight tabular-nums sm:text-3xl"
						>{stat.value}</span
					>
				{/if}
				{#if isLoading}
					<Skeleton class="h-3 w-24" />
				{:else}
					<span class="truncate text-xs text-muted-foreground">{stat.hint}</span>
				{/if}
			</Card.Content>
		</Card.Root>
	{/each}
</section>

<section class="grid grid-cols-1 gap-4 px-4 lg:grid-cols-5 lg:px-6">
	<Card.Root class="lg:col-span-3">
		<Card.Header>
			<Card.Title>Bookings by day</Card.Title>
			<Card.Description>The last 7 days and the week ahead</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-1">
			<div class="flex min-h-48 flex-1 items-end gap-1 sm:gap-2">
				{#each perDay as day (day.key)}
					{@const isToday = day.key === todayKey}
					{@const isPast = day.key < todayKey}
					<div class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
						<span class="text-[10px] font-medium text-muted-foreground tabular-nums">
							{day.count || ''}
						</span>
						<div
							title="{day.count} booking{day.count === 1 ? '' : 's'}"
							class="w-full transition-all duration-500 {isToday
								? 'bg-primary dark:bg-chart-2'
								: isPast
									? 'bg-primary/25 dark:bg-chart-1/25'
									: 'bg-primary/60 dark:bg-chart-1/60'}"
							style="height: {day.count ? Math.max(6, (day.count / maxPerDay) * 100) : 2}%"
						></div>
						<span
							class="text-center text-[10px] leading-tight tabular-nums {isToday
								? 'font-semibold text-primary dark:text-chart-1'
								: 'text-muted-foreground'}"
						>
							<span class="block">{day.weekday}</span>
							{day.date.day}
						</span>
					</div>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root class="lg:col-span-2">
		<Card.Header>
			<Card.Title>Up next</Card.Title>
			<Card.Description>Your upcoming appointments</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-1 flex-col">
			{#if isLoading}
				<div class="space-y-3">
					{#each Array(3) as _, i (i)}
						<Skeleton class="h-12 w-full" />
					{/each}
				</div>
			{:else if upcoming.length === 0}
				<div class="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
					<span
						class="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/30 dark:text-chart-1"
					>
						<CalendarCheck class="size-6" />
					</span>
					<div>
						<p class="text-sm font-medium">Nothing booked yet</p>
						<p class="text-xs text-muted-foreground">
							New bookings will show up here the moment they land.
						</p>
					</div>
					<Button size="sm" variant="outline" onclick={() => goto(resolve('/home/bookings'))}>
						Open calendar
					</Button>
				</div>
			{:else}
				<ul class="flex flex-col divide-y">
					{#each upcoming as booking (booking.id)}
						<li class="flex items-center gap-3 py-2.5">
							<span
								class="h-9 w-1 shrink-0"
								style="background-color: {booking.serviceSnapshot.colorCode}"
							></span>
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium">{booking.serviceSnapshot.title}</p>
								<p class="truncate text-xs text-muted-foreground">
									{customerName(booking.customerId)}
								</p>
							</div>
							<div class="shrink-0 text-right">
								<p class="text-sm font-medium tabular-nums">
									{formatIsoInTimezone(booking.bookingStartTime, timezone, 'h:mm a')}
								</p>
								<p class="text-xs text-muted-foreground">{relativeDay(booking.bookingStartTime)}</p>
							</div>
						</li>
					{/each}
				</ul>
				<Button
					variant="ghost"
					size="sm"
					class="mt-auto self-start px-0"
					onclick={() => goto(resolve('/home/bookings'))}
				>
					View calendar <ArrowRight />
				</Button>
			{/if}
		</Card.Content>
	</Card.Root>
</section>
