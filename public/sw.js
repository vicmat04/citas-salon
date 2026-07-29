/* global self */

// Lifecycle-only worker: deliberately no fetch handler, Cache Storage, or data persistence.
self.addEventListener("install", () => {
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(self.clients.claim());
});
