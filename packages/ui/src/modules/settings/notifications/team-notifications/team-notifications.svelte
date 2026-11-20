<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import Plus from '@tabler/icons-svelte/icons/plus';
	import type { TimeUnit, NotificationType } from '@pikslots/shared';
	import { businessStore } from '../../../core/store/business.svelte';
	import { createMutation } from '@tanstack/svelte-query';
	import { updateBusinessTeamNotifications } from '../../../api/business/update.business.team.notifications.mutation';
	import type {
		BusinessUpdateTeamNotificationsInput,
		BusinessUpdateTeamNotificationsResult
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
	let emailReminder = $state(true);
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

	// ── CC email ───────────────────────────────────────────────────
	let ccEmails = $state<string[]>([]);

	$effect(() => {
		if (business) {
			const n = business.teamNotifications;
			confirmations = n.notifyBookingConfirmation;
			changes = n.notifyBookingChanges;
			cancellations = n.notifyBookingCancellations;
			reminderValue = String(n.bookingRemindersTime.value);
			reminderUnit = n.bookingRemindersTime.unit;
			reminderType = n.bookingRemindersTime.type;
			emailReminder = n.bookingRemindersTime.active;
			ccEmails = [...n.extraCCEmails];
		}
	});

	const isDirty = $derived(
		!!business &&
			(confirmations !== business.teamNotifications.notifyBookingConfirmation ||
				changes !== business.teamNotifications.notifyBookingChanges ||
				cancellations !== business.teamNotifications.notifyBookingCancellations ||
				emailReminder !== business.teamNotifications.bookingRemindersTime.active ||
				Number(reminderValue) !== business.teamNotifications.bookingRemindersTime.value ||
				reminderUnit !== business.teamNotifications.bookingRemindersTime.unit ||
				reminderType !== business.teamNotifications.bookingRemindersTime.type ||
				JSON.stringify(ccEmails) !== JSON.stringify(business.teamNotifications.extraCCEmails))
	);

	const updateMutation = createMutation<
		BusinessUpdateTeamNotificationsResult,
		AxiosError<BaseErrorResponse>,
		BusinessUpdateTeamNotificationsInput
	>(() => ({
		mutationFn: updateBusinessTeamNotifications
	}));

	$effect(() => {
		if (updateMutation.data) {
			businessStore.setSelectedBusiness(updateMutation.data);
			toast.success('Team notifications saved successfully.');
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
				active: emailReminder,
				type: reminderType,
				unit: reminderUnit,
				value: Number(reminderValue)
			},
			extraCCEmails: ccEmails
		});
	}

	function handleCancel() {
		if (!business) return;
		const n = business.teamNotifications;
		confirmations = n.notifyBookingConfirmation;
		changes = n.notifyBookingChanges;
		cancellations = n.notifyBookingCancellations;
		reminderValue = String(n.bookingRemindersTime.value);
		reminderUnit = n.bookingRemindersTime.unit;
		reminderType = n.bookingRemindersTime.type;
		emailReminder = n.bookingRemindersTime.active;
		ccEmails = [...n.extraCCEmails];
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
		<!-- Team notifications -->
		<div class="flex flex-col gap-0.5">
			<h2 class="text-sm font-semibold">Team notifications</h2>
			<span class="text-xs text-muted-foreground"
				>Select the real-time updates your team will receive.</span
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
					>Keep team members in the loop with automatic booking reminders.</span
				>
			</div>

			<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
				<div class="flex items-start gap-3">
					<Checkbox bind:checked={emailReminder} class="mt-0.5" />
					<div class="flex flex-col gap-0.5">
						<span class="text-xs font-medium">Reminder</span>
						<span class="text-xs text-muted-foreground">Prior to each appointment</span>
					</div>
				</div>
				<div class="flex shrink-0 items-center gap-2">
					<Input
						type="number"
						bind:value={reminderValue}
						disabled={!emailReminder}
						class="w-16 text-xs"
						min="1"
					/>
					<Select.Root type="single" bind:value={reminderUnit} disabled={!emailReminder}>
						<Select.Trigger class="w-28 text-xs">
							{reminderUnits.find((u) => u.value === reminderUnit)?.label ?? reminderUnit}
						</Select.Trigger>
						<Select.Content>
							{#each reminderUnits as u (u.value)}
								<Select.Item value={u.value}>{u.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<Select.Root type="single" bind:value={reminderType} disabled={!emailReminder}>
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
		</div>

		<!-- CC email notifications -->
		<div class="flex flex-col gap-3">
			<div class="flex flex-col gap-0.5">
				<span class="text-xs font-medium">CC email notifications</span>
				<span class="text-xs text-muted-foreground"
					>Send all team appointment updates to additional email addresses.</span
				>
			</div>

			<Button variant="ghost" class="w-fit gap-1.5 px-0 text-xs font-medium text-muted-foreground">
				<Plus size={14} />
				Add an email
			</Button>
		</div>
	</div>
</div>
