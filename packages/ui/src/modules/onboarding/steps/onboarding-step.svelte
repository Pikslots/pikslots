<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4 as zod } from 'sveltekit-superforms/adapters';
	import { onboardingSchema, industries, type OnboardingFormValues } from '../utils/schema';
	import { getTimezones, timezoneLabel } from '../utils/timezone';
	import { untrack } from 'svelte';
	import { FieldGroup, Field, FieldLabel, FieldError } from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import Select from '$lib/components/ui/select/select.svelte';
	import SelectTrigger from '$lib/components/ui/select/select-trigger.svelte';
	import SelectContent from '$lib/components/ui/select/select-content.svelte';
	import SelectItem from '$lib/components/ui/select/select-item.svelte';
	import SelectGroup from '$lib/components/ui/select/select-group.svelte';
	import SelectGroupHeading from '$lib/components/ui/select/select-group-heading.svelte';
	import {
		ArrowRight,
		AtSign,
		Briefcase,
		Building2,
		Clock,
		Eye,
		EyeOff,
		Globe,
		LoaderCircle,
		Lock,
		Mail,
		Phone,
		UserRound
	} from '@lucide/svelte';

	let {
		values,
		onSubmit,
		isSubmitting = false
	}: {
		values: OnboardingFormValues;
		onSubmit: () => Promise<void> | void;
		isSubmitting?: boolean;
	} = $props();

	const timezones = getTimezones();

	const form = superForm<OnboardingFormValues>(
		untrack(() => ({ ...values })),
		{
			SPA: true,
			validators: zod(onboardingSchema),
			onSubmit: async ({ cancel }) => {
				const result = await form.validateForm({ update: true });
				if (!result.valid) {
					cancel();
					return;
				}
				Object.assign(values, result.data);
				await onSubmit();
			}
		}
	);

	const { form: formData, errors, enhance, submitting } = form;

	const isBusy = $derived($submitting || isSubmitting);

	let showPassword = $state(false);
	let slugEdited = $state(false);

	let timezoneOpen = $state(false);
	let tzSearch = $state('');
	let tzSearchInput = $state<HTMLInputElement | null>(null);

	const filteredTimezones = $derived.by(() => {
		const query = tzSearch.trim().toLowerCase();
		if (!query) return timezones;
		return timezones.filter(
			(tz) => tz.toLowerCase().includes(query) || timezoneLabel(tz).toLowerCase().includes(query)
		);
	});

	$effect(() => {
		if (!timezoneOpen) {
			tzSearch = '';
			return;
		}
		setTimeout(() => tzSearchInput?.focus(), 1);
	});

	function slugify(value: string): string {
		return value
			.toLowerCase()
			.trim()
			.replace(/\s+/g, '-')
			.replace(/[^a-z0-9-]/g, '')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '');
	}

	function syncSlug() {
		if (slugEdited) return;
		const slug = slugify($formData.name);
		formData.update((data) => ({ ...data, slug }));
	}
</script>

