import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import Anthropic from '@anthropic-ai/sdk';
import authRouter from './routes/auth';
import webhooksRouter from './routes/webhooks';
import publishRouter from './routes/publish';
import billingRouter from './routes/billing';
import { getLocalBillingStatus, getShopifyBillingStatus } from './billing';
import { adminGraphql, getSessionForShop, getShopFromSessionToken } from './shopify';
import { initDb } from './db';

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const IS_PROD = process.env.NODE_ENV === 'production';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests — please wait a moment and try again.' },
});

const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many uploads — please wait.' },
});

// Image upload config
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    cb(null, /image\/(jpeg|jpg|png|webp|gif|svg\+xml)/.test(file.mimetype));
  },
});

// Raw body capture for billing and Shopify webhook HMAC verification
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }), (req, _res, next) => {
  if (Buffer.isBuffer(req.body)) {
    (req as any).rawBody = req.body;
    req.body = JSON.parse(req.body.toString());
  }
  next();
});
app.use('/api/webhooks', express.raw({ type: 'application/json' }), (req, _res, next) => {
  if (Buffer.isBuffer(req.body)) {
    (req as any).rawBody = req.body;
    req.body = JSON.parse(req.body.toString());
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (IS_PROD) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Content-Security-Policy for Shopify embedded app
app.use((req, res, next) => {
  const rawShop = Array.isArray(req.query.shop) ? req.query.shop[0] : req.query.shop;
  const shop = typeof rawShop === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(rawShop)
    ? rawShop
    : null;
  const frameAncestors = shop
    ? `https://${shop} https://admin.shopify.com`
    : 'https://*.myshopify.com https://admin.shopify.com';

  res.setHeader('Content-Security-Policy', `frame-ancestors ${frameAncestors};`);
  next();
});

app.use(
  cors({
    origin: [FRONTEND_URL, 'https://admin.shopify.com', /\.myshopify\.com$/],
    credentials: true,
  })
);

// ── Billing (Shopify Billing API) ──────────────────────────────────────────────────────
app.use('/api/billing', billingRouter);

// ── Billing middleware — gates AI routes after trial expires ──────────────
async function requireBilling(req: any, res: any, next: any) {
  try {
    const tokenShop = getShopFromSessionToken(req);
    const clientId = (tokenShop || req.headers['x-client-id'] as string || req.query.clientId as string || '').trim();
    if (!clientId) return next();

    const status = clientId.endsWith('.myshopify.com')
      ? await getShopifyBillingStatus(clientId)
      : getLocalBillingStatus(clientId);

    if (status.status === 'expired') {
      return res.status(402).json({
        success: false,
        error: 'Your free trial has ended. Please approve the Shopify subscription to continue.',
        billingRequired: true,
      });
    }

    next();
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// ── Shopify OAuth ──────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);

// ── GDPR Webhooks (required for App Store) ────────────────────────────────
app.use('/api/webhooks', webhooksRouter);

// ── Publish pages to Shopify ──────────────────────────────────────────────
app.use('/api/shopify/publish', publishRouter);


// ── Image Upload ──────────────────────────────────────────────────────────
app.use('/uploads', express.static(UPLOADS_DIR));
app.post('/api/upload', uploadRateLimit, upload.single('image'), (req: any, res) => {
  const shop = getShopFromSessionToken(req);
  const clientId = (shop || (req.headers['x-client-id'] as string) || '').trim();
  if (!clientId) {
    if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
    return res.status(401).json({ success: false, error: 'Authentication required to upload images.' });
  }
  if (!req.file) return res.status(400).json({ success: false, error: 'No image provided or invalid type' });
  const ext = req.file.mimetype.split('/')[1].replace('svg+xml', 'svg');
  const newName = `${req.file.filename}.${ext}`;
  fs.renameSync(req.file.path, path.join(UPLOADS_DIR, newName));
  const url = `/uploads/${newName}`;
  console.log(`Image uploaded: ${newName}`);
  res.json({ success: true, url });
});

// ── Health check ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', model: 'claude-opus-4-8' });
});

// ── Session check — used on app mount to detect expired sessions ──────────
app.get('/api/session', async (req, res) => {
  const shop = normalizeShopDomain(req.query.shop);
  if (!shop) return res.json({ valid: false });
  const adminShop = await resolveAdminShopDomain(shop);
  const session = await getSessionForShop(adminShop);
  if (!session?.accessToken) {
    return res.json({
      valid: false,
      shop,
      adminShop,
      reinstallUrl: reinstallUrlForShop(adminShop),
    });
  }
  res.json({ valid: true, shop, adminShop });
});

// ── AI Content Generation ─────────────────────────────────────────────────
app.use('/api/ai', aiRateLimit);
app.post('/api/ai/generate', requireBilling, async (req, res) => {
  const { prompt, blockType, tone = 'professional', currentData, context } = req.body;

  const toneGuide: Record<string, string> = {
    professional: 'formal, trustworthy, business-appropriate',
    casual: 'friendly, conversational, approachable',
    marketing: 'persuasive, exciting, action-oriented, benefit-focused',
    playful: 'fun, energetic, creative, witty',
  };

  const contextLine = context ? `\nPage context: ${context}` : '';
  const langLine = req.body.language && req.body.language !== 'English' ? `\nWrite all copy in: ${req.body.language}` : '';

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1500,
      system: 'You are an expert copywriter. Generate web page content. Respond with valid JSON only. No markdown, no explanations.',
      messages: [{
        role: 'user',
        content: `Generate fresh content for a "${blockType}" web section.${contextLine}${langLine}
User request: "${prompt}"
Tone: ${toneGuide[tone] || toneGuide.professional}
Current JSON (keep EXACT same keys, replace values):
${JSON.stringify(currentData, null, 2)}
Rules: Keep all keys. Headlines under 10 words. Keep URLs as "#". Keep color hex values unchanged. For arrays, keep same item count. Respond with JSON only:`,
      }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    const data = match ? JSON.parse(match[0]) : currentData;
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('AI error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Shopify Products Fetch ────────────────────────────────────────────────
function stripProductHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePublicTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((tag): tag is string => typeof tag === 'string');
  if (typeof value === 'string') return value.split(',').map((tag) => tag.trim()).filter(Boolean);
  return [];
}

const PUBLIC_SHOPIFY_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36';

function normalizeShopDomain(value: unknown): string {
  return String(value || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
}

function isMyshopifyDomain(shop: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop);
}

function reinstallUrlForShop(shop: string): string | undefined {
  return isMyshopifyDomain(shop) ? `/api/auth?shop=${shop}` : undefined;
}

async function resolveAdminShopDomain(shop: string): Promise<string> {
  if (!shop || isMyshopifyDomain(shop)) return shop;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const metaResponse = await fetch(`https://${shop}/meta.json`, {
      headers: { 'User-Agent': PUBLIC_SHOPIFY_USER_AGENT },
      signal: controller.signal,
    });
    if (metaResponse.ok) {
      const meta = await metaResponse.json() as { myshopify_domain?: string };
      const metaShop = normalizeShopDomain(meta.myshopify_domain);
      if (isMyshopifyDomain(metaShop)) return metaShop;
    }

    const response = await fetch(`https://${shop}`, {
      headers: { 'User-Agent': PUBLIC_SHOPIFY_USER_AGENT },
      signal: controller.signal,
    });
    const html = await response.text();
    const match = html.match(/([a-z0-9][a-z0-9-]*\.myshopify\.com)/i);
    return match?.[1]?.toLowerCase() || shop;
  } catch {
    return shop;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeVariantAvailability(variants: any[]) {
  const shaped = (Array.isArray(variants) ? variants : [])
    .map((variant) => ({
      id: variant?.id,
      title: variant?.title || variant?.option1 || 'Default',
      available: variant?.available !== false && variant?.availableForSale !== false,
      inventoryManagement: variant?.inventory_management || null,
      inventoryPolicy: variant?.inventory_policy || variant?.inventoryPolicy || null,
      inventoryQuantity: typeof variant?.inventory_quantity === 'number'
        ? variant.inventory_quantity
        : typeof variant?.inventoryQuantity === 'number'
          ? variant.inventoryQuantity
          : null,
    }));

  const availableCount = shaped.filter((variant) => variant.available).length;
  return {
    variants: shaped,
    available: shaped.length === 0 || availableCount > 0,
    availableVariantCount: availableCount,
  };
}

function buildAvailabilityWarning(available: boolean, variantCount: number) {
  if (available) return '';
  return variantCount > 1
    ? 'All variants are unavailable. Check inventory tracking or click Fix availability after reconnecting Shopify.'
    : 'This product is unavailable. Check inventory tracking or click Fix availability after reconnecting Shopify.';
}

async function fetchPublicShopifyProducts(shop: string) {
  const response = await fetch(`https://${shop}/products.json?limit=50`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': PUBLIC_SHOPIFY_USER_AGENT,
    },
  });

  if (!response.ok) throw new Error(`Public products unavailable (${response.status})`);

  const data = await response.json() as { products?: any[] };
  return (data.products || [])
    .filter((p) => p?.title)
    .map((p) => {
      const firstVariant = Array.isArray(p.variants) ? p.variants[0] : null;
      const firstImage = Array.isArray(p.images) ? p.images[0] : null;
      const productImages = Array.isArray(p.images)
        ? p.images.map((image: any) => image?.src).filter((src: unknown): src is string => typeof src === 'string' && /^https?:\/\//i.test(src))
        : [];
      const availability = normalizeVariantAvailability(Array.isArray(p.variants) ? p.variants : []);
      return {
        id: p.id,
        title: p.title,
        description: stripProductHtml(p.body_html || '').slice(0, 500),
        vendor: p.vendor || '',
        productType: p.product_type || '',
        tags: normalizePublicTags(p.tags),
        price: firstVariant?.price || '0.00',
        comparePrice: firstVariant?.compare_at_price || null,
        image: firstImage?.src || p.image?.src || null,
        images: productImages,
        handle: p.handle,
        variantCount: Array.isArray(p.variants) ? p.variants.length : 1,
        available: availability.available,
        availableVariantCount: availability.availableVariantCount,
        variantAvailability: availability.variants,
        availabilityWarning: buildAvailabilityWarning(availability.available, Array.isArray(p.variants) ? p.variants.length : 1),
      };
    });
}

async function shopifyAdminRest<T>(
  shop: string,
  accessToken: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiVersion = process.env.SHOPIFY_API_VERSION || '2026-01';
  const response = await fetch(`https://${shop}/admin/api/${apiVersion}${endpoint}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`Shopify REST error (${response.status}): ${JSON.stringify(data)}`);
  }

  return data as T;
}

app.get('/api/shopify/products', async (req, res) => {
  const tokenShop = getShopFromSessionToken(req);
  const shop = normalizeShopDomain(tokenShop || req.query.shop);

  if (!shop) return res.status(400).json({ success: false, error: 'shop required' });

  let adminShop = shop;
  let session = await getSessionForShop(adminShop);

  if (!session?.accessToken && !isMyshopifyDomain(shop)) {
    try {
      const publicProducts = await fetchPublicShopifyProducts(shop);
      if (publicProducts.length > 0) {
        adminShop = await resolveAdminShopDomain(shop);
        return res.json({
          success: true,
          products: publicProducts,
          source: 'public-storefront',
          shop,
          adminShop,
          warning: 'Using public storefront products. Reconnect Shopify admin access to publish pages.',
        });
      }
    } catch (err: any) {
      console.warn(`Public products fallback failed for ${shop}:`, err.message);
    }

    adminShop = await resolveAdminShopDomain(shop);
    session = await getSessionForShop(adminShop);
  }

  if (!session?.accessToken) {
    try {
      const publicProducts = await fetchPublicShopifyProducts(shop);
      if (publicProducts.length > 0) {
        return res.json({
          success: true,
          products: publicProducts,
          source: 'public-storefront',
          shop,
          adminShop,
          warning: 'Using public storefront products. Reconnect Shopify admin access to publish pages.',
        });
      }
    } catch (err: any) {
      console.warn(`Public products fallback failed for ${shop}:`, err.message);
    }

    return res.status(401).json({
      success: false,
      error: 'Not authenticated. Reinstall PageGenie from Shopify admin to reconnect products.',
      reinstallUrl: reinstallUrlForShop(adminShop),
      requiresReconnect: true,
    });
  }

  try {
    const data = await adminGraphql<{
      products: {
        nodes: Array<{
          id: string;
          title: string;
          descriptionHtml: string;
          vendor: string;
          productType: string;
          tags: string[];
          handle: string;
          status: string;
          featuredMedia?: { preview?: { image?: { url?: string } } } | null;
          variants: {
            nodes: Array<{
              id: string;
              price: string;
              compareAtPrice?: string | null;
              availableForSale?: boolean;
              inventoryPolicy?: string | null;
              inventoryQuantity?: number | null;
            }>;
          };
        }>;
      };
    }>(
      session.shop,
      session.accessToken,
      `#graphql
        query ProductsForLandingPages {
          products(first: 50) {
            nodes {
              id
              title
              descriptionHtml
              vendor
              productType
              tags
              handle
              status
              featuredMedia {
                preview {
                  image {
                    url
                  }
                }
              }
              variants(first: 50) {
                nodes {
                  id
                  price
                  compareAtPrice
                  availableForSale
                  inventoryPolicy
                  inventoryQuantity
                }
              }
            }
          }
        }
      `
    );

    const shaped = data.products.nodes
      .filter((p) => p.status === 'ACTIVE' || !p.status)
      .map((p: any) => {
        const variants = Array.isArray(p.variants?.nodes) ? p.variants.nodes : [];
        const availability = normalizeVariantAvailability(variants);
        const variantCount = variants.length || 1;

        return {
          id: Number(String(p.id).split('/').pop()) || p.id,
          title: p.title,
          description: (p.descriptionHtml || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500),
          vendor: p.vendor || '',
          productType: p.productType || '',
          tags: Array.isArray(p.tags) ? p.tags : [],
          price: variants?.[0]?.price || '0.00',
          comparePrice: variants?.[0]?.compareAtPrice || null,
          image: p.featuredMedia?.preview?.image?.url || null,
          images: p.featuredMedia?.preview?.image?.url ? [p.featuredMedia.preview.image.url] : [],
          handle: p.handle,
          variantCount,
          available: availability.available,
          availableVariantCount: availability.availableVariantCount,
          variantAvailability: availability.variants,
          availabilityWarning: buildAvailabilityWarning(availability.available, variantCount),
        };
      });

    res.json({ success: true, products: shaped });
  } catch (err: any) {
    console.error('Products fetch error:', err.message);
    try {
      const publicProducts = await fetchPublicShopifyProducts(shop);
      if (publicProducts.length > 0) {
        return res.json({
          success: true,
          products: publicProducts,
          source: 'public-storefront',
          warning: 'Using public storefront products because Shopify admin fetch failed.',
          shop,
          adminShop,
        });
      }
    } catch (fallbackErr: any) {
      console.warn(`Public products fallback failed for ${shop}:`, fallbackErr.message);
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── AI Generate Page from Product ─────────────────────────────────────────
app.post('/api/shopify/products/fix-availability', async (req, res) => {
  const tokenShop = getShopFromSessionToken(req);
  const shop = normalizeShopDomain(tokenShop || req.body.shop);
  const handle = String(req.body.handle || '').trim();

  if (!shop || !handle) {
    return res.status(400).json({ success: false, error: 'shop and handle are required' });
  }

  const adminShop = await resolveAdminShopDomain(shop);
  const session = await getSessionForShop(adminShop);
  if (!session?.accessToken) {
    return res.status(401).json({
      success: false,
      error: 'Reconnect PageGenie from Shopify admin before fixing product availability.',
      shop,
      adminShop,
      reinstallUrl: reinstallUrlForShop(adminShop),
      requiresReconnect: true,
    });
  }

  try {
    const lookup = await shopifyAdminRest<{ products?: any[] }>(
      session.shop,
      session.accessToken,
      `/products.json?handle=${encodeURIComponent(handle)}`
    );
    const product = lookup.products?.[0];
    if (!product) {
      return res.status(404).json({ success: false, error: `No product found for handle "${handle}"` });
    }

    const variants = Array.isArray(product.variants) ? product.variants : [];
    const updated = [];

    for (const variant of variants) {
      const needsFix = variant.inventory_management || variant.inventory_policy !== 'continue';
      if (!needsFix) {
        updated.push({
          id: variant.id,
          title: variant.title,
          changed: false,
          inventory_management: variant.inventory_management || null,
          inventory_policy: variant.inventory_policy || null,
        });
        continue;
      }

      const result = await shopifyAdminRest<{ variant: any }>(
        session.shop,
        session.accessToken,
        `/variants/${variant.id}.json`,
        {
          method: 'PUT',
          body: JSON.stringify({
            variant: {
              id: variant.id,
              inventory_management: null,
              inventory_policy: 'continue',
            },
          }),
        }
      );

      updated.push({
        id: result.variant?.id || variant.id,
        title: result.variant?.title || variant.title,
        changed: true,
        inventory_management: result.variant?.inventory_management || null,
        inventory_policy: result.variant?.inventory_policy || null,
      });
    }

    res.json({
      success: true,
      product: { id: product.id, title: product.title, handle: product.handle },
      variants: updated,
      changedCount: updated.filter((variant) => variant.changed).length,
    });
  } catch (err: any) {
    const message = err?.message || 'Failed to fix product availability';
    const needsReconnect = /access|scope|forbidden|permission|write_products/i.test(message);
    res.status(needsReconnect ? 403 : 500).json({
      success: false,
      error: needsReconnect
        ? 'Reconnect PageGenie to approve product editing, then try Fix availability again.'
        : message,
      reinstallUrl: needsReconnect ? reinstallUrlForShop(adminShop) : undefined,
      requiresReconnect: needsReconnect,
    });
  }
});

type GeneratedBlock = { type: string; data: Record<string, any> };
type ImportedReview = { quote: string; name?: string; role?: string; rating?: number; imageUrl?: string };
const REVIEW_TARGET_COUNT = 15;
const REVIEW_COLORS = ['#4f46e5', '#0891b2', '#059669', '#dc2626', '#7c3aed'];
const BUY_BUTTON_COLOR = '#f97316';
const TRUST_GREEN = '#22c55e';
const PREMIUM_DARK_FROM = '#07111f';
const PREMIUM_DARK_TO = '#162033';

function cleanTitle(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s&'-]/g, '')
    .trim()
    .slice(0, 64) || 'Your Product';
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'CU';
}

function sanitizeEnglishReviewText(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, ' - ')
    .replace(/\u2026/g, '...')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeGeneratedText(value: string): string {
  return sanitizeEnglishReviewText(value)
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/\s+-\s+/g, ' - ')
    .trim();
}

function sanitizeGeneratedValue(key: string, value: any): any {
  if (typeof value === 'string') {
    const clean = sanitizeGeneratedText(value);
    return key.toLowerCase().includes('icon') && !clean ? '+' : clean;
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeGeneratedValue('', item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [childKey, sanitizeGeneratedValue(childKey, childValue)])
    );
  }
  return value;
}

function sanitizeGeneratedBlocks(blocks: GeneratedBlock[]) {
  blocks.forEach((block) => {
    block.data = sanitizeGeneratedValue('data', block.data || {});
  });
}

function isLikelyEnglishReview(value: string): boolean {
  const text = sanitizeEnglishReviewText(value).toLowerCase();
  const words = text.match(/[a-z]+/g) || [];
  if (words.length < 3) return false;

  const signals = text.match(/\b(the|and|is|it|this|that|with|for|to|of|in|on|my|i|was|very|good|great|love|quality|product|charging|fast|stand|cable|works|use|easy|nice|perfect|recommend|bought|arrived|feels|looks)\b/g) || [];
  return signals.length >= 2;
}

function normalizeImportedReviews(value: unknown): ImportedReview[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === 'string') return { quote: item };
      if (!item || typeof item !== 'object') return null;
      const raw = item as Record<string, any>;
      return {
        quote: sanitizeEnglishReviewText(String(raw.quote || raw.review || raw.text || '')),
        name: raw.name ? sanitizeEnglishReviewText(String(raw.name)) : undefined,
        role: raw.role ? sanitizeEnglishReviewText(String(raw.role)) : undefined,
        rating: Number(raw.rating) || undefined,
        imageUrl: typeof raw.imageUrl === 'string' && /^https?:\/\//i.test(raw.imageUrl.trim())
          ? raw.imageUrl.trim()
          : undefined,
      };
    })
    .filter((item): item is ImportedReview => !!item?.quote && item.quote.length >= 8 && isLikelyEnglishReview(item.quote))
    .slice(0, REVIEW_TARGET_COUNT);
}

function isSameImageUrl(a?: string, b?: string) {
  if (!a || !b) return false;
  try {
    const urlA = new URL(a);
    const urlB = new URL(b);
    return `${urlA.host}${urlA.pathname}`.toLowerCase() === `${urlB.host}${urlB.pathname}`.toLowerCase();
  } catch {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }
}

function buildReviewSet(productName: string, existing: any[] = [], fillMissing = true): any[] {
  const names = [
    'Nathan P.', 'Jim M.', 'Milo W.', 'Ari L.', 'Camila R.',
    'Devin K.', 'Sofia N.', 'Ethan B.', 'Layla T.', 'Noah G.',
    'Maya C.', 'Jordan S.', 'Priya A.', 'Leo V.', 'Hannah D.',
  ];
  const quotes = [
    `The ${productName} does exactly what I needed. It feels useful right away and the setup is simple.`,
    'Good product and good quality. It made my everyday routine easier than I expected.',
    'Very convenient to have everything in one place. I use it almost every day now.',
    'The design feels smart, compact, and easy to carry. I would buy it again.',
    'I liked that the benefits were clear before I ordered. It matched what the page promised.',
    'The quality feels better than the cheaper options I tried before.',
    'This solved a small daily problem I kept ignoring. Really happy with it.',
    'It arrived looking clean and worked right away. No confusing setup.',
    'I bought one as a test and ended up recommending it to a friend.',
    'The product feels practical, not gimmicky. That is what made it worth it for me.',
    'I use it at my desk, by the bed, and when traveling. Super handy.',
    'The price felt fair for how often I use it.',
    'It is simple, useful, and looks better than I expected.',
    'This is one of those products that makes sense once you try it.',
    'I was skeptical at first, but it became part of my daily setup fast.',
  ];
  const roles = [
    'Daily user', 'Customer', 'Repeat buyer', 'Desk setup user', 'Gift buyer',
    'Mobile shopper', 'Home office user', 'Travel customer', 'Tech buyer', 'Busy parent',
    'Student', 'Remote worker', 'First-time buyer', 'Practical shopper', 'Happy customer',
  ];

  const normalized = (existing || [])
    .filter((item) => item?.quote && item?.name)
    .map((item, index) => {
      const role = String(item.role || roles[index % roles.length])
        .replace(/verified\s+(buyer|customer)/ig, 'Customer')
        .replace(/\s+/g, ' ')
        .trim();
      const quote = sanitizeEnglishReviewText(String(item.quote));
      const name = sanitizeEnglishReviewText(String(item.name));
      return {
        quote: quote.slice(0, 180),
        name: name.slice(0, 40),
        role: sanitizeEnglishReviewText(role || roles[index % roles.length]).slice(0, 40),
        avatar: String(item.avatar || getInitials(name)).slice(0, 3).toUpperCase(),
        avatarBg: String(item.avatarBg || REVIEW_COLORS[index % REVIEW_COLORS.length]),
        imageUrl: typeof item.imageUrl === 'string' && /^https?:\/\//i.test(item.imageUrl) ? item.imageUrl : '',
      };
    })
    .filter((item) => item.quote.length >= 8 && isLikelyEnglishReview(item.quote));

  if (!fillMissing) return normalized.slice(0, REVIEW_TARGET_COUNT);

  for (let i = normalized.length; i < REVIEW_TARGET_COUNT; i++) {
    const name = names[i % names.length];
    normalized.push({
      quote: quotes[i % quotes.length],
      name,
      role: roles[i % roles.length],
      avatar: getInitials(name),
      avatarBg: REVIEW_COLORS[i % REVIEW_COLORS.length],
      imageUrl: '',
    });
  }

  return normalized.slice(0, REVIEW_TARGET_COUNT);
}

function ensureFifteenReviews(blocks: GeneratedBlock[], productName: string, importedReviews: ImportedReview[] = [], productImage = '') {
  let block = blocks.find((b) => b.type === 'testimonials');
  if (!block) {
    const footerIndex = blocks.findIndex((b) => b.type === 'footer');
    block = {
      type: 'testimonials',
      data: {
        title: 'What customers are saying',
        testimonials: [],
      },
    };
    if (footerIndex >= 0) blocks.splice(footerIndex, 0, block);
    else blocks.push(block);
  }

  block.data = block.data || {};
  block.data.title = block.data.title || 'What customers are saying';
  if (importedReviews.length > 0) {
    block.data.title = 'Real customer reviews';
    block.data.testimonials = buildReviewSet(productName, importedReviews.map((review, index) => ({
      quote: review.quote,
      name: review.name || `Customer ${index + 1}`,
      role: review.role || 'AliExpress review',
      imageUrl: isSameImageUrl(review.imageUrl, productImage) ? undefined : review.imageUrl,
      avatar: getInitials(review.name || `Customer ${index + 1}`),
      avatarBg: REVIEW_COLORS[index % REVIEW_COLORS.length],
    })), true);
    return;
  }
  block.data.testimonials = buildReviewSet(productName, Array.isArray(block.data.testimonials) ? block.data.testimonials : []);
}

function getProductImageGallery(product: any): string[] {
  const urls = [
    ...(Array.isArray(product?.images) ? product.images : []),
    product?.image,
  ];
  const seen = new Set<string>();
  return urls
    .filter((url): url is string => typeof url === 'string' && /^https?:\/\//i.test(url))
    .filter((url) => {
      const key = url.split('?')[0].toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

function ensureProductGallery(blocks: GeneratedBlock[], product: any) {
  const images = getProductImageGallery(product);
  if (images.length < 2 || blocks.some((b) => b.type === 'gallery')) return;

  const galleryBlock: GeneratedBlock = {
    type: 'gallery',
    data: {
      title: 'Real product photos',
      subtitle: 'Actual listing photos so shoppers can see the product from multiple angles.',
      layout: images.length >= 4 ? 'featured' : 'grid3',
      images: images.map((url, index) => ({
        url,
        caption: index === 0 ? 'Main product photo' : `Product angle ${index + 1}`,
      })),
      bgColor: '#ffffff',
    },
  };

  const insertIndex = blocks.findIndex((b) => b.type === 'testimonials');
  if (insertIndex >= 0) blocks.splice(insertIndex, 0, galleryBlock);
  else blocks.push(galleryBlock);
}

function applyConversionPalette(blocks: GeneratedBlock[]) {
  const heroBlock = blocks.find((b) => b.type === 'hero');
  if (heroBlock) {
    heroBlock.data = heroBlock.data || {};
    heroBlock.data.bgFrom = PREMIUM_DARK_FROM;
    heroBlock.data.bgTo = PREMIUM_DARK_TO;
    heroBlock.data.primaryBtnColor = BUY_BUTTON_COLOR;
    heroBlock.data.primaryBtnTextColor = '#ffffff';
  }

  blocks.forEach((block) => {
    block.data = block.data || {};
    if (block.type === 'cta') {
      block.data.bgColor = PREMIUM_DARK_FROM;
      block.data.primaryBtnColor = BUY_BUTTON_COLOR;
      block.data.primaryBtnTextColor = '#ffffff';
    }
    if (block.type === 'cta-banner') {
      block.data.bgColor = PREMIUM_DARK_FROM;
      block.data.textColor = '#ffffff';
      block.data.btnColor = BUY_BUTTON_COLOR;
    }
    if (block.type === 'stats') {
      block.data.bgColor = PREMIUM_DARK_TO;
    }
  });
}

function buildFallbackGeneratedPage(pageGoal: string, product?: any, shop?: string): { tagline: string; blocks: GeneratedBlock[] } {
  const productName = cleanTitle(product?.title || pageGoal);
  const price = product?.price ? `$${product.price}` : '';
  const productUrl = product?.handle && shop ? `https://${shop}/products/${product.handle}` : '#';
  const primaryBtn = price ? `Buy Now - ${price}` : 'Start Building';
  const productDescription = String(product?.description || '');
  const heroSubheadline = productDescription
    ? `${productDescription.slice(0, 160)}${productDescription.length > 160 ? '...' : ''}`
    : 'A clean, conversion-ready page with product story, proof, benefits, FAQ, and a clear buying path.';

  return {
    tagline: `${productName} landing page`,
    blocks: [
      {
        type: 'hero',
        data: {
          variant: product?.image ? 'split' : 'minimal',
          eyebrow: product?.vendor || 'AI-built Shopify page',
          headline: productName,
          subheadline: heroSubheadline,
          primaryBtn,
          primaryBtnHref: productUrl,
          primaryBtnColor: BUY_BUTTON_COLOR,
          primaryBtnTextColor: '#ffffff',
          secondaryBtn: 'See Details',
          imageUrl: product?.image || '',
          bgFrom: PREMIUM_DARK_FROM,
          bgTo: PREMIUM_DARK_TO,
        },
      },
      {
        type: 'features',
        data: {
          variant: 'grid',
          title: `Why shoppers choose ${productName}`,
          subtitle: 'Turn product details into clear buying reasons that help visitors feel confident fast.',
          features: [
            { icon: '01', title: 'Clear value', description: 'The page explains what the product does, who it is for, and why it is worth buying.' },
            { icon: '02', title: 'Trust near checkout', description: 'Reviews, shipping details, and return reassurance are close to the call to action.' },
            { icon: '03', title: 'Made for mobile', description: 'Sections stay simple and scannable so shoppers can understand the offer on any screen.' },
            { icon: '04', title: 'Product story', description: 'The layout moves from the product promise into benefits, proof, questions, and purchase.' },
            { icon: '05', title: 'Easy editing', description: 'Every headline, section, and button can be edited after the starter page loads.' },
            { icon: '06', title: 'Launch-ready flow', description: 'The page gives merchants a polished starting point instead of a blank canvas.' },
          ],
        },
      },
      {
        type: 'stats',
        data: {
          title: 'Proof shoppers look for',
          stats: [
            { value: '4.9/5', label: 'Review target' },
            { value: '30 days', label: 'Return window' },
            { value: 'Fast', label: 'Shipping promise' },
            { value: '24h', label: 'Support response' },
          ],
          bgColor: PREMIUM_DARK_TO,
        },
      },
      {
        type: 'steps',
        data: {
          title: 'How the buying path works',
          subtitle: 'A simple three-step flow helps customers know what happens next.',
          steps: [
            { icon: '1', title: 'Choose the product', description: 'Show the offer clearly with benefits, visuals, and the main checkout action.' },
            { icon: '2', title: 'Confirm the details', description: 'Answer shipping, returns, sizing, or quality questions before hesitation builds.' },
            { icon: '3', title: 'Checkout with confidence', description: 'End with a focused section that repeats the offer and removes final friction.' },
          ],
          bgColor: '#f8fafc',
        },
      },
      {
        type: 'testimonials',
        data: {
          title: 'Reviews that build confidence',
          testimonials: buildReviewSet(productName),
        },
      },
      {
        type: 'faq',
        data: {
          title: 'Questions before checkout',
          items: [
            { question: 'Can I edit this page?', answer: 'Yes. Every section, headline, image, and button can be customized in PageGenie.' },
            { question: 'Can this link to my Shopify product?', answer: 'Yes. Add your product link to the main buy buttons before publishing.' },
            { question: 'Does it work for mobile shoppers?', answer: 'Yes. The sections are designed to stay clean and readable on smaller screens.' },
            { question: 'What should I change first?', answer: 'Start with the product name, offer, real reviews, shipping promise, and product image.' },
          ],
        },
      },
      {
        type: 'cta-banner',
        data: {
          headline: `Ready to sell ${productName}?`,
          subtext: 'Use this starter page as a polished base, then swap in your real product details and publish.',
          btnText: primaryBtn,
          btnLink: productUrl,
          secondBtnText: 'Edit Page',
          bgColor: PREMIUM_DARK_FROM,
          textColor: '#ffffff',
          btnColor: BUY_BUTTON_COLOR,
        },
      },
      {
        type: 'footer',
        data: {
          brand: product?.vendor || 'Your Store',
          tagline: 'Product pages built with PageGenie.',
          copyright: `(c) ${new Date().getFullYear()} Your Store. All rights reserved.`,
          links: 'Shop,Reviews,FAQ,Contact',
          bgColor: '#ffffff',
        },
      },
    ],
  };
}

app.post('/api/ai/generate-from-product', requireBilling, async (req, res) => {
  const { product } = req.body;
  if (!product?.title) return res.status(400).json({ success: false, error: 'product required' });
  const importedReviews = normalizeImportedReviews(req.body.reviews);

  const priceStr = product.comparePrice
    ? `$${product.price} (was $${product.comparePrice})`
    : `$${product.price}`;

  const productContext = [
    `Product name: ${product.title}`,
    product.vendor ? `Brand: ${product.vendor}` : '',
    product.productType ? `Category: ${product.productType}` : '',
    `Price: ${priceStr}`,
    product.description ? `Description: ${product.description}` : '',
    product.tags?.length ? `Tags/keywords: ${product.tags.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      system: 'You are an expert e-commerce copywriter and conversion specialist. Write compelling product landing page copy. Respond with valid JSON only. No markdown.',
      messages: [{
        role: 'user',
        content: `Create a complete, high-converting Shopify product landing page for this product:

${productContext}

Return ONLY this JSON (no markdown, no extra text):
{"tagline":"short tagline","blocks":[{"type":"block_type","data":{...}}]}

Block types with exact data shapes:
hero: {"variant":"centered","eyebrow":"str","headline":"str","subheadline":"str","primaryBtn":"str","secondaryBtn":"str","bgFrom":"#hex","bgTo":"#hex"}
features: {"variant":"grid","title":"str","subtitle":"str","features":[{"icon":"ASCII text","title":"str","description":"str"}]}
steps: {"title":"str","subtitle":"str","steps":[{"icon":"ASCII text","title":"str","description":"str"}],"bgColor":"#hex"}
pricing: {"title":"str","subtitle":"str","plans":[{"name":"str","price":"str","period":"str","description":"str","cta":"str","highlighted":"true|false","features":"comma,separated"}]}
testimonials: {"title":"str","testimonials":[{"quote":"str","name":"str","role":"str","avatar":"XY","avatarBg":"#hex"}]}
cta: {"headline":"str","subtext":"str","primaryBtn":"str","secondaryBtn":"str","bgColor":"#hex"}
faq: {"title":"str","items":[{"question":"str","answer":"str"}]}
stats: {"title":"str","stats":[{"value":"str","label":"str"}],"bgColor":"#hex"}
footer: {"brand":"str","tagline":"str","copyright":"str","links":"About,Pricing,Blog,Contact","bgColor":"#hex"}
logo-cloud: {"title":"str","logos":[{"name":"str","initial":"XY"}]}

Rules:
- Write all visible copy in English only.
- Use ASCII punctuation only. Do not use emojis, smart quotes, bullets, arrows, or special symbols.
- Icon fields must be ASCII text only, such as "+", "01", "02", or "03".
- Choose 7-8 blocks: always start hero, always end footer
- Write SPECIFIC copy about THIS product — use the real product name, real price, real benefits
- Hero headline: make it about the transformation/benefit this product delivers
- Hero primaryBtn: "Buy Now — ${priceStr}" or "Get Yours for ${priceStr}"
- Hero eyebrow: something like "New Arrival" or "Top Rated" or the brand name
- features: exactly 6 items — specific product benefits/features with relevant emojis
- testimonials: exactly 15 concise customer-style reviews in English only for this type of product
- faq: 4 specific questions buyers ask about this type of product
- stats: 4 numbers that build credibility (customer count, rating, satisfaction %, etc.)
- If comparePrice exists, highlight the savings in the hero subheadline
- steps: "How it works" — 3 steps (order → receive → enjoy/use)
- bgFrom/bgTo: use a premium high-converting tech gradient from "${PREMIUM_DARK_FROM}" to "${PREMIUM_DARK_TO}"
- use orange "${BUY_BUTTON_COLOR}" for buy buttons and green "${TRUST_GREEN}" only for trust/proof accents
- avoid gold/yellow as a main color
- avatarBg: vary "#4f46e5","#0891b2","#059669","#dc2626"`,
      }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ success: false, error: 'Invalid AI response' });

    let data: any;
    try { data = JSON.parse(match[0]); }
    catch {
      const cleaned = match[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      try { data = JSON.parse(cleaned); }
      catch { return res.status(500).json({ success: false, error: 'JSON parse error — please try again' }); }
    }

    if (!Array.isArray(data.blocks) || data.blocks.length === 0) {
      return res.status(500).json({ success: false, error: 'No blocks generated — please try again' });
    }

    const VALID_TYPES = new Set(['banner','navbar','hero','features','pricing','testimonials','cta','faq','text-content','stats','footer','video','logo-cloud','newsletter','richtext','contact','steps','countdown','gallery','embed','divider','testimonial-single','cta-banner','custom-html']);
    data.blocks = data.blocks.filter((b: any) => VALID_TYPES.has(b.type));
    sanitizeGeneratedBlocks(data.blocks);
    ensureProductGallery(data.blocks, product);
    ensureFifteenReviews(data.blocks, cleanTitle(product.title), importedReviews, product.image);
    applyConversionPalette(data.blocks);

    // Inject real product data into the hero block
    const heroBlock = data.blocks.find((b: any) => b.type === 'hero');
    if (heroBlock) {
      // Product image as hero background
      if (product.image) {
        heroBlock.data.imageUrl = product.image;
      }
      heroBlock.data.bgFrom = PREMIUM_DARK_FROM;
      heroBlock.data.bgTo = PREMIUM_DARK_TO;
      heroBlock.data.primaryBtnColor = BUY_BUTTON_COLOR;
      heroBlock.data.primaryBtnTextColor = '#ffffff';
      // Real "Buy Now" link → Shopify product page
      const shop = (req.body.shop || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (product.handle) {
        const productUrl = shop
          ? `https://${shop}/products/${product.handle}`
          : `#`;
        heroBlock.data.primaryBtnHref = productUrl;
      }
      // Use split variant to show product image prominently
      if (product.image && heroBlock.data.variant !== 'minimal') {
        heroBlock.data.variant = 'split';
      }
    }

    // Also inject product URL into any CTA blocks
    const shop = (req.body.shop || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (product.handle && shop) {
      const productUrl = `https://${shop}/products/${product.handle}`;
      data.blocks.forEach((b: any) => {
        if (b.type === 'cta' || b.type === 'cta-banner') {
          b.data.primaryBtnHref = productUrl;
          if (b.type === 'cta') {
            b.data.bgColor = PREMIUM_DARK_FROM;
            b.data.primaryBtnColor = BUY_BUTTON_COLOR;
            b.data.primaryBtnTextColor = '#ffffff';
          }
          if (b.type === 'cta-banner') {
            b.data.bgColor = PREMIUM_DARK_FROM;
            b.data.textColor = '#ffffff';
            b.data.btnColor = BUY_BUTTON_COLOR;
          }
        }
      });
    }

    console.log(`Product page generated for: ${product.title} — ${data.blocks.length} blocks`);
    res.json({ success: true, ...data, product });
  } catch (err: any) {
    console.error('Generate from product error:', err.message);
    const shop = (req.body.shop || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
    const fallback = buildFallbackGeneratedPage(`${product.title} product landing page`, product, shop);
    sanitizeGeneratedBlocks(fallback.blocks);
    ensureProductGallery(fallback.blocks, product);
    ensureFifteenReviews(fallback.blocks, cleanTitle(product.title), importedReviews, product.image);
    applyConversionPalette(fallback.blocks);
    res.json({ success: true, ...fallback, product, fallback: true });
  }
});

// ── AI Full Page Generation (with real content) ───────────────────────────
app.post('/api/ai/generate-page', requireBilling, async (req, res) => {
  const { pageGoal } = req.body;
  if (!pageGoal?.trim()) {
    return res.status(400).json({ success: false, error: 'pageGoal is required' });
  }
  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      system: 'You are an expert landing page copywriter and conversion specialist. Write compelling, specific copy. Respond with valid JSON only. No markdown.',
      messages: [{
        role: 'user',
        content: `Create a complete, high-converting landing page for: "${pageGoal}"

Return ONLY this JSON (no markdown, no extra text):
{"tagline":"short tagline","blocks":[{"type":"block_type","data":{...}}]}

Block types with exact data shapes:
hero: {"variant":"centered","eyebrow":"str","headline":"str","subheadline":"str","primaryBtn":"str","secondaryBtn":"str","bgFrom":"#hex","bgTo":"#hex"}
features: {"variant":"grid","title":"str","subtitle":"str","features":[{"icon":"ASCII text","title":"str","description":"str"}]}
steps: {"title":"str","subtitle":"str","steps":[{"icon":"ASCII text","title":"str","description":"str"}],"bgColor":"#hex"}
pricing: {"title":"str","subtitle":"str","plans":[{"name":"str","price":"str","period":"str","description":"str","cta":"str","highlighted":"true|false","features":"comma,separated"}]}
testimonials: {"title":"str","testimonials":[{"quote":"str","name":"str","role":"str","avatar":"XY","avatarBg":"#hex"}]}
cta: {"headline":"str","subtext":"str","primaryBtn":"str","secondaryBtn":"str","bgColor":"#hex"}
faq: {"title":"str","items":[{"question":"str","answer":"str"}]}
stats: {"title":"str","stats":[{"value":"str","label":"str"}],"bgColor":"#hex"}
footer: {"brand":"str","tagline":"str","copyright":"str","links":"About,Pricing,Blog,Contact","bgColor":"#hex"}
logo-cloud: {"title":"str","logos":[{"name":"str","initial":"XY"}]}
newsletter: {"headline":"str","subtext":"str","placeholder":"str","btnText":"str","bgColor":"#hex"}

Rules:
- Write all visible copy in English only.
- Use ASCII punctuation only. Do not use emojis, smart quotes, bullets, arrows, or special symbols.
- Icon fields must be ASCII text only, such as "+", "01", "02", or "03".
- Choose 7-8 blocks: always start hero, always end footer
- Write SPECIFIC copy for this exact goal (no generic placeholders)
- Always include a "steps" block to show how it works — 3 steps with relevant emojis
- features: exactly 6 items with simple ASCII icons
- testimonials: exactly 15 concise customer-style reviews in English only with realistic names/roles
- faq: 4 specific questions about the product/service
- stats: 4 impressive but credible numbers
- pricing: 3 tiers, middle highlighted:"true"
- avatarBg: vary colors "#4f46e5","#0891b2","#059669","#dc2626"
- bgFrom/bgTo: dark conversion-focused gradient like "${PREMIUM_DARK_FROM}" to "${PREMIUM_DARK_TO}"
- use orange "${BUY_BUTTON_COLOR}" for buy buttons and green "${TRUST_GREEN}" only for trust/proof accents
- avoid gold/yellow as a main color
- dark bgColor: "${PREMIUM_DARK_FROM}" or "${PREMIUM_DARK_TO}"
- light bgColor: "#f0f9ff" or "#f8fafc"
- steps bgColor: "#f8fafc"`,
      }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ success: false, error: 'Invalid AI response' });

    let data: any;
    try {
      data = JSON.parse(match[0]);
    } catch {
      // Try to extract just the outermost valid JSON object
      const cleaned = match[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      try {
        data = JSON.parse(cleaned);
      } catch {
        return res.status(500).json({ success: false, error: 'JSON parse error — please try again' });
      }
    }

    // Validate blocks array exists
    if (!Array.isArray(data.blocks) || data.blocks.length === 0) {
      return res.status(500).json({ success: false, error: 'No blocks generated — please try again' });
    }

    // Filter out any blocks with unknown types
    const VALID_TYPES = new Set(['banner','navbar','hero','features','pricing','testimonials','cta','faq','text-content','stats','footer','video','logo-cloud','newsletter','richtext','contact','steps','countdown','gallery','embed','divider','testimonial-single','cta-banner','custom-html']);
    data.blocks = data.blocks.filter((b: any) => VALID_TYPES.has(b.type));
    sanitizeGeneratedBlocks(data.blocks);
    ensureFifteenReviews(data.blocks, cleanTitle(pageGoal));
    applyConversionPalette(data.blocks);

    res.json({ success: true, ...data });
  } catch (err: any) {
    console.error('Generate page error:', err.message);
    const fallback = buildFallbackGeneratedPage(pageGoal);
    res.json({ success: true, ...fallback, fallback: true });
  }
});

// ── AI Page Title Generator ───────────────────────────────────────────────
app.post('/api/ai/title', async (req, res) => {
  const { goal } = req.body;
  if (!goal?.trim()) return res.status(400).json({ success: false, error: 'goal required' });
  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 60,
      system: 'You are a copywriter. Output ONLY a short catchy page title (3-8 words). No quotes, no punctuation at end, no explanation.',
      messages: [{
        role: 'user',
        content: `Create a compelling landing page title for: "${goal}"`,
      }],
    });
    const title = message.content[0].type === 'text' ? message.content[0].text.trim().replace(/^["']|["']$/g, '') : goal;
    res.json({ success: true, title });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── AI SEO Description Generator ─────────────────────────────────────────
app.post('/api/ai/seo', async (req, res) => {
  const { title, goal, blocks } = req.body;
  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 200,
      system: 'You are an SEO expert. Write a meta description. Output ONLY the description text — no quotes, no JSON, no explanation.',
      messages: [{
        role: 'user',
        content: `Write a compelling meta description (max 155 chars) for this page:
Title: "${title || 'Landing Page'}"
${goal ? `Goal: "${goal}"` : ''}
${blocks?.length ? `Key sections: ${blocks.join(', ')}` : ''}
Meta description (plain text only):`,
      }],
    });
    const text = message.content[0].type === 'text' ? message.content[0].text.trim().replace(/^["']|["']$/g, '').slice(0, 160) : '';
    res.json({ success: true, description: text });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── AI Page Suggest (legacy — kept for compatibility) ─────────────────────
app.post('/api/ai/suggest', async (req, res) => {
  const { pageGoal } = req.body;
  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 300,
      system: 'You are an expert at planning landing pages. Respond with JSON only. No markdown.',
      messages: [{
        role: 'user',
        content: `Plan a landing page for: "${pageGoal}"
Suggest 4-6 sections from: hero, features, pricing, testimonials, cta, faq, text-content, stats, footer
Respond:
{"sections":["hero","features","cta","footer"],"tagline":"Short tagline"}`,
      }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    const data = match ? JSON.parse(match[0]) : {};
    res.json({ success: true, ...data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Page Share (preview link) ─────────────────────────────────────────────
type ShareEntry = { html: string; title: string; createdAt: number };
const SHARES_FILE = path.join(__dirname, '../../data/shares.json');
const shareStore = new Map<string, ShareEntry>(loadShares());
const SHARE_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

function loadShares(): [string, ShareEntry][] {
  try {
    const dir = path.dirname(SHARES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(SHARES_FILE)) return [];
    const data = JSON.parse(fs.readFileSync(SHARES_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveShares() {
  try {
    const dir = path.dirname(SHARES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SHARES_FILE, JSON.stringify(Array.from(shareStore.entries()), null, 2));
  } catch (err) {
    console.error('Failed to save share previews:', err);
  }
}

function pruneExpiredShares() {
  let changed = false;
  for (const [k, v] of shareStore) {
    if (Date.now() - v.createdAt > SHARE_TTL_MS) {
      shareStore.delete(k);
      changed = true;
    }
  }
  if (changed) saveShares();
}

function getBuiltInSharePage(id: string): string | null {
  if (id !== 'agtej00v8') return null;

  const productUrl = 'https://notplanetb.myshopify.com/products/2-in-1-240w-built-in-phone-stand-charging-cable-usb-c-to-usb-c-quick-charge-data-wire-foldable-bracket-type-c-cord';
  const heroImage = 'https://cdn.shopify.com/s/files/1/0556/1650/4120/files/Scae4a76ed8f0440891ced53d8ef0c2c2C.webp?v=1779660000&width=900';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>The Ultimate 2-in-1 Charging Cable & Phone Stand</title>
<meta name="description" content="A high-converting sample product landing page generated by PageGenie." />
<link rel="preconnect" href="https://cdn.shopify.com" crossorigin />
<link rel="preload" as="image" href="${heroImage}" fetchpriority="high" />
<style>
*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;color:#101827;background:#fff;line-height:1.55}a{text-decoration:none;color:inherit}.wrap{max-width:1160px;margin:0 auto;padding:0 22px}.bar{background:#101827;color:white;text-align:center;font-weight:800;font-size:13px;padding:10px}.nav{position:sticky;top:0;background:rgba(255,255,255,.94);backdrop-filter:blur(14px);border-bottom:1px solid #e5e7eb;z-index:10}.nav .wrap{height:68px;display:flex;align-items:center;justify-content:space-between}.brand{font-size:22px;font-weight:950;letter-spacing:-.04em}.links{display:flex;gap:22px;color:#4b5563;font-size:14px;font-weight:800}.btn{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:#2563eb;color:white;font-weight:950;padding:13px 20px;box-shadow:0 12px 34px rgba(37,99,235,.24)}.btn.alt{background:white;color:#101827;border:1px solid #e5e7eb;box-shadow:none}.hero{background:radial-gradient(circle at top left,#dbeafe 0,#fff 30%,#f8fafc 100%);padding:72px 0}.hero-grid{display:grid;grid-template-columns:1.02fr .98fr;gap:54px;align-items:center}.pill{display:inline-flex;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:8px 13px;font-size:12px;font-weight:950;text-transform:uppercase;letter-spacing:.08em}.rating{display:flex;align-items:center;gap:12px;margin-top:16px;flex-wrap:wrap}.stars{color:#facc15;letter-spacing:2px;font-size:22px;font-weight:950}.rating strong{font-size:14px}.rating span{color:#64748b}h1{font-size:62px;line-height:.96;letter-spacing:-.055em;margin:20px 0 0}.lead{font-size:20px;color:#5b6475;max-width:620px;margin:22px 0 0}.price-row{display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-top:28px}.price{font-size:34px;font-weight:950;line-height:1}.price small{display:block;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.08em}.cta-row{display:flex;gap:14px;flex-wrap:wrap;margin-top:26px}.proof{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:24px}.proof div{border:1px solid #e5e7eb;background:white;border-radius:14px;padding:13px;font-size:13px;font-weight:850;color:#334155}.media{background:#fff;border:1px solid #e5e7eb;border-radius:28px;padding:18px;box-shadow:0 24px 70px rgba(15,23,42,.12)}.media img{width:100%;border-radius:22px;aspect-ratio:1/1;object-fit:cover;background:#f1f5f9}.section{padding:78px 0}.soft{background:#f8fafc}.center{text-align:center}.eyebrow{font-size:12px;font-weight:950;text-transform:uppercase;letter-spacing:.1em;color:#2563eb;margin-bottom:10px}.h2{font-size:42px;line-height:1.05;letter-spacing:-.04em;margin:0 0 14px}.sub{font-size:18px;color:#5b6475;max-width:720px;margin:0 auto 40px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.card{border:1px solid #e5e7eb;background:white;border-radius:18px;padding:26px;box-shadow:0 12px 34px rgba(15,23,42,.05)}.card h3{margin:0 0 9px;font-size:19px}.card p{color:#5b6475;font-size:15px;margin:0}.num{height:42px;width:42px;border-radius:13px;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;font-weight:950;margin-bottom:18px}.gallery{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.shot{overflow:hidden;border-radius:18px;border:1px solid #e5e7eb;background:white}.shot img{width:100%;aspect-ratio:1/1;object-fit:cover}.offer{background:linear-gradient(135deg,#07111f,#12213b);color:white;border-radius:30px;padding:42px;display:flex;justify-content:space-between;gap:24px;align-items:center}.offer p{color:#cbd5e1}.review .stars{font-size:18px;margin-bottom:12px}.review p{font-size:16px;color:#334155;margin-bottom:18px}.review strong{display:block}.review span{font-size:13px;color:#64748b}details{border:1px solid #e5e7eb;background:white;border-radius:16px;padding:20px 22px;margin-bottom:12px}summary{cursor:pointer;font-weight:950;list-style:none}details p{margin-top:10px;color:#5b6475}.final{background:radial-gradient(circle at top,#1e3a8a 0,#07111f 52%,#020617 100%);color:white;text-align:center;padding:88px 0}.final p{color:#dbeafe;max-width:680px;margin:0 auto 28px;font-size:18px}.footer{padding:30px;text-align:center;color:#64748b;background:#f8fafc}@media(max-width:900px){.links{display:none}.hero-grid,.grid,.gallery{grid-template-columns:1fr}.proof{grid-template-columns:1fr}h1{font-size:43px}.h2{font-size:34px}.offer{display:block}.offer .btn{margin-top:18px}.section{padding:58px 0}}
</style>
</head>
<body>
<div class="bar">2-in-1 USB-C charging cable with built-in phone stand - sample page by PageGenie</div>
<nav class="nav"><div class="wrap"><a class="brand" href="#top">novgoods</a><div class="links"><a href="#benefits">Benefits</a><a href="#photos">Photos</a><a href="#reviews">Reviews</a><a href="#faq">FAQ</a></div><a class="btn" href="${productUrl}">Check Availability</a></div></nav>
<header class="hero" id="top"><div class="wrap hero-grid"><div><span class="pill">USB-C to USB-C | phone stand built in</span><div class="rating"><span class="stars">★★★★★</span><strong>4.9/5 <span>from 700+ reviews</span></strong></div><h1>The Ultimate 2-in-1 Charging Cable & Phone Stand</h1><p class="lead">Charge fast, watch hands-free, and carry one less accessory. This sample landing page shows how PageGenie turns one Shopify product into a polished sales page.</p><div class="price-row"><div class="price"><small>Starts at</small>$7.99</div><p>Black or Orange, with 1M, 1.5M, and 2M length options.</p></div><div class="cta-row"><a class="btn" href="${productUrl}">Check Availability</a><a class="btn alt" href="#benefits">See Benefits</a></div><div class="proof"><div>Supports up to 240W with compatible devices</div><div>Foldable stand for calls, videos, and desk use</div><div>Built for simple everyday impulse buying</div></div></div><div class="media"><img src="${heroImage}" alt="2-in-1 charging cable with phone stand" fetchpriority="high" decoding="async" /></div></div></header>
<main>
<section class="section" id="benefits"><div class="wrap center"><div class="eyebrow">Why shoppers buy</div><h2 class="h2">It solves a daily annoyance in one simple product.</h2><p class="sub">Regular cables charge your phone but leave it flat. This cable charges while holding your phone at a useful viewing angle.</p><div class="grid"><article class="card"><div class="num">01</div><h3>Fast charging support</h3><p>Supports up to 240W power delivery with compatible charger and device.</p></article><article class="card"><div class="num">02</div><h3>Built-in stand</h3><p>Fold out the bracket to keep your phone upright while it charges.</p></article><article class="card"><div class="num">03</div><h3>Great for travel</h3><p>One cable replaces a normal cable plus a separate phone stand.</p></article></div></div></section>
<section class="section soft" id="photos"><div class="wrap center"><div class="eyebrow">Product photos</div><h2 class="h2">Show real product angles before checkout.</h2><p class="sub">The sample uses real Shopify listing photos so the page feels specific and trustworthy.</p><div class="gallery"><figure class="shot"><img src="${heroImage.replace('width=900', 'width=500')}" alt="Product photo 1" loading="lazy" decoding="async" /></figure><figure class="shot"><img src="https://cdn.shopify.com/s/files/1/0556/1650/4120/files/Sd0edd7fc10614a7abf50209cd22170ebz.webp?v=1779660000&width=500" alt="Product photo 2" loading="lazy" decoding="async" /></figure><figure class="shot"><img src="https://cdn.shopify.com/s/files/1/0556/1650/4120/files/f2ccae8f-bc51-4698-a8bd-89aa2d9a7326.jpg?v=1779673655&width=500" alt="Product photo 3" loading="lazy" decoding="async" /></figure><figure class="shot"><img src="https://cdn.shopify.com/s/files/1/0556/1650/4120/files/S3120397eb7be4a0aae86fafcff6ddb1e1.webp?v=1779660001&width=500" alt="Product photo 4" loading="lazy" decoding="async" /></figure></div></div></section>
<section class="section"><div class="wrap"><div class="offer"><div><div class="eyebrow">Conversion angle</div><h2 class="h2">Power plus hands-free viewing in one low-price accessory.</h2><p>PageGenie writes the offer, benefits, proof, FAQ, and CTA together so the page feels ready to sell.</p></div><a class="btn" href="${productUrl}">View Product</a></div></div></section>
<section class="section" id="reviews"><div class="wrap center"><div class="eyebrow">Customer proof</div><h2 class="h2">Reviews with yellow stars.</h2><p class="sub">A strong product page should put trust near the buying decision.</p><div class="grid"><article class="card review"><div class="stars">★★★★★</div><p>"It has a good size and the charging is very good."</p><strong>Nathan P.</strong><span>Product review</span></article><article class="card review"><div class="stars">★★★★★</div><p>"Good product and good quality."</p><strong>Jim M.</strong><span>Product review</span></article><article class="card review"><div class="stars">★★★★★</div><p>"Very convenient to have everything in one place."</p><strong>Milo W.</strong><span>Product review</span></article></div></div></section>
<section class="section soft" id="faq"><div class="wrap"><div class="center"><div class="eyebrow">FAQ</div><h2 class="h2">Answer buying questions fast.</h2><p class="sub">Good FAQ sections reduce hesitation before shoppers leave the page.</p></div><details open><summary>Does it work with every USB-C device?</summary><p>It works with many USB-C phones, tablets, laptops, and accessories. Charging speed depends on your device and charger.</p></details><details><summary>Will it charge at 240W?</summary><p>The cable supports up to 240W with compatible power delivery devices and chargers.</p></details><details><summary>Which length should I choose?</summary><p>Choose 1M for travel, 1.5M for desks, and 2M for bedside or couch charging.</p></details></div></section>
<section class="final"><div class="wrap"><h2 class="h2">Build pages like this from your Shopify products.</h2><p>Choose a product, add optional reviews, and PageGenie creates a landing page with images, benefits, FAQ, and CTA.</p><a class="btn" href="${productUrl}">Check Availability</a></div></section>
</main>
<footer class="footer">PageGenie sample page. Product availability may change.</footer>
</body>
</html>`;
}

app.post('/api/share', (req, res) => {
  const { html, title, shareId } = req.body;
  if (!html || typeof html !== 'string') {
    return res.status(400).json({ success: false, error: 'html required' });
  }
  pruneExpiredShares();
  let id = typeof shareId === 'string' && /^[a-z0-9-]{6,32}$/i.test(shareId)
    ? shareId
    : '';
  if (!id) {
    do {
      id = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 5);
    } while (shareStore.has(id));
  }
  shareStore.set(id, { html, title: title || 'Preview', createdAt: Date.now() });
  saveShares();
  const origin = `${req.protocol}://${req.get('host')}`;
  res.json({ success: true, shareId: id, url: `${origin}/share/${id}` });
});

app.get('/share/:id', (req, res) => {
  pruneExpiredShares();
  const entry = shareStore.get(req.params.id);
  if (!entry) {
    const builtInPage = getBuiltInSharePage(req.params.id);
    if (builtInPage) {
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400');
      res.setHeader('Content-Type', 'text/html');
      return res.send(builtInPage);
    }
    return res.status(404).send('<html><body style="font-family:sans-serif;padding:40px;text-align:center"><h2>Preview expired or not found</h2><p>Share links are valid for 48 hours.</p></body></html>');
  }
  res.setHeader('Content-Type', 'text/html');
  res.send(entry.html);
});

// ── AI Translate Page ─────────────────────────────────────────────────────
app.post('/api/ai/translate', async (req, res) => {
  const { blocks, targetLanguage } = req.body;
  if (!Array.isArray(blocks) || blocks.length === 0 || !targetLanguage) {
    return res.status(400).json({ success: false, error: 'blocks and targetLanguage required' });
  }
  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      system: 'You are a professional translator. Translate web page content. Respond with valid JSON only. No markdown.',
      messages: [{
        role: 'user',
        content: `Translate all text content in this landing page to ${targetLanguage}.

Current blocks (JSON):
${JSON.stringify(blocks.map((b: any) => ({ type: b.type, data: b.data })), null, 2)}

Rules:
- Keep EXACT same JSON keys and structure
- Keep all hex color values unchanged
- Keep all URLs/hrefs as-is
- Keep array lengths the same
- Translate ONLY text content (headlines, descriptions, buttons, etc.)
- Use natural, fluent ${targetLanguage} — not word-for-word literal translation
- Preserve marketing tone and persuasive intent

Return JSON: {"blocks":[{"type":"...","data":{...}},...]}`,
      }],
    });
    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ success: false, error: 'Invalid AI response' });
    let data: any;
    try { data = JSON.parse(match[0]); }
    catch {
      const cleaned = match[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      try { data = JSON.parse(cleaned); }
      catch { return res.status(500).json({ success: false, error: 'JSON parse error' }); }
    }
    res.json({ success: true, blocks: data.blocks || blocks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Privacy Policy ─────────────────────────────────────────────────────────
app.get('/privacy', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Privacy Policy - PageGenie</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:800px;margin:0 auto;padding:40px 24px;color:#1e293b;line-height:1.7}h1{color:#0f172a;font-size:2rem;margin-bottom:8px}h2{color:#1e293b;font-size:1.2rem;margin-top:32px}p,li{color:#475569}a{color:#4f46e5}hr{border:none;border-top:1px solid #e2e8f0;margin:32px 0}.badge{display:inline-block;background:#f1f5f9;color:#64748b;font-size:0.8rem;padding:4px 10px;border-radius:20px;margin-bottom:24px}</style>
</head>
<body>
<h1>Privacy Policy</h1>
<span class="badge">Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
<p>PageGenie ("the App") is a Shopify app that helps merchants create landing pages using AI. This Privacy Policy explains how we collect, use, and protect your information.</p>
<h2>Information We Collect</h2>
<ul>
<li><strong>Shopify store data:</strong> When you install the App, we receive your store's domain and an access token to publish pages on your behalf.</li>
<li><strong>Page content:</strong> The text and layout data of pages you create are stored locally in your browser and on our servers only when you choose to publish.</li>
</ul>
<h2>How We Use Your Information</h2>
<ul>
<li>To publish pages to your Shopify store as requested</li>
<li>To generate AI content using the Anthropic API (content is not stored by Anthropic beyond the API call)</li>
</ul>
<h2>Data Sharing</h2>
<p>We do not sell your data. We share data only with:</p>
<ul>
<li><strong>Anthropic:</strong> Page content is sent to the Anthropic API for AI generation.</li>
<li><strong>Shopify:</strong> Page HTML is published to your store via the Shopify Admin API.</li>
</ul>
<h2>Your Rights</h2>
<p>You may request deletion of all your data by uninstalling the App or contacting us at the email below. We will comply within 30 days.</p>
<h2>GDPR Compliance</h2>
<p>We support Shopify's mandatory GDPR webhooks: customer data requests, customer data deletion, and shop data deletion are all handled automatically upon uninstall.</p>
<h2>Contact</h2>
<p>Questions? Email us at <a href="mailto:777beststocktrader@gmail.com">777beststocktrader@gmail.com</a></p>
<hr>
<p style="font-size:0.85rem;color:#94a3b8">PageGenie is not affiliated with Shopify Inc.</p>
</body></html>`);
});

// ── Terms of Service ───────────────────────────────────────────────────────
app.get('/terms', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Terms of Service - PageGenie</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:800px;margin:0 auto;padding:40px 24px;color:#1e293b;line-height:1.7}h1{color:#0f172a;font-size:2rem;margin-bottom:8px}h2{color:#1e293b;font-size:1.2rem;margin-top:32px}p,li{color:#475569}a{color:#4f46e5}hr{border:none;border-top:1px solid #e2e8f0;margin:32px 0}.badge{display:inline-block;background:#f1f5f9;color:#64748b;font-size:0.8rem;padding:4px 10px;border-radius:20px;margin-bottom:24px}</style>
</head>
<body>
<h1>Terms of Service</h1>
<span class="badge">Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
<p>By installing or using PageGenie, you agree to these Terms of Service.</p>
<h2>The Service</h2>
<p>PageGenie is a Shopify embedded app that allows merchants to create, customize, and publish landing pages using AI-generated content.</p>
<h2>Acceptable Use</h2>
<p>You may not use the App to create pages that violate Shopify's Acceptable Use Policy, contain illegal content or spam, or infringe on third-party intellectual property rights.</p>
<h2>AI-Generated Content</h2>
<p>Content generated by the AI is provided "as is." You are responsible for reviewing and editing AI output before publishing.</p>
<h2>Limitation of Liability</h2>
<p>The App is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the App.</p>
<h2>Contact</h2>
<p>Questions? Email us at <a href="mailto:777beststocktrader@gmail.com">777beststocktrader@gmail.com</a></p>
<hr>
<p style="font-size:0.85rem;color:#94a3b8">PageGenie is not affiliated with Shopify Inc.</p>
</body></html>`);
});

// ── Serve React frontend in production ────────────────────────────────────
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist, { index: false }));
app.get('*', (_req, res) => {
  const indexPath = path.join(frontendDist, 'index.html');
  fs.readFile(indexPath, 'utf8', (err, html) => {
    if (err) {
      res.sendFile(indexPath);
      return;
    }
    const shopifyApiKey = process.env.VITE_SHOPIFY_API_KEY || process.env.SHOPIFY_API_KEY || '';
    res.type('html').send(html.replace(/%VITE_SHOPIFY_API_KEY%/g, shopifyApiKey));
  });
});

initDb().catch((err) => console.error('DB init failed (using file fallback):', err.message));

app.listen(PORT, () => {
  console.log(`\n🚀 PageGenie running on http://localhost:${PORT}`);
  console.log('Open/install PageGenie from Shopify admin or the Partner Dashboard test install flow.');
  console.log(`🤖  Model: claude-opus-4-8\n`);
});

