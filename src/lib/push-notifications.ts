/**
 * Push notification utilities — service worker registration,
 * permission management, and subscription lifecycle.
 */

const SW_PATH = "/sw.js";

// ── Service Worker registration ──────────────────────────────────────

let swRegistration: ServiceWorkerRegistration | null = null;

export function isNotificationSupported(): boolean {
  return "Notification" in window && "serviceWorker" in navigator;
}

export function getPermissionState(): NotificationPermission {
  if (!isNotificationSupported()) return "denied";
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register(SW_PATH, {
      scope: "/",
    });

    swRegistration = registration;

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "activated") {
            // New SW activated — could show "update available" toast
          }
        });
      }
    });

    return registration;
  } catch (err) {
    console.error("[push] SW registration failed:", err);
    return null;
  }
}

export function getRegistration(): ServiceWorkerRegistration | null {
  return swRegistration;
}

// ── Permission ───────────────────────────────────────────────────────

export async function requestPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return "denied";
  const result = await Notification.requestPermission();
  return result;
}

// ── Push Subscription ────────────────────────────────────────────────

/**
 * Subscribe to push notifications using VAPID.
 * The `vapidPublicKey` should be provided by your push server.
 * Returns the PushSubscription (containing endpoint + keys) to send to the server.
 */
export async function subscribeToPush(
  vapidPublicKey: string,
): Promise<PushSubscription | null> {
  const reg = swRegistration ?? (await registerServiceWorker());
  if (!reg) return null;

  try {
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
    });
    return subscription;
  } catch (err) {
    console.error("[push] Subscribe failed:", err);
    return null;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  const reg = swRegistration ?? (await navigator.serviceWorker?.getRegistration());
  if (!reg) return false;

  try {
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      return await subscription.unsubscribe();
    }
    return true;
  } catch (err) {
    console.error("[push] Unsubscribe failed:", err);
    return false;
  }
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  const reg = swRegistration ?? (await navigator.serviceWorker?.getRegistration());
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

// ── Show notification via SW (for foreground events) ─────────────────

export async function showNotification(
  title: string,
  options?: NotificationOptions & { url?: string },
): Promise<void> {
  const reg = swRegistration ?? (await navigator.serviceWorker?.getRegistration());
  if (reg?.active) {
    reg.active.postMessage({
      type: "SHOW_NOTIFICATION",
      title,
      options: {
        ...options,
        data: { url: options?.url ?? "/" },
      },
    });
    return;
  }

  // Fallback to Notification API if SW not available
  if (isNotificationSupported() && Notification.permission === "granted") {
    new Notification(title, options);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
