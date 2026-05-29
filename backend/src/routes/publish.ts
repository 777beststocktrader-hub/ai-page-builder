import { Router, Request, Response } from 'express';
import { adminGraphql, getSessionForShop, getShopFromSessionToken } from '../shopify';

const router = Router();

function cleanShop(value: string): string {
  return value.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function gidNumber(gid: string): string {
  return gid.split('/').pop() || gid;
}

router.post('/', async (req: Request, res: Response) => {
  const tokenShop = getShopFromSessionToken(req);
  const shop = tokenShop || cleanShop((req.body.shop as string) || '');
  const { pageTitle, html } = req.body;

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
    const data = await adminGraphql<{
      pageCreate: {
        page: { id: string; handle: string; title: string } | null;
        userErrors: { field?: string[]; message: string }[];
      };
    }>(
      session.shop,
      session.accessToken,
      `#graphql
        mutation CreatePage($page: PageCreateInput!) {
          pageCreate(page: $page) {
            page {
              id
              title
              handle
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        page: {
          title: pageTitle,
          body: html,
          isPublished: true,
        },
      }
    );

    const errors = data.pageCreate.userErrors;
    if (errors.length || !data.pageCreate.page) {
      throw new Error(errors.map((e) => e.message).join('; ') || 'Page was not created');
    }

    const page = data.pageCreate.page;
    const pageUrl = `https://${session.shop}/pages/${page.handle}`;
    const adminUrl = `https://${session.shop}/admin/pages/${gidNumber(page.id)}`;

    console.log(`Published page: ${pageUrl}`);
    res.json({ success: true, page, url: pageUrl, adminUrl });
  } catch (err: any) {
    console.error('Publish error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/', async (req: Request, res: Response) => {
  const tokenShop = getShopFromSessionToken(req);
  const shop = tokenShop || cleanShop((req.query.shop as string) || '');
  if (!shop) {
    res.status(400).json({ error: 'Missing shop' });
    return;
  }

  const session = await getSessionForShop(shop);
  if (!session?.accessToken) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const data = await adminGraphql<{
      pages: { nodes: Array<{ id: string; title: string; handle: string; updatedAt: string }> };
    }>(
      session.shop,
      session.accessToken,
      `#graphql
        query Pages {
          pages(first: 50) {
            nodes {
              id
              title
              handle
              updatedAt
            }
          }
        }
      `
    );

    res.json({ pages: data.pages.nodes || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
