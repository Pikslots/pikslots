<script lang="ts">
	import BrandBackdrop from '$lib/components/brand-backdrop.svelte';
	import { brandSurfaceClass, timeQuotes } from '$lib/brand/brand';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { goto } from '$app/navigation';
	import { createQuery } from '@tanstack/svelte-query';
	import type { UserRole } from '@pikslots/shared';
	import { authStore } from '$stores/auth.svelte';
	import { getUserProfileQueryOptions } from '../api/user/get.user.profile.query';
	import { quickActions } from './nav-menu/quick-actions';

	const userProfileQuery = createQuery(() => getUserProfileQueryOptions());
	const currentUserRole = $derived(authStore.getPayloadData());

	const now = new Date();
	const hour = now.getHours();
	const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
	const today = now.toLocaleDateString(undefined, {
		weekday: 'long',
		month: 'long',
		day: 'numeric'
	});
	const quote = timeQuotes[Math.floor(Math.random() * timeQuotes.length)];

	function isItemAllowed(roles: UserRole[] | null): boolean {
		if (!currentUserRole) return false;
		if (!roles) return true;
		return roles.includes(currentUserRole.role);
	}

	const actions = $derived(quickActions.filter((item) => isItemAllowed(item.roles ?? null)));
</script>

<section class="px-4 lg:px-6">
	<div class="{brandSurfaceClass} border p-6 sm:p-8 dark:border-border">
		<BrandBackdrop />

		<div class="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
			<div class="space-y-3">
				<p class="text-sm text-primary-foreground/70">{today}</p>
				{#if userProfileQuery.data}
					<h2 class="text-2xl font-bold tracking-tight sm:text-3xl">
						{greeting}, {userProfileQuery.data.name.firstName} 👋
					</h2>
				{:else}
					<Skeleton class="h-9 w-64 bg-primary-foreground/20" />
				{/if}
				<p class="max-w-xl text-sm text-primary-foreground/80 sm:text-base">
					“{quote.text}” <span class="text-primary-foreground/60">— {quote.author}</span>
				</p>
			</div>

			<div class="flex flex-wrap gap-2 lg:shrink-0 lg:flex-nowrap">
				<!-- eslint-disable svelte/no-navigation-without-resolve -- some quick action routes carry query params resolve() can't type-check -->
				{#each actions.slice(0, 3) as action (action.href)}
					<button
						type="button"
						class="inline-flex grow items-center justify-center gap-2 border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-2 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-primary-foreground/20 sm:grow-0"
						onclick={() => goto(action.href)}
					>
						<action.icon class="size-4" />
						{action.label}
					</button>
				{/each}
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</div>
		</div>
	</div>
</section>
