<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>About · lecture-demos</title>
</svelte:head>

<article>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- our own README, rendered at build time -->
	{@html data.html}
</article>
