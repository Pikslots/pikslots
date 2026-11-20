<script lang="ts">
	import type { Component } from 'svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { cn } from '$lib/utils.js';

	let {
		icon: Icon,
		title,
		description,
		class: className
	}: {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lucide and tabler icons have different prop types
		icon: Component<any>;
		title: string;
		description?: string;
		class?: string;
	} = $props();
</script>

<Dialog.Header class={cn('flex flex-row items-center gap-3 border-b px-5 py-4 pr-12', className)}>
	<span
		class="flex size-9 shrink-0 items-center justify-center bg-primary/10 text-primary dark:bg-primary/30 dark:text-chart-1"
	>
		<Icon class="size-4.5" size={18} />
	</span>
	<div class="min-w-0 space-y-0.5">
		<Dialog.Title class="text-base font-semibold">{title}</Dialog.Title>
		{#if description}
			<Dialog.Description class="text-xs text-muted-foreground">{description}</Dialog.Description>
		{/if}
	</div>
</Dialog.Header>
