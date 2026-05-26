import React, { useState } from 'react';
import { Undo2, Redo2, Eye, EyeOff, Download, Copy, ExternalLink, Monitor, Tablet, Smartphone, Pencil, ShoppingBag, Loader2, CheckCircle, Cloud, Layers, Settings, X, Sparkles, FolderOpen } from 'lucide-react';
import ProjectsModal from './ProjectsModal';
import { usePageStore } from '../store/pageStore';
import { downloadHtml, copyHtml, previewInNewTab, downloadZip } from '../lib/htmlExport';
import { publishToShopify, getShopFromUrl, isShopifyEmbedded } from '../lib/shopifyPublish';
import { generatePageTitle } from '../lib/api';
import toast from 'react-hot-toast';

export default function Toolbar() {
  const { page, theme, undo, redo, isPreview, setPreview, previewMode, setPreviewMode, history, setPageTitle, savedAt, setPageSettings, pageGoal } = usePageStore();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(page.title);
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [showProjects, setShowProjects] = useState(false);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  const shop = getShopFromUrl();
  const inShopify = isShopifyEmbedded();

  const handlePublishToShopify = async () => {
    if (!shop) {
      toast.error('No Shopify store connected. Open this app from your Shopify admin.');
      return;
    }
    if (page.blocks.length === 0) {
      toast.error('Add some sections before publishing');
      return;
    }
    setPublishing(true);
    try {
      const { url } = await publishToShopify(page, shop);
      setPublishedUrl(url);
      toast.success('Page published to Shopify!', { duration: 5000 });
    } catch (err: any) {
      toast.error(err.message || 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const savedLabel = savedAt
    ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : null;

  return (
    <>
    {showProjects && <ProjectsModal onClose={() => setShowProjects(false)} />}
    {showSettings && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
        <div className="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-white font-semibold text-lg">Page Settings</h2>
            <button onClick={() => setShowSettings(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-all">
              <X size={16} />
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Favicon URL</label>
            <input type="url" value={page.faviconUrl || ''} onChange={(e) => setPageSettings({ faviconUrl: e.target.value })}
              placeholder="https://yourdomain.com/favicon.ico"
              className="w-full bg-slate-900 text-slate-200 text-sm px-3 py-2 rounded-lg border border-slate-700 focus:border-indigo-500 focus:outline-none placeholder-slate-600" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">OG Image URL <span className="text-slate-600 normal-case font-normal">(for social sharing)</span></label>
            <input type="url" value={page.ogImageUrl || ''} onChange={(e) => setPageSettings({ ogImageUrl: e.target.value })}
              placeholder="https://yourdomain.com/og-image.png (1200×630)"
              className="w-full bg-slate-900 text-slate-200 text-sm px-3 py-2 rounded-lg border border-slate-700 focus:border-indigo-500 focus:outline-none placeholder-slate-600" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Tracking Code <span className="text-slate-600 normal-case font-normal">(Google Analytics, Hotjar, etc.)</span></label>
            <textarea value={page.trackingCode || ''} onChange={(e) => setPageSettings({ trackingCode: e.target.value })}
              placeholder={`<!-- Google Analytics -->\n<script async src="https://www.googletagmanager.com/..."></script>`}
              rows={4}
              className="w-full bg-slate-900 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-700 focus:border-indigo-500 focus:outline-none placeholder-slate-600 font-mono resize-none" />
            <p className="text-xs text-slate-600 mt-1">Injected into the {"<head>"} of your exported HTML</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Custom CSS <span className="text-slate-600 normal-case font-normal">(override any styles)</span></label>
            <textarea value={page.customCss || ''} onChange={(e) => setPageSettings({ customCss: e.target.value })}
              placeholder={`.hero-section { background: linear-gradient(...); }\nh1 { font-size: 4rem; }`}
              rows={4}
              className="w-full bg-slate-900 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-700 focus:border-indigo-500 focus:outline-none placeholder-slate-600 font-mono resize-none" />
            <p className="text-xs text-slate-600 mt-1">Appended inside {"<style>"} in exported HTML</p>
          </div>

          <button onClick={() => setShowSettings(false)}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-all">
            Save Settings
          </button>
        </div>
      </div>
    )}
    <header className="h-14 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4 flex-shrink-0 z-50">
      {/* Left: Brand + Page Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            AI
          </div>
          <span className="text-white font-semibold text-sm hidden sm:block">PageBuilder</span>
          {inShopify && (
            <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded-full border border-green-800 hidden sm:block">
              Shopify
            </span>
          )}
        </div>
        <button
          onClick={() => setShowProjects(true)}
          title="My Pages"
          className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-all"
        >
          <FolderOpen size={15} />
        </button>
        <div className="w-px h-5 bg-slate-700" />
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => { setPageTitle(titleDraft); setEditingTitle(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { setPageTitle(titleDraft); setEditingTitle(false); } }}
            className="bg-slate-800 text-white text-sm px-2 py-1 rounded border border-indigo-500 outline-none w-48"
          />
        ) : (
          <button
            onClick={() => { setTitleDraft(page.title); setEditingTitle(true); }}
            className="text-slate-300 hover:text-white text-sm flex items-center gap-1.5 group"
          >
            <span className="max-w-[140px] truncate">{page.title}</span>
            <Pencil size={12} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </button>
        )}
        {pageGoal && (
          <button
            onClick={async () => {
              setGeneratingTitle(true);
              try {
                const t = await generatePageTitle(pageGoal);
                if (t) { setPageTitle(t); setTitleDraft(t); toast.success('Title generated!'); }
              } catch { toast.error('Title generation failed'); }
              setGeneratingTitle(false);
            }}
            disabled={generatingTitle}
            title="Generate title with AI"
            className="hidden md:flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-all"
          >
            {generatingTitle ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
          </button>
        )}
        {savedLabel && (
          <span className="hidden md:flex items-center gap-1 text-xs text-slate-500">
            <Cloud size={11} />
            {savedLabel}
          </span>
        )}
        {page.blocks.length > 0 && (
          <span className="hidden lg:flex items-center gap-1 text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">
            <Layers size={10} />
            {page.blocks.length}
          </span>
        )}
      </div>

      {/* Center: Preview mode selectors */}
      {isPreview && (
        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
          {([
            { mode: 'desktop', Icon: Monitor },
            { mode: 'tablet', Icon: Tablet },
            { mode: 'mobile', Icon: Smartphone },
          ] as const).map(({ mode, Icon }) => (
            <button
              key={mode}
              onClick={() => setPreviewMode(mode)}
              className={`p-1.5 rounded-md transition-all ${previewMode === mode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-md hover:bg-slate-800 transition-all"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-md hover:bg-slate-800 transition-all"
        >
          <Redo2 size={16} />
        </button>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        <button
          onClick={() => setPreview(!isPreview)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${isPreview ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
        >
          {isPreview ? <EyeOff size={14} /> : <Eye size={14} />}
          {isPreview ? 'Edit' : 'Preview'}
        </button>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        <button
          onClick={() => setShowSettings(true)}
          title="Page settings (favicon, OG image, tracking)"
          className="p-2 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-all"
        >
          <Settings size={16} />
        </button>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        <button
          onClick={() => { copyHtml(page, theme); toast.success('HTML copied!'); }}
          title="Copy HTML"
          className="p-2 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-all"
        >
          <Copy size={16} />
        </button>
        <button
          onClick={() => previewInNewTab(page, theme)}
          title="Preview in new tab"
          className="p-2 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-all"
        >
          <ExternalLink size={16} />
        </button>
        <div className="flex items-center">
          <button
            onClick={() => { downloadHtml(page, theme); toast.success('HTML exported!'); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-l-md text-sm font-medium transition-all border-r border-slate-700"
            title="Download as HTML"
          >
            <Download size={14} />
            <span className="hidden sm:block">Export</span>
          </button>
          <button
            onClick={() => { downloadZip(page, theme); toast.success('Bundling ZIP…'); }}
            className="px-2 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-r-md text-xs font-medium transition-all"
            title="Export as ZIP (HTML + images)"
          >
            .zip
          </button>
        </div>

        {publishedUrl ? (
          <a
            href={publishedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-md text-sm font-medium transition-all"
          >
            <CheckCircle size={14} />
            View Live
          </a>
        ) : (
          <button
            onClick={handlePublishToShopify}
            disabled={publishing}
            title={shop ? `Publish to ${shop}` : 'Open from Shopify admin to publish'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-all"
          >
            {publishing ? <Loader2 size={14} className="animate-spin" /> : <ShoppingBag size={14} />}
            <span className="hidden sm:block">
              {publishing ? 'Publishing…' : 'Publish'}
            </span>
          </button>
        )}
      </div>
    </header>
    </>
  );
}
