import fs from 'fs';
import path from 'path';
import { adminGraphql, getSessionForShop } from './shopify';

const BILLING_FILE = path.join(__dirname, '../../data/billing.json');
const TRIAL_DAYS = Number(process.env.SHOPIFY_BILLING_TRIAL_DAYS || 30);
const PLAN_NAME = process.env.SHOPIFY_BILLING_PLAN_NAME || 'PageGenie Pro';
const PLAN_PRICE = Number(process.env.SHOPIFY_BILLING_PRICE || 19);

export interface BillingRecord {
  clientId: string;
  shop: string | null;
  trialStart: number;
  trialEnd: number;
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  shopifySubscriptionId: string | null;
  email: string | null;
  createdAt: number;
  updatedAt: number;
}

export type BillingStatus = {
  status: 'trial' | 'active' | 'expired';
  daysLeft: number;
  trialEnd: number;
  isPaid: boolean;
  billingProvider: 'shopify' | 'trial-only';
  billingReady: boolean;
  planName: string;
  price: number;
};

function loadBilling(): Record<string, BillingRecord> {
  try {
    const dir = path.dirname(BILLING_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(BILLING_FILE)) return {};
    return JSON.parse(fs.readFileSync(BILLING_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveBilling(data: Record<string, BillingRecord>): void {
  const dir = path.dirname(BILLING_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(BILLING_FILE, JSON.stringify(data, null, 2));
}

export function getOrCreateBilling(clientId: string, shop: string | null = null): BillingRecord {
  const all = loadBilling();
  if (all[clientId]) {
    if (shop && all[clientId].shop !== shop) {
      all[clientId].shop = shop;
      all[clientId].updatedAt = Date.now();
      saveBilling(all);
    }
    return all[clientId];
  }

  const now = Date.now();
  const record: BillingRecord = {
    clientId,
    shop,
    trialStart: now,
    trialEnd: now + TRIAL_DAYS * 24 * 60 * 60 * 1000,
    status: 'trial',
    shopifySubscriptionId: null,
    email: null,
    createdAt: now,
    updatedAt: now,
  };
  all[clientId] = record;
  saveBilling(all);
  return record;
}

export function getLocalBillingStatus(clientId: string, shop: string | null = null): BillingStatus {
  const record = getOrCreateBilling(clientId, shop);

  if ((record.status as string) === 'active') {
    return {
      status: 'active',
      daysLeft: 999,
      trialEnd: record.trialEnd,
      isPaid: true,
      billingProvider: 'trial-only',
      billingReady: false,
      planName: PLAN_NAME,
      price: PLAN_PRICE,
    };
  }

  const now = Date.now();
  const msLeft = record.trialEnd - now;
  const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));

  if (daysLeft === 0 && record.status !== 'active') {
    updateBilling(clientId, { status: 'expired' });
    return {
      status: 'expired',
      daysLeft: 0,
      trialEnd: record.trialEnd,
      isPaid: false,
      billingProvider: 'trial-only',
      billingReady: false,
      planName: PLAN_NAME,
      price: PLAN_PRICE,
    };
  }

  return {
    status: 'trial',
    daysLeft,
    trialEnd: record.trialEnd,
    isPaid: false,
    billingProvider: 'trial-only',
    billingReady: false,
    planName: PLAN_NAME,
    price: PLAN_PRICE,
  };
}

export function updateBilling(clientId: string, updates: Partial<BillingRecord>): void {
  const all = loadBilling();
  if (!all[clientId]) return;
  all[clientId] = { ...all[clientId], ...updates, updatedAt: Date.now() };
  saveBilling(all);
}

export async function getShopifyBillingStatus(shop: string): Promise<BillingStatus> {
  const local = getLocalBillingStatus(shop, shop);
  const session = await getSessionForShop(shop);

  if (!session?.accessToken) {
    return {
      ...local,
      billingProvider: 'shopify',
      billingReady: false,
    };
  }

  const data = await adminGraphql<{
    currentAppInstallation: {
      activeSubscriptions: Array<{ id: string; status: string; trialDays?: number | null }>;
    };
  }>(
    session.shop,
    session.accessToken,
    `#graphql
      query CurrentAppBilling {
        currentAppInstallation {
          activeSubscriptions {
            id
            status
            trialDays
          }
        }
      }
    `
  );

  const active = data.currentAppInstallation.activeSubscriptions.find((sub) => sub.status === 'ACTIVE');
  if (active) {
    updateBilling(shop, { status: 'active', shopifySubscriptionId: active.id, shop });
    return {
      status: 'active',
      daysLeft: 999,
      trialEnd: local.trialEnd,
      isPaid: true,
      billingProvider: 'shopify',
      billingReady: true,
      planName: PLAN_NAME,
      price: PLAN_PRICE,
    };
  }

  return {
    ...local,
    billingProvider: 'shopify',
    billingReady: true,
  };
}

export async function createShopifySubscription(shop: string, host?: string): Promise<string> {
  const session = await getSessionForShop(shop);
  if (!session?.accessToken) {
    throw new Error('Shopify session missing. Reinstall the app from Shopify admin.');
  }

  const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  const returnParams = new URLSearchParams({ shop, billing: 'success' });
  if (host) returnParams.set('host', host);
  const returnUrl = `${appUrl.replace(/\/$/, '')}/?${returnParams.toString()}`;

  const data = await adminGraphql<{
    appSubscriptionCreate: {
      confirmationUrl: string | null;
      appSubscription: { id: string } | null;
      userErrors: { field?: string[]; message: string }[];
    };
  }>(
    session.shop,
    session.accessToken,
    `#graphql
      mutation AppSubscriptionCreate(
        $name: String!
        $returnUrl: URL!
        $lineItems: [AppSubscriptionLineItemInput!]!
        $trialDays: Int
        $test: Boolean
      ) {
        appSubscriptionCreate(
          name: $name
          returnUrl: $returnUrl
          lineItems: $lineItems
          trialDays: $trialDays
          test: $test
        ) {
          userErrors {
            field
            message
          }
          appSubscription {
            id
          }
          confirmationUrl
        }
      }
    `,
    {
      name: PLAN_NAME,
      returnUrl,
      trialDays: TRIAL_DAYS,
      test: process.env.SHOPIFY_BILLING_TEST === 'true',
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: PLAN_PRICE,
                currencyCode: 'USD',
              },
              interval: 'EVERY_30_DAYS',
            },
          },
        },
      ],
    }
  );

  const errors = data.appSubscriptionCreate.userErrors;
  if (errors.length || !data.appSubscriptionCreate.confirmationUrl) {
    throw new Error(errors.map((e) => e.message).join('; ') || 'Shopify did not return a confirmation URL');
  }

  if (data.appSubscriptionCreate.appSubscription?.id) {
    updateBilling(shop, {
      shop,
      shopifySubscriptionId: data.appSubscriptionCreate.appSubscription.id,
    });
  }

  return data.appSubscriptionCreate.confirmationUrl;
}
