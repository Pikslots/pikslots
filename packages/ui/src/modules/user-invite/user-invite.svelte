<script lang="ts">
	import PikslotsLogo from '$lib/components/pikslots-logo.svelte';
	import {
		FieldGroup,
		Field,
		FieldLabel,
		FieldError,
		FieldDescription
	} from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		InputOTP,
		InputOTPGroup,
		InputOTPSlot,
		InputOTPSeparator
	} from '$lib/components/ui/input-otp/index.js';
	import { cn } from '$lib/utils.js';
	import { superForm } from 'sveltekit-superforms';
	import { zod4 as zod } from 'sveltekit-superforms/adapters';
	import { SetPasswordFormSchema, OtpFormSchema } from './validations/schema';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { isInviteExpired } from '../../utils/check.jwt';
	import { createMutation } from '@tanstack/svelte-query';
	import { requestInviteOtpMutationOptions } from '../api/user/request.invite.otp.mutation';
	import { acceptInviteMutationOptions } from '../api/user/accept.invite.mutation';
	import { toast } from 'svelte-sonner';

	let { token }: { token: string | null } = $props();
	let linkExpired = $state<boolean>(false);

	$effect(() => {
		if (!token) goto(resolve('/login'));
		if (token && isInviteExpired(token)) linkExpired = true;
	});

	let step = $state<1 | 2 | 'success'>(1);

	// ── Mutations ───────────────────────────────────────────────────────────────

	const requestOtpMutation = createMutation(requestInviteOtpMutationOptions);
	const acceptInviteMutation = createMutation(acceptInviteMutationOptions);

	$effect(() => {
		if (requestOtpMutation.isSuccess) {
			step = 2;
		}
		if (requestOtpMutation.isError) {
			toast.error(
				requestOtpMutation.error?.response?.data?.message ?? 'Failed to send OTP. Try again.'
			);
		}
	});

	$effect(() => {
		if (acceptInviteMutation.isSuccess) {
			step = 'success';
		}
		if (acceptInviteMutation.isError) {
			toast.error(
				acceptInviteMutation.error?.response?.data?.message ?? 'Invalid or expired OTP. Try again.'
			);
		}
	});

	// ── Step 1: Set Password ────────────────────────────────────────────────────

	const {
		form: passwordForm,
		errors: passwordErrors,
		enhance: passwordEnhance
	} = superForm(
		{ newPassword: '', retypeNewPassword: '' },
		{
			validators: zod(SetPasswordFormSchema),
			SPA: true,
			resetForm: false,
			onUpdate({ form }) {
				if (form.valid && token) {
					requestOtpMutation.mutate({ token });
				}
			}
		}
	);

	// ── Step 2: OTP ─────────────────────────────────────────────────────────────

	const {
		form: otpForm,
		errors: otpErrors,
		enhance: otpEnhance
	} = superForm(
		{ otp: '' },
		{
			validators: zod(OtpFormSchema),
			SPA: true,
			resetForm: false,
			onUpdate({ form }) {
				if (form.valid && token) {
					acceptInviteMutation.mutate({
						token,
						otp: form.data.otp,
						newPassword: $passwordForm.newPassword
					});
				}
			}
		}
	);

	// ── Resend countdown ────────────────────────────────────────────────────────

	const RESEND_WAIT = 60;
	let resendCountdown = $state(RESEND_WAIT);
	let countdownInterval: ReturnType<typeof setInterval> | null = null;

	function startCountdown() {
		resendCountdown = RESEND_WAIT;
		countdownInterval = setInterval(() => {
			resendCountdown -= 1;
			if (resendCountdown <= 0 && countdownInterval) {
				clearInterval(countdownInterval);
				countdownInterval = null;
			}
		}, 1000);
	}

	$effect(() => {
		if (step === 2) startCountdown();
		return () => {
			if (countdownInterval) clearInterval(countdownInterval);
		};
	});

	function resendOtp() {
		if (!token) return;
		requestOtpMutation.mutate({ token });
		startCountdown();
	}

	// ── Expired link redirect ───────────────────────────────────────────────────

	let expiredRedirectIn = $state(60);

	$effect(() => {
		if (!linkExpired) return;
		expiredRedirectIn = 60;
		const timer = setInterval(() => {
			expiredRedirectIn -= 1;
			if (expiredRedirectIn <= 0) {
				clearInterval(timer);
				goto(resolve('/login'));
			}
		}, 1000);
		return () => clearInterval(timer);
	});

	// ── Welcome redirect ────────────────────────────────────────────────────────

	let redirectIn = $state(5);

	$effect(() => {
		if (step !== 'success') return;
		redirectIn = 5;
		const timer = setInterval(() => {
			redirectIn -= 1;
			if (redirectIn <= 0) {
				clearInterval(timer);
				goto(resolve('/login'));
			}
		}, 1000);
		return () => clearInterval(timer);
	});
</script>

