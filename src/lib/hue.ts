// Every topic gets its own hue, derived from its name so the server render
// and the live-stream client agree without storing a colour anywhere.
export function topicHue(topic: string): number {
  let hash = 0;
  for (const char of topic) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}
