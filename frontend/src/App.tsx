import React, { useEffect, useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import Toolbar from './components/Toolbar';
import BlockLibrary from './components/BlockLibrary';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import { usePageStore } from './store/pageStore';
import { exportPageToHtml } from './lib/htmlExport';
import { saveProject } from './lib/projects';

const STORAGE_KEY = 'ai-pb-v1';
const SAVE_DEBOUNCE_MS = 800;

function PreviewFrame() {
  const { page, previewMode, theme } = usePageStore();

  const widths: Record<string, string> = {
    desktop: '100%',
    tablet: '768px',
    mobile: '390px',
  };

  const html = exportPageToHtml(page, theme);

  return (
    <div className="flex-1 overflow-auto bg-slate-700 flex items-start justify-center py-4 px-4">
      <iframe
        srcDoc={html}
        style={{ width: widths[previewMode], minHeight: '100%', border: 'none', background: '#fff', borderRadius: '8px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
        title="Page Preview"
      />
    </div>
  );
}

export default function App() {
  const { isPreview, selectedBlockId, deleteBlock, selectBlock, duplicateBlock } = usePageStore();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save to localStorage with debounce
  useEffect(() => {
    const unsub = usePageStore.subscribe((state) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            page: state.page,
            pageGoal: state.pageGoal,
            theme: state.theme,
          }));
          saveProject(state.page, state.pageGoal, state.theme);
          usePageStore.getState().markSaved();
        } catch {}
      }, SAVE_DEBOUNCE_MS);
    });
    return () => {
      unsub();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        usePageStore.getState().undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        usePageStore.getState().redo();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !inInput) {
        const id = usePageStore.getState().selectedBlockId;
        if (id) {
          e.preventDefault();
          deleteBlock(id);
        }
      }
      if (e.key === 'Escape') {
        selectBlock(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        const id = usePageStore.getState().selectedBlockId;
        if (id) {
          e.preventDefault();
          duplicateBlock(id);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        const s = usePageStore.getState();
        s.setPreview(!s.isPreview);
      }
      if (!inInput && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        const state = usePageStore.getState();
        const blocks = state.page.blocks;
        if (blocks.length === 0) return;
        const curIdx = blocks.findIndex((b) => b.id === state.selectedBlockId);
        const nextIdx = e.key === 'ArrowUp'
          ? curIdx <= 0 ? blocks.length - 1 : curIdx - 1
          : curIdx === -1 ? 0 : (curIdx + 1) % blocks.length;
        e.preventDefault();
        selectBlock(blocks[nextIdx].id);
        document.querySelector(`[data-block-id="${blocks[nextIdx].id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteBlock, selectBlock, duplicateBlock]);

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: { background: '#1e293b', color: '#f1f5f9', fontSize: '13px', border: '1px solid #334155' },
          success: { iconTheme: { primary: '#4f46e5', secondary: '#fff' } },
        }}
      />

      <Toolbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        {!isPreview && (
          <aside className="w-56 bg-slate-800 border-r border-slate-700 flex flex-col flex-shrink-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-700">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Blocks</h2>
            </div>
            <BlockLibrary />
          </aside>
        )}

        {/* Main Canvas */}
        {isPreview ? <PreviewFrame /> : <Canvas />}

        {/* Right Sidebar */}
        {!isPreview && (
          <aside className="w-64 bg-slate-800 border-l border-slate-700 flex flex-col flex-shrink-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-700">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Properties</h2>
            </div>
            <PropertiesPanel />
          </aside>
        )}
      </div>
    </div>
  );
}
