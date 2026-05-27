import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

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

export async function analyzePageConversions(
  pageGoal: string,
  blockTypes: string[]
): Promise<{ score: number; tips: { issue: string; fix: string; priority: string }[]; missing: string[] }> {
  const { data } = await api.post('/ai/analyze', { pageGoal, blockTypes });
  if (!data.success) throw new Error(data.error || 'Analysis failed');
  return { score: data.score || 70, tips: data.tips || [], missing: data.missing || [] };
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

export async function publishToWeb(html: string, title: string): Promise<{ url: string; slug: string }> {
  const { data } = await api.post('/publish-web', { html, title });
  if (!data.success) throw new Error('Failed to publish');
  return { url: data.url, slug: data.slug };
}

export async function getMySites(): Promise<{ slug: string; title: string; publishedAt: string; updatedAt: string; views: number }[]> {
  const { data } = await api.get('/my-sites');
  return data.sites || [];
}

export async function deleteSite(slug: string): Promise<void> {
  await api.delete(`/my-sites/${slug}`);
}

export async function importFromUrl(
  url: string
): Promise<{ pageGoal: string; companyName: string; tagline: string }> {
  const { data } = await api.post('/ai/import-url', { url });
  if (!data.success) throw new Error(data.error || 'Import failed');
  return { pageGoal: data.pageGoal || '', companyName: data.companyName || '', tagline: data.tagline || '' };
}

export async function polishPage(
  blocks: Array<{ type: string; data: Record<string, any> }>,
  pageGoal?: string,
  tone?: string
): Promise<Array<{ type: string; data: Record<string, any> }>> {
  const { data } = await api.post('/ai/polish-page', { blocks, pageGoal, tone: tone || 'marketing' });
  if (!data.success) throw new Error(data.error || 'Polish failed');
  return data.blocks;
}

export async function translatePage(
  blocks: Array<{ type: string; data: Record<string, any> }>,
  targetLanguage: string
): Promise<Array<{ type: string; data: Record<string, any> }>> {
  const { data } = await api.post('/ai/translate', { blocks, targetLanguage });
  if (!data.success) throw new Error(data.error || 'Translation failed');
  return data.blocks;
}

export async function generateBrandPalette(
  description: string
): Promise<{ name: string; primaryColor: string; font: string; rationale: string }[]> {
  const { data } = await api.post('/ai/brand-palette', { description });
  if (!data.success) throw new Error(data.error || 'Palette generation failed');
  return data.palettes || [];
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
  handle: string;
  variantCount: number;
}

export async function fetchShopifyProducts(shop: string, token?: string): Promise<ShopifyProduct[]> {
  const params = new URLSearchParams({ shop });
  if (token) params.set('token', token);
  const { data } = await api.get(`/shopify/products?${params}`);
  if (!data.success) throw new Error(data.error || 'Failed to fetch products');
  return data.products || [];
}

export async function generatePageFromProduct(
  product: ShopifyProduct,
  shop?: string
): Promise<{ tagline: string; blocks: Array<{ type: string; data: Record<string, any> }>; product: ShopifyProduct }> {
  const { data } = await api.post('/ai/generate-from-product', { product, shop: shop || '' });
  if (!data.success) throw new Error(data.error || 'Page generation failed');
  return { tagline: data.tagline || '', blocks: data.blocks || [], product: data.product };
}

export async function abTestHeadlines(
  headline: string,
  subheadline?: string,
  primaryBtn?: string,
  pageGoal?: string
): Promise<{ label: string; angle: string; headline: string; subheadline: string; primaryBtn: string; improvement: string }[]> {
  const { data } = await api.post('/ai/ab-test', { headline, subheadline, primaryBtn, pageGoal });
  if (!data.success) throw new Error(data.error || 'A/B test failed');
  return data.variants || [];
}
