<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as Select from '$lib/components/ui/select/index.js';

	// ── Your notifications ─────────────────────────────────────────
	let notificationMode = $state<'all' | 'focus' | 'none'>('all');

	// ── Sound ──────────────────────────────────────────────────────
	let appointmentReminders = $state(true);
	let reminderSound = $state('Chime');

	const sounds = ['Chime', 'Bell', 'Ping', 'None'];
</script>

<div class="flex flex-col">
	<!-- Page header -->
	<div class="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
		<h1 class="text-base font-semibold">Notifications</h1>
		<div class="flex items-center gap-2">
			<Button variant="outline">Cancel</Button>
			<Button>Save</Button>
		</div>
	</div>

	<div class="flex w-full max-w-3xl flex-col gap-6 px-4 py-4 sm:px-6">
		<!-- Your notifications -->
		<div class="flex flex-col gap-3">
			<div class="flex flex-col gap-0.5">
				<h2 class="text-sm font-semibold">Your notifications</h2>
				<span class="text-xs text-muted-foreground">Select the real-time updates to receive.</span>
			</div>

			<div class="flex flex-col gap-3">
				<!-- All -->
				<label class="flex cursor-pointer items-start gap-3">
					<input
						type="radio"
						name="notificationMode"
						value="all"
						bind:group={notificationMode}
						class="mt-0.5 accent-primary"
					/>
					<div class="flex flex-col gap-0.5">
						<span class="text-xs font-medium">All</span>
						<span class="text-xs text-muted-foreground"
							>All chats, mentions and booking updates</span
						>
					</div>
				</label>

				<!-- Focus mode -->
				<label class="flex cursor-pointer items-start gap-3">
					<input
						type="radio"
						name="notificationMode"
						value="focus"
						bind:group={notificationMode}
						class="mt-0.5 accent-primary"
					/>
					<div class="flex flex-col gap-0.5">
						<span class="text-xs font-medium">Focus mode</span>
						<span class="text-xs text-muted-foreground"
							>Only your chats, mentions and booking updates</span
						>
					</div>
				</label>

				<!-- None -->
				<label class="flex cursor-pointer items-start gap-3">
					<input
						type="radio"
						name="notificationMode"
						value="none"
						bind:group={notificationMode}
						class="mt-0.5 accent-primary"
					/>
					<div class="flex flex-col gap-0.5">
						<span class="text-xs font-medium">None</span>
						<span class="text-xs text-muted-foreground">Switch off notifications</span>
					</div>
				</label>
			</div>
		</div>

		<!-- Sound -->
		<div class="flex flex-col gap-3">
			<div class="flex flex-col gap-0.5">
				<h2 class="text-sm font-semibold">Sound</h2>
				<span class="text-xs text-muted-foreground">Choose how notifications sound</span>
			</div>

			<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
				<div class="flex items-start gap-3">
					<Checkbox bind:checked={appointmentReminders} class="mt-0.5" />
					<div class="flex flex-col gap-0.5">
						<span class="text-xs font-medium">Appointment Reminders</span>
						<span class="text-xs text-muted-foreground">10 minutes prior to each appointment</span>
					</div>
				</div>
				<Select.Root type="single" bind:value={reminderSound} disabled={!appointmentReminders}>
					<Select.Trigger class="w-32 shrink-0 text-xs">{reminderSound}</Select.Trigger>
					<Select.Content>
						{#each sounds as s (s)}
							<Select.Item value={s}>{s}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</div>
	</div>
</div>
