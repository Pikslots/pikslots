<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Field, FieldGroup, FieldLabel, FieldError } from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { SvelteSet } from 'svelte/reactivity';
	import { toast } from 'svelte-sonner';
	import { superForm } from 'sveltekit-superforms';
	import { zod4 as zod } from 'sveltekit-superforms/adapters';
	import { businessStore } from '$stores/business.svelte';
	import { editCustomerMutationOptions } from '../../api/customer/edit.customer.mutation';
	import type { CustomerModel } from '../../api/customer/models/customer-model';
	import { AddCustomerSchema } from '../validations/add-customer-schema';
	import AddCustomerProfileImage from './add-customer-profile-image.svelte';
	import { uploadAvatarMutationOptions } from '../../api/s3/upload.avatar.mutation';
	import { UpdateCustomerProfileImageMutationOptions } from '../../api/customer/update.customer.profile.image.mutation';
	import XIcon from '@lucide/svelte/icons/x';
	import { UserRoundPen } from '@lucide/svelte';
	import UserIcon from '@tabler/icons-svelte/icons/user';
	import Plus from '@tabler/icons-svelte/icons/plus';
	import Phone from '@tabler/icons-svelte/icons/phone';
	import Mail from '@tabler/icons-svelte/icons/mail';
	import World from '@tabler/icons-svelte/icons/world';
	import BrandInstagram from '@tabler/icons-svelte/icons/brand-instagram';
	import BrandFacebook from '@tabler/icons-svelte/icons/brand-facebook';
	import BrandX from '@tabler/icons-svelte/icons/brand-x';
	import BrandYoutube from '@tabler/icons-svelte/icons/brand-youtube';
	import BrandLinkedin from '@tabler/icons-svelte/icons/brand-linkedin';

	//____var____________________________
	const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
	const MAX_SIZE_MB = 10;

	const COUNTRY_CODES = [
		{ code: '+1', country: 'US' },
		{ code: '+44', country: 'GB' },
		{ code: '+92', country: 'PK' },
		{ code: '+91', country: 'IN' },
		{ code: '+61', country: 'AU' },
		{ code: '+49', country: 'DE' },
		{ code: '+33', country: 'FR' },
		{ code: '+971', country: 'AE' },
		{ code: '+966', country: 'SA' }
	] as const;

	const COUNTRIES = [
		'Afghanistan',
		'Albania',
		'Algeria',
		'Argentina',
		'Australia',
		'Austria',
		'Bangladesh',
		'Belgium',
		'Brazil',
		'Canada',
		'China',
		'Denmark',
		'Egypt',
		'Ethiopia',
		'Finland',
		'France',
		'Germany',
		'Ghana',
		'Greece',
		'Hungary',
		'India',
		'Indonesia',
		'Iran',
		'Iraq',
		'Ireland',
		'Israel',
		'Italy',
		'Japan',
		'Jordan',
		'Kenya',
		'Malaysia',
		'Mexico',
		'Morocco',
		'Netherlands',
		'New Zealand',
		'Nigeria',
		'Norway',
		'Pakistan',
		'Philippines',
		'Poland',
		'Portugal',
		'Qatar',
		'Romania',
		'Russia',
		'Saudi Arabia',
		'Singapore',
		'South Africa',
		'South Korea',
		'Spain',
		'Sweden',
		'Switzerland',
		'Thailand',
		'Turkey',
		'Ukraine',
		'United Arab Emirates',
		'United Kingdom',
		'United States',
		'Vietnam'
	] as const;

	type ExtraField =
		| 'profileImageUrl'
		| 'phone'
		| 'email'
		| 'website'
		| 'instagram'
		| 'facebook'
		| 'x'
		| 'youtube'
		| 'linkedin';

	const ADD_ITEMS: { key: ExtraField; label: string; icon: typeof Phone }[] = [
		{ key: 'phone', label: 'Phone', icon: Phone },
		{ key: 'email', label: 'Email', icon: Mail },
		{ key: 'website', label: 'Website', icon: World },
		{ key: 'instagram', label: 'Instagram', icon: BrandInstagram },
		{ key: 'facebook', label: 'Facebook', icon: BrandFacebook },
		{ key: 'x', label: 'X', icon: BrandX },
		{ key: 'youtube', label: 'YouTube', icon: BrandYoutube },
		{ key: 'linkedin', label: 'LinkedIn', icon: BrandLinkedin }
	];

	let { open = $bindable(false), customer }: { open: boolean; customer: CustomerModel } = $props();

	// Parse a stored phone string (e.g. "+92 300 1234567") into code + number
	function parsePhone(phone: string | null): { code: string; number: string } {
		if (!phone) return { code: '+92', number: '' };
		const known = COUNTRY_CODES.map((c) => c.code).sort((a, b) => b.length - a.length);
		for (const code of known) {
			if (phone.startsWith(code)) {
				return { code, number: phone.slice(code.length).trim() };
			}
		}
		return { code: '+92', number: phone };
	}

	// Derive initial extra fields from existing customer data
	function initialExtraFields(c: CustomerModel): Set<ExtraField> {
		const fields = new SvelteSet<ExtraField>();
		if (c.additionalPhone) fields.add('phone');
		if (c.profileImageUrl) fields.add('profileImageUrl');
		if (c.additionalEmail) fields.add('email');
		const links = c.customerSocialLinks ?? {};
		if (links['website']) fields.add('website');
		if (links['instagram']) fields.add('instagram');
		if (links['facebook']) fields.add('facebook');
		if (links['x']) fields.add('x');
		if (links['youtube']) fields.add('youtube');
		if (links['linkedin']) fields.add('linkedin');
		return fields;
	}

	function buildFormValues(c: CustomerModel) {
		const { code, number } = parsePhone(c.primaryPhone);
		const links = c.customerSocialLinks ?? {};
		return {
			firstName: c.firstName,
			lastName: c.lastName,
			countryCode: code,
			phone: number,
			profileImage: c.profileImageUrl,
			email: c.email ?? '',
			company: c.company ?? '',
			country: c.country ?? 'Pakistan',
			address: c.address ?? '',
			city: c.city ?? '',
			state: c.state ?? '',
			zipCode: c.zipCode ?? '',
			additionalPhone: c.additionalPhone ?? '',
			additionalEmail: c.additionalEmail ?? '',
			website: links['website'] ?? '',
			instagram: links['instagram'] ?? '',
			facebook: links['facebook'] ?? '',
			x: links['x'] ?? '',
			youtube: links['youtube'] ?? '',
			linkedin: links['linkedin'] ?? ''
		};
	}

	let extraFields = $state<Set<ExtraField>>(new Set());
	let customerProfileImageDialog = $state<boolean>(false);
	let imageFile = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);
	let fileInput: HTMLInputElement | undefined = $state();

	const queryClient = useQueryClient();
	const editMutation = createMutation(() => editCustomerMutationOptions());
	const uploadMutation = createMutation(() => uploadAvatarMutationOptions());
	const updateCustomerProfileMutation = createMutation(() =>
		UpdateCustomerProfileImageMutationOptions()
	);

	// Seed value; re-synced by the effect below on customer change
	// svelte-ignore state_referenced_locally
	const { form, errors, enhance } = superForm(buildFormValues(customer), {
		validators: zod(AddCustomerSchema),
		SPA: true,
		resetForm: false,
		onUpdate: async ({ form }) => {
			if (form.valid && businessStore.selectedBusiness) {
				let avatarKey = customer.profileImageUrl ?? '';
				const phone = form.data.phone ? `${form.data.countryCode} ${form.data.phone}` : null;
				const socialLinks: Record<string, string> = {};
				if (form.data.website) socialLinks['website'] = form.data.website;
				if (form.data.instagram) socialLinks['instagram'] = form.data.instagram;
				if (form.data.facebook) socialLinks['facebook'] = form.data.facebook;
				if (form.data.x) socialLinks['x'] = form.data.x;
				if (form.data.youtube) socialLinks['youtube'] = form.data.youtube;
				if (form.data.linkedin) socialLinks['linkedin'] = form.data.linkedin;

				if (imageFile && businessStore.selectedBusiness?.slug) {
					avatarKey = await uploadMutation.mutateAsync({
						folder: 'customer',
						file: imageFile,
						businessSlug: businessStore.selectedBusiness.slug,
						type: 'profile_image',
						id: customer.id ?? null
					});

					await updateCustomerProfileMutation.mutateAsync({
						customerId: customer.id,
						profileImageKey: avatarKey
					});
				}

				editMutation.mutate({
					id: customer.id,
					firstName: form.data.firstName,
					lastName: form.data.lastName,
					profileImageUrl: avatarKey,
					email: form.data.email || null,
					additionalEmail: form.data.additionalEmail || null,
					primaryPhone: phone,
					additionalPhone: form.data.additionalPhone || null,
					company: form.data.company || null,
					country: form.data.country || null,
					address: form.data.address || null,
					city: form.data.city || null,
					state: form.data.state || null,
					zipCode: form.data.zipCode || null,
					notes: customer.notes,
					customerSocialLinks: socialLinks,
					businessId: businessStore.selectedBusiness.id
				});
			}
		}
	});

	// Re-populate when the customer prop changes (different customer selected)
	$effect(() => {
		$form = buildFormValues(customer);
		extraFields = initialExtraFields(customer);
	});

	$effect(() => {
		if (editMutation.isSuccess) {
			toast.success('Customer updated successfully');
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl as string);
			}
			queryClient.invalidateQueries({
				queryKey: ['customers', businessStore.selectedBusiness?.id]
			});
			queryClient.invalidateQueries({ queryKey: ['customer', customer.id] });
			open = false;
		}

		if (editMutation.isError) {
			toast.error(editMutation.error?.response?.data?.message ?? 'Failed to update customer');
		}
	});

	function addField(key: ExtraField) {
		extraFields = new Set([...extraFields, key]);
	}

	function handleImageChange(e: Event) {
		const target = (e.target as HTMLInputElement).files?.[0];
		if (!target) return;

		if (!ACCEPTED_TYPES.includes(target.type)) {
			toast.error('Only JPG, JPEG and PNG files are allowed');
			return;
		}
		if (target.size > MAX_SIZE_MB * 1024 * 1024) {
			toast.error(`File must be under ${MAX_SIZE_MB}MB`);
			return;
		}

		if (previewUrl) URL.revokeObjectURL(previewUrl);
		imageFile = target;
		previewUrl = URL.createObjectURL(target);
		customerProfileImageDialog = true;
	}

	const initials = $derived($form.firstName ? $form.firstName.charAt(0).toUpperCase() : null);
	const isSaving = $derived(
		uploadMutation.isPending || updateCustomerProfileMutation.isPending || editMutation.isPending
	);
