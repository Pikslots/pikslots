<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import BrandStripe from '@tabler/icons-svelte/icons/brand-stripe';
	import BrandPaypal from '@tabler/icons-svelte/icons/brand-paypal';
	import Cash from '@tabler/icons-svelte/icons/cash';
	import Scale from '@tabler/icons-svelte/icons/scale';
	import BrandYoutube from '@tabler/icons-svelte/icons/brand-youtube';

	const providers = [
		{
			label: 'Square',
			icon: BrandYoutube,
			description: 'Get paid fast via your Square terminal, Cash App, Apple Pay or Google Pay.'
		},
		{
			label: 'Stripe',
			icon: BrandStripe,
			description: 'Collect payments online with your Booking Page, and in person with Tap to Pay.'
		},
		{
			label: 'PayPal',
			icon: BrandPaypal,
			description:
				'Accept payments conveniently via PayPal, Venmo, credit and debit cards, and more.'
		},
		{
			label: 'Cash',
			icon: Cash,
			description: 'Account for cash transactions at different locations and on the go.'
		},
		{
			label: 'LawPay',
			icon: Scale,
			description: 'Enable leads and clients to pay in advance through your Booking Page.'
		}
	];
</script>

<div class="flex flex-col">
	<!-- Page header -->
	<div class="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
		<h1 class="text-base font-semibold">Payments</h1>
		<Button>Save</Button>
	</div>

	<div class="flex w-full max-w-3xl flex-col gap-4 px-4 py-4 sm:px-6">
		<h2 class="text-sm font-semibold">Payment integrations</h2>
		<div class="grid grid-cols-3 gap-4">
			{#each providers as provider (provider.label)}
				<button
					type="button"
					class="flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-accent"
				>
					<div class="flex size-10 items-center justify-center rounded-md border bg-muted">
						<provider.icon size={20} />
					</div>
					<div class="flex flex-col gap-0.5">
						<span class="text-xs font-medium">{provider.label}</span>
						<span class="text-xs text-muted-foreground">{provider.description}</span>
					</div>
				</button>
			{/each}
		</div>
	</div>
</div>
