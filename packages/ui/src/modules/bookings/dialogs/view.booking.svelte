<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { toast } from 'svelte-sonner';
	import axios from 'axios';
	import { deleteBookingMutationOptions } from '../../api/booking/delete.booking.mutation';
	import {
		CalendarDays,
		Clock,
		History,
		Info,
		LoaderCircle,
		MessageSquare,
		Pencil,
		Trash2,
		UserRound,
		UsersRound,
		Wallet
	} from '@lucide/svelte';
	import { formatIsoInTimezone } from '@pikslots/datetime';
	import { businessStore } from '$stores/business.svelte';
	import { formatCost, formatDuration } from '$utils/format-time-duration';
	import { LABEL_COLORS } from '../components/labels';
	import EditBookingDialog from './edit.booking.svelte';

	export type BookingEvent = {
		id: string;
		title: string;
		start: Date;
		end: Date;
		durationMins: number;
		host: string;
		guests: { name: string; deleted?: boolean }[];
		bookingId: string;
		source: string;
		color?: string;
		label?: string;
		notes?: string;
		serviceId: string;
		customerId: string;
		userId: string;
		bookingDate: string;
		serviceSnapshot: {
			title: string;
			durationInMins: number;
			cost: number;
			colorCode: string;
		};
	};

	let {
		open = $bindable(false),
		booking,
		selectedUserRole,
		selectedUserId
	}: {
		open: boolean;
		booking: BookingEvent | null;
		selectedUserRole: string;
		selectedUserId: string;
	} = $props();

	let editDialogOpen = $state(false);

	const businessTimezone = $derived(
		businessStore.selectedBusiness?.locationDetails?.timeZone || 'UTC'
	);
	const currency = $derived(businessStore.selectedBusiness?.locationDetails?.currency ?? '');

	const queryClient = useQueryClient();
	const deleteMutation = createMutation(deleteBookingMutationOptions);

	$effect(() => {
		if (deleteMutation.isSuccess) {
			queryClient.invalidateQueries({ queryKey: ['bookings-by-business-for-user'] });
			toast.success('Booking deleted successfully');
			open = false;
			deleteMutation.reset();
		}

		if (deleteMutation.isError) {
			const error = deleteMutation.error;
			if (axios.isAxiosError(error)) {
				toast.error(error?.response?.data?.message ?? 'Failed to delete booking');
			} else {
				toast.error('Failed to delete booking');
			}
		}
	});

	function onDelete() {
		if (!booking) return;
		deleteMutation.mutate(booking.id);
	}

	function formatDate(date: Date) {
		return formatIsoInTimezone(date.toISOString(), businessTimezone, 'EEE, d MMM');
	}

	function formatTime(date: Date) {
		return formatIsoInTimezone(date.toISOString(), businessTimezone, 'h:mm a');
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="flex max-h-[92svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
		{#if booking}
			<!-- Header: the service's color, what and when -->
			<div
				class="h-1.5 shrink-0"
				style="background-color: {booking.color ?? 'var(--primary)'}"
			></div>
			<Dialog.Header class="gap-2 border-b px-5 pt-4 pr-12 pb-4">
				<div class="flex flex-wrap items-center gap-2">
					<span class="text-xs font-medium text-muted-foreground">Appointment</span>
					{#if booking.label}
						<span
							class="inline-flex items-center gap-1.5 border px-1.5 py-0.5 text-[11px] font-medium"
							style="border-color: {LABEL_COLORS[booking.label] ?? 'var(--border)'}"
						>
							<span
								class="size-1.5 rounded-full"
								style="background-color: {LABEL_COLORS[booking.label] ?? 'var(--primary)'}"
							></span>
							<span class="max-w-28 truncate">{booking.label}</span>
						</span>
					{/if}
				</div>
				<Dialog.Title class="text-lg leading-tight font-semibold">{booking.title}</Dialog.Title>
				<Dialog.Description class="flex items-center gap-1.5 text-sm text-muted-foreground">
					<CalendarDays class="size-3.5 shrink-0" />
					{formatDate(booking.start)} · {formatTime(booking.start)} – {formatTime(booking.end)}
				</Dialog.Description>
			</Dialog.Header>

			<Tabs.Root value="details" class="flex min-h-0 flex-1 flex-col gap-0">
				<Tabs.List variant="line" class="justify-start px-5 pt-2">
					<Tabs.Trigger value="details" class="cursor-pointer">Details</Tabs.Trigger>
					<Tabs.Trigger value="history" class="cursor-pointer">History</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="details" class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
					<div class="grid grid-cols-2 gap-3">
						<div class="border bg-muted/30 px-3 py-2.5">
							<p class="flex items-center gap-1.5 text-xs text-muted-foreground">
								<Clock class="size-3.5" /> Duration
							</p>
							<p class="mt-1 text-sm font-semibold tabular-nums">
								{formatDuration(booking.durationMins)}
							</p>
						</div>
						<div class="border bg-muted/30 px-3 py-2.5">
							<p class="flex items-center gap-1.5 text-xs text-muted-foreground">
								<Wallet class="size-3.5" /> Price
							</p>
							<p class="mt-1 text-sm font-semibold tabular-nums">
								{formatCost(booking.serviceSnapshot.cost / 100, currency)}
							</p>
						</div>
					</div>

					<dl class="mt-4 divide-y">
						<div class="flex items-start gap-3 py-3">
							<dt class="flex w-24 shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
								<UsersRound class="size-3.5" />
								{booking.guests.length === 1 ? 'Customer' : 'Customers'}
							</dt>
							<dd class="flex min-w-0 flex-col gap-1.5">
								{#each booking.guests as guest, i (i)}
									<span class="flex items-center gap-2">
										<span
											class="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary dark:bg-primary/30 dark:text-chart-1"
										>
											{guest.name[0]?.toUpperCase()}
										</span>
										<span class="truncate text-sm">{guest.name}</span>
										{#if guest.deleted}
											<Badge variant="secondary" class="h-5 px-1.5 text-[10px]">Deleted</Badge>
										{/if}
									</span>
								{:else}
									<span class="text-sm text-muted-foreground">No customer</span>
								{/each}
							</dd>
						</div>
						<div class="flex items-center gap-3 py-3">
							<dt class="flex w-24 shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
								<UserRound class="size-3.5" /> With
							</dt>
							<dd class="flex min-w-0 items-center gap-2">
								<Avatar.Root class="size-6 text-[10px]">
									<Avatar.Fallback class="bg-primary text-[10px] text-primary-foreground">
										{booking.host[0]}
									</Avatar.Fallback>
								</Avatar.Root>
								<span class="truncate text-sm">{booking.host}</span>
							</dd>
						</div>
						<div class="flex items-start gap-3 py-3">
							<dt class="flex w-24 shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
								<Info class="size-3.5" /> Booked via
							</dt>
							<dd class="min-w-0">
								<p class="text-sm">{booking.source}</p>
								<p class="truncate text-xs text-muted-foreground">ID: {booking.bookingId}</p>
							</dd>
						</div>
						{#if booking.notes}
							<div class="flex items-start gap-3 py-3">
								<dt class="flex w-24 shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
									<MessageSquare class="size-3.5" /> Notes
								</dt>
								<dd class="min-w-0 text-sm whitespace-pre-line">{booking.notes}</dd>
							</div>
						{/if}
					</dl>
				</Tabs.Content>

				<Tabs.Content value="history" class="min-h-0 flex-1 overflow-y-auto px-5">
					<div class="flex flex-col items-center justify-center gap-2 py-12 text-center">
						<History class="size-6 text-muted-foreground" />
						<p class="text-sm text-muted-foreground">No history available</p>
					</div>
				</Tabs.Content>
			</Tabs.Root>

			<!-- Footer -->
			<div class="flex items-center justify-between gap-2 border-t bg-muted/30 px-5 py-3">
				<Button
					variant="ghost"
					class="text-destructive hover:bg-destructive/10 hover:text-destructive"
					onclick={onDelete}
					disabled={deleteMutation.isPending}
				>
					{#if deleteMutation.isPending}
						<LoaderCircle class="animate-spin" /> Deleting...
					{:else}
						<Trash2 /> Delete
					{/if}
				</Button>
				<Button
					onclick={() => {
						open = false;
						editDialogOpen = true;
					}}
				>
					<Pencil /> Edit
				</Button>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<EditBookingDialog bind:open={editDialogOpen} {booking} {selectedUserRole} {selectedUserId} />
