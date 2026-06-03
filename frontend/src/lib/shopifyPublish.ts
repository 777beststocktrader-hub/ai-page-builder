import { Page, Theme } from '../types';
import { exportPageToHtml } from './htmlExport';
import { Redirect } from '@shopify/app-bridge/actions';
import { getHostFromUrl, getShopForApi, getShopFromUrl, getShopifyAppBridge, getShopifySessionToken, isShopifyEmbedded } from './shopifyAppBridge';

const PUBLISH_TIMEOUT_MS = 45000;

function openShopifyReconnect(authUrl: string): void {
  const app = getShopifyAppBridge();

  if (app) {
    Redirect.create(app).dispatch(Redirect.Action.REMOTE, authUrl);
    return;
  }

  try {
    if (window.top && window.top !== window) {
      window.open(authUrl, '_top');
      return;
    }
  } catch {
    // Fall back to same-window navigation below.
  }

  window.location.assign(authUrl);
}

export async function publishToShopify(
  page: Page,
  theme?: Theme
): Promise<{ url: string; title: string; adminUrl?: string }> {
  const html = exportPageToHtml(page, theme);
  const token = await getShopifySessionToken();
  const shop = getShopForApi();
  if (!shop && !token) throw new Error('No Shopify store connected. Open PageGenie from Shopify admin first.');
  const host = getHostFromUrl();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), PUBLISH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch('/api/shopify/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ shop, host, pageTitle: page.title, html }),
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Publishing is taking too long. Please reconnect Shopify or try again in a moment.');
    }
    throw new Error('Could not reach Shopify publish server. Please try again.');
  } finally {
    window.clearTimeout(timeout);
  }

  const data = await res.json() as {
    success: boolean;
    url?: string;
    adminUrl?: string;
    page?: { title: string };
    error?: string;
    authUrl?: string;
  };

  if (!data.success) {
    if (data.authUrl) {
      const authUrl = new URL(data.authUrl, window.location.origin).toString();
      openShopifyReconnect(authUrl);
      throw new Error('Shopify needs to reconnect before publishing. Opening the reconnect page now.');
    }
    throw new Error(data.error || 'Publish failed');
  }

  return { url: data.url!, title: data.page!.title, adminUrl: data.adminUrl };
}

export { getShopFromUrl, isShopifyEmbedded };
