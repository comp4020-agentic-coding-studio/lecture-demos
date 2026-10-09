<script lang="ts">
	import { page } from '$app/state';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	// keep ?next= on the form's action, so signing in lands on the room you asked for
	const next = $derived(page.url.searchParams.get('next'));
	const action = (name: string) => `?/${name}${next ? `&next=${encodeURIComponent(next)}` : ''}`;
</script>

<svelte:head>
	<title>Sign in · lecture-demos</title>
</svelte:head>

<h1>Sign in</h1>

<form method="POST" action={action('signIn')}>
	<h2>I have an account</h2>
	<p>
		<label>Email <input name="email" type="email" autocomplete="email" required value={form?.action === 'signIn' ? form.email : ''} /></label>
	</p>
	<p>
		<label>Password <input name="password" type="password" autocomplete="current-password" required /></label>
	</p>
	{#if form?.action === 'signIn'}<p class="error" role="alert">{form.message}</p>{/if}
	<button>Sign in</button>
</form>

<form method="POST" action={action('signUp')}>
	<h2>I'm new here</h2>
	<p>
		<label>Name <input name="name" type="text" autocomplete="nickname" required value={form?.action === 'signUp' ? form.name : ''} /></label>
	</p>
	<p>
		<label>Email <input name="email" type="email" autocomplete="email" required value={form?.action === 'signUp' ? form.email : ''} /></label>
	</p>
	<p>
		<label>Password (8 or more characters) <input name="password" type="password" autocomplete="new-password" minlength="8" required /></label>
	</p>
	{#if form?.action === 'signUp'}<p class="error" role="alert">{form.message}</p>{/if}
	<button>Make an account</button>
</form>
