<script lang="ts">
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { Icon } from '@tabler/icons-svelte';
	import Plus from '@tabler/icons-svelte/icons/plus';

	let {
		icon: IconComponent,
		title,
		description,
		buttonLabel,
		onclick
	}: {
		icon: Icon;
		title: string;
		description: string;
		buttonLabel?: string;
		onclick?: () => void;
	} = $props();
</script>

<div class="px-4 lg:px-6">
	<Empty.Root class="border border-dashed bg-muted/20 py-12">
		<Empty.Header>
			<div class="relative mb-2 flex items-center justify-center">
				<span class="absolute size-24 bg-primary/5 dark:bg-chart-1/5" aria-hidden="true"></span>
				<span class="absolute size-18 bg-primary/10 dark:bg-chart-1/10" aria-hidden="true"></span>
				<span
					class="relative flex size-12 items-center justify-center bg-primary text-primary-foreground shadow-lg shadow-primary/25"
				>
					<IconComponent size={24} />
				</span>
			</div>
			<Empty.Title class="mt-6 text-base font-semibold">{title}</Empty.Title>
			<Empty.Description class="max-w-sm">{description}</Empty.Description>
		</Empty.Header>
		{#if buttonLabel}
			<Empty.Content>
				<div class="flex gap-2">
					<Button {onclick}><Plus />{buttonLabel}</Button>
				</div>
			</Empty.Content>
		{/if}
	</Empty.Root>
</div>
