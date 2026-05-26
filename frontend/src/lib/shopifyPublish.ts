import { Page } from '../types';
import { exportPageToHtml } from './htmlExport';

export async function publishToShopify(
  page: Page,
  shop: string
): Promise<{ url: string; title: string }> {
  const html = exportPageToHtml(page);

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
      // App not installed — redirect to install
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
