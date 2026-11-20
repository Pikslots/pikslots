<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Field, FieldGroup, FieldLabel, FieldError } from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { createMutation, createQuery } from '@tanstack/svelte-query';
	import type { BusinessIndustry } from '@pikslots/shared';
	import { toast } from 'svelte-sonner';
	import { superForm } from 'sveltekit-superforms';
	import { zod4 as zod } from 'sveltekit-superforms/adapters';
	import { registerBusinessMutationOptions } from '../../../../api/business/register.business.mutation';
	import { inviteUserMutationOptions } from '../../../../api/user/invite.user.mutation';
	import { getUsersByRoleQueryOptions } from '../../../../api/user/get.users.by.role.query';
	import { InviteOwnerFormSchema, CreateBusinessFormSchema } from './validations/schema';

	let {
		refetchAllBusiness,
		open = $bindable(false)
	}: { open: boolean; refetchAllBusiness: () => void } = $props();

	let step = $state<1 | 2>(1);

	const businessOwnersQuery = createQuery(() => ({
		...getUsersByRoleQueryOptions({ role: 'Business Owner' }),
		enabled: open && step === 2
	}));

	const INDUSTRIES: { value: BusinessIndustry; label: string }[] = [
		{ value: 'salon_and_beauty', label: 'Salon & Beauty' },
		{ value: 'health_and_wellness', label: 'Health & Wellness' },
		{ value: 'fitness', label: 'Fitness' },
		{ value: 'medical', label: 'Medical' },
		{ value: 'education', label: 'Education' },
		{ value: 'legal', label: 'Legal' },
		{ value: 'financial', label: 'Financial' },
		{ value: 'hospitality', label: 'Hospitality' },
		{ value: 'retail', label: 'Retail' },
		{ value: 'other', label: 'Other' }
	];

	// ── Step 1 form ────────────────────────────────────────────────────────────

	const inviteMutation = createMutation(inviteUserMutationOptions);

	const {
		form: inviteForm,
		errors: inviteErrors,
		enhance: inviteEnhance
	} = superForm(
		{ firstName: '', lastName: '', username: '', email: '', phone: '' },
		{
			validators: zod(InviteOwnerFormSchema),
			SPA: true,
			resetForm: false,
			onUpdate({ form }) {
				if (form.valid) {
					inviteMutation.mutate({
						username: form.data.username,
						email: form.data.email,
						name: { firstName: form.data.firstName, lastName: form.data.lastName },
						role: 'Business Owner',
						// Placeholder: the business doesn't exist yet; registering it in step 2 reassigns the owner via USER_ASSIGN_TO_BUSINESS
						businessId: crypto.randomUUID(),
						...(form.data.phone ? { phone: form.data.phone } : {})
					});
				}
			}
		}
	);

	// ── Step 2 form ────────────────────────────────────────────────────────────

	const registerMutation = createMutation(registerBusinessMutationOptions);

	const {
		form: businessForm,
		errors: businessErrors,
		enhance: businessEnhance
	} = superForm(
		{
			ownerId: '',
			businessName: '',
			slug: '',
			industry: '' as BusinessIndustry,
			defaultTimeZone: ''
		},
		{
			validators: zod(CreateBusinessFormSchema),
			SPA: true,
			resetForm: false,
			onUpdate({ form }) {
				if (form.valid) {
					console.log(form.data);
					registerMutation.mutate({
						ownerId: form.data.ownerId,
						ownerName: `${$inviteForm.firstName} ${$inviteForm.lastName}`,
						ownerEmail: $inviteForm.email,
						slug: form.data.slug,
						name: form.data.businessName,
						industry: form.data.industry,
						...(form.data.defaultTimeZone ? { defaultTimeZone: form.data.defaultTimeZone } : {})
					});
				}
			}
		}
	);

	$effect(() => {
		if (inviteMutation.isSuccess) {
			toast.success('Business owner invited successfully');
			businessOwnersQuery.refetch();
			step = 2;
		}
		if (inviteMutation.isError) {
			toast.error(inviteMutation.error?.response?.data?.message ?? 'Failed to invite user');
		}
	});

	$effect(() => {
		if (registerMutation.isSuccess) {
			toast.success('Business created successfully');
			open = false;
			resetForm();
			refetchAllBusiness();
		}
		if (registerMutation.isError) {
			toast.error(registerMutation.error?.message ?? 'Failed to create business');
		}
	});

	function resetForm() {
		step = 1;
		$inviteForm = { firstName: '', lastName: '', username: '', email: '', phone: '' };
		$businessForm = {
			ownerId: '',
			businessName: '',
			slug: '',
			industry: '' as BusinessIndustry,
			defaultTimeZone: ''
		};
		inviteMutation.reset();
		registerMutation.reset();
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
			<Sheet.Title>New Business</Sheet.Title>
			<Sheet.Description>
				{step === 1
					? 'Invite the business owner first, then set up their business.'
					: 'Create the business and assign it to the invited owner.'}
			</Sheet.Description>
		</Sheet.Header>

		<!-- Stepper -->
		<div class="flex items-center gap-3 px-6 py-5">
			<div class="flex items-center gap-2">
				<div
					class="flex size-7 items-center justify-center rounded-full text-xs font-semibold
					{step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}"
				>
					1
				</div>
				<span
					class="text-sm font-medium {step === 1 ? 'text-foreground' : 'text-muted-foreground'}"
				>
					Invite Owner
				</span>
			</div>

			<div class="h-px flex-1 bg-border"></div>

			<div class="flex items-center gap-2">
				<div
					class="flex size-7 items-center justify-center rounded-full text-xs font-semibold
					{step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}"
				>
					2
				</div>
				<span
					class="text-sm font-medium {step === 2 ? 'text-foreground' : 'text-muted-foreground'}"
				>
					Create Business
				</span>
			</div>
		</div>

		<Separator />

		<!-- Step 1: Invite Business Owner -->
		{#if step === 1}
			<form use:inviteEnhance class="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
				<FieldGroup>
					<div class="grid grid-cols-2 gap-4">
						<Field>
							<FieldLabel>First name</FieldLabel>
							<Input bind:value={$inviteForm.firstName} placeholder="John" />
							<FieldError errors={$inviteErrors.firstName?.map((e) => ({ message: e }))} />
						</Field>
						<Field>
							<FieldLabel>Last name</FieldLabel>
							<Input bind:value={$inviteForm.lastName} placeholder="Doe" />
							<FieldError errors={$inviteErrors.lastName?.map((e) => ({ message: e }))} />
						</Field>
					</div>

					<Field>
						<FieldLabel>Username</FieldLabel>
						<Input bind:value={$inviteForm.username} placeholder="john_doe" />
						<FieldError errors={$inviteErrors.username?.map((e) => ({ message: e }))} />
					</Field>

					<Field>
						<FieldLabel>Email</FieldLabel>
						<Input bind:value={$inviteForm.email} type="email" placeholder="john@example.com" />
						<FieldError errors={$inviteErrors.email?.map((e) => ({ message: e }))} />
					</Field>

					<Field>
						<FieldLabel>
							Phone
							<span class="ml-1 text-xs text-muted-foreground">(optional)</span>
						</FieldLabel>
						<Input bind:value={$inviteForm.phone} type="tel" placeholder="+12025551234" />
						<FieldError errors={$inviteErrors.phone?.map((e) => ({ message: e }))} />
					</Field>
				</FieldGroup>

				<div class="border-t px-0 py-4">
					<Button type="submit" class="w-full" disabled={inviteMutation.isPending}>
						{inviteMutation.isPending ? 'Inviting...' : 'Invite & Continue'}
					</Button>
				</div>
			</form>
		{/if}

		<!-- Step 2: Create Business -->
		{#if step === 2}
			<form use:businessEnhance class="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
				<FieldGroup>
					<Field>
						<FieldLabel>Business owner</FieldLabel>
						<Select.Root
							type="single"
							bind:value={$businessForm.ownerId}
							disabled={businessOwnersQuery.isPending}
						>
							<Select.Trigger class="w-full">
								{#if businessOwnersQuery.isPending}
									Loading owners...
								{:else}
									{(() => {
										const u = businessOwnersQuery.data?.find((o) => o.id === $businessForm.ownerId);
										return u
											? `${u.name.firstName} ${u.name.lastName} (${u.username})`
											: 'Select a business owner';
									})()}
								{/if}
							</Select.Trigger>
							<Select.Content>
								{#each businessOwnersQuery.data ?? [] as owner (owner.id)}
									<Select.Item value={owner.id}>
										{owner.name.firstName}
										{owner.name.lastName}
										<span class="ml-1 text-xs text-muted-foreground">({owner.username})</span>
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<FieldError errors={$businessErrors.ownerId?.map((e) => ({ message: e }))} />
					</Field>

					<Field>
						<FieldLabel>Business name</FieldLabel>
						<Input bind:value={$businessForm.businessName} placeholder="Joe's Barbershop" />
						<FieldError errors={$businessErrors.businessName?.map((e) => ({ message: e }))} />
					</Field>

					<Field>
						<FieldLabel>Slug</FieldLabel>
						<Input bind:value={$businessForm.slug} placeholder="joes-barbershop" />
						<FieldError errors={$businessErrors.slug?.map((e) => ({ message: e }))} />
					</Field>

					<Field>
						<FieldLabel>Industry</FieldLabel>
						<Select.Root type="single" bind:value={$businessForm.industry}>
							<Select.Trigger class="w-full">
								{INDUSTRIES.find((i) => i.value === $businessForm.industry)?.label ??
									'Select an industry'}
							</Select.Trigger>
							<Select.Content>
								{#each INDUSTRIES as item (item.value)}
									<Select.Item value={item.value}>{item.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<FieldError errors={$businessErrors.industry?.map((e) => ({ message: e }))} />
					</Field>

					<Field>
						<FieldLabel>
							Default timezone
							<span class="ml-1 text-xs text-muted-foreground">(optional)</span>
						</FieldLabel>
						<Input bind:value={$businessForm.defaultTimeZone} placeholder="America/New_York" />
						<FieldError errors={$businessErrors.defaultTimeZone?.map((e) => ({ message: e }))} />
					</Field>
				</FieldGroup>

				<div class="flex gap-3 border-t px-0 py-4">
					<Button type="button" variant="outline" class="flex-1" onclick={() => (step = 1)}
						>Back</Button
					>
					<Button type="submit" class="flex-1" disabled={registerMutation.isPending}>
						{registerMutation.isPending ? 'Creating...' : 'Create Business'}
					</Button>
				</div>
			</form>
		{/if}
	</Sheet.Content>
</Sheet.Root>
