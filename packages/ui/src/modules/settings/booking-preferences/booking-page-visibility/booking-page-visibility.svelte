<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import BrandInstagram from '@tabler/icons-svelte/icons/brand-instagram';
	import BrandFacebook from '@tabler/icons-svelte/icons/brand-facebook';
	import BrandGoogle from '@tabler/icons-svelte/icons/brand-google';
	import Code from '@tabler/icons-svelte/icons/code';
	import Plus from '@tabler/icons-svelte/icons/plus';
	import { businessStore } from '../../../core/store/business.svelte';
	import { createMutation } from '@tanstack/svelte-query';
	import { updateBusinessVisibility } from '../../../api/business/update.business.visibility.mutation';
	import type {
		BusinessUpdateVisibilityInput,
		BusinessUpdateVisibilityResult
	} from '../../../api/business/models/business-model';
	import type { BaseErrorResponse } from '@pikslots/shared';
	import type { AxiosError } from 'axios';
	import { toast } from 'svelte-sonner';

	const business = $derived(businessStore.selectedBusiness);

	let appearInSearch = $state(false);

	const channels = [
		{ label: 'Instagram booking', icon: BrandInstagram },
		{ label: 'Facebook', icon: BrandFacebook },
		{ label: 'Reserve with Google', icon: BrandGoogle },
		{ label: 'Booking widget', icon: Code }
	];

	$effect(() => {
		if (business) {
			appearInSearch = business.appearInSearchResults;
		}
	});

	const isDirty = $derived(!!business && appearInSearch !== business.appearInSearchResults);

	const updateMutation = createMutation<
		BusinessUpdateVisibilityResult,
		AxiosError<BaseErrorResponse>,
		BusinessUpdateVisibilityInput
	>(() => ({
		mutationFn: updateBusinessVisibility
	}));

	$effect(() => {
		if (updateMutation.data) {
			businessStore.setSelectedBusiness(updateMutation.data);
			toast.success('Visibility settings saved successfully.');
		}
		if (updateMutation.isError) {
			toast.error(
				updateMutation.error?.response?.data?.message ?? 'Failed to save. Please try again.'
			);
		}
	});

	function handleSave() {
		if (!business) return;
		updateMutation.mutate({ id: business.id, appearInSearchResults: appearInSearch });
	}
</script>

<div class="flex flex-col">
	<!-- Page header -->
	<div class="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
		<h1 class="text-base font-semibold">Booking preferences</h1>
		<Button size="sm" onclick={handleSave} disabled={!isDirty || updateMutation.isPending}>
			{updateMutation.isPending ? 'Saving...' : 'Save'}
		</Button>
	</div>

	<div class="flex flex-col gap-6 px-6 py-4">
		<!-- Section heading -->
		<h2 class="text-sm font-semibold">Booking Page visibility</h2>

		<!-- Search results -->
		<div class="flex flex-col gap-3">
			<div class="flex flex-col gap-0.5">
				<span class="text-xs font-medium">Search results</span>
				<span class="text-xs text-muted-foreground"
					>Make your Booking Page appear in Google and other search engines.</span
				>
			</div>
			<div class="flex items-center gap-3">
				{#if business === null}
					<Skeleton class="h-5 w-9 rounded-full" />
					<Skeleton class="h-3.5 w-36 rounded" />
				{:else}
					<Switch bind:checked={appearInSearch} />
					<span class="text-xs">Appear in search results</span>
				{/if}
			</div>
		</div>

		<!-- Connect your booking channels -->
		<div class="flex flex-col gap-3">
			<div class="flex flex-col gap-0.5">
				<span class="text-xs font-medium">Connect your booking channels</span>
				<span class="text-xs text-muted-foreground"
					>Add your 'Book now' button to these platforms so customers can book instantly.</span
				>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				{#each channels as channel (channel.label)}
					<Button variant="outline" class="gap-2 rounded-full text-xs font-normal">
						<channel.icon size={15} />
						{channel.label}
					</Button>
				{/each}
				<Button variant="outline" class="gap-1.5 rounded-full text-xs font-normal">
					<Plus size={14} />
					more
				</Button>
			</div>
		</div>
	</div>
</div>
