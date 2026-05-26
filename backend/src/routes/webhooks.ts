import { Router, Request, Response } from 'express';
import crypto from 'crypto';

const router = Router();

function verifyWebhook(req: Request): boolean {
  const hmac = req.headers['x-shopify-hmac-sha256'] as string;
  if (!hmac || !process.env.SHOPIFY_API_SECRET) return false;
  const body = JSON.stringify(req.body);
  const digest = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(body, 'utf8')
    .digest('base64');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
}

// GDPR: Delete customer data
router.post('/customers/redact', (req: Request, res: Response) => {
  if (!verifyWebhook(req)) { res.status(401).send('Unauthorized'); return; }
  console.log('GDPR customers/redact:', req.body.shop_domain);
  // No customer PII stored — nothing to delete
  res.status(200).send('OK');
});

// GDPR: Customer data request
router.post('/customers/data_request', (req: Request, res: Response) => {
  if (!verifyWebhook(req)) { res.status(401).send('Unauthorized'); return; }
  console.log('GDPR customers/data_request:', req.body.shop_domain);
  // No customer PII stored
  res.status(200).send('OK');
});

// GDPR: Delete shop data (uninstall cleanup)
router.post('/shop/redact', (req: Request, res: Response) => {
  if (!verifyWebhook(req)) { res.status(401).send('Unauthorized'); return; }
  console.log('GDPR shop/redact:', req.body.shop_domain);
  // Could clean up session data here
  res.status(200).send('OK');
});

export default router;
