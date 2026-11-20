<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import Check from '@tabler/icons-svelte/icons/check';

	let twoFactorEnabled = $state(true);
</script>

<div class="flex flex-col">
	<!-- Page header -->
	<div class="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
		<h1 class="text-base font-semibold">Security</h1>
	</div>

	<div class="flex w-full max-w-3xl flex-col gap-4 px-4 py-4 sm:px-6">
		<!-- Two-factor authentication -->
		<div class="flex flex-col gap-3">
			<div class="flex flex-col gap-0.5">
				<span class="text-xs font-semibold">Two-factor authentication</span>
				<span class="text-xs text-muted-foreground">
					An authentication code is required for all team members when logging in with email and
					password.
				</span>
			</div>

			<Button
				variant="outline"
				class="w-fit gap-1.5 rounded-full text-xs {twoFactorEnabled ? 'text-muted-foreground' : ''}"
				onclick={() => (twoFactorEnabled = !twoFactorEnabled)}
			>
				{#if twoFactorEnabled}
					<Check size={14} />
					Enabled
				{:else}
					Enable
				{/if}
			</Button>
		</div>
	</div>
</div>
