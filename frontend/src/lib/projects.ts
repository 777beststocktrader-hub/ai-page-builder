import { Page, Theme } from '../types';

const INDEX_KEY = 'ai-pb-projects';
const PROJECT_PREFIX = 'ai-pb-proj-';

export interface ProjectMeta {
  id: string;
  title: string;
  updatedAt: number;
  blockCount: number;
  firstBlockType: string;
  pageGoal: string;
}

export interface ProjectData {
  page: Page;
  pageGoal: string;
  theme: Theme;
}

export function getAllProjects(): ProjectMeta[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveProject(page: Page, pageGoal: string, theme: Theme): void {
  try {
    const data: ProjectData = { page, pageGoal, theme };
    localStorage.setItem(PROJECT_PREFIX + page.id, JSON.stringify(data));

    const index = getAllProjects();
    const meta: ProjectMeta = {
      id: page.id,
      title: page.title,
      updatedAt: Date.now(),
      blockCount: page.blocks.filter((b) => !b.hidden).length,
      firstBlockType: page.blocks[0]?.type || '',
      pageGoal,
    };
    const existing = index.findIndex((p) => p.id === page.id);
    if (existing >= 0) index[existing] = meta;
    else index.unshift(meta);
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch {}
}

export function loadProject(id: string): ProjectData | null {
  try {
    const raw = localStorage.getItem(PROJECT_PREFIX + id);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function deleteProject(id: string): void {
  try {
    localStorage.removeItem(PROJECT_PREFIX + id);
    const index = getAllProjects().filter((p) => p.id !== id);
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch {}
}

export function getBlockEmoji(type: string): string {
  const map: Record<string, string> = {
    hero: '🦸', features: '✨', pricing: '💰', testimonials: '💬',
    cta: '🎯', faq: '❓', stats: '📊', footer: '🔗', navbar: '🧭',
    steps: '📋', team: '👥', comparison: '⚖️', newsletter: '📧',
    contact: '📬', video: '🎥', 'logo-cloud': '🏢', banner: '📢',
    richtext: '📄', 'text-content': '📝',
  };
  return map[type] || '📄';
}
