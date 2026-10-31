<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import Trash from '@tabler/icons-svelte/icons/trash';
	import DeviceDesktop from '@tabler/icons-svelte/icons/device-desktop';
	import World from '@tabler/icons-svelte/icons/world';
	import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { toast } from 'svelte-sonner';
	import { getSessionsByUserQueryOptions } from '../../../api/session/get.sessions.by.user.query';
	import { deleteSessionMutationOptions } from '../../../api/session/delete.session.mutation';
	import { authStore } from '$stores/auth.svelte';

	let { userId }: { userId: string } = $props();

	const currentUserId = $derived(authStore.getPayloadData()?.userId);

	const queryClient = useQueryClient();

	const sessionsQuery = createQuery(() => getSessionsByUserQueryOptions(userId));
	const deleteMut = createMutation(() => deleteSessionMutationOptions());

	const sessions = $derived(sessionsQuery.data ?? []);

	function formatDate(value: string): string {
		return new Date(value).toLocaleString(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		});
	}

	async function removeSession(sessionId: string) {
		try {
			await deleteMut.mutateAsync(sessionId);
			await queryClient.invalidateQueries({ queryKey: ['sessions', 'user', userId] });
			toast.success('Session removed');
		} catch {
			toast.error('Failed to remove session');
		}
	}
</script>

<div class="flex w-[70%] flex-col gap-3 px-6 py-4">
	{#if sessionsQuery.isPending}
		<p class="text-xs text-muted-foreground">Loading...</p>
	{:else if sessionsQuery.isError}
		<p class="text-xs text-destructive">Failed to load sessions.</p>
	{:else if sessions.length === 0}
		<p class="text-xs text-muted-foreground">No sessions found for this user.</p>
	{:else}
		<div class="flex flex-col divide-y divide-border/90">
			{#each sessions as session (session.id)}
				<div class="flex items-center gap-4 py-3">
					<div class="flex min-w-0 flex-1 flex-col gap-1">
						<div class="flex items-center gap-2">
							<DeviceDesktop size={14} class="text-muted-foreground" />
							<span class="text-xs font-medium">{session.os} · {session.browser}</span>
							{#if session.isExpired}
								<Badge variant="outline" class="text-xs text-muted-foreground">Expired</Badge>
							{:else}
								<Badge variant="secondary" class="text-xs">Active</Badge>
							{/if}
						</div>

						<div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
							<span class="flex items-center gap-1">
								<World size={12} />
								{session.country}
							</span>
							<span>Role: {session.role}</span>
							<span>Session ID: {session.id}</span>
						</div>

						<div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
							<span>Issued: {formatDate(session.issuedAt)}</span>
							<span>Expires: {formatDate(session.expiresAt)}</span>
						</div>
					</div>

					{#if session.userId !== currentUserId}
						<Button
							variant="ghost"
							size="icon-sm"
							class="shrink-0 text-muted-foreground hover:text-destructive"
							disabled={deleteMut.isPending}
							onclick={() => removeSession(session.id)}
						>
							<Trash size={14} />
						</Button>
					{:else}
						<span class="shrink-0 text-xs text-muted-foreground">Current session</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
