import { Page, Theme } from '../types';
import { exportPageToHtml } from './htmlExport';
import { getShopifyCredentials } from '../components/ShopifyConnectModal';

export async function publishToShopify(
  page: Page,
  theme?: Theme
): Promise<{ url: string; title: string; adminUrl?: string }> {
  const html = exportPageToHtml(page, theme);
  const creds = getShopifyCredentials();

  // Direct publish (Custom App token)
  if (creds?.shop && creds?.token) {
    const res = await fetch('/api/shopify/direct-publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shop: creds.shop,
        token: creds.token,
        pageTitle: page.title,
        html,
      }),
    });

    const data = await res.json() as {
      success: boolean;
      url?: string;
      adminUrl?: string;
      page?: { title: string };
      error?: string;
    };

    if (!data.success) throw new Error(data.error || 'Publish failed');
    return { url: data.url!, title: data.page!.title, adminUrl: data.adminUrl };
  }

  // OAuth-based publish (embedded app)
  const shop = getShopFromUrl();
  if (!shop) throw new Error('No Shopify store connected. Click the store icon to connect.');

  const res = await fetch('/api/shopify/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shop, pageTitle: page.title, html }),
  });

  const data = await res.json() as {
    success: boolean;
    url?: string;
    page?: { title: string };
    error?: string;
    authUrl?: string;
  };

  if (!data.success) {
    if (data.authUrl) {
      window.top ? (window.top.location.href = data.authUrl) : (window.location.href = data.authUrl);
    }
    throw new Error(data.error || 'Publish failed');
  }

  return { url: data.url!, title: data.page!.title };
}

export function getShopFromUrl(): string {
  return new URLSearchParams(window.location.search).get('shop') || '';
}

export function getHostFromUrl(): string {
  return new URLSearchParams(window.location.search).get('host') || '';
}

export function isShopifyEmbedded(): boolean {
  return !!getHostFromUrl() || window !== window.top;
}
