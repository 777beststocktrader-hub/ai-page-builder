import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const router = Router();

const DATA_DIR = path.join(__dirname, '../../data');
const SHOP_DATA_FILES = ['sessions.json', 'billing.json', 'contacts.json', 'subscribers.json'];

function verifyWebhook(req: Request): boolean {
  const hmac = req.headers['x-shopify-hmac-sha256'] as string;
  const secret = process.env.SHOPIFY_API_SECRET;
  const body = (req as any).rawBody;

  if (!hmac || !secret || !Buffer.isBuffer(body)) return false;

  const digest = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64');
  const expected = Buffer.from(digest, 'utf8');
  const received = Buffer.from(hmac, 'utf8');

  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

function removeShopData(shopDomain: string) {
  if (!shopDomain) return;

  for (const file of SHOP_DATA_FILES) {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) continue;

    try {
      const raw = fs.readFileSync(filePath, 'utf8');

      if (file === 'sessions.json') {
        const entries = JSON.parse(raw) as [string, any][];
        const filtered = entries.filter(([, session]) => session?.shop !== shopDomain);
        fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
        continue;
      }

      if (file === 'billing.json') {
        const billing = JSON.parse(raw) as Record<string, any>;
        for (const key of Object.keys(billing)) {
          if (key === shopDomain || billing[key]?.shop === shopDomain || billing[key]?.clientId === shopDomain) {
            delete billing[key];
          }
        }
        fs.writeFileSync(filePath, JSON.stringify(billing, null, 2));
        continue;
      }

      const records = JSON.parse(raw);
      if (Array.isArray(records)) {
        const filtered = records.filter((record) => {
          if (!record || typeof record !== 'object') return false;
          if (!record.shop && !record.shopDomain) return false;
          return record.shop !== shopDomain && record.shopDomain !== shopDomain;
        });
        fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
      }
    } catch (err: any) {
      console.error(`Failed to clean ${file} for ${shopDomain}:`, err.message);
    }
  }
}

router.post('/customers/redact', (req: Request, res: Response) => {
  if (!verifyWebhook(req)) {
    res.status(401).send('Unauthorized');
    return;
  }

  console.log('GDPR customers/redact:', req.body.shop_domain);
  res.status(200).send('OK');
});

router.post('/customers/data_request', (req: Request, res: Response) => {
  if (!verifyWebhook(req)) {
    res.status(401).send('Unauthorized');
    return;
  }

  console.log('GDPR customers/data_request:', req.body.shop_domain);
  res.status(200).json({
    customer: req.body.customer,
    data: [],
  });
});

router.post('/shop/redact', (req: Request, res: Response) => {
  if (!verifyWebhook(req)) {
    res.status(401).send('Unauthorized');
    return;
  }

  console.log('GDPR shop/redact:', req.body.shop_domain);
  removeShopData(req.body.shop_domain);
  res.status(200).send('OK');
});

router.post('/app-subscriptions/update', (req: Request, res: Response) => {
  if (!verifyWebhook(req)) {
    res.status(401).send('Unauthorized');
    return;
  }

  console.log('Billing app_subscriptions/update:', req.body.app_subscription?.admin_graphql_api_id || req.body.app_subscription?.status);
  res.status(200).send('OK');
});

export default router;
