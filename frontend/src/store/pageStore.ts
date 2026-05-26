import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import { Block, Page, Theme } from '../types';

interface History {
  past: Block[][];
  present: Block[];
  future: Block[][];
}

export interface Snapshot {
  id: string;
  name: string;
  blocks: Block[];
  pageTitle: string;
  createdAt: number;
}

interface PageStore {
  page: Page;
  selectedBlockId: string | null;
  history: History;
  isPreview: boolean;
  previewMode: 'desktop' | 'tablet' | 'mobile';
  pageGoal: string;
  savedAt: number | null;
  theme: Theme;
  snapshots: Snapshot[];

  setPageTitle: (title: string) => void;
  setPageDescription: (desc: string) => void;
  setPageSettings: (settings: Partial<Pick<Page, 'faviconUrl' | 'ogImageUrl' | 'trackingCode' | 'customCss'>>) => void;
  setPageGoal: (goal: string) => void;
  setTheme: (theme: Theme) => void;
  applyBrandColor: (color: string) => void;
  addBlock: (type: string, data: Record<string, any>, afterId?: string) => void;
  updateBlock: (id: string, data: Record<string, any>) => void;
  deleteBlock: (id: string) => void;
  duplicateBlock: (id: string) => void;
  toggleBlockVisibility: (id: string) => void;
  lockBlock: (id: string) => void;
  moveBlock: (activeId: string, overId: string) => void;
  selectBlock: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  setPreview: (val: boolean) => void;
  setPreviewMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  loadPage: (page: Page) => void;
  loadProject: (page: Page, pageGoal: string, theme: Theme) => void;
  newProject: () => void;
  markSaved: () => void;
  createSnapshot: (name?: string) => void;
  restoreSnapshot: (id: string) => void;
  deleteSnapshot: (id: string) => void;
}

const STORAGE_KEY = 'ai-pb-v1';

function tryLoadSaved(): { page: Page; pageGoal: string; theme?: Theme } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const saved = tryLoadSaved();

const defaultPage: Page = {
  id: uuid(),
  title: 'My Landing Page',
  blocks: [],
};

