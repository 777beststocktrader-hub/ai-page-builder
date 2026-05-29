import React, { useEffect, useState } from 'react';
import { X, ShoppingBag, Loader2, Sparkles, Search, Tag, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { fetchShopifyProducts, generatePageFromProduct, ShopifyProduct } from '../lib/api';
import { getShopifyCredentials } from './ShopifyConnectModal';
import { usePageStore } from '../store/pageStore';
import BLOCK_DEFS from '../blocks/blockDefs';
import toast from 'react-hot-toast';

function getShopFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('shop');
}

interface Props {
  onClose: () => void;
}

export default function ProductPickerModal({ onClose }: Props) {
  const { addBlock, setPageGoal, setPageTitle, newProject } = usePageStore();
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<number | 'auto' | null>(null);
  const [error, setError] = useState('');
  const [reinstallUrl, setReinstallUrl] = useState('');
  const [query, setQuery] = useState('');

  // Resolve shop from OAuth URL or the last store selected before OAuth.
  const shop = getShopFromUrl() || getShopifyCredentials()?.shop || '';

  useEffect(() => {
    if (!shop) {
      setError('No Shopify store connected. Connect your store first.');
      setLoading(false);
      return;
    }
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    setReinstallUrl('');
    try {
      const list = await fetchShopifyProducts(shop);
      setProducts(list);
      if (list.length === 0) setError('No active products found in your store.');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to load products';
      const url = err.response?.data?.reinstallUrl || '';
      setError(msg);
      if (url) setReinstallUrl(url);
    }
    setLoading(false);
  };

  const buildPageForProduct = async (product: ShopifyProduct) => {
    setGenerating(product.id);
    try {
      const { blocks, tagline } = await generatePageFromProduct(product, shop);
      if (blocks.length === 0) throw new Error('No blocks generated');

      // Clear existing page and start fresh
      newProject();

      // Set page goal for context
      setPageGoal(`Product landing page for ${product.title} — ${product.vendor || 'Shopify store'}`);

      // Add all generated blocks
      for (const b of blocks) {
        const def = BLOCK_DEFS.find((d) => d.type === b.type);
        if (def) addBlock(b.type, { ...def.defaultData, ...b.data });
      }

      // Set page title
      if (tagline) setPageTitle(tagline);
      else setPageTitle(`${product.title} — Landing Page`);

      toast.success(`Page built for "${product.title}" — ${blocks.length} sections! ✨`, { duration: 4000 });
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Page generation failed');
    }
    setGenerating(null);
  };

  const autoPickBest = async () => {
    if (products.length === 0) return;
    setGenerating('auto');
    // Pick the product with longest description + highest price (likely best seller)
    const scored = products.map(p => ({
      p,
      score: (p.description?.length || 0) * 0.3 + parseFloat(p.price || '0') * 0.7,
    }));
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0].p;
    toast(`Auto-selected: ${best.title}`, { icon: '🎯' });
    // Don't set generating to null here — buildPageForProduct will handle it
    setGenerating(null);
    await buildPageForProduct(best);
  };

  const filtered = query.trim()
    ? products.filter(p =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.productType?.toLowerCase().includes(query.toLowerCase()) ||
        p.vendor?.toLowerCase().includes(query.toLowerCase()) ||
        p.tags?.some(t => t.toLowerCase().includes(query.toLowerCase()))
      )
    : products;

  const isAnyGenerating = generating !== null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={!isAnyGenerating ? onClose : undefined} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-green-600/20 border border-green-600/40 flex items-center justify-center">
              <ShoppingBag size={16} className="text-green-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-base">Build a sales page from a product</h2>
              <p className="text-slate-500 text-xs">Uses your product image, price, description, and AI conversion copy</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isAnyGenerating}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-all disabled:opacity-40">
            <X size={16} />
          </button>
        </div>

        {/* Auto-pick CTA */}
        {!loading && !error && products.length > 0 && (
          <div className="px-5 py-4 border-b border-slate-700 flex-shrink-0 bg-indigo-950/40">
            <button
              onClick={autoPickBest}
              disabled={isAnyGenerating}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all"
            >
              {generating === 'auto' ? (
                <><Loader2 size={15} className="animate-spin" /> AI is analyzing your products…</>
              ) : (
                <><Sparkles size={15} /> Pick best product and build full sales page</>
              )}
            </button>
            <div className="grid grid-cols-5 gap-1.5 mt-3">
              {['Hero', 'Benefits', 'Proof', 'FAQ', 'CTA'].map((item) => (
                <div key={item} className="rounded-lg bg-slate-900/70 border border-slate-700 px-2 py-1.5 text-center text-[10px] font-bold text-slate-300">
                  {item}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 text-center mt-2">Or pick a specific product below</p>
          </div>
        )}

        {/* Search */}
        {!loading && !error && products.length > 3 && (
          <div className="px-5 py-2.5 border-b border-slate-700 flex-shrink-0">
            <div className="flex items-center gap-2 bg-slate-900 rounded-lg px-3 py-2">
              <Search size={13} className="text-slate-500 flex-shrink-0" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search products…"
                className="flex-1 bg-transparent text-slate-200 text-sm placeholder-slate-600 focus:outline-none"
              />
              {query && <button onClick={() => setQuery('')} className="text-slate-500 hover:text-white"><X size={12} /></button>}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={28} className="animate-spin text-indigo-400" />
              <p className="text-slate-400 text-sm">Loading your products…</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-4 py-10">
              <div className="flex items-start gap-3 p-4 bg-red-950/30 border border-red-800/40 rounded-xl max-w-sm w-full">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
              {reinstallUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs text-slate-500 text-center">Your session expired because the server restarted.<br/>Click below to reconnect — takes 10 seconds.</p>
                  <a
                    href={reinstallUrl}
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition-all"
                  >
                    <ExternalLink size={14} /> Reconnect Store
                  </a>
                </div>
              ) : shop && (
                <button onClick={loadProducts}
                  className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-all">
                  <RefreshCw size={14} /> Try again
                </button>
              )}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-10">
              <p className="text-slate-400 text-sm">No products match "{query}"</p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(product => {
                const isGen = generating === product.id;
                const priceNum = parseFloat(product.price || '0');
                const hasDiscount = product.comparePrice && parseFloat(product.comparePrice) > priceNum;
                const discountPct = hasDiscount
                  ? Math.round((1 - priceNum / parseFloat(product.comparePrice!)) * 100)
                  : 0;

                return (
                  <button
                    key={product.id}
                    onClick={() => !isAnyGenerating && buildPageForProduct(product)}
                    disabled={isAnyGenerating}
                    className={`relative text-left bg-slate-900 border rounded-xl overflow-hidden transition-all group ${
                      isGen
                        ? 'border-indigo-500 ring-1 ring-indigo-500/50'
                        : 'border-slate-700 hover:border-indigo-500/60 hover:bg-slate-800/60'
                    } disabled:cursor-not-allowed`}
                  >
                    {/* Product image */}
                    <div className="aspect-video bg-slate-800 relative overflow-hidden">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag size={32} className="text-slate-600" />
                        </div>
                      )}
                      {hasDiscount && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          -{discountPct}%
                        </div>
                      )}
                      {isGen && (
                        <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 size={20} className="animate-spin text-indigo-400" />
                            <p className="text-xs text-indigo-300 font-medium">Building page…</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Product info */}
                    <div className="p-3">
                      <p className="text-white font-medium text-sm leading-tight mb-1 line-clamp-2">{product.title}</p>

                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-green-400 font-bold text-sm">${product.price}</span>
                        {hasDiscount && (
                          <span className="text-slate-500 text-xs line-through">${product.comparePrice}</span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1 mb-2">
                        {product.vendor && (
                          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                            {product.vendor}
                          </span>
                        )}
                        {product.productType && (
                          <span className="flex items-center gap-1 text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                            <Tag size={9} />
                            {product.productType}
                          </span>
                        )}
                        {product.variantCount > 1 && (
                          <span className="text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full border border-slate-700">
                            {product.variantCount} variants
                          </span>
                        )}
                      </div>

                      {product.description && (
                        <p className="text-xs text-slate-500 line-clamp-2">{product.description}</p>
                      )}

                      <div className={`mt-3 w-full py-1.5 rounded-lg text-xs font-semibold text-center transition-all ${
                        isGen
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-300 group-hover:bg-indigo-600 group-hover:text-white border border-slate-700 group-hover:border-transparent'
                      }`}>
                        {isGen ? (
                          <span className="flex items-center justify-center gap-1.5">
                            <Loader2 size={11} className="animate-spin" /> Generating…
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-1.5">
                            <Sparkles size={11} /> Build Sales Page
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && products.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-700 flex items-center justify-between flex-shrink-0">
            <p className="text-xs text-slate-500">{products.length} product{products.length !== 1 ? 's' : ''} ready for a sales page</p>
            <button onClick={loadProducts} disabled={isAnyGenerating}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-all disabled:opacity-40">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
