import React, { useState, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Copy, EyeOff, Code, Sparkles, Loader2, Wand2, ArrowRight, Zap, Languages, X, Lock, Unlock, ChevronUp, ChevronDown, Monitor, Tablet, Smartphone } from 'lucide-react';
import { usePageStore } from '../store/pageStore';
import { getBlockDef } from '../blocks/blockDefs';
import { Block, BlockStyle } from '../types';
import BLOCK_DEFS from '../blocks/blockDefs';
import { generateBlockContent, generateFullPage, polishPage, translatePage } from '../lib/api';
import toast from 'react-hot-toast';

function getSmartSuggestions(existingTypes: string[]): string[] {
  const priority = ['hero', 'features', 'testimonials', 'pricing', 'cta', 'steps', 'faq', 'stats', 'newsletter', 'comparison', 'gallery', 'video', 'countdown', 'team', 'contact', 'testimonial-single', 'cta-banner'];
  const missing = priority.filter((t) => !existingTypes.includes(t));
  return missing.slice(0, 6);
}

function ContextMenu({ x, y, block, onClose }: { x: number; y: number; block: Block; onClose: () => void }) {
  const { deleteBlock, duplicateBlock, moveBlock, toggleBlockVisibility, lockBlock, page } = usePageStore();
  const def = getBlockDef(block.type);
  const idx = page.blocks.findIndex(b => b.id === block.id);

  const item = (icon: React.ReactNode, label: string, onClick: () => void, danger?: boolean) => (
    <button
      key={label}
      onClick={() => { onClick(); onClose(); }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors rounded-md ${danger ? 'text-red-400 hover:bg-red-950/40' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div
      className="fixed z-[200] bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-1.5 w-48"
      style={{ left: x, top: y }}
      onClick={e => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 border-b border-slate-700 mb-1">
        <p className="text-xs font-semibold text-slate-400">{def?.emoji} {def?.label}</p>
      </div>
      {item(<Copy size={12} />, 'Duplicate', () => duplicateBlock(block.id))}
      {item(<ChevronUp size={12} />, 'Move Up', () => idx > 0 && moveBlock(block.id, page.blocks[idx - 1].id), false)}
      {item(<ChevronDown size={12} />, 'Move Down', () => idx < page.blocks.length - 1 && moveBlock(block.id, page.blocks[idx + 1].id), false)}
      <div className="border-t border-slate-700 my-1" />
      {item(block.hidden ? <EyeOff size={12} /> : <EyeOff size={12} />, block.hidden ? 'Show Block' : 'Hide Block', () => toggleBlockVisibility(block.id))}
      {item(block.locked ? <Unlock size={12} /> : <Lock size={12} />, block.locked ? 'Unlock Block' : 'Lock Block', () => lockBlock(block.id))}
      {item(<Code size={12} />, 'Copy HTML', () => {
        const html = def?.exportHtml(block.data) || '';
        navigator.clipboard.writeText(html).then(() => toast.success('Block HTML copied!'));
      })}
      <div className="border-t border-slate-700 my-1" />
      {item(<Trash2 size={12} />, 'Delete Block', () => { deleteBlock(block.id); }, true)}
    </div>
  );
}

function SortableBlock({ block, selected, existingTypes }: { block: Block; selected: boolean; existingTypes: string[] }) {
  const { selectBlock, deleteBlock, duplicateBlock, addBlock, updateBlock, pageGoal, moveBlock, toggleBlockVisibility, lockBlock, page } = usePageStore();
  const def = getBlockDef(block.type);
  const [rewriting, setRewriting] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleAiRewrite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!def || rewriting) return;
    setRewriting(true);
    try {
      const newData = await generateBlockContent(
        block.type,
        'Make this section more compelling, benefit-focused, and conversion-optimized. Keep the same structure.',
        block.data,
        'marketing',
        pageGoal || undefined
      );
      updateBlock(block.id, { ...block.data, ...newData });
      toast.success('Block rewritten!');
    } catch {
      toast.error('AI rewrite failed');
    }
    setRewriting(false);
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  if (!def) return null;

  const onUpdate = selected
    ? (key: string, val: string) => updateBlock(block.id, { ...block.data, [key]: val })
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-block-id={block.id}
      className={`relative group canvas-block-enter ${selected ? 'block-selected' : 'hover:block-hover-outline'}`}
      onClick={(e) => { e.stopPropagation(); selectBlock(block.id); if (contextMenu) setContextMenu(null); }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY }); selectBlock(block.id); }}
    >
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          block={block}
          onClose={() => setContextMenu(null)}
        />
      )}
      {/* Block Controls */}
      <div className={`absolute top-2 right-2 z-50 flex items-center gap-1 transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <div
          {...attributes}
          {...listeners}
          className="p-1.5 bg-slate-800/90 backdrop-blur-sm text-slate-400 hover:text-white rounded-md cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical size={14} />
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }}
          className="p-1.5 bg-slate-800/90 backdrop-blur-sm text-slate-400 hover:text-blue-400 rounded-md"
          title="Duplicate"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={handleAiRewrite}
          disabled={rewriting}
          className="p-1.5 bg-slate-800/90 backdrop-blur-sm text-slate-400 hover:text-purple-400 rounded-md disabled:opacity-50"
          title="AI rewrite this block"
        >
          {rewriting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            const html = def.exportHtml(block.data);
            navigator.clipboard.writeText(html).then(() => toast.success('Block HTML copied!'));
          }}
          className="p-1.5 bg-slate-800/90 backdrop-blur-sm text-slate-400 hover:text-green-400 rounded-md"
          title="Copy block HTML"
        >
          <Code size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); selectBlock(null); }}
          className="p-1.5 bg-slate-800/90 backdrop-blur-sm text-slate-400 hover:text-red-400 rounded-md"
          title="Delete (Del)"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Section Label */}
      <div className={`absolute top-2 left-2 z-50 transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <span className="px-2 py-1 bg-indigo-600/90 backdrop-blur-sm text-white text-xs rounded-md font-medium">
          {def.emoji} {def.label}
        </span>
      </div>

      {/* Inline edit hint */}
      {selected && (
        <div className="absolute bottom-2 left-2 z-50 pointer-events-none">
          <span className="px-2 py-0.5 bg-black/50 backdrop-blur-sm text-white/70 text-xs rounded">
            Click text to edit inline
          </span>
        </div>
      )}

      {/* Hidden block overlay */}
      {block.hidden && (
        <div className="absolute inset-0 z-40 bg-slate-900/60 flex items-center justify-center pointer-events-none">
          <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded-lg font-medium">
            <EyeOff size={12} /> Hidden — excluded from export
          </span>
        </div>
      )}

      {/* Block Content — pointer events enabled when selected for inline editing */}
      <div
        className={`${selected ? '' : 'pointer-events-none select-none'} ${block.hidden ? 'opacity-30' : ''}`}
        style={block.style?.bgType === 'solid' ? { backgroundColor: block.style.bgColor } : block.style?.bgType === 'gradient' ? { background: block.style.bgGradient } : undefined}
      >
        {def.renderCanvas(block.data, onUpdate)}
      </div>

      {/* Smart Add Button between blocks */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-50 transition-opacity opacity-0 group-hover:opacity-100">
        <div className="relative">
          <div className="w-px h-4 bg-indigo-500 mx-auto" />
          <div className="flex gap-1 bg-slate-900 border border-slate-600 rounded-lg p-1 shadow-lg items-center">
            <span className="text-slate-600 text-xs px-1">Add:</span>
            {getSmartSuggestions(existingTypes).map((type) => {
              const d = BLOCK_DEFS.find((b) => b.type === type);
              if (!d) return null;
              return (
                <button
                  key={d.type}
                  onClick={(e) => {
                    e.stopPropagation();
                    addBlock(d.type, { ...d.defaultData }, block.id);
                    toast.success(`${d.label} added`);
                  }}
                  title={`Add ${d.label}`}
                  className="p-1 text-base hover:bg-slate-700 rounded"
                >
                  {d.emoji}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function estimateReadingTime(blocks: import('../types').Block[]): string {
  const text = blocks.map((b) => JSON.stringify(b.data)).join(' ');
  const words = text.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `~${minutes} min read`;
}

const QUICK_GOALS = [
  { label: 'SaaS product', goal: 'SaaS project management tool for small teams' },
  { label: 'Agency', goal: 'Digital marketing agency that grows brands online' },
  { label: 'E-commerce', goal: 'Online store for premium handmade jewelry' },
  { label: 'Restaurant', goal: 'Modern Italian restaurant in downtown' },
  { label: 'Portfolio', goal: 'Freelance web developer portfolio' },
  { label: 'Mobile app', goal: 'Fitness tracking mobile app for beginners' },
];

function EmptyState() {
  const { addBlock, setPageGoal, setPageTitle } = usePageStore();
  const [goal, setGoal] = useState('');
  const [generating, setGenerating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async (customGoal?: string) => {
    const finalGoal = customGoal || goal;
    if (!finalGoal.trim()) { inputRef.current?.focus(); return; }
    setGenerating(true);
    setPageGoal(finalGoal);
    try {
      const { blocks, tagline } = await generateFullPage(finalGoal);
      if (blocks.length === 0) throw new Error('No blocks generated');
      for (const b of blocks) {
        const def = BLOCK_DEFS.find((d) => d.type === b.type);
        if (def) addBlock(b.type, { ...def.defaultData, ...b.data });
      }
      if (tagline) setPageTitle(tagline);
      toast.success(`Page generated with ${blocks.length} sections! ✨`);
    } catch (err: any) {
      toast.error(err.message || 'Generation failed — try again');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-indigo-50 cursor-default p-8">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-4 shadow-lg shadow-indigo-200">
            <Wand2 size={26} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome to PageGenie ✨</h2>
          <p className="text-slate-500 text-sm">Describe your business and get a complete landing page in seconds</p>
        </div>

        {/* AI input */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-100 p-1 mb-4 flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-400 ml-3 flex-shrink-0" />
          <input
            ref={inputRef}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !generating) handleGenerate(); }}
            placeholder="e.g. SaaS tool for managing client projects..."
            className="flex-1 text-sm text-slate-700 bg-transparent outline-none py-3 placeholder-slate-400"
            disabled={generating}
          />
          <button
            onClick={() => handleGenerate()}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all flex-shrink-0"
          >
            {generating ? (
              <><Loader2 size={14} className="animate-spin" /> Building…</>
            ) : (
              <><Zap size={14} /> Generate</>
            )}
          </button>
        </div>

        {/* Quick goals */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {QUICK_GOALS.map((q) => (
            <button
              key={q.label}
              onClick={() => { setGoal(q.goal); handleGenerate(q.goal); }}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-full text-xs font-medium text-slate-600 hover:text-indigo-700 transition-all disabled:opacity-50 shadow-sm"
            >
              {q.label} <ArrowRight size={10} />
            </button>
          ))}
        </div>

        {/* Or add manually */}
        <div className="text-center">
          <p className="text-xs text-slate-400 mb-3">Or add sections manually</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {['hero', 'features', 'pricing', 'testimonials', 'cta', 'faq'].map((type) => {
              const def = BLOCK_DEFS.find((b) => b.type === type);
              if (!def) return null;
              return (
                <button
                  key={def.type}
                  onClick={() => { addBlock(def.type, { ...def.defaultData }); toast.success(`${def.label} added`); }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs hover:border-indigo-300 hover:shadow-sm transition-all text-slate-600 hover:text-indigo-700"
                >
                  <span>{def.emoji}</span>
                  <span className="font-medium">{def.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const LANGUAGES = [
  'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Dutch',
  'Japanese', 'Korean', 'Chinese (Simplified)', 'Arabic', 'Hindi', 'Russian',
  'Turkish', 'Polish', 'Swedish', 'Norwegian', 'Danish', 'Finnish',
];

export default function Canvas() {
  const { page, selectedBlockId, selectBlock, moveBlock, addBlock, updateBlock, pageGoal, theme, previewMode, setPreviewMode } = usePageStore();
  const [polishing, setPolishing] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [polishTone, setPolishTone] = useState<'marketing' | 'professional' | 'casual' | 'playful'>('marketing');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      moveBlock(active.id as string, over.id as string);
    }
  };

  const handlePolish = async () => {
    if (polishing || page.blocks.length === 0) return;
    setPolishing(true);
    try {
      const input = page.blocks.map(b => ({ type: b.type, data: b.data }));
      const polished = await polishPage(input, pageGoal || page.title, polishTone);
      polished.forEach((pb, i) => {
        if (page.blocks[i]) updateBlock(page.blocks[i].id, pb.data);
      });
      toast.success(`Page polished! ✨ All ${page.blocks.length} sections rewritten.`);
    } catch (err: any) {
      toast.error(err.message || 'Polish failed');
    }
    setPolishing(false);
  };

  const handleTranslate = async (lang: string) => {
    setShowLangPicker(false);
    setTranslating(true);
    try {
      const input = page.blocks.map(b => ({ type: b.type, data: b.data }));
      const translated = await translatePage(input, lang);
      translated.forEach((tb, i) => {
        if (page.blocks[i]) updateBlock(page.blocks[i].id, tb.data);
      });
      toast.success(`Translated to ${lang}! 🌐`);
    } catch (err: any) {
      toast.error(err.message || 'Translation failed');
    }
    setTranslating(false);
  };

  if (page.blocks.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      className="flex-1 overflow-y-auto bg-slate-200 relative"
      style={{ '--brand': theme.primaryColor } as React.CSSProperties}
      onClick={() => { selectBlock(null); setShowLangPicker(false); }}
    >
      {page.blocks.length > 0 && (
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-1.5 bg-slate-100/80 backdrop-blur-sm border-b border-slate-200">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>{page.blocks.length} section{page.blocks.length !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{estimateReadingTime(page.blocks)}</span>
            <span>·</span>
            {/* Preview mode toggle */}
            <div className="flex items-center gap-0.5 bg-slate-200 rounded-lg p-0.5">
              {([['desktop', Monitor, 'Desktop'], ['tablet', Tablet, 'Tablet (768px)'], ['mobile', Smartphone, 'Mobile (390px)']] as const).map(([mode, Icon, label]) => (
                <button
                  key={mode}
                  onClick={() => setPreviewMode(mode)}
                  title={label}
                  className={`p-1 rounded-md transition-all ${previewMode === mode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Icon size={12} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            {/* Polish Page */}
            <select
              value={polishTone}
              onChange={e => setPolishTone(e.target.value as any)}
              disabled={polishing || translating}
              className="py-1 px-1.5 bg-slate-700 text-slate-300 text-xs rounded-md border border-slate-600 focus:outline-none focus:border-purple-500 disabled:opacity-50"
              title="Tone for Polish Page"
            >
              <option value="marketing">Marketing</option>
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="playful">Playful</option>
            </select>
            <button
              onClick={handlePolish}
              disabled={polishing || translating}
              title="Polish Page — AI rewrites all sections for consistent, compelling copy"
              className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-md transition-all"
            >
              {polishing ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              {polishing ? 'Polishing…' : 'Polish Page'}
            </button>
            {/* Translate */}
            <div className="relative">
              <button
                onClick={() => setShowLangPicker(!showLangPicker)}
                disabled={polishing || translating}
                title="Translate all content to another language"
                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 text-xs font-medium rounded-md transition-all border border-slate-600"
              >
                {translating ? <Loader2 size={11} className="animate-spin" /> : <Languages size={11} />}
                {translating ? 'Translating…' : 'Translate'}
              </button>
              {showLangPicker && (
                <div className="absolute right-0 top-8 z-[100] w-52 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
                    <span className="text-xs font-semibold text-slate-300">Translate to…</span>
                    <button onClick={() => setShowLangPicker(false)} className="p-0.5 text-slate-500 hover:text-white"><X size={11} /></button>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {LANGUAGES.map(lang => (
                      <button key={lang} onClick={() => handleTranslate(lang)}
                        className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/30 last:border-0">
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div
        className="min-h-full bg-white mx-auto shadow-xl my-4 transition-all duration-300"
        style={{
          maxWidth: previewMode === 'mobile' ? 390 : previewMode === 'tablet' ? 768 : undefined,
          width: previewMode !== 'desktop' ? '100%' : undefined,
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={page.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="divide-y divide-slate-100">
              {page.blocks.map((block) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  selected={selectedBlockId === block.id}
                  existingTypes={page.blocks.map((b) => b.type)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
