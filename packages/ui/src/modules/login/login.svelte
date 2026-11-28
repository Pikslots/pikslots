<script lang="ts">
	import BrandBackdrop from '$lib/components/brand-backdrop.svelte';
	import PikslotsLogo from '$lib/components/pikslots-logo.svelte';
	import { brandSurfaceClass, timeQuotes } from '$lib/brand/brand';
	import {
		FieldGroup,
		Field,
		FieldLabel,
		FieldDescription,
		FieldError,
		FieldSeparator
	} from '$lib/components/ui/field/index.js';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';
	import { fade } from 'svelte/transition';
	import { ArrowRight, Eye, EyeOff, LoaderCircle, Lock, Quote, UserRound } from '@lucide/svelte';
	import { createMutation, createQuery } from '@tanstack/svelte-query';
	import { loginUser } from '../api/user/login.user.mutation';
	import { GetOnboardingStatusQueryOptions } from '../api/onboarding/get.onboarding.status.query';
	import { getCurrentSession } from '../api/session/get.current.session.query';
	import type { BaseErrorResponse, LoginUserInput, LoginUserResponse } from '@pikslots/shared';
	import type { AxiosError } from 'axios';
	import { toast } from 'svelte-sonner';
	import { authStore } from '$stores/auth.svelte.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { superForm } from 'sveltekit-superforms';
	import { zod4 as zod } from 'sveltekit-superforms/adapters';
	import { LoginUserFormSchema } from './validations/schema';
	import { getDeviceInfo } from './utils/device-info';

	const quotes = timeQuotes;

	let quoteIndex = $state(Math.floor(Math.random() * quotes.length));
	const quote = $derived(quotes[quoteIndex]);

	$effect(() => {
		const timer = setInterval(() => {
			quoteIndex = (quoteIndex + 1) % quotes.length;
		}, 7000);
		return () => clearInterval(timer);
	});

	let showPassword = $state(false);

	const loginMutation = createMutation<
		LoginUserResponse,
		AxiosError<BaseErrorResponse>,
		LoginUserInput
	>(() => ({
		mutationFn: loginUser
	}));

	const onboardingStatusQuery = createQuery(GetOnboardingStatusQueryOptions);

	// Nobody can log in before the platform owner exists, so send first-time setups to onboarding
	$effect(() => {
		if (onboardingStatusQuery.isFetching) return;
		if (onboardingStatusQuery.data?.isOnboardingComplete === false) {
			goto(resolve('/onboarding'), { replaceState: true });
		}
	});

	const { form, errors, enhance } = superForm(
		{ userNameOrEmail: '', password: '' },
		{
			validators: zod(LoginUserFormSchema),
			SPA: true,
			resetForm: false,
			onUpdate({ form }) {
				if (form.valid) {
					const { os, browser, country } = getDeviceInfo();
					loginMutation.mutate({
						usernameOrEmail: form.data.userNameOrEmail,
						password: form.data.password,
						os,
						browser,
						country
					});
				}
			}
		}
	);

	$effect(() => {
		if (authStore.isAuthenticated) {
			goto(resolve('/home'));
			return;
		}

		if (loginMutation.data) {
			getCurrentSession()
				.then((session) => {
					authStore.setSession(session);
				})
				.catch(() => {
					toast.error('Something went wrong. Please try again.');
				});
		}
		if (loginMutation.isError) {
			console.log(loginMutation.error.response?.data.message);
			toast.error(
				loginMutation.error?.response?.data?.message ?? 'Login failed. Please try again.'
			);
		}
	});
</script>

