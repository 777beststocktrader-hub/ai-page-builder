import { v4 as uuid } from 'uuid';
import { getHostFromUrl, getShopFromUrl, getShopifySessionToken } from './shopifyAppBridge';

const CLIENT_ID_KEY = 'pg-client-id';

export function getClientId(): string {
  const shopParam = getShopFromUrl();
  if (shopParam) return shopParam;

  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = `standalone-${uuid()}`;
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

export interface BillingStatus {
  status: 'trial' | 'active' | 'expired';
  daysLeft: number;
  trialEnd: number;
  isPaid: boolean;
  billingProvider: 'shopify' | 'trial-only';
  billingReady: boolean;
  planName: string;
  price: number;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getShopifySessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchBillingStatus(clientId: string): Promise<BillingStatus> {
  const shop = getShopFromUrl() || clientId;
  const params = new URLSearchParams({ clientId, shop });
  const res = await fetch(`/api/billing/status?${params}`, {
    headers: await authHeaders(),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data as BillingStatus;
}

export async function createCheckoutSession(clientId: string): Promise<string> {
  const shop = getShopFromUrl() || clientId;
  const res = await fetch('/api/billing/create-checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeaders()),
    },
    body: JSON.stringify({ clientId, shop, host: getHostFromUrl() }),
  });
  const data = await res.json();
  if (!data.success || !data.url) throw new Error(data.error || 'Checkout failed');
  return data.url;
}

export async function openBillingPortal(clientId: string): Promise<string> {
  const shop = getShopFromUrl() || clientId;
  const res = await fetch('/api/billing/portal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeaders()),
    },
    body: JSON.stringify({ clientId, shop }),
  });
  const data = await res.json();
  if (!data.success || !data.url) throw new Error(data.error || 'Billing page unavailable');
  return data.url;
}
