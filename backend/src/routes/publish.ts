import { Router, Request, Response } from 'express';
import { getSessionForShop } from '../shopify';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { shop, pageTitle, html } = req.body;

  if (!shop || !pageTitle || !html) {
    res.status(400).json({ success: false, error: 'Missing shop, pageTitle, or html' });
    return;
  }

  const session = await getSessionForShop(shop);
  if (!session?.accessToken) {
    res.status(401).json({
      success: false,
      error: 'Not authenticated. Please install the app first.',
      authUrl: `/api/auth?shop=${shop}`,
    });
    return;
  }

  try {
    // Create or update a page via Shopify REST Admin API
    const response = await fetch(
      `https://${session.shop}/admin/api/2024-01/pages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': session.accessToken,
        },
        body: JSON.stringify({
          page: {
            title: pageTitle,
            body_html: html,
            published: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Shopify API error: ${err}`);
    }

    const data = (await response.json()) as { page: { id: number; handle: string; title: string } };
    const pageUrl = `https://${session.shop}/pages/${data.page.handle}`;

    console.log(`✅ Published page: ${pageUrl}`);
    res.json({ success: true, page: data.page, url: pageUrl });
  } catch (err: any) {
    console.error('Publish error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// List pages published by this app for a shop
router.get('/', async (req: Request, res: Response) => {
  const shop = req.query.shop as string;
  if (!shop) { res.status(400).json({ error: 'Missing shop' }); return; }

  const session = await getSessionForShop(shop);
  if (!session?.accessToken) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const response = await fetch(
    `https://${session.shop}/admin/api/2024-01/pages.json?limit=50`,
    { headers: { 'X-Shopify-Access-Token': session.accessToken } }
  );
  const data = await response.json() as { pages: any[] };
  res.json({ pages: data.pages || [] });
});

export default router;
