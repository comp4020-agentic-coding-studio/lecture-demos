<script lang="ts">
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Rooms · lecture-demos</title>
</svelte:head>

<h1>Rooms</h1>

<p>Each room is a shared list of cards. Everyone in a room sees every change as it happens.</p>

{#if data.user}
	<form method="POST" action="?/create" class="inline">
		<label for="room-name" class="visually-hidden">Room name</label>
		<input id="room-name" name="name" type="text" placeholder="Name a new room" required />
		<button>Create room</button>
	</form>
	{#if form?.message}<p class="error" role="alert">{form.message}</p>{/if}
{:else}
	<p><a href="/login">Sign in</a> to make a room or join one.</p>
{/if}

{#if data.rooms.length}
	<ul class="rooms">
		{#each data.rooms as r (r.id)}
			<li>
				<a href="/rooms/{r.id}">{r.name}</a>
				<span class="meta">by {r.owner}, {r.cards} {r.cards === 1 ? 'card' : 'cards'}</span>
			</li>
		{/each}
	</ul>
{:else}
	<p class="meta">No rooms yet.</p>
{/if}
