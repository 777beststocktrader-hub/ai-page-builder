import React, { useState, useRef } from 'react';
import { Trash2, Copy, ChevronUp, ChevronDown, Plus, X, ChevronRight, Palette, Type, Search, Upload, Loader2, Eye, EyeOff, Sparkles } from 'lucide-react';
import { generateSeoDescription } from '../lib/api';

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Space Grotesk', label: 'Space Grotesk' },
  { value: 'Outfit', label: 'Outfit' },
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans' },
];
import { usePageStore } from '../store/pageStore';
import { getBlockDef } from '../blocks/blockDefs';
import { Field } from '../types';
import AIPanel from './AIPanel';

function ArrayFieldEditor({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: any;
  onChange: (v: any) => void;
}) {
  const items: any[] = Array.isArray(value) ? value : [];
  const [openIdx, setOpenIdx] = useState<number | null>(items.length > 0 ? 0 : null);

  const toggle = (idx: number) => setOpenIdx(openIdx === idx ? null : idx);

  const moveItem = (idx: number, dir: -1 | 1) => {
    const next = [...items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
    setOpenIdx(target);
  };

  const getItemTitle = (item: any): string => {
    const firstField = field.arrayItemFields?.[0];
    if (!firstField) return 'Item';
    const val = item[firstField.key];
    return (typeof val === 'string' && val.trim()) ? val.trim().slice(0, 32) : 'Item';
  };

  return (
    <div className="space-y-1.5">
      {items.map((item, idx) => (
        <div key={idx} className="rounded-lg border border-slate-700 overflow-hidden">
          {/* Card header */}
          <div
            className="flex items-center px-3 py-2 bg-slate-900/60 cursor-pointer hover:bg-slate-900 select-none"
            onClick={() => toggle(idx)}
          >
            <ChevronRight
              size={12}
              className={`text-slate-500 mr-2 flex-shrink-0 transition-transform ${openIdx === idx ? 'rotate-90' : ''}`}
            />
            <span className="flex-1 text-xs text-slate-300 truncate font-medium">
              {getItemTitle(item)}
            </span>
            <div className="flex items-center gap-0.5 ml-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => moveItem(idx, -1)}
                disabled={idx === 0}
                className="p-1 text-slate-600 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move up"
              >
                <ChevronUp size={11} />
              </button>
              <button
                onClick={() => moveItem(idx, 1)}
                disabled={idx === items.length - 1}
                className="p-1 text-slate-600 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move down"
              >
                <ChevronDown size={11} />
              </button>
              <button
                onClick={() => {
                  onChange(items.filter((_, i) => i !== idx));
                  if (openIdx === idx) setOpenIdx(null);
                }}
                className="p-1 text-slate-600 hover:text-red-400"
                title="Remove"
              >
                <X size={11} />
              </button>
            </div>
          </div>

          {/* Card body */}
          {openIdx === idx && (
            <div className="p-3 space-y-2 border-t border-slate-700 bg-slate-900/30">
              {field.arrayItemFields!.map((subField) => (
                <div key={subField.key}>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{subField.label}</label>
                  <FieldEditor
                    field={subField}
                    value={item[subField.key] ?? ''}
                    onChange={(v) => {
                      const updated = [...items];
                      updated[idx] = { ...updated[idx], [subField.key]: v };
                      onChange(updated);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <button
        onClick={() => {
          const blank: any = {};
          field.arrayItemFields!.forEach((f) => { blank[f.key] = ''; });
          const newIdx = items.length;
          onChange([...items, blank]);
          setOpenIdx(newIdx);
        }}
        className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-600 rounded-lg text-xs text-slate-400 hover:text-white hover:border-slate-400 transition-all"
      >
        <Plus size={12} /> Add {field.label.replace(/s$/, '')}
      </button>
    </div>
  );
}

function FieldEditor({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: any;
  onChange: (v: any) => void;
}) {
  if (field.type === 'array' && field.arrayItemFields) {
    return <ArrayFieldEditor field={field} value={value} onChange={onChange} />;
  }

  if (field.type === 'color') {
    return (
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent flex-shrink-0"
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-slate-900 text-slate-200 text-xs px-2 py-1.5 rounded border border-slate-700 focus:border-indigo-500 focus:outline-none font-mono"
        />
      </div>
    );
  }

  if (field.type === 'select' && field.options) {
    return (
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-900 text-slate-200 text-xs px-2 py-1.5 rounded border border-slate-700 focus:border-indigo-500 focus:outline-none"
      >
        {field.options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={3}
        className="w-full bg-slate-900 text-slate-200 text-xs px-2 py-1.5 rounded border border-slate-700 focus:border-indigo-500 focus:outline-none resize-none placeholder-slate-600"
      />
    );
  }

  if (field.type === 'url') {
    return <UrlFieldEditor value={value} onChange={onChange} placeholder={field.placeholder} />;
  }

  return (
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className="w-full bg-slate-900 text-slate-200 text-xs px-2 py-1.5 rounded border border-slate-700 focus:border-indigo-500 focus:outline-none placeholder-slate-600"
    />
  );
}

function UrlFieldEditor({ value, onChange, placeholder }: { value: any; onChange: (v: any) => void; placeholder?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) onChange(data.url);
      else alert('Upload failed: ' + data.error);
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        <input
          type="url"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'https://...'}
          className="flex-1 bg-slate-900 text-slate-200 text-xs px-2 py-1.5 rounded border border-slate-700 focus:border-indigo-500 focus:outline-none placeholder-slate-600 min-w-0"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Upload image from your device"
          className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded border border-slate-600 transition-all disabled:opacity-50 flex-shrink-0 flex items-center gap-1"
        >
          {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
      </div>
      {value && (
        <div className="rounded overflow-hidden border border-slate-700">
          <img src={value} alt="" className="w-full h-16 object-cover" onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }} />
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  const { theme, setTheme, page, setPageDescription, pageGoal } = usePageStore();
  const [genSeo, setGenSeo] = useState(false);
  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin">
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <div className="text-3xl opacity-60 mb-3">🖱️</div>
        <p className="text-slate-300 text-sm font-medium mb-1">Click any section to edit</p>
        <p className="text-slate-500 text-xs">Or add blocks from the left panel</p>
      </div>

      {/* Brand Settings */}
      <div className="mx-3 mb-3 p-3 rounded-xl bg-slate-900/50 border border-slate-700">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Palette size={11} className="text-indigo-400" />
          Brand Color
        </p>
        <div className="flex items-center gap-2 mb-2.5">
          <input
            type="color"
            value={theme.primaryColor}
            onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
            className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0 bg-transparent flex-shrink-0"
          />
          <div className="flex-1">
            <input
              type="text"
              value={theme.primaryColor}
              onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
              className="w-full bg-slate-900 text-slate-200 text-xs px-2 py-1.5 rounded border border-slate-700 focus:border-indigo-500 focus:outline-none font-mono"
            />
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[
            '#4f46e5', '#0891b2', '#059669', '#dc2626',
            '#7c3aed', '#db2777', '#d97706', '#0f172a',
          ].map((color) => (
            <button
              key={color}
              onClick={() => setTheme({ ...theme, primaryColor: color })}
              title={color}
              className={`w-6 h-6 rounded-full transition-all hover:scale-110 ${theme.primaryColor === color ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Font */}
      <div className="mx-3 mb-3 p-3 rounded-xl bg-slate-900/50 border border-slate-700">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Type size={11} className="text-indigo-400" />
          Export Font
        </p>
        <select
          value={theme.font || 'Inter'}
          onChange={(e) => setTheme({ ...theme, font: e.target.value })}
          className="w-full bg-slate-900 text-slate-200 text-xs px-2 py-1.5 rounded border border-slate-700 focus:border-indigo-500 focus:outline-none"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <p className="text-xs text-slate-600 mt-1.5">Applied in exported HTML</p>
      </div>

      {/* SEO Settings */}
      <div className="mx-3 mb-3 p-3 rounded-xl bg-slate-900/50 border border-slate-700">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Search size={11} className="text-indigo-400" />
          SEO / Meta
        </p>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slate-500">Meta Description</label>
            <button
              onClick={async () => {
                setGenSeo(true);
                try {
                  const desc = await generateSeoDescription(
                    page.title,
                    pageGoal || undefined,
                    page.blocks.map((b) => b.type)
                  );
                  if (desc) setPageDescription(desc);
                } catch {}
                setGenSeo(false);
              }}
              disabled={genSeo}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-all"
            >
              {genSeo ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
              {genSeo ? 'Generating…' : 'AI generate'}
            </button>
          </div>
          <textarea
            value={page.description || ''}
            onChange={(e) => setPageDescription(e.target.value)}
            placeholder="Describe your page for search engines..."
            rows={2}
            className="w-full bg-slate-900 text-slate-200 text-xs px-2 py-1.5 rounded border border-slate-700 focus:border-indigo-500 focus:outline-none resize-none placeholder-slate-600"
          />
          <p className="text-xs text-slate-600 mt-1">{(page.description || '').length}/160 chars</p>
        </div>
      </div>

      {/* Shortcuts */}
      <div className="mx-3 mb-3 p-3 rounded-xl bg-slate-900/50 border border-slate-700">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Shortcuts</p>
        {[
          { keys: 'Click text', label: 'Edit inline (selected block)' },
          { keys: 'Ctrl+Z', label: 'Undo' },
          { keys: 'Ctrl+Y', label: 'Redo' },
          { keys: 'Ctrl+D', label: 'Duplicate selected block' },
          { keys: 'Del', label: 'Delete selected block' },
          { keys: 'Esc', label: 'Deselect' },
          { keys: '↑ / ↓', label: 'Select prev / next block' },
        ].map(({ keys, label }) => (
          <div key={keys} className="flex items-center justify-between py-1">
            <span className="text-xs text-slate-500">{label}</span>
            <kbd className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono whitespace-nowrap ml-2">{keys}</kbd>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PropertiesPanel() {
  const { selectedBlockId, page, updateBlock, deleteBlock, duplicateBlock, moveBlock, toggleBlockVisibility } = usePageStore();

  const block = page.blocks.find((b) => b.id === selectedBlockId);
  const blockIndex = page.blocks.findIndex((b) => b.id === selectedBlockId);
  const def = block ? getBlockDef(block.type) : null;

  if (!block || !def) return <EmptyState />;

  const handleFieldChange = (key: string, value: any) => {
    updateBlock(block.id, { ...block.data, [key]: value });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Block header */}
      <div className="p-3 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{def.emoji}</span>
            <span className="text-sm font-semibold text-white">{def.label}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => blockIndex > 0 && moveBlock(block.id, page.blocks[blockIndex - 1].id)}
              disabled={blockIndex === 0}
              className="p-1 text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded"
              title="Move up"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={() => blockIndex < page.blocks.length - 1 && moveBlock(block.id, page.blocks[blockIndex + 1].id)}
              disabled={blockIndex === page.blocks.length - 1}
              className="p-1 text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded"
              title="Move down"
            >
              <ChevronDown size={14} />
            </button>
            <button
              onClick={() => toggleBlockVisibility(block.id)}
              className={`p-1 rounded ${block.hidden ? 'text-yellow-500 hover:text-yellow-400' : 'text-slate-500 hover:text-slate-300'}`}
              title={block.hidden ? 'Show block' : 'Hide block (excluded from export)'}
            >
              {block.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button
              onClick={() => duplicateBlock(block.id)}
              className="p-1 text-slate-500 hover:text-blue-400 rounded"
              title="Duplicate"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={() => deleteBlock(block.id)}
              className="p-1 text-slate-500 hover:text-red-400 rounded"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
        {def.fields.map((field) => (
          <div key={field.key}>
            <label className="block text-xs font-medium text-slate-400 mb-1">{field.label}</label>
            <FieldEditor
              field={field}
              value={block.data[field.key]}
              onChange={(v) => handleFieldChange(field.key, v)}
            />
          </div>
        ))}
      </div>

      {/* AI Panel */}
      <div className="border-t border-slate-700 flex-shrink-0">
        <AIPanel block={block} def={def} />
      </div>
    </div>
  );
}
