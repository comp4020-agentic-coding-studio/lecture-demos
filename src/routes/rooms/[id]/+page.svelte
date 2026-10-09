<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// The server sends an event down this stream whenever anything in the room
	// changes; each one re-runs the page's load.
	$effect(() => {
		const events = new EventSource(`/rooms/${data.room.id}/events`);
		events.onmessage = () => invalidateAll();
		return () => events.close();
	});
</script>

<svelte:head>
	<title>{data.room.name} · lecture-demos</title>
</svelte:head>

<h1>{data.room.name}</h1>

<form method="POST" action="?/add" class="inline" use:enhance>
	<label for="new-card" class="visually-hidden">New card</label>
	<input id="new-card" name="text" type="text" placeholder="Add a card" required />
	<button>Add</button>
</form>
{#if form?.message}<p class="error" role="alert">{form.message}</p>{/if}

<ul class="cards">
	{#each data.cards as c (c.id)}
		<li>
			<form method="POST" action="?/edit" class="inline" use:enhance={() => async ({ update }) => update({ reset: false })}>
				<input type="hidden" name="id" value={c.id} />
				<label for="card-{c.id}" class="visually-hidden">Card {c.id}</label>
				<input id="card-{c.id}" name="text" type="text" value={c.text} required />
				<button>Save</button>
			</form>
			<p class="meta">
				{c.author}, {c.updatedAt.toLocaleString('en-AU', { timeStyle: 'short', dateStyle: 'medium', timeZone: 'Australia/Sydney' })}
			</p>
			{#if c.userId === data.user?.id}
				<form method="POST" action="?/delete" use:enhance>
					<input type="hidden" name="id" value={c.id} />
					<button aria-label="Delete card {c.id}">Delete</button>
				</form>
			{/if}
		</li>
	{:else}
		<li class="meta">No cards yet.</li>
	{/each}
</ul>
