import createApp, { ClientApplication } from '@shopify/app-bridge';
import { getSessionToken } from '@shopify/app-bridge/utilities';

let appBridge: ClientApplication | null = null;

export function getShopFromUrl(): string {
  return new URLSearchParams(window.location.search).get('shop') || '';
}

export function getHostFromUrl(): string {
  return new URLSearchParams(window.location.search).get('host') || '';
}

export function isShopifyEmbedded(): boolean {
  return !!getHostFromUrl() || window !== window.top;
}

export function getShopifyAppBridge(): ClientApplication | null {
  const host = getHostFromUrl();
  const apiKey = ((import.meta as any).env?.VITE_SHOPIFY_API_KEY || '').trim();
  if (!host || !apiKey) return null;

  if (!appBridge) {
    appBridge = createApp({
      apiKey,
      host,
      forceRedirect: true,
    });
  }

  return appBridge;
}

export async function getShopifySessionToken(): Promise<string | null> {
  const app = getShopifyAppBridge();
  if (!app) return null;

  try {
    return await getSessionToken(app);
  } catch {
    return null;
  }
}
