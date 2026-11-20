<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { businessStore } from '../../../core/store/business.svelte';
	import { createMutation } from '@tanstack/svelte-query';
	import { updateBusinessNotificationCustomization } from '../../../api/business/update.business.notification.customization.mutation';
	import type {
		BusinessUpdateNotificationCustomizationInput,
		BusinessUpdateNotificationCustomizationResult
	} from '../../../api/business/models/business-model';
	import type { BaseErrorResponse } from '@pikslots/shared';
	import type { AxiosError } from 'axios';
	import { toast } from 'svelte-sonner';

	const business = $derived(businessStore.selectedBusiness);

	let senderName = $state('');
	let emailSignature = $state('');

	$effect(() => {
		if (business) {
			const c = business.notificationCustomization;
			senderName = c.emailSenderName;
			emailSignature = c.emailSignature;
		}
	});

	const isDirty = $derived(
		!!business &&
			(senderName !== business.notificationCustomization.emailSenderName ||
				emailSignature !== business.notificationCustomization.emailSignature)
	);

	const updateMutation = createMutation<
		BusinessUpdateNotificationCustomizationResult,
		AxiosError<BaseErrorResponse>,
		BusinessUpdateNotificationCustomizationInput
	>(() => ({
		mutationFn: updateBusinessNotificationCustomization
	}));

	$effect(() => {
		if (updateMutation.data) {
			businessStore.setSelectedBusiness(updateMutation.data);
			toast.success('Notification customization saved successfully.');
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
			emailSenderName: senderName,
			emailSignature
		});
	}

	function handleCancel() {
		if (!business) return;
		const c = business.notificationCustomization;
		senderName = c.emailSenderName;
		emailSignature = c.emailSignature;
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

	<div class="flex w-full max-w-3xl flex-col gap-4 px-4 py-4 sm:px-6">
		<h2 class="text-sm font-semibold">Customization</h2>

		<div class="flex flex-col gap-3">
			<span class="text-xs font-medium">Emails</span>

			<div class="flex flex-col gap-1">
				<span class="text-xs text-muted-foreground">Sender name</span>
				<Input bind:value={senderName} class="text-xs" />
			</div>

			<div class="flex flex-col gap-1">
				<span class="text-xs text-muted-foreground">Email signature</span>
				<textarea
					bind:value={emailSignature}
					rows={4}
					class="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
				></textarea>
			</div>
		</div>
	</div>
</div>
