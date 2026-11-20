<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Field, FieldGroup, FieldLabel, FieldError } from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { createMutation } from '@tanstack/svelte-query';
	import type { UserRole } from '@pikslots/shared';
	import { toast } from 'svelte-sonner';
	import { superForm } from 'sveltekit-superforms';
	import { zod4 as zod } from 'sveltekit-superforms/adapters';
	import z from 'zod';
	import { businessStore } from '$stores/business.svelte';
	import { inviteUserMutationOptions } from '../../../api/user/invite.user.mutation';

	const ROLES = [
		'Platform Owner',
		'Business Owner',
		'Admin',
		'Enhanced',
		'Standard',
		'No Access'
	] as const satisfies UserRole[];

	const ROLE_LABELS: Record<UserRole, string> = {
		'Platform Owner': 'Platform Owner',
		'Business Owner': 'Business Owner',
		Admin: 'Admin',
		Enhanced: 'Enhanced',
		Standard: 'Standard',
		'No Access': 'No Access'
	};

	const InviteTeamMemberSchema = z.object({
		firstName: z.string().min(1, 'First name is required'),
		lastName: z.string().min(1, 'Last name is required'),
		username: z.string().min(3, 'Username must be at least 3 characters'),
		email: z.string().min(1, 'Email is required').email('Invalid email address'),
		role: z.enum(ROLES, { error: 'Please select a role' })
	});

	let { open = $bindable(false) }: { open: boolean } = $props();

	const inviteMutation = createMutation(inviteUserMutationOptions);

	const { form, errors, enhance } = superForm(
		{ firstName: '', lastName: '', username: '', email: '', role: '' as UserRole },
		{
			validators: zod(InviteTeamMemberSchema),
			SPA: true,
			resetForm: false,
			onUpdate({ form }) {
				if (form.valid) {
					const business = businessStore.selectedBusiness;
					if (!business) {
						toast.error('Select a business before inviting a team member');
						return;
					}
					inviteMutation.mutate({
						username: form.data.username,
						email: form.data.email,
						name: { firstName: form.data.firstName, lastName: form.data.lastName },
						role: form.data.role,
						businessId: business.id,
						businessName: business.name
					});
				}
			}
		}
	);

	$effect(() => {
		if (inviteMutation.isSuccess) {
			toast.success('Team member invited successfully');
			open = false;
			resetForm();
		}
		if (inviteMutation.isError) {
			toast.error(inviteMutation.error?.response?.data?.message ?? 'Failed to invite team member');
		}
	});

	function resetForm() {
		$form = { firstName: '', lastName: '', username: '', email: '', role: '' as UserRole };
		inviteMutation.reset();
	}
</script>

<Sheet.Root
	bind:open
	onOpenChange={(v) => {
		if (!v) resetForm();
	}}
>
	<Sheet.Content
		side="top"
		class="mx-auto my-12 flex w-full flex-col gap-0 sm:max-w-lg"
		interactOutsideBehavior="ignore"
		escapeKeydownBehavior="ignore"
	>
		<Sheet.Header class="px-6 pt-6">
			<Sheet.Title>Invite Team Member</Sheet.Title>
			<Sheet.Description>Send an invite to add a new member to your team.</Sheet.Description>
		</Sheet.Header>

		<Separator class="mt-5" />

		<form use:enhance class="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
			<FieldGroup>
				<div class="grid grid-cols-2 gap-4">
					<Field>
						<FieldLabel>First name</FieldLabel>
						<Input bind:value={$form.firstName} placeholder="John" />
						<FieldError errors={$errors.firstName?.map((e) => ({ message: e }))} />
					</Field>
					<Field>
						<FieldLabel>Last name</FieldLabel>
						<Input bind:value={$form.lastName} placeholder="Doe" />
						<FieldError errors={$errors.lastName?.map((e) => ({ message: e }))} />
					</Field>
				</div>

				<Field>
					<FieldLabel>Username</FieldLabel>
					<Input bind:value={$form.username} placeholder="john_doe" />
					<FieldError errors={$errors.username?.map((e) => ({ message: e }))} />
				</Field>

				<Field>
					<FieldLabel>Email</FieldLabel>
					<Input bind:value={$form.email} type="email" placeholder="john@example.com" />
					<FieldError errors={$errors.email?.map((e) => ({ message: e }))} />
				</Field>

				<Field>
					<FieldLabel>Access</FieldLabel>
					<Select.Root type="single" bind:value={$form.role}>
						<Select.Trigger class="w-full">
							{$form.role ? ROLE_LABELS[$form.role] : 'Select a role'}
						</Select.Trigger>
						<Select.Content>
							{#each ROLES as role (role)}
								<Select.Item value={role}>{ROLE_LABELS[role]}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<FieldError errors={$errors.role?.map((e) => ({ message: e }))} />
				</Field>
			</FieldGroup>

			<div class="border-t px-0 py-4">
				<Button type="submit" class="w-full cursor-pointer" disabled={inviteMutation.isPending}>
					{inviteMutation.isPending ? 'Inviting...' : 'Send Invite'}
				</Button>
			</div>
		</form>
	</Sheet.Content>
</Sheet.Root>
