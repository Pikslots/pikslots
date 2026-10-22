<script lang="ts">
	import { Calendar } from '@fullcalendar/core';
	import dayGridPlugin from '@fullcalendar/daygrid';
	import timeGridPlugin from '@fullcalendar/timegrid';
	import listPlugin from '@fullcalendar/list';
	import interactionPlugin from '@fullcalendar/interaction';
	import Plus from '@tabler/icons-svelte/icons/plus';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import { getUsersInsideBusinessQueryOptions } from '../api/user/get.users.inside.business.query';
	import { getCustomersByBusinessQueryOptions } from '../api/customer/get.customers.by.business.query';
	import { getBookingsByBusinessForUser } from '../api/booking/get.bookings.by.business.for.user.query';
	import { businessStore } from '$stores/business.svelte';
	import { authStore } from '$stores/auth.svelte';
	import ViewBookingDialog from './dialogs/view.booking.svelte';
	import CreateBookingDialog from './dialogs/create.booking.svelte';
	import type { BookingEvent } from './dialogs/view.booking.svelte';
	import type { BookingItemResponse } from '@pikslots/shared';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { type DateValue, parseDate } from '@internationalized/date';
	import { untrack } from 'svelte';
	import { formatIsoInTimezone } from '@pikslots/datetime';
	import { SvelteSet } from 'svelte/reactivity';

	// ── State ───────────────────────────────────────────────────────────────────

	let calendarEl: HTMLElement | null = null;
	let fullCalendar: Calendar | null = null;

	const jwtPayload = $derived(authStore.getPayloadData());
	// ── user Query ──────────────────────────────────────────────────────────────────

	const usersQuery = createQuery(() => ({
		...getUsersInsideBusinessQueryOptions(businessStore.selectedBusiness?.id ?? ''),
		enabled: !!businessStore.selectedBusiness?.id
	}));

	const users = $derived(usersQuery.data ?? []);
	const currentUser = $derived(users.find((u) => u.id === jwtPayload?.userId));
	const currentUserRole = $derived(jwtPayload?.role);
	const teamMembers = $derived(
		currentUserRole !== 'Standard' ? users.filter((u) => u.id !== jwtPayload?.userId) : []
	);

	// ── Multi-user selection ──────────────────────────────────────────────────

	let enabledUserIds: SvelteSet<string> = new SvelteSet();
	let usersInitialized = $state(false);

	$effect(() => {
		if (!usersInitialized && users.length > 0) {
			enabledUserIds.clear();
			for (const u of users) {
				enabledUserIds.add(u.id);
			}
			usersInitialized = true;
		}
	});

	const canToggleTeam = $derived(
		currentUserRole === 'Business Owner' ||
			currentUserRole === 'Admin' ||
			currentUserRole === 'Platform Owner' ||
			currentUserRole === 'Enhanced'
	);

	const getUserRole = (userId: string) => users.find((u) => u.id === userId)?.role ?? '';

	const businessTimezone = $derived(
		businessStore.selectedBusiness?.locationDetails.timeZone ||
			Intl.DateTimeFormat().resolvedOptions().timeZone
	);

	// ── Bookings (manual parallel fetch per enabled user) ───────────────────────

	let calendarStartDateTime = $state<string>('');
	let calendarEndDateTime = $state<string>('');
	let bookingData = $state<BookingItemResponse[]>([]);

	$effect(() => {
		const businessId = businessStore.selectedBusiness?.id ?? '';
		const start = calendarStartDateTime;
		const end = calendarEndDateTime;
		const tz = businessTimezone;
		const enabledUsers = users.filter((u) => enabledUserIds.has(u.id));

		if (!businessId || !start || !end || enabledUsers.length === 0) {
			bookingData = [];
			return;
		}

		let cancelled = false;

		Promise.all(
			enabledUsers.map((user) => getBookingsByBusinessForUser(businessId, user.id, start, end, tz))
		)
			.then((results) => {
				if (!cancelled) {
					bookingData = results.flat();
				}
			})
			.catch(() => {
				if (!cancelled) {
					bookingData = [];
				}
			});

		return () => {
			cancelled = true;
		};
	});

	const hasBookings = $derived(bookingData.length > 0);

	// ── Customers Query  ──────────────────────────────────────────────────────────

	const customersQuery = createQuery(() => ({
		...getCustomersByBusinessQueryOptions(businessStore.selectedBusiness?.id ?? ''),
		enabled: !!businessStore.selectedBusiness?.id && hasBookings
	}));

	const customers = $derived(customersQuery.data ?? []);

	// ── Events transformation ────────────────────────────────────────────────────

	const bookingEvents = $derived(
		bookingData.map((booking: BookingItemResponse) => {
			const start = new Date(booking.bookingStartTime);
			const end = new Date(booking.bookingEndTime);
			const currentMember = users.find((user) => user.id === booking.userId);
			const durationMins = (end.getTime() - start.getTime()) / (1000 * 60);
			const customer = customers.find((c) => c.id === booking.customerId);
			return {
				id: booking.id,
				title: booking.serviceSnapshot.title,
				start,
				end,
				extendedProps: {
					durationMins,
					host: currentMember
						? `${currentMember.name.firstName} ${currentMember.name.lastName}`
						: 'Unknown',
					guests: customer
						? [{ name: `${customer.firstName} ${customer.lastName}` }]
						: [{ name: 'Customer' }],
					bookingId: booking.bookingId,
					source: 'Booked from Web App',
					label: booking.label ?? undefined,
					notes: booking.notes ?? undefined,
					serviceColor: booking.serviceSnapshot.colorCode || '#0d9488',
					serviceId: booking.serviceId,
					customerId: booking.customerId,
					userId: booking.userId,
					bookingDate: booking.bookingDate,
					serviceSnapshot: booking.serviceSnapshot
				}
			};
		})
	);

	// ── Dialog state ─────────────────────────────────────────────────────────────

	let dialogOpen = $state(false);
	let selectedBooking = $state<BookingEvent | null>(null);
	let createDialogOpen = $state(false);
	let initialBookingDate = $state<DateValue | undefined>(undefined);

	const allEvents = $derived(bookingEvents);

	// ── Calendar ─────────────────────────────────────────────────────────────────

	$effect(() => {
		untrack(() => {
			calendarEl = document.getElementById('calendar');

			fullCalendar = new Calendar(calendarEl!, {
				plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
				initialView: 'dayGridMonth',
				headerToolbar: {
					left: 'prev,next today',
					center: 'title',
					right: 'dayGridMonth,timeGridWeek,listWeek'
				},
				buttonText: {
					today: 'Today',
					month: 'Month',
					week: 'Week',
					list: 'List'
				},
				noEventsText: 'No bookings for this period',
				events: allEvents,
				datesSet: (info) => {
					calendarStartDateTime = info.startStr;
					calendarEndDateTime = info.endStr;
				},
				eventContent: (info) => {
					const start = info.event.start;
					const fmt = (d: Date | null) =>
						d ? formatIsoInTimezone(d.toISOString(), businessTimezone, 'h:mm a') : '';

					const color = (info.event.extendedProps as Record<string, unknown>)
						.serviceColor as string;
					const label = (info.event.extendedProps as Record<string, unknown>).label as
						| string
						| undefined;

					const LABEL_COLORS: Record<string, string> = {
						Confirmed: '#22c55e',
						Pending: '#f59e0b',
						Cancelled: '#ef4444',
						Completed: '#3b82f6',
						'No Show': '#a855f7'
					};

					const seg = (el: string, cls: string, text: string): HTMLElement => {
						const node = document.createElement(el);
						node.className = cls;
						node.textContent = text;
						return node;
					};

					const dot = seg('span', 'fc-booking-dot', '');
					dot.style.backgroundColor = color;

					const nodes = [
						dot,
						seg('span', 'fc-booking-time', fmt(start)),
						seg('span', 'fc-booking-title', info.event.title)
					];

					if (info.view.type === 'listWeek' && label) {
						const badge = seg('span', 'fc-booking-label', label);
						badge.style.backgroundColor = LABEL_COLORS[label] ?? 'var(--primary)';
						nodes.push(badge);
					}

					return {
						domNodes: nodes
					};
				},
				dateClick: (info) => {
					const clicked = info.date;
					const y = clicked.getFullYear();
					const m = (clicked.getMonth() + 1).toString().padStart(2, '0');
					const d = clicked.getDate().toString().padStart(2, '0');
					initialBookingDate = parseDate(`${y}-${m}-${d}`);
					createDialogOpen = true;
				},

				eventClick: (info) => {
					const p = info.event.extendedProps;

					selectedBooking = {
						id: info.event.id,
						title: info.event.title,
						start: info.event.start!,
						end: info.event.end!,
						durationMins: p.durationMins,
						host: p.host,
						guests: p.guests,
						bookingId: p.bookingId,
						source: p.source,
						color: p.serviceColor as string,
						label: p.label as string | undefined,
						notes: p.notes as string | undefined,
						serviceId: p.serviceId as string,
						customerId: p.customerId as string,
						userId: p.userId as string,
						bookingDate: p.bookingDate as string,
						serviceSnapshot: p.serviceSnapshot as {
							title: string;
							durationInMins: number;
							cost: number;
							colorCode: string;
						}
					};
					dialogOpen = true;
				},
				height: '100%',
				expandRows: true,
				handleWindowResize: true
			});
			fullCalendar.render();
		});
	});

	// Update calendar events when they change
	$effect(() => {
		if (fullCalendar) {
			fullCalendar.setOption('events', allEvents);
		}
	});

	$effect(() => {
		if ($page.url.searchParams.get('create') === 'true') {
			initialBookingDate = undefined;
			createDialogOpen = true;
			goto(resolve('/home/bookings'), { replaceState: true, keepFocus: true });
		}
	});
