<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import type { TimeUnit, NotificationType } from '@pikslots/shared';
	import { businessStore } from '../../../core/store/business.svelte';
	import { createMutation } from '@tanstack/svelte-query';
	import { updateBusinessCustomerNotifications } from '../../../api/business/update.business.customer.notifications.mutation';
	import type {
		BusinessUpdateCustomerNotificationsInput,
		BusinessUpdateCustomerNotificationsResult
	} from '../../../api/business/models/business-model';
	import type { BaseErrorResponse } from '@pikslots/shared';
	import type { AxiosError } from 'axios';
	import { toast } from 'svelte-sonner';

	const business = $derived(businessStore.selectedBusiness);

	// ── Updates ────────────────────────────────────────────────────
	let confirmations = $state(true);
	let changes = $state(true);
	let cancellations = $state(true);

	// ── Reminders ──────────────────────────────────────────────────
	let reminderActive = $state(true);
	let reminderValue = $state('1');
	let reminderUnit = $state<TimeUnit>('days');
	let reminderType = $state<NotificationType>('email');

	const reminderUnits: { value: TimeUnit; label: string }[] = [
		{ value: 'minutes', label: 'Minutes' },
		{ value: 'hours', label: 'Hours' },
		{ value: 'days', label: 'Days' },
		{ value: 'weeks', label: 'Weeks' }
	];

	const reminderTypes: { value: NotificationType; label: string }[] = [
		{ value: 'email', label: 'Email' },
		{ value: 'sms', label: 'SMS' }
	];

	$effect(() => {
		if (business) {
			const n = business.customerNotifications;
			confirmations = n.notifyBookingConfirmation;
			changes = n.notifyBookingChanges;
			cancellations = n.notifyBookingCancellations;
			reminderValue = String(n.bookingRemindersTime.value);
			reminderUnit = n.bookingRemindersTime.unit;
			reminderType = n.bookingRemindersTime.type;
			reminderActive = n.bookingRemindersTime.active;
		}
	});

	const isDirty = $derived(
		!!business &&
			(confirmations !== business.customerNotifications.notifyBookingConfirmation ||
				changes !== business.customerNotifications.notifyBookingChanges ||
				cancellations !== business.customerNotifications.notifyBookingCancellations ||
				reminderActive !== business.customerNotifications.bookingRemindersTime.active ||
				Number(reminderValue) !== business.customerNotifications.bookingRemindersTime.value ||
				reminderUnit !== business.customerNotifications.bookingRemindersTime.unit ||
				reminderType !== business.customerNotifications.bookingRemindersTime.type)
	);

	const updateMutation = createMutation<
		BusinessUpdateCustomerNotificationsResult,
		AxiosError<BaseErrorResponse>,
		BusinessUpdateCustomerNotificationsInput
	>(() => ({
		mutationFn: updateBusinessCustomerNotifications
	}));

	$effect(() => {
		if (updateMutation.data) {
			businessStore.setSelectedBusiness(updateMutation.data);
			toast.success('Customer notifications saved successfully.');
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
			notifyBookingConfirmation: confirmations,
			notifyBookingChanges: changes,
			notifyBookingCancellations: cancellations,
			bookingRemindersTime: {
				active: reminderActive,
				type: reminderType,
				unit: reminderUnit,
				value: Number(reminderValue)
			}
		});
	}

	function handleCancel() {
		if (!business) return;
		const n = business.customerNotifications;
		confirmations = n.notifyBookingConfirmation;
		changes = n.notifyBookingChanges;
		cancellations = n.notifyBookingCancellations;
		reminderValue = String(n.bookingRemindersTime.value);
		reminderUnit = n.bookingRemindersTime.unit;
		reminderType = n.bookingRemindersTime.type;
		reminderActive = n.bookingRemindersTime.active;
	}
</script>

