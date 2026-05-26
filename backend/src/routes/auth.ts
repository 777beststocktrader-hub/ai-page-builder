import { Router, Request, Response } from 'express';
import { shopify, sessionStorage } from '../shopify';

const router = Router();

// Step 1: Begin OAuth — redirect merchant to Shopify
router.get('/', async (req: Request, res: Response) => {
  const shop = req.query.shop as string;
  if (!shop) {
    res.status(400).send('Missing shop parameter');
    return;
  }

  try {
    await shopify.auth.begin({
      shop: shopify.utils.sanitizeShop(shop, true)!,
      callbackPath: '/api/auth/callback',
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });
  } catch (err: any) {
    console.error('Auth begin error:', err);
    res.status(500).send(err.message);
  }
});

// Step 2: OAuth callback — exchange code for token
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const callbackResponse = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    const { session } = callbackResponse;
    await sessionStorage.storeSession(session);

    console.log(`✅ App installed on: ${session.shop}`);

    // Register mandatory GDPR webhooks
    await registerWebhooks(session.shop, session.accessToken!);

    // Redirect into the Shopify admin embedded app
    const host = req.query.host as string;
    const redirectUrl = host
      ? `/?shop=${session.shop}&host=${host}`
      : `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`;

    res.redirect(redirectUrl);
  } catch (err: any) {
    console.error('Auth callback error:', err);
    res.status(500).send(err.message);
  }
});

async function registerWebhooks(shop: string, accessToken: string) {
  const baseUrl = process.env.APP_URL || 'https://your-app.railway.app';
  const webhooks = [
    { topic: 'customers/redact', address: `${baseUrl}/api/webhooks/customers/redact` },
    { topic: 'customers/data_request', address: `${baseUrl}/api/webhooks/customers/data_request` },
    { topic: 'shop/redact', address: `${baseUrl}/api/webhooks/shop/redact` },
  ];

  for (const wh of webhooks) {
    try {
      await fetch(`https://${shop}/admin/api/2024-01/webhooks.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({
          webhook: { topic: wh.topic, address: wh.address, format: 'json' },
        }),
      });
    } catch {}
  }
}

export default router;
