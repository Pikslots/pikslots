<!-- Pikslots logo: the wordmark, with the picked slot in amber as the dot on the i. Sizes with font-size -->
<script lang="ts">
	import { cn } from '$lib/utils.js';

	let {
		tone = 'brand',
		class: className
	}: {
		/** 'brand' paints the p indigo; 'inherit' uses the text color, for brand-colored panels */
		tone?: 'brand' | 'inherit';
		class?: string;
	} = $props();
</script>

<!-- A dotless ı carries the amber square. In Roboto Bold the ı stem spans 0.065–0.21em across and its top sits 0.69em
	 above the box bottom, so the square matches the stem's width and floats 0.1em above it -->
<span
	class={cn('inline-block leading-none font-bold tracking-tighter whitespace-nowrap', className)}
	role="img"
	aria-label="Pikslots"
	><span aria-hidden="true"
		><span class={cn(tone === 'brand' && 'text-primary dark:text-chart-1')}>p</span><span
			class="relative inline-block"
			>ı<span class="absolute bottom-[0.79em] left-[0.065em] size-[0.145em] bg-amber-400"
			></span></span
		>kslots</span
	></span
>
