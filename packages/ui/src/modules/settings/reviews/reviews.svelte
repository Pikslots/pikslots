<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import InfoCircle from '@tabler/icons-svelte/icons/info-circle';
	import BrandGoogle from '@tabler/icons-svelte/icons/brand-google';
	import Sparkles from '@tabler/icons-svelte/icons/sparkles';
	import Check from '@tabler/icons-svelte/icons/check';

	const reviews: never[] = [];

	// ── Preferences ────────────────────────────────────────────────
	let sendReviewEmails = $state(true);
	let autoPublish = $state(false);
	let selectedPlatform = $state<'google' | 'pikslot'>('pikslot');
</script>

<div class="flex flex-col">
	<!-- Page header -->
	<div class="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
		<h1 class="text-base font-semibold">Reviews</h1>
	</div>

	<div class="flex flex-col px-6 py-4">
		<Tabs.Root value="reviews" class="flex flex-col">
			<Tabs.List class="h-auto justify-start rounded-none border-b bg-transparent pb-0">
				<Tabs.Trigger
					value="reviews"
					class="cursor-pointer rounded-none border-b-2 border-transparent px-3 pt-0 pb-2 text-muted-foreground data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
				>
					Reviews
				</Tabs.Trigger>
				<Tabs.Trigger
					value="preferences"
					class="cursor-pointer rounded-none border-b-2 border-transparent px-3 pt-0 pb-2 text-muted-foreground data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
				>
					Preferences
				</Tabs.Trigger>
			</Tabs.List>

			<!-- Reviews tab -->
			<Tabs.Content value="reviews" class="mt-0">
				{#if reviews.length === 0}
					<div class="flex flex-col items-center justify-center gap-2 py-32 text-center">
						<InfoCircle size={24} class="text-muted-foreground" />
						<span class="text-xs font-semibold">No reviews to display</span>
						<span class="text-xs text-muted-foreground"
							>Request reviews to share on your Booking Page.</span
						>
						<Button variant="outline" class="mt-2">Request review</Button>
					</div>
				{/if}
			</Tabs.Content>

			<!-- Preferences tab -->
			<Tabs.Content value="preferences" class="mt-0">
				<div class="flex w-full max-w-3xl flex-col gap-6 py-4">
					<!-- Review source cards -->
					<div class="grid grid-cols-2 gap-3">
						<!-- Google Reviews -->
						<div class="flex flex-col gap-2 rounded-lg border bg-muted/40 p-4">
							<div class="flex size-10 items-center justify-center rounded-md border bg-background">
								<BrandGoogle size={20} />
							</div>
							<div class="flex flex-col gap-0.5">
								<span class="text-xs font-medium">Google Reviews</span>
								<span class="text-xs text-muted-foreground">
									Get competitive by showcasing standout Google Reviews on your Booking Page.
								</span>
							</div>
						</div>

						<!-- Pikslot Reviews -->
						<div class="relative flex flex-col gap-2 rounded-lg border p-4">
							<Badge
								variant="secondary"
								class="absolute top-3 right-3 gap-1 text-xs text-green-600"
							>
								<Check size={11} />
								Connected
							</Badge>
							<div class="flex size-10 items-center justify-center rounded-md border bg-muted">
								<Sparkles size={20} />
							</div>
							<div class="flex flex-col gap-0.5">
								<span class="text-xs font-medium">Pikslot Reviews</span>
								<span class="text-xs text-muted-foreground">
									Automate review requests and share glowing feedback on your Booking Page.
								</span>
							</div>
						</div>
					</div>

					<!-- Automate review requests -->
					<div class="flex flex-col gap-3">
						<span class="text-xs font-semibold">Automate review requests</span>

						<div class="flex items-start gap-3">
							<Switch bind:checked={sendReviewEmails} class="mt-0.5" />
							<div class="flex flex-col gap-0.5">
								<span class="text-xs font-medium">Send review request emails</span>
								<span class="text-xs text-muted-foreground"
									>Requests sent 1 hr after the appointment.</span
								>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<Switch bind:checked={autoPublish} class="mt-0.5" />
							<div class="flex flex-col gap-0.5">
								<span class="text-xs font-medium">Auto-publish reviews</span>
								<span class="text-xs text-muted-foreground"
									>New Pikslot reviews display automatically.</span
								>
							</div>
						</div>
					</div>

					<!-- Select a platform -->
					<div class="flex flex-col gap-3">
						<div class="flex flex-col gap-0.5">
							<span class="text-xs font-semibold">Select a platform</span>
							<span class="text-xs text-muted-foreground">Where will customers write a review?</span
							>
						</div>

						<div class="grid grid-cols-2 gap-3">
							<!-- Google Reviews option -->
							<label
								class="flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-4 {selectedPlatform ===
								'google'
									? 'border-foreground'
									: 'border-border'}"
							>
								<input
									type="radio"
									name="platform"
									value="google"
									bind:group={selectedPlatform}
									class="sr-only"
								/>
								<div class="flex w-full justify-start">
									<input
										type="radio"
										name="platform-visible"
										checked={selectedPlatform === 'google'}
										onchange={() => (selectedPlatform = 'google')}
										class="accent-primary"
									/>
								</div>
								<BrandGoogle size={28} class="text-muted-foreground" />
								<span class="text-xs font-medium">Google Reviews</span>
							</label>

							<!-- Pikslot Reviews option -->
							<label
								class="flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-4 {selectedPlatform ===
								'pikslot'
									? 'border-foreground'
									: 'border-border'}"
							>
								<input
									type="radio"
									name="platform"
									value="pikslot"
									bind:group={selectedPlatform}
									class="sr-only"
								/>
								<div class="flex w-full justify-start">
									<input
										type="radio"
										name="platform-visible"
										checked={selectedPlatform === 'pikslot'}
										onchange={() => (selectedPlatform = 'pikslot')}
										class="accent-primary"
									/>
								</div>
								<Sparkles size={28} class="text-muted-foreground" />
								<span class="text-xs font-medium">Pikslot Reviews</span>
							</label>
						</div>
					</div>
				</div>
			</Tabs.Content>
		</Tabs.Root>
	</div>
</div>
