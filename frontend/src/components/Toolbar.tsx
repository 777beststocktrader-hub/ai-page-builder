import React, { useState } from 'react';
import { Undo2, Redo2, Eye, EyeOff, Download, Copy, ExternalLink, Monitor, Tablet, Smartphone, Pencil, ShoppingBag, Loader2, CheckCircle, Cloud, Layers, Settings, X, Sparkles, FolderOpen, Link, Unlink, Share2, History, RotateCcw, Trash2, Globe, Package, MoreHorizontal, Upload } from 'lucide-react';
import ProjectsModal from './ProjectsModal';
import ShopifyConnectModal, { getShopifyCredentials, clearShopifyCredentials, ShopifyCredentials } from './ShopifyConnectModal';
import ProductPickerModal from './ProductPickerModal';
import MySitesModal from './MySitesModal';
import PageGenieLogo from './PageGenieLogo';
import { usePageStore } from '../store/pageStore';
import { downloadHtml, copyHtml, previewInNewTab, downloadZip, exportPageToHtml, exportPageJson, importPageJson } from '../lib/htmlExport';
import { publishToShopify, isShopifyEmbedded } from '../lib/shopifyPublish';
import { generatePageTitle, createShareLink, publishToWeb } from '../lib/api';
import toast from 'react-hot-toast';

