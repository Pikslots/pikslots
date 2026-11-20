<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import InfoCircle from '@tabler/icons-svelte/icons/info-circle';
	import Plus from '@tabler/icons-svelte/icons/plus';

	let acceptPayments = $state(false);
	let requireFullPayment = $state(false);
</script>

<div class="flex flex-col">
	<!-- Page header -->
	<div class="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
		<h1 class="text-base font-semibold">Payments</h1>
		<Button>Save</Button>
	</div>

	<div class="flex w-full max-w-3xl flex-col gap-6 px-4 py-4 sm:px-6">
		<!-- Booking Page payments -->
		<div class="flex flex-col gap-3">
			<div class="flex flex-col gap-0.5">
				<h2 class="text-sm font-semibold">Booking Page payments</h2>
				<span class="text-xs text-muted-foreground"
					>Manage how your customers can pay for your services</span
				>
			</div>

			<div class="flex items-start gap-2 text-xs text-muted-foreground">
				<InfoCircle size={15} class="mt-0.5 shrink-0" />
				<p>
					To accept Booking Page payments, you first need to connect
					<strong class="font-medium text-foreground">Square</strong>,
					<strong class="font-medium text-foreground">Stripe</strong>,
					<strong class="font-medium text-foreground">PayPal</strong> or
					<strong class="font-medium text-foreground">LawPay</strong>.
				</p>
			</div>

			<div class="flex flex-col gap-3">
				<div class="flex items-start gap-3">
					<Switch bind:checked={acceptPayments} disabled class="mt-0.5 opacity-40" />
					<div class="flex flex-col gap-0.5">
						<span class="text-xs text-muted-foreground">Accept payments</span>
						<span class="text-xs text-muted-foreground"
							>Allow clients to pay online while booking</span
						>
					</div>
				</div>

				<div class="flex items-start gap-3">
					<Switch bind:checked={requireFullPayment} disabled class="mt-0.5 opacity-40" />
					<div class="flex flex-col gap-0.5">
						<span class="text-xs text-muted-foreground">Require full payment</span>
						<span class="text-xs text-muted-foreground"
							>Make payment mandatory at the time of booking</span
						>
					</div>
				</div>
			</div>
		</div>

		<!-- Charges and reductions -->
		<div class="flex flex-col gap-3">
			<div class="flex flex-col gap-0.5">
				<span class="text-xs font-medium">Charges and reductions</span>
				<span class="text-xs text-muted-foreground">Apply fees, taxes, or discounts</span>
			</div>

			<Button variant="outline" class="w-fit gap-1.5 text-xs">
				<Plus size={14} />
				Add charge or reduction
			</Button>

			<div class="flex items-start gap-2 text-xs text-muted-foreground">
				<InfoCircle size={15} class="mt-0.5 shrink-0" />
				<p>
					To verify that your new settings have taken effect, open your
					<button type="button" class="font-medium text-foreground underline underline-offset-2">
						Booking Page</button
					>
					and schedule a test appointment.
				</p>
			</div>
		</div>
	</div>
</div>
