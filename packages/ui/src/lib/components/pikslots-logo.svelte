<!-- Pikslots logo: a P built from booking slots, with the picked slot in amber. Sizes with font-size -->
<script lang="ts">
	import { cn } from '$lib/utils.js';

	let {
		wordmark = true,
		tone = 'brand',
		class: className
	}: {
		wordmark?: boolean;
		/** 'brand' paints the slots indigo; 'inherit' uses the text color, for brand-colored panels */
		tone?: 'brand' | 'inherit';
		class?: string;
	} = $props();

	const slots = [
		[0, 0],
		[24, 0],
		[48, 0],
		[0, 24],
		[48, 24],
		[0, 48],
		[24, 48],
		[48, 48],
		[0, 72],
		[0, 96]
	];
</script>

<!-- The mark stands in for the P: an oversized initial dipping just below the baseline, followed by "ikslots" -->
<span
	class={cn('inline-block leading-none font-bold tracking-tighter whitespace-nowrap', className)}
	role="img"
	aria-label="Pikslots"
	><svg
		viewBox="0 0 68 116"
		aria-hidden="true"
		class={cn(
			// `!` so parents that size every svg (e.g. sidebar buttons' [&_svg]:size-4) can't shrink the mark
			'inline-block w-auto! align-baseline',
			wordmark ? 'mr-[0.1em] h-[1.4em]! align-[-0.2em]' : 'h-[1.15em]!',
			tone === 'brand' && 'text-primary dark:text-chart-1'
		)}
	>
		<g fill="currentColor">
			{#each slots as [x, y] (`${x}-${y}`)}
				<rect {x} {y} width="20" height="20" />
			{/each}
		</g>
		<rect x="28" y="28" width="12" height="12" fill="#fbbf24" />
	</svg>{#if wordmark}<span aria-hidden="true">ikslots</span>{/if}</span
>
