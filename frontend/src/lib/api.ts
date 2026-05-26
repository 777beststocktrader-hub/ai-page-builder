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
