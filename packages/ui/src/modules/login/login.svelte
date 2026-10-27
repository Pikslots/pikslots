<script lang="ts">
	import {
		FieldGroup,
		Field,
		FieldLabel,
		FieldDescription,
		FieldError,
		FieldSeparator
	} from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';
	import loginImage from '$lib/assets/login-image.jpg';
	import { createMutation } from '@tanstack/svelte-query';
	import { loginUser } from '../api/user/login.user.mutation';
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

	const loginMutation = createMutation<
		LoginUserResponse,
		AxiosError<BaseErrorResponse>,
		LoginUserInput
	>(() => ({
		mutationFn: loginUser
	}));

	const { form, errors, enhance } = superForm(
		{ userNameOrEmail: '', password: '' },
		{
			validators: zod(LoginUserFormSchema),
			SPA: true,
			resetForm: false,
			onUpdate({ form }) {
				if (form.valid) {
					loginMutation.mutate({
						usernameOrEmail: form.data.userNameOrEmail,
						password: form.data.password
					});
				}
			}
		}
	);

	$effect(() => {
		if (authStore.isAuthenticated) goto(resolve('/home'));

		if (loginMutation.data) {
			getCurrentSession()
				.then((session) => {
					authStore.setSession(session);
					goto(resolve('/home'));
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

<div class="grid min-h-svh lg:grid-cols-2">
	<div class="flex flex-col gap-4 p-6 md:p-10">
		<div class="flex justify-center gap-2 md:justify-start">
			<a href="/" class="font-code flex items-center gap-2 text-2xl">Pikslots</a>
		</div>
		<div class="flex flex-1 items-center justify-center">
			<div class="w-full max-w-xs">
				<form class={cn('flex flex-col gap-6')} use:enhance>
					<FieldGroup>
						<div class="flex flex-col items-center gap-1 text-center">
							<h1 data-testid="login-heading" class="text-2xl font-bold">Login to your account</h1>
							<p data-testid="login-paragraph" class="text-sm text-balance text-muted-foreground">
								Enter your email below to login to your account
							</p>
						</div>

						<Field>
							<FieldLabel for="userNameOrEmail">Username or Email</FieldLabel>
							<Input
								data-testid="email"
								id="userNameOrEmail"
								name="userNameOrEmail"
								type="text"
								placeholder="m@example.com"
								bind:value={$form.userNameOrEmail}
							/>
							<FieldError
								data-testid="email-error"
								errors={$errors.userNameOrEmail?.map((e) => ({ message: e }))}
							/>
						</Field>

						<Field>
							<div class="flex items-center">
								<FieldLabel for="password">Password</FieldLabel>
								<a href="##" class="ms-auto text-sm underline-offset-4 hover:underline">
									Forgot your password?
								</a>
							</div>
							<Input
								data-testid="password"
								id="password"
								name="password"
								type="password"
								bind:value={$form.password}
							/>
							<FieldError
								data-testid="password-error"
								errors={$errors.password?.map((e) => ({ message: e }))}
							/>
						</Field>

						<Field>
							<Button
								data-testid="login-btn"
								type="submit"
								disabled={loginMutation.isPending ||
									!$form.userNameOrEmail.trim() ||
									!$form.password.trim()}
								class="disabled:cursor-not-allowed disabled:opacity-50"
							>
								{loginMutation.isPending ? 'Please wait...' : 'Login'}
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
	</div>
	<div class="relative hidden bg-muted lg:block">
		<img
			src={loginImage}
			alt="placeholder"
			class="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
		/>
	</div>
</div>
