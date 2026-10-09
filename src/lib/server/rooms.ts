import { EventEmitter } from "node:events";

// Publish and subscribe, in memory: the app runs on one Fly machine, so every
// open tab's event stream is in this one process.
const topics = new EventEmitter();
topics.setMaxListeners(0);

export function publish(roomId: number) {
  topics.emit(`room:${roomId}`);
}

export function subscribe(roomId: number, listener: () => void): () => void {
  topics.on(`room:${roomId}`, listener);
  return () => topics.off(`room:${roomId}`, listener);
}
