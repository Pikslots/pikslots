<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Field, FieldGroup, FieldLabel, FieldError } from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { createMutation } from '@tanstack/svelte-query';
	import type { BusinessIndustry } from '@pikslots/shared';
	import { toast } from 'svelte-sonner';
	import { superForm } from 'sveltekit-superforms';
	import { zod4 as zod } from 'sveltekit-superforms/adapters';
	import { registerBusinessMutationOptions } from '../../../../api/business/register.business.mutation';
	import { CreateBusinessFormSchema } from './validations/schema';

	let {
		refetchAllBusiness,
		open = $bindable(false)
	}: { open: boolean; refetchAllBusiness: () => void } = $props();

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

	const EMPTY_FORM = {
		businessName: '',
		slug: '',
		industry: '' as BusinessIndustry,
		defaultTimeZone: ''
	};

	const registerMutation = createMutation(registerBusinessMutationOptions);

	const {
		form: businessForm,
		errors: businessErrors,
		enhance: businessEnhance
	} = superForm(
		{ ...EMPTY_FORM },
		{
			validators: zod(CreateBusinessFormSchema),
			SPA: true,
			resetForm: false,
			onUpdate({ form }) {
				if (form.valid) {
					registerMutation.mutate({
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
		$businessForm = { ...EMPTY_FORM };
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
			<Sheet.Description>Set up a new business. You'll be its owner.</Sheet.Description>
		</Sheet.Header>

		<Separator />

		<!-- Create Business -->
		<form use:businessEnhance class="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
			<FieldGroup>
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

			<div class="border-t px-0 py-4">
				<Button type="submit" class="w-full" disabled={registerMutation.isPending}>
					{registerMutation.isPending ? 'Creating...' : 'Create Business'}
				</Button>
			</div>
		</form>
	</Sheet.Content>
</Sheet.Root>