{#snippet sectionHeading(step: number, title: string, description: string)}
	<div class="flex items-start gap-3">
		<span
			class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
		>
			{step}
		</span>
		<div>
			<h3 class="text-sm font-semibold">{title}</h3>
			<p class="text-xs text-muted-foreground">{description}</p>
		</div>
	</div>
{/snippet}

<form method="POST" use:enhance class="flex flex-col gap-6">
	<FieldGroup class="gap-5">
		{@render sectionHeading(1, 'Your account', "You'll use these details to sign in")}

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<Field>
				<FieldLabel for="first_name">First name</FieldLabel>
				<InputGroup.Root>
					<InputGroup.Addon><UserRound /></InputGroup.Addon>
					<InputGroup.Input
						id="first_name"
						name="first_name"
						bind:value={$formData.first_name}
						placeholder="Jane"
					/>
				</InputGroup.Root>
				<FieldError errors={$errors.first_name?.map((e) => ({ message: e }))} />
			</Field>
			<Field>
				<FieldLabel for="last_name">Last name</FieldLabel>
				<InputGroup.Root>
					<InputGroup.Addon><UserRound /></InputGroup.Addon>
					<InputGroup.Input
						id="last_name"
						name="last_name"
						bind:value={$formData.last_name}
						placeholder="Doe"
					/>
				</InputGroup.Root>
				<FieldError errors={$errors.last_name?.map((e) => ({ message: e }))} />
			</Field>
		</div>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<Field>
				<FieldLabel for="email">Work email</FieldLabel>
				<InputGroup.Root>
					<InputGroup.Addon><Mail /></InputGroup.Addon>
					<InputGroup.Input
						id="email"
						name="email"
						type="email"
						bind:value={$formData.email}
						placeholder="jane@acmestudio.com"
					/>
				</InputGroup.Root>
				<FieldError errors={$errors.email?.map((e) => ({ message: e }))} />
			</Field>
			<Field>
				<FieldLabel for="phone"
					>Phone <span class="font-normal text-muted-foreground">(optional)</span></FieldLabel
				>
				<InputGroup.Root>
					<InputGroup.Addon><Phone /></InputGroup.Addon>
					<InputGroup.Input
						id="phone"
						name="phone"
						type="number"
						bind:value={$formData.phone}
						placeholder="+1 555 000 0000"
					/>
				</InputGroup.Root>
				<FieldError errors={$errors.phone?.map((e) => ({ message: e }))} />
			</Field>
		</div>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<Field>
				<FieldLabel for="username">Username</FieldLabel>
				<InputGroup.Root>
					<InputGroup.Addon><AtSign /></InputGroup.Addon>
					<InputGroup.Input
						id="username"
						name="username"
						bind:value={$formData.username}
						placeholder="janedoe"
					/>
				</InputGroup.Root>
				<FieldError errors={$errors.username?.map((e) => ({ message: e }))} />
			</Field>
			<Field>
				<FieldLabel for="password">Password</FieldLabel>
				<InputGroup.Root>
					<InputGroup.Addon><Lock /></InputGroup.Addon>
					<InputGroup.Input
						id="password"
						name="password"
						type={showPassword ? 'text' : 'password'}
						bind:value={$formData.password}
						placeholder="At least 8 characters"
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
				<FieldError errors={$errors.password?.map((e) => ({ message: e }))} />
			</Field>
		</div>

		<div class="border-t pt-6">
			{@render sectionHeading(2, 'Your business', 'This is how customers will find and book you')}
		</div>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<Field>
				<FieldLabel for="biz_name">Business name</FieldLabel>
				<InputGroup.Root>
					<InputGroup.Addon><Building2 /></InputGroup.Addon>
					<InputGroup.Input
						id="biz_name"
						name="name"
						bind:value={$formData.name}
						oninput={syncSlug}
						placeholder="Acme Studio"
					/>
				</InputGroup.Root>
				<FieldError errors={$errors.name?.map((e) => ({ message: e }))} />
			</Field>
			<Field>
				<FieldLabel for="slug">Booking page</FieldLabel>
				<InputGroup.Root>
					<InputGroup.Addon><Globe /></InputGroup.Addon>
					<InputGroup.Input
						id="slug"
						name="slug"
						disabled
						bind:value={$formData.slug}
						oninput={() => (slugEdited = true)}
						placeholder="acme-studio"
					/>
					<InputGroup.Addon align="inline-end">
						<InputGroup.Text>.pikslots.com</InputGroup.Text>
					</InputGroup.Addon>
				</InputGroup.Root>
				<FieldError errors={$errors.slug?.map((e) => ({ message: e }))} />
			</Field>
		</div>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<Field>
				<FieldLabel for="industry">Industry</FieldLabel>
				<Select type="single" bind:value={$formData.industry}>
					<SelectTrigger id="industry" class="w-full">
						<span class="flex items-center gap-2">
							<Briefcase class="size-4 text-muted-foreground" />
							{#if $formData.industry}
								{industries.find((i) => i.value === $formData.industry)?.label ??
									$formData.industry}
							{:else}
								<span class="text-muted-foreground">Select an industry</span>
							{/if}
						</span>
					</SelectTrigger>
					<SelectContent>
						{#each industries as ind, i (i)}
							<SelectItem value={ind.value}>{ind.label}</SelectItem>
						{/each}
					</SelectContent>
				</Select>
				<FieldError errors={$errors.industry?.map((e) => ({ message: e }))} />
			</Field>
			<Field>
				<FieldLabel for="timezone">Default timezone</FieldLabel>
				<Select type="single" bind:value={$formData.default_time_zone} bind:open={timezoneOpen}>
					<SelectTrigger id="timezone" class="w-full">
						<span class="flex min-w-0 items-center gap-2">
							<Clock class="size-4 shrink-0 text-muted-foreground" />
							{#if $formData.default_time_zone}
								<span class="truncate">{timezoneLabel($formData.default_time_zone)}</span>
							{:else}
								<span class="text-muted-foreground">Select a timezone</span>
							{/if}
						</span>
					</SelectTrigger>
					<SelectContent class="max-h-60 overflow-y-auto">
						<div class="sticky top-0 z-10 border-b border-border bg-popover p-1.5">
							<Input
								bind:ref={tzSearchInput}
								type="text"
								placeholder="Search timezones..."
								bind:value={tzSearch}
								class="h-7"
								onkeydown={(e) => {
									if (e.key === 'Escape') return;
									e.stopPropagation();
									if (e.key === 'Enter') {
										e.preventDefault();
										if (filteredTimezones.length) {
											$formData.default_time_zone = filteredTimezones[0];
										}
										timezoneOpen = false;
									}
								}}
							/>
						</div>
						<SelectGroup>
							<SelectGroupHeading>All timezones</SelectGroupHeading>
							{#if filteredTimezones.length}
								{#each filteredTimezones as tz, i (i)}
									<SelectItem value={tz}>{timezoneLabel(tz)}</SelectItem>
								{/each}
							{:else}
								<div class="px-3 py-2 text-xs text-muted-foreground">No timezones found</div>
							{/if}
						</SelectGroup>
					</SelectContent>
				</Select>
				<FieldError errors={$errors.default_time_zone?.map((e) => ({ message: e }))} />
			</Field>
		</div>

		<Field class="pt-2">
			<Button type="submit" size="lg" class="w-full" disabled={isBusy}>
				{#if isBusy}
					<LoaderCircle class="animate-spin" />
					Creating your workspace...
				{:else}
					Create my workspace
					<ArrowRight />
				{/if}
			</Button>
		</Field>
	</FieldGroup>
</form>
