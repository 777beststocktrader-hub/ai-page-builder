import createApp, { ClientApplication } from '@shopify/app-bridge';
import { getSessionToken } from '@shopify/app-bridge/utilities';

let appBridge: ClientApplication | null = null;
const SHOPIFY_STORE_STORAGE_KEY = 'ai-pb-shopify-store';
const SESSION_TOKEN_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('Shopify session token timed out')), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

function getShopifyApiKey(): string {
  const envKey = ((import.meta as any).env?.VITE_SHOPIFY_API_KEY || '').trim();
  if (envKey) return envKey;

  const metaKey = document.querySelector<HTMLMetaElement>('meta[name="shopify-api-key"]')?.content?.trim() || '';
  return metaKey.startsWith('%') ? '' : metaKey;
}

export function getShopFromUrl(): string {
  return new URLSearchParams(window.location.search).get('shop') || '';
}

export function getSavedShopFromStorage(): string {
  try {
    const raw = localStorage.getItem(SHOPIFY_STORE_STORAGE_KEY);
    if (!raw) return '';
    const saved = JSON.parse(raw) as { shop?: string };
    return typeof saved.shop === 'string' ? saved.shop : '';
  } catch {
    return '';
  }
}

export function getShopForApi(): string {
  return getShopFromUrl() || getSavedShopFromStorage();
}

export function getHostFromUrl(): string {
  return new URLSearchParams(window.location.search).get('host') || '';
}

export function isShopifyEmbedded(): boolean {
  return !!getHostFromUrl() || window !== window.top;
}

export function getShopifyAppBridge(): ClientApplication | null {
  const host = getHostFromUrl();
  const apiKey = getShopifyApiKey();
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
  const shopifyGlobal = (window as any).shopify;
  if (shopifyGlobal?.idToken) {
    try {
      return await withTimeout(shopifyGlobal.idToken(), SESSION_TOKEN_TIMEOUT_MS);
    } catch {
      // Fall back to the legacy package path below.
    }
  }

  const app = getShopifyAppBridge();
  if (!app) return null;

  try {
    return await withTimeout(getSessionToken(app), SESSION_TOKEN_TIMEOUT_MS);
  } catch {
    return null;
  }
}
