/// <reference lib="webworker" />

/**
 * OpenClaw Office — Service Worker
 *
 * Handles push notifications and notification click routing.
 * Uses cache-first strategy for static assets, network-first for API.
 */

const SW_VERSION = "1.0.0";
const CACHE_NAME = `openclaw-office-v${SW_VERSION}`;

// ── Install ──────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  // Activate immediately without waiting for old SW to retire
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("openclaw-office-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ── Push ─────────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {
    title: "OpenClaw Office",
    body: "New notification",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "openclaw-default",
    url: "/",
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/icon-192.png",
    tag: data.tag || "openclaw-default",
    renotify: !!data.tag,
    data: { url: data.url || "/" },
    vibrate: [100, 50, 100],
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ── Notification click ───────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  // If an action was clicked, handle it
  if (event.action === "dismiss") {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.postMessage({
            type: "notification-click",
            url: targetUrl,
            action: event.action,
          });
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(targetUrl);
    }),
  );
});

// ── Message from main thread ─────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  // Show notification from main thread (for foreground gateway events)
  if (event.data?.type === "SHOW_NOTIFICATION") {
    const { title, options } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        ...options,
      }),
    );
  }
});
