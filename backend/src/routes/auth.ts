import { Router, Request, Response } from 'express';
import { adminGraphql, shopify, sessionStorage } from '../shopify';

const router = Router();

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

router.get('/callback', async (req: Request, res: Response) => {
  try {
    const callbackResponse = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    const { session } = callbackResponse;
    await sessionStorage.storeSession(session);

    console.log(`App installed on: ${session.shop}`);
    await registerWebhooks(session.shop, session.accessToken!);

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
    { topic: 'CUSTOMERS_REDACT', address: `${baseUrl}/api/webhooks/customers/redact` },
    { topic: 'CUSTOMERS_DATA_REQUEST', address: `${baseUrl}/api/webhooks/customers/data_request` },
    { topic: 'SHOP_REDACT', address: `${baseUrl}/api/webhooks/shop/redact` },
    { topic: 'APP_SUBSCRIPTIONS_UPDATE', address: `${baseUrl}/api/webhooks/app-subscriptions/update` },
  ];

  const mutation = `#graphql
    mutation WebhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
        webhookSubscription {
          id
          topic
          uri
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  for (const wh of webhooks) {
    try {
      const data = await adminGraphql<{
        webhookSubscriptionCreate: {
          userErrors: { field?: string[]; message: string }[];
        };
      }>(shop, accessToken, mutation, {
        topic: wh.topic,
        webhookSubscription: { uri: wh.address },
      });

      const errors = data.webhookSubscriptionCreate.userErrors;
      if (errors.length) {
        console.warn(`Webhook ${wh.topic} registration warning:`, errors.map((e) => e.message).join('; '));
      }
    } catch (err: any) {
      console.warn(`Webhook ${wh.topic} registration failed:`, err.message);
    }
  }
}

export default router;