<div class="flex flex-col">
	<!-- Page header -->
	<div class="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
		<h1 class="text-base font-semibold">Notifications</h1>
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				onclick={handleCancel}
				disabled={!isDirty || updateMutation.isPending}
			>
				Cancel
			</Button>
			<Button size="sm" onclick={handleSave} disabled={!isDirty || updateMutation.isPending}>
				{updateMutation.isPending ? 'Saving...' : 'Save'}
			</Button>
		</div>
	</div>

	<div class="flex w-full max-w-3xl flex-col gap-6 px-4 py-4 sm:px-6">
		<!-- Customer notifications -->
		<div class="flex flex-col gap-0.5">
			<h2 class="text-sm font-semibold">Customer notifications</h2>
			<span class="text-xs text-muted-foreground"
				>Select the real-time updates your customers will receive.</span
			>
		</div>

		<!-- Updates -->
		<div class="flex flex-col gap-3">
			<div class="flex flex-col gap-0.5">
				<span class="text-xs font-medium">Updates</span>
				<span class="text-xs text-muted-foreground"
					>Automate notifications for new, edited and cancelled bookings</span
				>
			</div>

			<div class="flex flex-col gap-3">
				<div class="flex items-start gap-3">
					<Checkbox bind:checked={confirmations} class="mt-0.5" />
					<div class="flex flex-col gap-0.5">
						<span class="text-xs font-medium">Confirmations</span>
						<span class="text-xs text-muted-foreground"
							>Automate notifications for new bookings</span
						>
					</div>
				</div>

				<div class="flex items-start gap-3">
					<Checkbox bind:checked={changes} class="mt-0.5" />
					<div class="flex flex-col gap-0.5">
						<span class="text-xs font-medium">Changes</span>
						<span class="text-xs text-muted-foreground"
							>Automate notifications for edited or rescheduled bookings</span
						>
					</div>
				</div>

				<div class="flex items-start gap-3">
					<Checkbox bind:checked={cancellations} class="mt-0.5" />
					<div class="flex flex-col gap-0.5">
						<span class="text-xs font-medium">Cancellations</span>
						<span class="text-xs text-muted-foreground"
							>Automate notifications for cancelled bookings</span
						>
					</div>
				</div>
			</div>
		</div>

		<!-- Reminders -->
		<div class="flex flex-col gap-3">
			<div class="flex flex-col gap-0.5">
				<span class="text-xs font-medium">Reminders</span>
				<span class="text-xs text-muted-foreground"
					>Reduce no-shows and rescheduling with automatic booking reminders.</span
				>
			</div>

			<!-- Reminder 1 -->
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
				<div class="flex items-center gap-3">
					<Checkbox bind:checked={reminderActive} />
					<span class="text-xs font-medium">Reminder</span>
				</div>
				<div class="flex shrink-0 items-center gap-2">
					<Input
						type="number"
						bind:value={reminderValue}
						disabled={!reminderActive}
						class="w-16 text-xs"
						min="1"
					/>
					<Select.Root type="single" bind:value={reminderUnit} disabled={!reminderActive}>
						<Select.Trigger class="w-28 text-xs">
							{reminderUnits.find((u) => u.value === reminderUnit)?.label ?? reminderUnit}
						</Select.Trigger>
						<Select.Content>
							{#each reminderUnits as u (u.value)}
								<Select.Item value={u.value}>{u.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<Select.Root type="single" bind:value={reminderType} disabled={!reminderActive}>
						<Select.Trigger class="w-24 text-xs">
							{reminderTypes.find((t) => t.value === reminderType)?.label ?? reminderType}
						</Select.Trigger>
						<Select.Content>
							{#each reminderTypes as t (t.value)}
								<Select.Item value={t.value}>{t.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<!-- Reminder 2 (pro feature) -->
			<!-- <div class="flex items-center justify-between gap-6 opacity-50"> -->
			<!-- 	<div class="flex items-center gap-3"> -->
			<!-- 		<Checkbox disabled /> -->
			<!-- 		<span class="text-xs text-muted-foreground">Reminder 2</span> -->
			<!-- 	</div> -->
			<!-- 	<div class="flex shrink-0 items-center gap-2"> -->
			<!-- 		<Input type="number" value="12" disabled class="w-16 text-xs" /> -->
			<!-- 		<Select.Root type="single" value="hours" disabled> -->
			<!-- 			<Select.Trigger class="w-28 text-xs">Hours</Select.Trigger> -->
			<!-- 			<Select.Content> -->
			<!-- 				{#each reminderUnits as u (u.value)} -->
			<!-- 					<Select.Item value={u.value}>{u.label}</Select.Item> -->
			<!-- 				{/each} -->
			<!-- 			</Select.Content> -->
			<!-- 		</Select.Root> -->
			<!-- 		<Select.Root type="single" value="email" disabled> -->
			<!-- 			<Select.Trigger class="w-24 text-xs">Email</Select.Trigger> -->
			<!-- 			<Select.Content> -->
			<!-- 				{#each reminderTypes as t (t.value)} -->
			<!-- 					<Select.Item value={t.value}>{t.label}</Select.Item> -->
			<!-- 				{/each} -->
			<!-- 			</Select.Content> -->
			<!-- 		</Select.Root> -->
			<!-- 	</div> -->
			<!-- </div> -->
		</div>
	</div>
</div>
