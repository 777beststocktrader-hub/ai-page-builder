import { Page, Theme } from '../types';
import { exportPageToHtml } from './htmlExport';
import { getHostFromUrl, getShopForApi, getShopFromUrl, getShopifySessionToken, isShopifyEmbedded } from './shopifyAppBridge';

export async function publishToShopify(
  page: Page,
  theme?: Theme
): Promise<{ url: string; title: string; adminUrl?: string }> {
  const html = exportPageToHtml(page, theme);
  const shop = getShopForApi();
  if (!shop) throw new Error('No Shopify store connected. Install PageGenie from Shopify admin first.');
  const token = await getShopifySessionToken();
  const host = getHostFromUrl();

  const res = await fetch('/api/shopify/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ shop, host, pageTitle: page.title, html }),
  });

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
      try {
        if (window.top && window.top !== window) {
          window.top.location.href = authUrl;
        } else {
          window.location.href = authUrl;
        }
      } catch {
        window.location.href = authUrl;
      }
    }
    throw new Error(data.error || 'Publish failed');
  }

  return { url: data.url!, title: data.page!.title, adminUrl: data.adminUrl };
}

export { getShopFromUrl, isShopifyEmbedded };