export default function Toolbar() {
  const { page, theme, undo, redo, isPreview, setPreview, previewMode, setPreviewMode, history, setPageTitle, savedAt, setPageSettings, pageGoal, snapshots, createSnapshot, restoreSnapshot, deleteSnapshot } = usePageStore();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(page.title);
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showShopifyConnect, setShowShopifyConnect] = useState(false);
  const [shopifyCreds, setShopifyCreds] = useState<ShopifyCredentials | null>(() => getShopifyCredentials());
  const [sharing, setSharing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [publishingWeb, setPublishingWeb] = useState(false);
  const [webUrl, setWebUrl] = useState<string | null>(null);
  const [showMySites, setShowMySites] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  const inShopify = isShopifyEmbedded();

  const handlePublishToShopify = async () => {
    const creds = getShopifyCredentials();
    if (!creds && !isShopifyEmbedded()) {
      setShowShopifyConnect(true);
      return;
    }
    if (page.blocks.length === 0) {
      toast.error('Add some sections before publishing');
      return;
    }
    setPublishing(true);
    try {
      const { url, adminUrl } = await publishToShopify(page, theme) as any;
      setPublishedUrl(url);
      toast.success(
        <span>Page live! <a href={adminUrl || url} target="_blank" rel="noopener noreferrer" className="underline">View in Shopify</a></span>,
        { duration: 6000 }
      );
    } catch (err: any) {
      toast.error(err.message || 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const handlePublishWeb = async () => {
    if (page.blocks.length === 0) { toast.error('Add sections before creating a preview link'); return; }
    setPublishingWeb(true);
    try {
      const html = exportPageToHtml(page, theme);
      const { url } = await publishToWeb(html, page.title);
      setWebUrl(url);
      await navigator.clipboard.writeText(url);
      toast.success(
        <span>Preview link copied. <a href={url} target="_blank" rel="noopener noreferrer" className="underline font-semibold">Open preview</a></span>,
        { duration: 8000 }
      );
    } catch {
      toast.error('Could not create preview link');
    }
    setPublishingWeb(false);
  };

  const handleShare = async () => {
    if (page.blocks.length === 0) { toast.error('Add sections before sharing'); return; }
    setSharing(true);
    try {
      const html = exportPageToHtml(page, theme);
      const url = await createShareLink(html, page.title);
      await navigator.clipboard.writeText(url);
      toast.success('Share link copied to clipboard!', { duration: 5000 });
    } catch {
      toast.error('Could not create share link');
    }
    setSharing(false);
  };

  const savedLabel = savedAt
    ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : null;

  return (
    <>
    {showProjects && <ProjectsModal onClose={() => setShowProjects(false)} />}
    {showMySites && <MySitesModal onClose={() => setShowMySites(false)} />}
    {showProductPicker && <ProductPickerModal onClose={() => setShowProductPicker(false)} />}
    {showShopifyConnect && (
      <ShopifyConnectModal
        onClose={() => setShowShopifyConnect(false)}
        onConnected={(creds) => { setShopifyCreds(creds); toast.success(`Connected to ${creds.shop}!`); }}
      />
    )}
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
          <PageGenieLogo size="sm" />
          <div className="hidden w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/30">
            ✨
          </div>
          <span className="hidden">PageGenie</span>
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

        <div className="relative">
          <button
            onClick={() => { if (page.blocks.length > 0) { createSnapshot(); setShowHistory(true); } else setShowHistory(!showHistory); }}
            title="Version history — save and restore snapshots"
            className={`p-2 rounded-md hover:bg-slate-800 transition-all ${showHistory ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
          >
            <History size={16} />
          </button>
          {showHistory && (
            <div className="absolute right-0 top-10 z-[200] w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
                <span className="text-xs font-semibold text-slate-300">Version History</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => { createSnapshot(); toast.success('Snapshot saved!'); }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">+ Save now</button>
                  <button onClick={() => setShowHistory(false)} className="p-0.5 text-slate-500 hover:text-white rounded">
                    <X size={12} />
                  </button>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {snapshots.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-500">No snapshots yet.<br/>Snapshots save automatically or click "+ Save now".</p>
                ) : snapshots.map(snap => (
                  <div key={snap.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 border-b border-slate-700/50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">{snap.name}</p>
                      <p className="text-xs text-slate-500">{snap.blocks.length} blocks · {new Date(snap.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <button onClick={() => { restoreSnapshot(snap.id); setShowHistory(false); toast.success('Restored!'); }}
                      title="Restore this snapshot" className="p-1 text-slate-500 hover:text-green-400 rounded"><RotateCcw size={12} /></button>
                    <button onClick={() => deleteSnapshot(snap.id)}
                      title="Delete snapshot" className="p-1 text-slate-500 hover:text-red-400 rounded"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

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

        <div className="hidden items-center gap-1">
        <button
          onClick={handleShare}
          disabled={sharing}
          title="Create shareable preview link (copies to clipboard)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md text-sm font-medium transition-all disabled:opacity-50"
        >
          {sharing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
          <span className="hidden sm:block">Share</span>
        </button>
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
            className="px-2 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition-all border-r border-slate-700"
            title="Export as ZIP (HTML + images)"
          >
            .zip
          </button>
          <button
            onClick={() => { exportPageJson(page, theme); toast.success('JSON exported!'); }}
            className="px-2 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-r-md text-xs font-medium transition-all"
            title="Export page data as JSON"
          >
            .json
          </button>
        </div>
        <button
          onClick={() => importPageJson((p, t) => {
            usePageStore.getState().loadProject(p, '', t ?? usePageStore.getState().theme);
            toast.success('Page imported!');
          })}
          title="Import page from JSON file"
          className="p-2 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-all text-xs font-medium"
        >
          Import
        </button>

        {/* Preview link tools */}
        <div className="w-px h-5 bg-slate-700 mx-1" />
        <button
          onClick={() => setShowMySites(true)}
          title="Saved preview links"
          className="p-2 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-all"
        >
          <Globe size={16} />
        </button>
        {webUrl ? (
          <a href={webUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md text-sm font-medium transition-all"
          >
            <CheckCircle size={14} />
            <span className="hidden sm:block">Preview</span>
          </a>
        ) : (
          <button
            onClick={handlePublishWeb}
            disabled={publishingWeb}
            title="Create a preview link"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-all"
          >
            {publishingWeb ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
            <span className="hidden sm:block">{publishingWeb ? 'Creating...' : 'Preview link'}</span>
          </button>
        )}
        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Build from Product button — show when Shopify is connected */}
        </div>
        {(shopifyCreds || inShopify) && (
          <button
            onClick={() => setShowProductPicker(true)}
            title="Build a landing page from your Shopify products"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-200 bg-emerald-900/35 hover:bg-emerald-800/55 border border-emerald-700/50 hover:border-emerald-500/60 rounded-md transition-all"
          >
            <Package size={13} />
            Build from products
          </button>
        )}

        {/* Shopify connect indicator */}
        {shopifyCreds ? (
          <button
            onClick={() => {
              if (confirm(`Disconnect ${shopifyCreds.shop}?`)) {
                clearShopifyCredentials();
                setShopifyCreds(null);
                setPublishedUrl(null);
                toast.success('Disconnected');
              }
            }}
            title={`Connected to ${shopifyCreds.shop} — click to disconnect`}
            className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 text-xs text-green-400 hover:text-red-400 bg-green-900/20 hover:bg-red-900/20 border border-green-800/40 hover:border-red-800/40 rounded-md transition-all"
          >
            <Link size={11} />
            <span className="max-w-[100px] truncate">{shopifyCreds.shop.replace('.myshopify.com', '')}</span>
          </button>
        ) : !isShopifyEmbedded() && (
          <button
            onClick={() => setShowShopifyConnect(true)}
            title="Connect your Shopify store"
            className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 text-xs text-slate-400 hover:text-green-400 bg-slate-800 hover:bg-green-900/20 border border-slate-700 hover:border-green-800/40 rounded-md transition-all"
          >
            <Unlink size={11} />
            Connect Store
          </button>
        )}

        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setShowMoreActions(!showMoreActions)}
            title="More actions"
            className={`p-2 rounded-md transition-all ${showMoreActions ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <MoreHorizontal size={16} />
          </button>
          {showMoreActions && (
            <div className="absolute right-0 top-10 z-[220] w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-1.5">
              <button onClick={handleShare} disabled={sharing || page.blocks.length === 0}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">
                {sharing ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />} Share preview
              </button>
              <button onClick={() => previewInNewTab(page, theme)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg">
                <ExternalLink size={13} /> Open preview tab
              </button>
              <button onClick={() => { copyHtml(page, theme); toast.success('HTML copied!'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg">
                <Copy size={13} /> Copy HTML
              </button>
              <div className="h-px bg-slate-700 my-1" />
              <button onClick={() => { downloadHtml(page, theme); toast.success('HTML exported!'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg">
                <Download size={13} /> Export HTML
              </button>
              <button onClick={() => { downloadZip(page, theme); toast.success('Bundling ZIP...'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg">
                <Download size={13} /> Export ZIP
              </button>
              <button onClick={() => { exportPageJson(page, theme); toast.success('JSON exported!'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg">
                <Download size={13} /> Export JSON
              </button>
              <button onClick={() => importPageJson((p, t) => {
                  usePageStore.getState().loadProject(p, '', t ?? usePageStore.getState().theme);
                  toast.success('Page imported!');
                })}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg">
                <Upload size={13} /> Import JSON
              </button>
              <div className="h-px bg-slate-700 my-1" />
              <button onClick={() => setShowMySites(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg">
                <Globe size={13} /> Saved preview links
              </button>
              {webUrl ? (
                <a href={webUrl} target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-emerald-300 hover:text-white hover:bg-emerald-900/50 rounded-lg">
                  <CheckCircle size={13} /> Open preview link
                </a>
              ) : (
                <button onClick={handlePublishWeb} disabled={publishingWeb || page.blocks.length === 0}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-emerald-300 hover:text-white hover:bg-emerald-900/50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">
                  {publishingWeb ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />} Create preview link
                </button>
              )}
            </div>
          )}
        </div>

        {publishedUrl ? (
          <a
            href={publishedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-md text-sm font-medium transition-all"
          >
            <CheckCircle size={14} />
            View Shopify Page
          </a>
        ) : (
          <button
            onClick={handlePublishToShopify}
            disabled={publishing}
            title={shopifyCreds ? `Publish to ${shopifyCreds.shop}` : 'Connect a store to publish to Shopify'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-all"
          >
            {publishing ? <Loader2 size={14} className="animate-spin" /> : <ShoppingBag size={14} />}
            <span className="hidden sm:block">
              {publishing ? 'Publishing...' : 'Publish to Shopify'}
            </span>
          </button>
        )}
      </div>
    </header>
    </>
  );
}
