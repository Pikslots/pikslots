<script lang="ts">
	import Phone from '@tabler/icons-svelte/icons/phone';
	import Mail from '@tabler/icons-svelte/icons/mail';
	import BuildingStore from '@tabler/icons-svelte/icons/building-store';
	import MapPin from '@tabler/icons-svelte/icons/map-pin';
	import Copy from '@tabler/icons-svelte/icons/copy';
	import World from '@tabler/icons-svelte/icons/world';
	import BrandInstagram from '@tabler/icons-svelte/icons/brand-instagram';
	import BrandFacebook from '@tabler/icons-svelte/icons/brand-facebook';
	import BrandX from '@tabler/icons-svelte/icons/brand-x';
	import BrandYoutube from '@tabler/icons-svelte/icons/brand-youtube';
	import BrandLinkedin from '@tabler/icons-svelte/icons/brand-linkedin';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import type { FullCustomerModel } from '../../api/customer/models/customer-model';

	let { customer }: { customer: FullCustomerModel } = $props();

	const SOCIAL_ICONS: Record<string, typeof World> = {
		website: World,
		instagram: BrandInstagram,
		facebook: BrandFacebook,
		x: BrandX,
		youtube: BrandYoutube,
		linkedin: BrandLinkedin
	};

	function formatAddress(c: FullCustomerModel): string | null {
		const parts = [c.address, c.city, c.state, c.country].filter(Boolean);
		if (!parts.length) return null;
		const base = parts.join(', ');
		return c.zipCode ? `${base} - ${c.zipCode}` : base;
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		toast.success('Copied to clipboard');
	}
</script>

<div class="flex flex-col gap-0.5">
	<!-- Phone -->
	<div class="flex items-center gap-3 py-2.5">
		<Phone class="size-4 shrink-0 text-muted-foreground" />
		{#if customer.primaryPhone}
			<span class="text-sm">{customer.primaryPhone}</span>
		{:else}
			<!-- eslint-disable svelte/no-navigation-without-resolve -- /home/customers/[id]/edit doesn't exist yet, so resolve() can't type-check this route -->
			<button
				class="text-sm text-primary underline underline-offset-2"
				onclick={() => goto(`/home/customers/${customer.id}/edit`)}
			>
				Add phone
			</button>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		{/if}
	</div>

	<!-- Email -->
	{#if customer.email}
		<div class="flex items-center gap-3 py-2.5">
			<Mail class="size-4 shrink-0 text-muted-foreground" />
			<span class="text-sm">{customer.email}</span>
		</div>
	{/if}

	<!-- Company -->
	{#if customer.company}
		<div class="flex items-center gap-3 py-2.5">
			<BuildingStore class="size-4 shrink-0 text-muted-foreground" />
			<span class="text-sm">{customer.company}</span>
		</div>
	{/if}

	<!-- Address -->
	{#if formatAddress(customer)}
		<div class="flex items-center gap-3 py-2.5">
			<MapPin class="size-4 shrink-0 text-muted-foreground" />
			<span class="text-sm">{formatAddress(customer)}</span>
		</div>
	{/if}

	<!-- Social links -->
	{#each Object.entries(customer.customerSocialLinks ?? {}) as [key, value] (key)}
		{#if value.length > 0}
			{@const Icon = SOCIAL_ICONS[key] ?? World}
			<div class="group flex items-center justify-start gap-3 py-2.5">
				<Icon class="size-4 shrink-0 text-muted-foreground" />
				<button
					class="truncate text-left text-sm underline underline-offset-2"
					onclick={() => copyToClipboard(value as string)}
					type="button">{value}</button
				>
				<Copy
					class="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
				/>
			</div>
		{/if}
	{/each}
</div>
