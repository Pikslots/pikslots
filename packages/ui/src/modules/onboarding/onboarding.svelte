<script lang="ts">
	import BrandBackdrop from '$lib/components/brand-backdrop.svelte';
	import { brandSurfaceClass } from '$lib/brand/brand';
	import type { OnboardingFormValues } from './utils/schema';
	import OnboardingStep from './steps/onboarding-step.svelte';
	import {
		CalendarCheck,
		Check,
		Globe,
		LoaderCircle,
		ShieldAlert,
		UsersRound
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { createMutation, createQuery } from '@tanstack/svelte-query';
	import { toast } from 'svelte-sonner';
	import { completeOnboardingMutationOptions } from '../api/onboarding/complete.onboarding.mutation';
	import type { OnboardingCompleteInput } from '@pikslots/shared';
	import { GetOnboardingStatusQueryOptions } from '../api/onboarding/get.onboarding.status.query';

	let isComplete = $state(false);

	let values: OnboardingFormValues = {
		username: '',
		password: '',
		first_name: '',
		last_name: '',
		email: '',
		name: '',
		slug: '',
		industry: '' as OnboardingFormValues['industry'],
		default_time_zone: ''
	};

	const features = [
		{
			icon: CalendarCheck,
			title: 'Bookings on autopilot',
			description: 'Customers book 24/7 while you focus on the work.'
		},
		{
			icon: Globe,
			title: 'Your own booking page',
			description: 'A branded link you can share anywhere, live in minutes.'
		},
		{
			icon: UsersRound,
			title: 'Built for your whole team',
			description: 'Staff schedules, breaks and services in one place.'
		}
	];

	const completeOnboardingMutation = createMutation(completeOnboardingMutationOptions);
	const OnboardingStatusQuery = createQuery(GetOnboardingStatusQueryOptions);

	const onboardingComplete = $derived(OnboardingStatusQuery.data?.isOnboardingComplete === true);
	// const onboardingComplete = false;

	$effect(() => {
		if (!onboardingComplete) return;
		const timer = setTimeout(() => {
			goto(resolve('/login'));
		}, 3000);
		return () => clearTimeout(timer);
	});

	function buildPayload(): OnboardingCompleteInput {
		return {
			platformOwner: {
				username: values.username,
				password: values.password,
				name: { firstName: values.first_name, lastName: values.last_name },
				email: values.email,
				phone: values.phone ? values.phone.toString() : '',
				role: 'Platform Owner'
			},
			business: {
				slug: values.slug,
				name: values.name,
				industry: values.industry,
				defaultTimeZone: values.default_time_zone
			}
		};
	}

	function handleSubmit() {
		const payload = buildPayload();

		completeOnboardingMutation.mutate(payload, {
			onSuccess: async () => {
				isComplete = true;

				await new Promise((resolve) => setTimeout(resolve, 3000));

				await goto(resolve('/login'));
			},
			onError: (error) => {
				toast.error(error?.response?.data?.message ?? 'Onboarding failed. Please try again.');
			}
		});
	}
</script>

<div class="grid min-h-svh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
	<!-- Brand panel -->
	<aside
		class="{brandSurfaceClass} hidden lg:flex lg:flex-col lg:justify-between lg:p-12 dark:border-r"
	>
		<BrandBackdrop />

		<a href={resolve('/')} class="font-code relative text-2xl">Pikslots</a>

		<div class="relative space-y-10">
			<div class="space-y-4">
				<h1 class="text-4xl leading-tight font-bold tracking-tight text-balance xl:text-5xl">
					Fill your calendar, not your inbox.
				</h1>
				<p class="max-w-md text-base text-primary-foreground/75">
					Create your workspace and start taking online bookings today.
				</p>
			</div>

			<ul class="space-y-5">
				{#each features as feature (feature.title)}
					<li class="flex items-start gap-4">
						<span
							class="flex size-10 shrink-0 items-center justify-center border border-primary-foreground/20 bg-primary-foreground/10"
						>
							<feature.icon class="size-5" />
						</span>
						<div>
							<p class="font-semibold">{feature.title}</p>
							<p class="text-sm text-primary-foreground/70">{feature.description}</p>
						</div>
					</li>
				{/each}
			</ul>
		</div>

		<p class="relative text-xs text-primary-foreground/60">
			© {new Date().getFullYear()} Pikslots. All rights reserved.
		</p>
	</aside>

	<!-- Form panel -->
	<main class="flex flex-col p-6 md:p-10">
		<a href={resolve('/')} class="font-code text-center text-2xl lg:hidden">Pikslots</a>

		<div class="flex flex-1 items-center justify-center py-8">
			<div class="w-full max-w-xl">
				{#if onboardingComplete}
					<div class="space-y-6 text-center">
						<div
							class="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10"
						>
							<ShieldAlert class="size-8 text-destructive" />
						</div>
						<div class="space-y-2">
							<h1 class="text-2xl font-bold">Onboarding is already complete</h1>
							<p class="text-sm text-muted-foreground">
								This workspace is already set up. Redirecting you to login...
							</p>
						</div>
						<Button variant="outline" class="w-full" onclick={() => goto(resolve('/login'))}>
							Go to login now
						</Button>
					</div>
				{:else if OnboardingStatusQuery.isPending}
					<div class="flex items-center justify-center py-24">
						<LoaderCircle class="size-8 animate-spin text-primary" />
					</div>
				{:else if isComplete}
					<div class="space-y-6 text-center">
						<div class="relative mx-auto flex size-20 items-center justify-center">
							<span class="absolute inset-0 animate-ping rounded-full bg-primary/20"></span>
							<span
								class="relative flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground"
							>
								<Check class="size-10" />
							</span>
						</div>
						<div class="space-y-2">
							<h1 class="text-3xl font-bold tracking-tight">Welcome aboard!</h1>
							<p class="text-sm text-muted-foreground">
								Your workspace is ready. Taking you to login in a few seconds...
							</p>
						</div>
						<Button class="w-full" onclick={() => goto(resolve('/login'))}>Go to login now</Button>
					</div>
				{:else}
					<div class="mb-8 space-y-2">
						<p class="text-sm font-medium text-primary dark:text-chart-1">Get started</p>
						<h1 class="text-3xl font-bold tracking-tight">Create your workspace</h1>
						<p class="text-sm text-muted-foreground">
							Set up your account and business in one go. You can change everything later.
						</p>
					</div>
					<OnboardingStep
						{values}
						onSubmit={handleSubmit}
						isSubmitting={completeOnboardingMutation.isPending}
					/>
					<p class="mt-6 text-center text-sm text-muted-foreground">
						Already set up?
						<a
							href={resolve('/login')}
							class="font-medium text-primary underline-offset-4 hover:underline dark:text-chart-1"
							>Log in</a
						>
					</p>
				{/if}
			</div>
		</div>
	</main>
</div>
