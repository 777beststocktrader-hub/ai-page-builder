import { Router, Request, Response } from 'express';
import {
  createShopifySubscription,
  getLocalBillingStatus,
  getShopifyBillingStatus,
} from '../billing';
import { getShopFromSessionToken } from '../shopify';

const router = Router();

function cleanShop(value?: string): string {
  return (value || '').trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function resolveShop(req: Request): string {
  return (
    getShopFromSessionToken(req) ||
    cleanShop(req.query.shop as string) ||
    cleanShop(req.body?.shop as string) ||
    cleanShop(req.query.clientId as string) ||
    cleanShop(req.body?.clientId as string)
  );
}

router.get('/status', async (req: Request, res: Response) => {
  const shop = resolveShop(req);
  const clientId = ((req.query.clientId as string) || shop || '').trim();

  if (!clientId) {
    res.status(400).json({ success: false, error: 'shop or clientId required' });
    return;
  }

  try {
    const status = shop.endsWith('.myshopify.com')
      ? await getShopifyBillingStatus(shop)
      : getLocalBillingStatus(clientId);

    res.json({ success: true, ...status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/create-checkout', async (req: Request, res: Response) => {
  const shop = resolveShop(req);
  if (!shop || !shop.endsWith('.myshopify.com')) {
    res.status(400).json({ success: false, error: 'Shopify shop required for billing' });
    return;
  }

  try {
    const url = await createShopifySubscription(shop, req.body?.host as string | undefined);
    res.json({ success: true, url });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/portal', async (req: Request, res: Response) => {
  const shop = resolveShop(req);
  if (!shop || !shop.endsWith('.myshopify.com')) {
    res.status(400).json({ success: false, error: 'Shopify shop required' });
    return;
  }

  res.json({
    success: true,
    url: `https://${shop}/admin/settings/billing`,
  });
});

export default router;