<div class="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
	<div class="flex w-full max-w-xs flex-col gap-6">
		<div class="flex justify-center">
			<a href="##" class="flex items-center text-2xl"><PikslotsLogo /></a>
		</div>

		<div class="w-full">
			<!-- Expired link -->
			{#if linkExpired}
				<div class="flex flex-col items-center gap-5 text-center">
					<div
						class="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="size-8"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<circle cx="12" cy="12" r="10" />
							<polyline points="12 6 12 12 16 14" />
						</svg>
					</div>
					<div class="flex flex-col gap-1">
						<h1 class="text-2xl font-bold">Invite link expired</h1>
						<p class="text-sm text-muted-foreground">
							This invite link is no longer valid. Please contact support to request a new one.
						</p>
					</div>
				</div>
			{/if}

			<!-- Steps (only when link is valid) -->
			<!-- Step 1: Set Password -->
			{#if !linkExpired && step === 1}
				<form class={cn('flex flex-col gap-6')} use:passwordEnhance>
					<FieldGroup>
						<div class="flex flex-col items-center gap-1 text-center">
							<h1 class="text-2xl font-bold">Set your password</h1>
							<p class="text-sm text-balance text-muted-foreground">
								Enter the temporary password from your invite email, then choose a new one.
							</p>
						</div>

						<Field>
							<FieldLabel>New password</FieldLabel>
							<Input
								type="password"
								placeholder="••••••••"
								bind:value={$passwordForm.newPassword}
							/>
							<FieldError errors={$passwordErrors.newPassword?.map((e) => ({ message: e }))} />
						</Field>

						<Field>
							<FieldLabel>Confirm new password</FieldLabel>
							<Input
								type="password"
								placeholder="••••••••"
								bind:value={$passwordForm.retypeNewPassword}
							/>
							<FieldError
								errors={$passwordErrors.retypeNewPassword?.map((e) => ({ message: e }))}
							/>
						</Field>
						<Field>
							<Button type="submit">Continue</Button>
						</Field>
					</FieldGroup>
				</form>
			{/if}

			<!-- Step 2: OTP Verification -->
			{#if !linkExpired && step === 2}
				<form class={cn('flex flex-col gap-6')} use:otpEnhance>
					<FieldGroup>
						<div class="flex flex-col items-center gap-1 text-center">
							<h1 class="text-2xl font-bold">Verify your identity</h1>
							<p class="text-sm text-balance text-muted-foreground">
								We sent a 6-digit code to your email. Enter it below to complete setup.
							</p>
						</div>

						<Field>
							<FieldLabel class="sr-only">One-time code</FieldLabel>
							<div class="flex justify-center">
								<InputOTP bind:value={$otpForm.otp} maxlength={6}>
									{#snippet children({ cells })}
										<InputOTPGroup>
											{#each cells.slice(0, 3) as cell, i (i)}
												<InputOTPSlot
													{cell}
													class="size-12 text-base font-semibold first:rounded-l-md last:rounded-r-md"
												/>
											{/each}
										</InputOTPGroup>
										<InputOTPSeparator />
										<InputOTPGroup>
											{#each cells.slice(3) as cell, i (i)}
												<InputOTPSlot
													{cell}
													class="size-12 text-base font-semibold first:rounded-l-md last:rounded-r-md"
												/>
											{/each}
										</InputOTPGroup>
									{/snippet}
								</InputOTP>
							</div>
							<FieldError errors={$otpErrors.otp?.map((e) => ({ message: e }))} />
						</Field>

						<Field>
							<Button type="submit" disabled={acceptInviteMutation.isPending}>
								{acceptInviteMutation.isPending ? 'Verifying…' : 'Verify & finish'}
							</Button>
						</Field>

						<FieldDescription class="text-center">
							Didn't receive a code?
							{#if resendCountdown > 0}
								<span class="text-muted-foreground">
									Resend in {resendCountdown}s
								</span>
							{:else}
								<button type="button" class="underline underline-offset-4" onclick={resendOtp}>
									Resend
								</button>
							{/if}
						</FieldDescription>

						<FieldDescription class="text-center">
							<button
								type="button"
								class="text-sm text-muted-foreground underline underline-offset-4"
								onclick={() => (step = 1)}
							>
								Back
							</button>
						</FieldDescription>
					</FieldGroup>
				</form>
			{/if}

			<!-- Success -->
			{#if !linkExpired && step === 'success'}
				<div class="flex flex-col items-center gap-5 text-center">
					<div
						class="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="size-8"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M20 6 9 17l-5-5" />
						</svg>
					</div>
					<div class="flex flex-col gap-1">
						<h1 class="text-2xl font-bold">Welcome to Pikslots!</h1>
						<p class="text-sm text-muted-foreground">
							Your account is ready. You'll be redirected to login in {redirectIn}s.
						</p>
					</div>
					<Button variant="outline" class="w-full" onclick={() => goto(resolve('/login'))}>
						Go to login now
					</Button>
				</div>
			{/if}
		</div>
	</div>
</div>
