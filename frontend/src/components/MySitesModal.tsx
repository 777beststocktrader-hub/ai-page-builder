import React, { useEffect, useState } from 'react';
import { X, Globe, ExternalLink, Trash2, RefreshCw, Loader2, Eye, BarChart2 } from 'lucide-react';
import { getMySites, deleteSite } from '../lib/api';
import toast from 'react-hot-toast';

interface Site {
  slug: string;
  title: string;
  publishedAt: string;
  updatedAt: string;
  views: number;
}

export default function MySitesModal({ onClose }: { onClose: () => void }) {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setSites(await getMySites()); } catch { toast.error('Could not load sites'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (slug: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeletingSlug(slug);
    try {
      await deleteSite(slug);
      setSites(s => s.filter(x => x.slug !== slug));
      toast.success('Page deleted');
    } catch { toast.error('Delete failed'); }
    setDeletingSlug(null);
  };

  const getSiteUrl = (slug: string) => `${window.location.protocol}//${window.location.hostname}:3001/sites/${slug}`;

  const totalViews = sites.reduce((sum, s) => sum + (s.views || 0), 0);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-indigo-400" />
            <h2 className="text-white font-semibold text-base">My Published Websites</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} title="Refresh" className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-all">
              <RefreshCw size={14} />
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-all">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Analytics summary bar */}
        {sites.length > 0 && (
          <div className="px-5 py-3 bg-slate-900/60 border-b border-slate-700 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <BarChart2 size={14} className="text-indigo-400" />
              <span className="text-xs text-slate-400 font-medium">{sites.length} page{sites.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-emerald-400" />
              <span className="text-xs text-slate-400 font-medium">{totalViews.toLocaleString()} total views</span>
            </div>
          </div>
        )}

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : sites.length === 0 ? (
            <div className="text-center py-12">
              <Globe size={36} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-300 font-medium mb-1">No websites published yet</p>
              <p className="text-slate-500 text-sm">Click "Save to Web" to host your page permanently.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sites.map(site => {
                const siteUrl = getSiteUrl(site.slug);
                const updated = new Date(site.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                const views = site.views || 0;
                return (
                  <div key={site.slug} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl border border-slate-700 hover:border-slate-600 transition-all">
                    <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center flex-shrink-0">
                      <Globe size={16} className="text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{site.title}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-xs text-slate-500">Updated {updated}</p>
                        <span className="flex items-center gap-1 text-xs text-emerald-400/80">
                          <Eye size={10} />
                          {views.toLocaleString()} {views === 1 ? 'view' : 'views'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => { navigator.clipboard.writeText(siteUrl); toast.success('URL copied!'); }}
                        title="Copy URL"
                        className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-700 transition-all text-xs"
                      >
                        Copy
                      </button>
                      <a href={siteUrl} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-green-400 rounded-lg hover:bg-slate-700 transition-all"
                        title="Open live page">
                        <ExternalLink size={14} />
                      </a>
                      <button
                        onClick={() => handleDelete(site.slug, site.title)}
                        disabled={deletingSlug === site.slug}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-700 transition-all disabled:opacity-50"
                        title="Delete page"
                      >
                        {deletingSlug === site.slug ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <p className="text-xs text-slate-500 text-center">
            Deploy to Railway to get a public URL — views are tracked automatically
          </p>
        </div>
      </div>
    </div>
  );
}