</script>

<Dialog.Root
	bind:open
	onOpenChange={(v) => {
		if (!v) {
			editMutation.reset();
			imageFile = null;
			if (previewUrl) URL.revokeObjectURL(previewUrl);
			previewUrl = null;
		}
	}}
>
	<Dialog.Content
		class="flex max-h-[92svh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
		showCloseButton={false}
	>
		<!-- Add profile image dialog -->
		<AddCustomerProfileImage
			bind:open={customerProfileImageDialog}
			bind:previewUrl
			initialFile={imageFile}
			onSave={(file) => (imageFile = file)}
			onClose={() => {
				imageFile = null;
			}}
		/>
		<!-- Header -->
		<div class="flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
			<div class="flex min-w-0 items-center gap-3">
				<span
					class="flex size-9 shrink-0 items-center justify-center bg-primary/10 text-primary dark:bg-primary/30 dark:text-chart-1"
				>
					<UserRoundPen class="size-4.5" />
				</span>
				<div class="min-w-0">
					<Dialog.Title class="text-base font-semibold">Edit customer</Dialog.Title>
					<Dialog.Description class="text-xs text-muted-foreground"
						>Keep their contact details up to date</Dialog.Description
					>
				</div>
			</div>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button variant="ghost" size="icon-sm" {...props}>
						<XIcon />
						<span class="sr-only">Close</span>
					</Button>
				{/snippet}
			</Dialog.Close>
		</div>

		<Separator />

		<!-- Body -->
		<div class="flex min-h-0 flex-1 flex-col overflow-y-auto sm:flex-row sm:overflow-hidden">
			<!-- Left panel -->
			<div
				class="flex shrink-0 flex-col border-b bg-muted/20 py-4 sm:w-52 sm:border-r sm:border-b-0 sm:pt-6"
			>
				<div class="flex justify-center px-4 pb-4">
					{#if imageFile}
						<Button
							class="size-18 shrink-0 cursor-pointer rounded-full bg-transparent p-0"
							onclick={() => fileInput?.click()}
						>
							<img
								src={previewUrl}
								alt="customerImage"
								class="h-full w-full cursor-pointer rounded-full object-cover opacity-60 hover:opacity-100"
							/>
						</Button>
						<input
							bind:this={fileInput}
							type="file"
							accept=".jpg,.jpeg,.png"
							class="hidden"
							onchange={handleImageChange}
						/>
					{:else if customer.profileImageUrl}
						<Button
							class="size-18 shrink-0 cursor-pointer rounded-full bg-transparent p-0"
							onclick={() => fileInput?.click()}
						>
							<img
								src={customer.profileImageUrl}
								alt="customerImage"
								class="h-full w-full cursor-pointer rounded-full object-cover opacity-60 hover:opacity-100"
							/>
						</Button>
						<input
							bind:this={fileInput}
							type="file"
							accept=".jpg,.jpeg,.png"
							class="hidden"
							onchange={handleImageChange}
						/>
					{:else}
						<Avatar.Root
							class="size-16 cursor-pointer text-base opacity-60 hover:opacity-100"
							onclick={() => fileInput?.click()}
						>
							{#if initials}
								<Avatar.Fallback class="text-lg">{initials}</Avatar.Fallback>
							{:else}
								<Avatar.Fallback class="bg-muted">
									<UserIcon class="size-7 text-muted-foreground" />
								</Avatar.Fallback>
							{/if}
						</Avatar.Root>

						<input
							bind:this={fileInput}
							type="file"
							accept=".jpg,.jpeg,.png"
							class="hidden"
							onchange={handleImageChange}
						/>
					{/if}
				</div>

				<p class="-mt-1 text-center text-xs text-muted-foreground">Tap to change photo</p>
				<div class="mt-4 hidden px-2 sm:block">
					<div class="flex items-center gap-2 rounded-none bg-muted px-3 py-2 text-sm font-medium">
						<UserIcon class="size-4" />
						Profile
					</div>
				</div>
			</div>

			<!-- Right panel (form) -->
			<form use:enhance class="flex flex-1 flex-col sm:min-h-0 sm:overflow-hidden">
				<div class="flex-1 px-4 py-5 sm:overflow-y-auto sm:px-6">
					<FieldGroup>
						<!-- First / Last name -->
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<Field>
								<FieldLabel>First name</FieldLabel>
								<Input bind:value={$form.firstName} placeholder="Enter first name" />
								<FieldError errors={$errors.firstName?.map((e) => ({ message: e }))} />
							</Field>
							<Field>
								<FieldLabel>Last name</FieldLabel>
								<Input bind:value={$form.lastName} placeholder="Enter last name" />
								<FieldError errors={$errors.lastName?.map((e) => ({ message: e }))} />
							</Field>
						</div>

						<!-- Primary phone -->
						<Field>
							<FieldLabel>Primary phone</FieldLabel>
							<InputGroup.Root>
								<Select.Root type="single" bind:value={$form.countryCode}>
									<Select.Trigger
										class="w-20 shrink-0 rounded-none border-0 border-r shadow-none focus:ring-0"
									>
										{$form.countryCode}
									</Select.Trigger>
									<Select.Content>
										{#each COUNTRY_CODES as cc (cc.code)}
											<Select.Item value={cc.code}>{cc.code} {cc.country}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
								<InputGroup.Input bind:value={$form.phone} placeholder="Enter phone number" />
							</InputGroup.Root>
							<FieldError errors={$errors.phone?.map((e) => ({ message: e }))} />
						</Field>

						<!-- Primary email -->
						<Field>
							<FieldLabel>Primary email</FieldLabel>
							<Input bind:value={$form.email} type="email" placeholder="Enter email address" />
							<FieldError errors={$errors.email?.map((e) => ({ message: e }))} />
						</Field>

						<!-- Company -->
						<Field>
							<FieldLabel>Company</FieldLabel>
							<Input bind:value={$form.company} placeholder="Enter company name" />
							<FieldError errors={$errors.company?.map((e) => ({ message: e }))} />
						</Field>
					</FieldGroup>

					<Separator class="my-5" />

					<!-- Address section -->
					<p class="mb-4 text-sm font-semibold">Address</p>

					<FieldGroup>
						<!-- Country -->
						<Field>
							<FieldLabel>Country</FieldLabel>
							<Select.Root type="single" bind:value={$form.country}>
								<Select.Trigger class="w-full">
									{$form.country || 'Select country'}
								</Select.Trigger>
								<Select.Content class="max-h-60">
									{#each COUNTRIES as country (country)}
										<Select.Item value={country}>{country}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
							<FieldError errors={$errors.country?.map((e) => ({ message: e }))} />
						</Field>

						<!-- Address -->
						<Field>
							<FieldLabel>Address</FieldLabel>
							<Input
								bind:value={$form.address}
								placeholder="Enter street name, apt, suite, floor"
							/>
							<FieldError errors={$errors.address?.map((e) => ({ message: e }))} />
						</Field>

						<!-- City -->
						<Field>
							<FieldLabel>City</FieldLabel>
							<Input bind:value={$form.city} placeholder="Enter city" />
							<FieldError errors={$errors.city?.map((e) => ({ message: e }))} />
						</Field>

						<!-- State + Zip -->
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<Field>
								<FieldLabel>State</FieldLabel>
								<Input bind:value={$form.state} placeholder="Select state" />
								<FieldError errors={$errors.state?.map((e) => ({ message: e }))} />
							</Field>
							<Field>
								<FieldLabel>Zip code</FieldLabel>
								<Input bind:value={$form.zipCode} placeholder="Enter code" />
								<FieldError errors={$errors.zipCode?.map((e) => ({ message: e }))} />
							</Field>
						</div>
					</FieldGroup>

					<!-- Extra fields -->
					{#if extraFields.size > 0}
						<Separator class="my-5" />
						<FieldGroup>
							{#if extraFields.has('phone')}
								<Field>
									<FieldLabel>Additional phone</FieldLabel>
									<Input bind:value={$form.additionalPhone} placeholder="Enter phone number" />
									<FieldError errors={$errors.additionalPhone?.map((e) => ({ message: e }))} />
								</Field>
							{/if}
							{#if extraFields.has('email')}
								<Field>
									<FieldLabel>Additional email</FieldLabel>
									<Input
										bind:value={$form.additionalEmail}
										type="email"
										placeholder="Enter email address"
									/>
									<FieldError errors={$errors.additionalEmail?.map((e) => ({ message: e }))} />
								</Field>
							{/if}
							{#if extraFields.has('website')}
								<Field>
									<FieldLabel>Website</FieldLabel>
									<Input bind:value={$form.website} placeholder="https://example.com" />
								</Field>
							{/if}
							{#if extraFields.has('instagram')}
								<Field>
									<FieldLabel>Instagram</FieldLabel>
									<Input bind:value={$form.instagram} placeholder="@username" />
								</Field>
							{/if}
							{#if extraFields.has('facebook')}
								<Field>
									<FieldLabel>Facebook</FieldLabel>
									<Input bind:value={$form.facebook} placeholder="Profile URL or username" />
								</Field>
							{/if}
							{#if extraFields.has('x')}
								<Field>
									<FieldLabel>X</FieldLabel>
									<Input bind:value={$form.x} placeholder="@username" />
								</Field>
							{/if}
							{#if extraFields.has('youtube')}
								<Field>
									<FieldLabel>YouTube</FieldLabel>
									<Input bind:value={$form.youtube} placeholder="Channel URL" />
								</Field>
							{/if}
							{#if extraFields.has('linkedin')}
								<Field>
									<FieldLabel>LinkedIn</FieldLabel>
									<Input bind:value={$form.linkedin} placeholder="Profile URL or username" />
								</Field>
							{/if}
						</FieldGroup>
					{/if}
				</div>

				<!-- Footer -->
				<div
					class="sticky bottom-0 flex flex-wrap items-center gap-y-2 border-t bg-popover px-4 py-3 sm:px-6"
				>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button
									variant="ghost"
									size="sm"
									type="button"
									class="gap-1.5 text-muted-foreground"
									{...props}
								>
									<Plus class="size-4" />
									Add
								</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="start" class="w-44">
							{#each ADD_ITEMS as item (item.key)}
								{#if !extraFields.has(item.key)}
									<DropdownMenu.Item
										class="cursor-pointer gap-2"
										onclick={() => addField(item.key)}
									>
										<item.icon class="size-4" />
										{item.label}
									</DropdownMenu.Item>
								{/if}
							{/each}
						</DropdownMenu.Content>
					</DropdownMenu.Root>

					<div class="ml-auto flex items-center gap-2">
						<Button variant="ghost" size="sm" type="button" onclick={() => (open = false)}>
							Cancel
						</Button>
						<Button size="sm" type="submit" disabled={isSaving}>
							{isSaving ? 'Saving...' : 'Save'}
						</Button>
					</div>
				</div>
			</form>
		</div>
	</Dialog.Content>
</Dialog.Root>
