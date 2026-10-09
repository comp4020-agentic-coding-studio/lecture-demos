<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header>
	<nav aria-label="Main">
		<a href="/">Rooms</a>
		<a href="/readme/">About</a>
		{#if data.user}
			<span class="who">signed in as {data.user.name}</span>
			<form method="POST" action="/logout">
				<button>Sign out</button>
			</form>
		{:else}
			<a class="who" href="/login">Sign in</a>
		{/if}
	</nav>
</header>

<main>
	{@render children()}
</main>
