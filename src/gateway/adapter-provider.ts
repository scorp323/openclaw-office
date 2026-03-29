import type { GatewayAdapter } from "./adapter";
import { HttpAdapter } from "./http-adapter";
import { MockAdapter } from "./mock-adapter";
import { GatewayRpcClient } from "./rpc-client";
import { WsAdapter } from "./ws-adapter";
import { GatewayWsClient } from "./ws-client";

let adapterInstance: GatewayAdapter | null = null;
let adapterInitPromise: Promise<GatewayAdapter> | null = null;
let adapterInitError: Error | null = null;
let adapterReadyWaiters: Array<{
  resolve: (adapter: GatewayAdapter) => void;
  reject: (error: Error) => void;
}> = [];
let httpFallbackInstance: HttpAdapter | null = null;

export function getAdapter(): GatewayAdapter {
  if (adapterInstance) return adapterInstance;
  throw new Error("GatewayAdapter not initialized. Call initAdapter() first.");
}

/**
 * Wait for adapter to be initialized (resolves immediately if already ready).
 * Console pages call this before fetching data to handle the race condition
 * where the page mounts before the WebSocket connection establishes.
 */
export function waitForAdapter(timeoutMs = 15_000): Promise<GatewayAdapter> {
  if (adapterInstance) return Promise.resolve(adapterInstance);
  if (adapterInitError) return Promise.reject(adapterInitError);

  return new Promise<GatewayAdapter>((resolve, reject) => {
    const timer = setTimeout(() => {
      adapterReadyWaiters = adapterReadyWaiters.filter((waiter) => waiter.resolve !== wrappedResolve);
      reject(new Error("Adapter initialization timed out"));
    }, timeoutMs);

    const wrappedResolve = (adapter: GatewayAdapter) => {
      clearTimeout(timer);
      resolve(adapter);
    };
    const wrappedReject = (error: Error) => {
      clearTimeout(timer);
      reject(error);
    };
    adapterReadyWaiters.push({
      resolve: wrappedResolve,
      reject: wrappedReject,
    });
  });
}

export async function initAdapter(
  mode: "mock" | "ws",
  deps?: { wsClient: unknown; rpcClient: unknown },
): Promise<GatewayAdapter> {
  if (adapterInstance) return adapterInstance;
  if (adapterInitPromise) return adapterInitPromise;

  adapterInitError = null;
  const initPromise = (async () => {
    try {
      const adapter =
        mode === "mock"
          ? new MockAdapter()
          : createWsAdapter(deps);

      await adapter.connect();
      adapterInstance = adapter;
      resolveWaiters(adapter);
      return adapter;
    } catch (error) {
      const normalizedError = toError(error);
      adapterInitError = normalizedError;
      rejectWaiters(normalizedError);
      throw normalizedError;
    }
  })();

  adapterInitPromise = initPromise;

  try {
    return await initPromise;
  } finally {
    if (adapterInitPromise === initPromise) {
      adapterInitPromise = null;
    }
  }
}

export function isMockMode(): boolean {
  return import.meta.env.VITE_MOCK === "true";
}

function createWsAdapter(
  deps?: { wsClient: unknown; rpcClient: unknown },
): GatewayAdapter {
  if (!deps) throw new Error("WsAdapter requires wsClient and rpcClient");
  if (!(deps.wsClient instanceof GatewayWsClient)) {
    throw new Error("Invalid wsClient");
  }
  if (!(deps.rpcClient instanceof GatewayRpcClient)) {
    throw new Error("Invalid rpcClient");
  }
  return new WsAdapter(deps.wsClient, deps.rpcClient);
}

function resolveWaiters(adapter: GatewayAdapter): void {
  for (const waiter of adapterReadyWaiters) {
    waiter.resolve(adapter);
  }
  adapterReadyWaiters = [];
}

function rejectWaiters(error: Error): void {
  for (const waiter of adapterReadyWaiters) {
    waiter.reject(error);
  }
  adapterReadyWaiters = [];
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Initialize the HTTP adapter as a fallback when WebSocket is unavailable.
 * This is used when accessing through Cloudflare tunnels where the gateway
 * WS port is not exposed.
 */
export async function initHttpAdapter(): Promise<GatewayAdapter> {
  if (adapterInstance) return adapterInstance;

  const httpAdapter = new HttpAdapter();
  try {
    await httpAdapter.connect();
    httpFallbackInstance = httpAdapter;
    adapterInstance = httpAdapter;
    resolveWaiters(httpAdapter);
    return httpAdapter;
  } catch (error) {
    throw toError(error);
  }
}

/**
 * Returns true if the current adapter is an HTTP fallback adapter.
 */
export function isHttpAdapter(): boolean {
  return adapterInstance instanceof HttpAdapter;
}

export function __resetAdapterForTests(): void {
  adapterInstance?.disconnect();
  adapterInstance = null;
  adapterInitPromise = null;
  adapterInitError = null;
  adapterReadyWaiters = [];
  httpFallbackInstance = null;
}