<div class="grid min-h-svh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
	<!-- Brand panel -->
	<aside
		class="{brandSurfaceClass} hidden lg:flex lg:flex-col lg:justify-between lg:p-12 dark:border-r"
	>
		<BrandBackdrop />

		<a href={resolve('/')} class="relative w-fit text-2xl"><PikslotsLogo tone="inherit" /></a>

		<div class="relative max-w-lg space-y-8">
			<Quote class="size-10 text-primary-foreground/40" />
			<div class="grid min-h-48 items-end">
				{#key quoteIndex}
					<div
						class="col-start-1 row-start-1 space-y-6"
						in:fade={{ duration: 500, delay: 250 }}
						out:fade={{ duration: 250 }}
					>
						<blockquote
							class="text-3xl leading-snug font-semibold tracking-tight text-balance xl:text-4xl"
						>
							{quote.text}
						</blockquote>
						<p class="text-sm text-primary-foreground/70">— {quote.author}</p>
					</div>
				{/key}
			</div>
			<div class="flex gap-2">
				{#each quotes as item, i (item.author)}
					<button
						type="button"
						aria-label={`Show quote ${i + 1}`}
						class="h-1 transition-all duration-300 {i === quoteIndex
							? 'w-8 bg-primary-foreground'
							: 'w-4 bg-primary-foreground/30 hover:bg-primary-foreground/60'}"
						onclick={() => (quoteIndex = i)}
					></button>
				{/each}
			</div>
		</div>

		<p class="relative text-xs text-primary-foreground/60">
			© {new Date().getFullYear()} Pikslots. All rights reserved.
		</p>
	</aside>

	<!-- Form panel -->
	<main class="flex flex-col p-6 md:p-10">
		<a href={resolve('/')} class="flex justify-center text-2xl lg:hidden"><PikslotsLogo /></a>

		<div class="flex flex-1 items-center justify-center py-8">
			<div class="w-full max-w-sm">
				<form class={cn('flex flex-col gap-6')} use:enhance>
					<FieldGroup>
						<div class="space-y-2">
							<p class="text-sm font-medium text-primary dark:text-chart-1">Welcome back</p>
							<h1 data-testid="login-heading" class="text-3xl font-bold tracking-tight">
								Login to your account
							</h1>
							<p data-testid="login-paragraph" class="text-sm text-balance text-muted-foreground">
								Enter your email below to login to your account
							</p>
						</div>

						<Field>
							<FieldLabel for="userNameOrEmail">Username or Email</FieldLabel>
							<InputGroup.Root>
								<InputGroup.Addon><UserRound /></InputGroup.Addon>
								<InputGroup.Input
									data-testid="email"
									id="userNameOrEmail"
									name="userNameOrEmail"
									type="text"
									placeholder="m@example.com"
									bind:value={$form.userNameOrEmail}
								/>
							</InputGroup.Root>
							<FieldError
								data-testid="email-error"
								errors={$errors.userNameOrEmail?.map((e) => ({ message: e }))}
							/>
						</Field>

						<Field>
							<div class="flex items-center">
								<FieldLabel for="password">Password</FieldLabel>
								<a
									href="##"
									class="ms-auto text-xs text-primary underline-offset-4 hover:underline dark:text-chart-1"
								>
									Forgot your password?
								</a>
							</div>
							<InputGroup.Root>
								<InputGroup.Addon><Lock /></InputGroup.Addon>
								<InputGroup.Input
									data-testid="password"
									id="password"
									name="password"
									type={showPassword ? 'text' : 'password'}
									placeholder="••••••••"
									bind:value={$form.password}
								/>
								<InputGroup.Addon align="inline-end">
									<InputGroup.Button
										size="icon-xs"
										aria-label={showPassword ? 'Hide password' : 'Show password'}
										onclick={() => (showPassword = !showPassword)}
									>
										{#if showPassword}<EyeOff />{:else}<Eye />{/if}
									</InputGroup.Button>
								</InputGroup.Addon>
							</InputGroup.Root>
							<FieldError
								data-testid="password-error"
								errors={$errors.password?.map((e) => ({ message: e }))}
							/>
						</Field>

						<Field>
							<Button
								data-testid="login-btn"
								type="submit"
								size="lg"
								disabled={loginMutation.isPending ||
									!$form.userNameOrEmail.trim() ||
									!$form.password.trim()}
								class="w-full disabled:cursor-not-allowed disabled:opacity-50"
							>
								{#if loginMutation.isPending}
									<LoaderCircle class="animate-spin" />
									Please wait...
								{:else}
									Login
									<ArrowRight />
								{/if}
							</Button>
						</Field>

						<FieldSeparator>Or no account 👇🏻</FieldSeparator>

						<Field>
							<FieldDescription class="text-center">
								Don't have an account?
								<a href="##" class="underline underline-offset-4">Sign up</a>
							</FieldDescription>
						</Field>
					</FieldGroup>
				</form>
			</div>
		</div>
	</main>
</div>