const SNAPSHOTS_KEY = 'ai-pb-snapshots';
function tryLoadSnapshots(): Snapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export const usePageStore = create<PageStore>((set, get) => ({
  page: saved?.page ?? defaultPage,
  selectedBlockId: null,
  history: { past: [], present: saved?.page?.blocks ?? [], future: [] },
  isPreview: false,
  previewMode: 'desktop',
  pageGoal: saved?.pageGoal ?? '',
  savedAt: saved ? Date.now() : null,
  theme: saved?.theme ?? { primaryColor: '#4f46e5' },
  snapshots: tryLoadSnapshots(),

  setPageTitle: (title) =>
    set((s) => ({ page: { ...s.page, title } })),

  setPageDescription: (description) =>
    set((s) => ({ page: { ...s.page, description } })),

  setPageSettings: (settings) =>
    set((s) => ({ page: { ...s.page, ...settings } })),

  setPageGoal: (goal) => set({ pageGoal: goal }),
  setTheme: (theme) => set({ theme }),

  applyBrandColor: (color) =>
    set((s) => {
      const raw = JSON.stringify(s.page.blocks);
      // Replace all instances of the default indigo accent #4f46e5
      const updated = raw.replace(/#4f46e5/gi, color);
      try {
        const blocks = JSON.parse(updated) as Block[];
        return {
          page: { ...s.page, blocks },
          theme: { ...s.theme, primaryColor: color },
          history: { past: [...s.history.past, s.page.blocks], present: blocks, future: [] },
        };
      } catch { return {}; }
    }),

  addBlock: (type, data, afterId) => {
    const newBlock: Block = { id: uuid(), type, data };
    set((s) => {
      const blocks = [...s.page.blocks];
      const idx = afterId ? blocks.findIndex((b) => b.id === afterId) + 1 : blocks.length;
      blocks.splice(idx, 0, newBlock);
      return {
        page: { ...s.page, blocks },
        selectedBlockId: newBlock.id,
        history: {
          past: [...s.history.past, s.history.present.length ? s.history.present : s.page.blocks],
          present: blocks,
          future: [],
        },
      };
    });
  },

  updateBlock: (id, data) =>
    set((s) => ({
      page: {
        ...s.page,
        blocks: s.page.blocks.map((b) => (b.id === id ? { ...b, data } : b)),
      },
    })),

  deleteBlock: (id) =>
    set((s) => {
      const blocks = s.page.blocks.filter((b) => b.id !== id);
      return {
        page: { ...s.page, blocks },
        selectedBlockId: s.selectedBlockId === id ? null : s.selectedBlockId,
        history: {
          past: [...s.history.past, s.page.blocks],
          present: blocks,
          future: [],
        },
      };
    }),

  duplicateBlock: (id) =>
    set((s) => {
      const idx = s.page.blocks.findIndex((b) => b.id === id);
      if (idx === -1) return {};
      const clone: Block = { ...s.page.blocks[idx], id: uuid() };
      const blocks = [...s.page.blocks];
      blocks.splice(idx + 1, 0, clone);
      return {
        page: { ...s.page, blocks },
        selectedBlockId: clone.id,
      };
    }),

  toggleBlockVisibility: (id) =>
    set((s) => ({
      page: {
        ...s.page,
        blocks: s.page.blocks.map((b) => b.id === id ? { ...b, hidden: !b.hidden } : b),
      },
    })),

  lockBlock: (id) =>
    set((s) => ({
      page: {
        ...s.page,
        blocks: s.page.blocks.map((b) => b.id === id ? { ...b, locked: !b.locked } : b),
      },
    })),

  moveBlock: (activeId, overId) =>
    set((s) => {
      const blocks = [...s.page.blocks];
      const oldIdx = blocks.findIndex((b) => b.id === activeId);
      const newIdx = blocks.findIndex((b) => b.id === overId);
      if (oldIdx === -1 || newIdx === -1) return {};
      const [moved] = blocks.splice(oldIdx, 1);
      blocks.splice(newIdx, 0, moved);
      return { page: { ...s.page, blocks } };
    }),

  selectBlock: (id) => set({ selectedBlockId: id }),

  undo: () =>
    set((s) => {
      if (!s.history.past.length) return {};
      const past = [...s.history.past];
      const previous = past.pop()!;
      return {
        page: { ...s.page, blocks: previous },
        history: {
          past,
          present: previous,
          future: [s.page.blocks, ...s.history.future],
        },
      };
    }),

  redo: () =>
    set((s) => {
      if (!s.history.future.length) return {};
      const [next, ...future] = s.history.future;
      return {
        page: { ...s.page, blocks: next },
        history: {
          past: [...s.history.past, s.page.blocks],
          present: next,
          future,
        },
      };
    }),

  setPreview: (val) => set({ isPreview: val, selectedBlockId: null }),
  setPreviewMode: (mode) => set({ previewMode: mode }),
  loadPage: (page) =>
    set({ page, selectedBlockId: null, history: { past: [], present: page.blocks, future: [] } }),

  loadProject: (page, pageGoal, theme) =>
    set({ page, pageGoal, theme, selectedBlockId: null, isPreview: false, history: { past: [], present: page.blocks, future: [] } }),

  newProject: () => {
    const page: Page = { id: uuid(), title: 'New Page', blocks: [] };
    set({ page, pageGoal: '', theme: { primaryColor: '#4f46e5' }, selectedBlockId: null, isPreview: false, history: { past: [], present: [], future: [] } });
  },

  markSaved: () => set({ savedAt: Date.now() }),

  createSnapshot: (name) =>
    set((s) => {
      const snapshot: Snapshot = {
        id: uuid(),
        name: name || `Snapshot — ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        blocks: s.page.blocks,
        pageTitle: s.page.title,
        createdAt: Date.now(),
      };
      const snapshots = [snapshot, ...s.snapshots].slice(0, 20);
      try { localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots)); } catch {}
      return { snapshots };
    }),

  restoreSnapshot: (id) =>
    set((s) => {
      const snap = s.snapshots.find(sn => sn.id === id);
      if (!snap) return {};
      return {
        page: { ...s.page, blocks: snap.blocks, title: snap.pageTitle },
        history: { past: [...s.history.past, s.page.blocks], present: snap.blocks, future: [] },
        selectedBlockId: null,
      };
    }),

  deleteSnapshot: (id) =>
    set((s) => {
      const snapshots = s.snapshots.filter(sn => sn.id !== id);
      try { localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots)); } catch {}
      return { snapshots };
    }),
}));