</script>

<ViewBookingDialog
	bind:open={dialogOpen}
	booking={selectedBooking}
	selectedUserRole={selectedBooking ? getUserRole(selectedBooking.userId) : ''}
	selectedUserId={selectedBooking?.userId ?? ''}
/>
<CreateBookingDialog
	bind:open={createDialogOpen}
	{initialBookingDate}
	selectedUserRole={(currentUserRole ?? '') as string}
	selectedUserId={jwtPayload?.userId ?? ''}
/>

<div class="flex h-full min-h-0 flex-1">
	<!-- ── Left: sidebar ──────────────────────────────────────────────────── -->
	<div class=" flex w-56 shrink-0 flex-col gap-5 px-3 pb-4">
		<!-- <div class="-mb-2 flex items-center justify-end">
			<Button
				class="rounded-full px-2 py-3"
				size="sm"
				onclick={() => {
					initialBookingDate = undefined;
					createDialogOpen = true;
				}}
			>
				<Plus size={16} />
			</Button>
		</div> -->
		<!-- Your calendars -->
		<div class="flex flex-col gap-1">
			<span class="px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
				>Your calendars</span
			>
			{#if currentUser}
				<div
					class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left {enabledUserIds.has(
						currentUser.id
					)
						? 'bg-accent'
						: 'hover:bg-accent'}"
				>
					<Checkbox
						checked={enabledUserIds.has(currentUser.id)}
						disabled={!canToggleTeam}
						onCheckedChange={(checked) => {
							if (checked) {
								enabledUserIds.add(currentUser.id);
							} else {
								enabledUserIds.delete(currentUser.id);
							}
						}}
					/>
					<Avatar.Root class="size-6 text-[10px]">
						{#if currentUser.avatarUrl}
							<Avatar.Image
								src={currentUser.avatarUrl}
								alt="{currentUser.name.firstName} {currentUser.name.lastName}"
							/>
						{/if}
						<Avatar.Fallback class="bg-primary text-[10px] text-primary-foreground">
							{currentUser.name.firstName[0]}{currentUser.name.lastName[0]}
						</Avatar.Fallback>
					</Avatar.Root>
					<span class="truncate text-sm"
						>{currentUser.name.firstName} {currentUser.name.lastName}</span
					>
				</div>
			{/if}
			<button
				type="button"
				class="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
			>
				<Plus size={13} />
				Connect calendar
			</button>
		</div>

		<!-- Team -->
		{#if teamMembers.length > 0}
			<div class="flex flex-col gap-1">
				<span class="px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
					>Team</span
				>
				{#each teamMembers as user (user.id)}
					<div
						class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left {enabledUserIds.has(
							user.id
						)
							? 'bg-accent'
							: 'hover:bg-accent'}"
					>
						<Checkbox
							checked={enabledUserIds.has(user.id)}
							disabled={!canToggleTeam}
							onCheckedChange={(checked) => {
								if (checked) {
									enabledUserIds.add(user.id);
								} else {
									enabledUserIds.delete(user.id);
								}
							}}
						/>
						<Avatar.Root class="size-6 text-[10px]">
							{#if user.avatarUrl}
								<Avatar.Image
									src={user.avatarUrl}
									alt="{user.name.firstName} {user.name.lastName}"
								/>
							{/if}
							<Avatar.Fallback class="bg-muted text-[10px] text-muted-foreground">
								{user.name.firstName[0]}{user.name.lastName[0]}
							</Avatar.Fallback>
						</Avatar.Root>
						<div class="flex min-w-0 flex-col">
							<span class="truncate text-sm">{user.name.firstName} {user.name.lastName}</span>
							<span class="truncate text-xs text-muted-foreground">{user.role}</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- ── Right: calendar ───────────────────────────────────────────────── -->
	<div class="flex flex-1 flex-col overflow-hidden">
		<!-- <div class="min-w-0">
				<h2 class="truncate text-sm font-medium">
					{#if selectedUser?.id === currentUser?.id}
						Your Calendar
					{:else if selectedUser}
						{selectedUser.name.firstName} {selectedUser.name.lastName}'s Calendar
					{:else}
						Calendar
					{/if}
				</h2>
				<p class="truncate text-xs text-muted-foreground">
					{#if effectiveUserId !== jwtPayload?.userId}
						Team member calendar
					{:else if isElevatedRole}
						{businessStore.selectedBusiness?.name ?? 'Calendar'}
					{:else}
						Your calendar
					{/if}
				</p>
			</div> -->
		<div id="calendar" class="calendar-wrapper"></div>
	</div>
</div>

<style>
	.calendar-wrapper {
		height: 100%;
		min-height: 90dvh;
		font-size: 0.8rem;
		font-family: 'Roboto Variable', sans-serif;
	}

	:global(.calendar-wrapper .fc) {
		font-family: 'Roboto Variable', sans-serif;
	}

	:global(.calendar-wrapper .fc-scrollgrid),
	:global(.calendar-wrapper .fc-scrollgrid td),
	:global(.calendar-wrapper .fc-scrollgrid th) {
		border-width: 0.8px !important;
		border-color: var(--border) !important;
	}

	:global(.calendar-wrapper .fc-scrollgrid) {
		border-left-width: 0 !important;
		border-right-width: 0 !important;
		border-top-width: 0 !important;
		border-bottom-width: 0 !important;
	}

	:global(.calendar-wrapper .fc-col-header-cell),
	:global(.calendar-wrapper .fc-scrollgrid-section-header td),
	:global(.calendar-wrapper .fc-scrollgrid-section-header th) {
		border-bottom-width: 0.8px !important;
		border-color: var(--border) !important;
	}

	/* ── Today highlight → shadcn primary ── */
	:global(.calendar-wrapper .fc-day-today) {
		background-color: color-mix(in oklch, var(--primary) 10%, transparent) !important;
	}

	:global(.calendar-wrapper .fc-timegrid-col.fc-day-today) {
		background-color: color-mix(in oklch, var(--primary) 8%, transparent) !important;
	}

	:global(.dark .calendar-wrapper .fc-day-today) {
		background-color: color-mix(in oklch, var(--primary) 25%, transparent) !important;
	}

	:global(.dark .calendar-wrapper .fc-timegrid-col.fc-day-today) {
		background-color: color-mix(in oklch, var(--primary) 20%, transparent) !important;
	}

	/* ── List view ── */

	/* Container */
	:global(.calendar-wrapper .fc-list),
	:global(.calendar-wrapper .fc-list-table) {
		background: transparent !important;
	}

	/* Day header row */
	:global(.calendar-wrapper .fc-list-day > td),
	:global(.calendar-wrapper .fc-list-day-cushion) {
		background-color: color-mix(in oklch, var(--primary) 15%, transparent) !important;
		border-color: var(--border) !important;
	}

	:global(.calendar-wrapper .fc-list-day-cushion a),
	:global(.calendar-wrapper .fc-list-day-text),
	:global(.calendar-wrapper .fc-list-day-side-text) {
		color: var(--primary) !important;
		text-decoration: none !important;
	}

	/* Event rows */
	:global(.calendar-wrapper .fc-list-event) {
		background-color: transparent !important;
	}

	:global(.calendar-wrapper .fc-list-event:hover td) {
		background-color: var(--accent) !important;
		cursor: pointer;
	}

	:global(.calendar-wrapper .fc-list-event td) {
		border-color: var(--border) !important;
	}

	/* Event time */
	:global(.calendar-wrapper .fc-list-event-time) {
		display: none;
	}

	/* Event title */
	:global(.calendar-wrapper .fc-list-event-title) {
		display: flex;
		align-items: center;
	}

	:global(.calendar-wrapper .fc-list-event-title a) {
		display: flex;
		align-items: center;
		color: var(--foreground) !important;
		text-decoration: none !important;
	}

	/* Empty state */
	:global(.calendar-wrapper .fc-list-empty),
	:global(.calendar-wrapper .fc-list-empty-cushion) {
		background: transparent !important;
		color: var(--muted-foreground) !important;
	}

	:global(.calendar-wrapper .fc-list-empty) {
		font-size: 0.85rem;
		color: var(--muted-foreground);
	}

	/* ── FullCalendar buttons → shadcn primary theme ── */
	:global(.calendar-wrapper .fc-button-primary) {
		background-color: var(--primary);
		color: var(--primary-foreground);
		border-color: var(--primary);
		border-radius: var(--radius);
		box-shadow: none;
		outline: none;
	}

	:global(.calendar-wrapper .fc-button-primary:hover) {
		background-color: color-mix(in oklch, var(--primary) 85%, black);
		border-color: color-mix(in oklch, var(--primary) 85%, black);
	}

	:global(.calendar-wrapper .fc-button-primary:focus) {
		box-shadow:
			0 0 0 2px var(--background),
			0 0 0 4px var(--ring);
	}

	:global(.calendar-wrapper .fc-button-primary:disabled) {
		background-color: var(--primary);
		border-color: var(--primary);
		opacity: 0.4;
		cursor: not-allowed;
	}

	:global(.calendar-wrapper .fc-button-primary:not(:disabled):active),
	:global(.calendar-wrapper .fc-button-primary:not(:disabled).fc-button-active) {
		background-color: color-mix(in oklch, var(--primary) 75%, black);
		border-color: color-mix(in oklch, var(--primary) 75%, black);
		box-shadow: none;
	}

	:global(.calendar-wrapper .fc-button:focus),
	:global(.calendar-wrapper .fc-button:active),
	:global(.calendar-wrapper .fc-button-primary:not(:disabled):active:focus),
	:global(.calendar-wrapper .fc-button-primary:not(:disabled).fc-button-active:focus) {
		box-shadow: none !important;
		outline: none !important;
	}

	/* ── Booking event content ── */
	:global(.calendar-wrapper .fc-event) {
		background-color: transparent !important;
		border: none !important;
		border-radius: 4px !important;
	}

	:global(.calendar-wrapper .fc-booking-dot) {
		display: inline-block;
		width: 8px;
		height: 8px;
		min-width: 8px;
		border-radius: 50%;
		flex-shrink: 0;
		margin-right: 6px;
	}

	:global(.calendar-wrapper .fc-booking-time) {
		display: inline-block;
		font-size: 0.7rem;
		font-weight: 700;
		white-space: nowrap;
		color: var(--foreground);
		margin-right: 6px;
	}

	:global(.calendar-wrapper .fc-booking-title) {
		display: inline-block;
		font-size: 0.75rem;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--foreground);
	}

	/* single-line row layout for both month & timeGrid */
	:global(.calendar-wrapper .fc-event .fc-event-main) {
		padding: 1px 5px 1px 4px !important;
		display: flex;
		align-items: center;
		min-width: 0;
	}

	:global(.calendar-wrapper .fc-event-main > .fc-booking-time) {
		flex-shrink: 0;
	}

	:global(.calendar-wrapper .fc-event-main > .fc-booking-title) {
		flex: 1 1 auto;
		min-width: 0;
	}

	:global(.calendar-wrapper .fc-booking-label) {
		display: inline-block;
		font-size: 0.6rem;
		font-weight: 600;
		padding: 1px 6px;
		border-radius: 9999px;
		color: white;
		margin-left: 8px;
		white-space: nowrap;
		line-height: 1.4;
	}
</style>
