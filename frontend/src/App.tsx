import React, { useEffect, useRef, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Toolbar from './components/Toolbar';
import BlockLibrary from './components/BlockLibrary';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import { usePageStore } from './store/pageStore';
import { exportPageToHtml } from './lib/htmlExport';
import { saveProject } from './lib/projects';
import { getBlockDef } from './blocks/blockDefs';
import { Search, X } from 'lucide-react';

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

function BlockSearchOverlay({ onClose }: { onClose: () => void }) {
  const { page, selectBlock } = usePageStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = query.trim().length < 2 ? [] : page.blocks.filter(block => {
    const text = JSON.stringify(block.data).toLowerCase();
    const def = getBlockDef(block.type);
    return text.includes(query.toLowerCase()) || def?.label.toLowerCase().includes(query.toLowerCase());
  });

  const pick = (id: string) => {
    selectBlock(id);
    document.querySelector(`[data-block-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-24 px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
          <Search size={16} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search blocks by content…"
            className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 focus:outline-none"
            onKeyDown={e => { if (e.key === 'Escape') onClose(); if (e.key === 'Enter' && results.length > 0) pick(results[0].id); }}
          />
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-white rounded"><X size={14} /></button>
        </div>
        {query.trim().length >= 2 && (
          <div className="max-h-80 overflow-y-auto">
            {results.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No blocks found</p>
            ) : results.map(block => {
              const def = getBlockDef(block.type);
              const preview = Object.values(block.data).filter(v => typeof v === 'string' && v.length > 2).slice(0, 2).join(' · ').slice(0, 60);
              return (
                <button key={block.id} onClick={() => pick(block.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 text-left transition-colors border-b border-slate-700/50 last:border-0">
                  <span className="text-xl flex-shrink-0">{def?.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{def?.label}</p>
                    <p className="text-xs text-slate-400 truncate">{preview}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {query.trim().length < 2 && (
          <p className="py-5 text-center text-xs text-slate-600">Type at least 2 characters to search</p>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const { isPreview, selectedBlockId, deleteBlock, selectBlock, duplicateBlock } = usePageStore();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSearch, setShowSearch] = useState(false);

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
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !inInput) {
        e.preventDefault();
        setShowSearch(true);
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
      {showSearch && <BlockSearchOverlay onClose={() => setShowSearch(false)} />}
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
