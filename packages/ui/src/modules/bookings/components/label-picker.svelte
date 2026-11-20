<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Check, ChevronDown, Tag, X } from '@lucide/svelte';
	import { LABEL_COLORS, PREDEFINED_LABELS } from './labels';

	let { value = $bindable(''), invalid = false }: { value: string; invalid?: boolean } = $props();

	let showCustomInput = $state(false);
	let customValue = $state('');

	function confirmCustom() {
		const trimmed = customValue.trim();
		if (!trimmed) return;
		value = trimmed;
		showCustomInput = false;
		customValue = '';
	}
</script>

{#if showCustomInput}
	<Input
		bind:value={customValue}
		placeholder="Custom label..."
		class="h-7 w-36 text-xs"
		autofocus
		onkeydown={(e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				confirmCustom();
			}
			if (e.key === 'Escape') {
				showCustomInput = false;
				customValue = '';
			}
		}}
		onblur={() => {
			if (customValue.trim()) confirmCustom();
			else showCustomInput = false;
		}}
	/>
{:else}
	<div class="flex items-center gap-1">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				class="flex h-7 cursor-pointer items-center gap-1.5 border px-2 text-xs transition-colors hover:bg-muted {invalid
					? 'border-destructive text-destructive'
					: value
						? 'text-foreground'
						: 'border-dashed text-muted-foreground'}"
			>
				{#if value}
					<span
						class="size-2 rounded-full"
						style="background-color: {LABEL_COLORS[value] ?? 'var(--primary)'}"
					></span>
					<span class="max-w-28 truncate">{value}</span>
				{:else}
					<Tag class="size-3" />
					<span>Add label</span>
				{/if}
				<ChevronDown class="size-3 opacity-60" />
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="z-50 w-44">
				{#each PREDEFINED_LABELS as label (label)}
					<DropdownMenu.Item onclick={() => (value = label)} class="cursor-pointer gap-2 text-xs">
						<span class="size-2 rounded-full" style="background-color: {LABEL_COLORS[label]}"
						></span>
						<span>{label}</span>
						{#if value === label}
							<Check class="ml-auto size-3.5 text-muted-foreground" />
						{/if}
					</DropdownMenu.Item>
				{/each}
				<DropdownMenu.Separator />
				<DropdownMenu.Item onclick={() => (showCustomInput = true)} class="cursor-pointer text-xs">
					Custom...
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
		{#if value}
			<button
				type="button"
				aria-label="Clear label"
				onclick={() => (value = '')}
				class="flex size-7 cursor-pointer items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
			>
				<X class="size-3" />
			</button>
		{/if}
	</div>
{/if}
