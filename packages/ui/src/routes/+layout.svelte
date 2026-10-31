<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { themeStore } from '$stores/theme.svelte.js';
	import { authStore } from '$stores/auth.svelte.js';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { Toaster } from 'svelte-sonner';
	import { getCurrentSession } from '../modules/api/session/get.current.session.query';
	import { browser } from '$app/environment';

	let { children } = $props();

	const query = new QueryClient({
		defaultOptions: {
			queries: {
				enabled: browser,
				staleTime: 0,
				gcTime: 0,
				refetchOnWindowFocus: false
			},
			mutations: {
				gcTime: 0
			}
		}
	});

	$effect(() => {
		themeStore.init();
		getCurrentSession()
			.then((session) => authStore.setSession(session))
			.catch(() => {})
			.finally(() => authStore.setInitialized());
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<Toaster position="top-right" title="Notification" theme={themeStore.current} richColors={true} />
<QueryClientProvider client={query}
	>{@render children()}
	<!-- <SvelteQueryDevtools /> -->
</QueryClientProvider>
