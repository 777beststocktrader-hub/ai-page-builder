import axios from 'axios';
import { getClientId } from './billing';
import { getShopForApi, getShopifySessionToken } from './shopifyAppBridge';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(async config => {
  config.headers = config.headers || {};
  const token = await getShopifySessionToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['x-client-id'] = getShopForApi() || getClientId();
  return config;
});

export async function generateBlockContent(
  blockType: string,
  prompt: string,
  currentData: Record<string, any>,
  tone: string,
  context?: string,
  language?: string
): Promise<Record<string, any>> {
  const { data } = await api.post('/ai/generate', { blockType, prompt, currentData, tone, context, language });
  if (!data.success) throw new Error(data.error || 'Generation failed');
  return data.data;
}

export async function generateFullPage(
  pageGoal: string
): Promise<{ tagline: string; blocks: Array<{ type: string; data: Record<string, any> }> }> {
  const { data } = await api.post('/ai/generate-page', { pageGoal });
  if (!data.success) throw new Error(data.error || 'Page generation failed');
  return { tagline: data.tagline || '', blocks: data.blocks || [] };
}

export async function generatePageTitle(goal: string): Promise<string> {
  const { data } = await api.post('/ai/title', { goal });
  if (!data.success) throw new Error(data.error || 'Title generation failed');
  return data.title || '';
}

export async function generateSeoDescription(
  title: string,
  goal?: string,
  blocks?: string[]
): Promise<string> {
  const { data } = await api.post('/ai/seo', { title, goal, blocks });
  if (!data.success) throw new Error(data.error || 'SEO generation failed');
  return data.description || '';
}

export async function suggestSections(pageGoal: string): Promise<{ sections: string[]; tagline: string }> {
  const { data } = await api.post('/ai/suggest', { pageGoal });
  if (!data.success) throw new Error(data.error || 'Suggestion failed');
  return { sections: data.sections || [], tagline: data.tagline || '' };
}

export async function createShareLink(html: string, title: string): Promise<string> {
  const { data } = await api.post('/share', { html, title });
  if (!data.success) throw new Error('Failed to create share link');
  return data.url as string;
}

export async function translatePage(
  blocks: Array<{ type: string; data: Record<string, any> }>,
  targetLanguage: string
): Promise<Array<{ type: string; data: Record<string, any> }>> {
  const { data } = await api.post('/ai/translate', { blocks, targetLanguage });
  if (!data.success) throw new Error(data.error || 'Translation failed');
  return data.blocks;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  description: string;
  vendor: string;
  productType: string;
  tags: string[];
  price: string;
  comparePrice: string | null;
  image: string | null;
  images?: string[];
  handle: string;
  variantCount: number;
  available?: boolean;
  availableVariantCount?: number;
  availabilityWarning?: string;
  variantAvailability?: Array<{
    id?: number | string;
    title: string;
    available: boolean;
    inventoryManagement?: string | null;
    inventoryPolicy?: string | null;
    inventoryQuantity?: number | null;
  }>;
}

export interface ImportedReview {
  quote: string;
  name?: string;
  role?: string;
  rating?: number;
  imageUrl?: string;
}

export async function fetchShopifyProducts(shop: string): Promise<ShopifyProduct[]> {
  const params = new URLSearchParams({ shop });
  const { data } = await api.get(`/shopify/products?${params}`);
  if (!data.success) throw new Error(data.error || 'Failed to fetch products');
  return data.products || [];
}

export async function fixShopifyProductAvailability(
  product: ShopifyProduct,
  shop?: string
): Promise<{ changedCount: number; variants: Array<{ title: string; changed: boolean }> }> {
  const { data } = await api.post('/shopify/products/fix-availability', {
    shop: shop || '',
    handle: product.handle,
  });
  if (!data.success) throw new Error(data.error || 'Failed to fix product availability');
  return {
    changedCount: data.changedCount || 0,
    variants: data.variants || [],
  };
}

export async function generatePageFromProduct(
  product: ShopifyProduct,
  shop?: string,
  reviews?: ImportedReview[]
): Promise<{ tagline: string; blocks: Array<{ type: string; data: Record<string, any> }>; product: ShopifyProduct }> {
  const { data } = await api.post('/ai/generate-from-product', { product, shop: shop || '', reviews: reviews || [] });
  if (!data.success) throw new Error(data.error || 'Page generation failed');
  return { tagline: data.tagline || '', blocks: data.blocks || [], product: data.product };
}
