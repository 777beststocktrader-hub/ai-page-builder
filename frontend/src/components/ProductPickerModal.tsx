import React, { useEffect, useState } from 'react';
import { X, ShoppingBag, Loader2, Sparkles, Search, Tag, AlertCircle, RefreshCw, ExternalLink, Star, Clock } from 'lucide-react';
import { fetchShopifyProducts, fixShopifyProductAvailability, generatePageFromProduct, ImportedReview, ShopifyProduct } from '../lib/api';
import { getShopifyCredentials } from './ShopifyConnectModal';
import { usePageStore } from '../store/pageStore';
import BLOCK_DEFS from '../blocks/blockDefs';
import toast from 'react-hot-toast';

function getShopFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('shop');
}

const REVIEW_STORAGE_KEY = 'pagegenie-aliexpress-reviews';
const BUILD_ESTIMATE_SECONDS = 120;

function sanitizeEnglishReviewText(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, ' - ')
    .replace(/\u2026/g, '...')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyEnglishReview(value: string): boolean {
  const text = sanitizeEnglishReviewText(value).toLowerCase();
  const words = text.match(/[a-z]+/g) || [];
  if (words.length < 3) return false;

  const signals = text.match(/\b(the|and|is|it|this|that|with|for|to|of|in|on|my|i|was|very|good|great|love|quality|product|charging|fast|stand|cable|works|use|easy|nice|perfect|recommend|bought|arrived|feels|looks)\b/g) || [];
  return signals.length >= 2;
}

function cleanReviewQuote(value: string): string {
  return sanitizeEnglishReviewText(value
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .replace(/^\d+[\.)]\s*/, '')
    .replace(/^[-*•]\s*/, '')
    .replace(/^\s*(?:5\s*stars?|★★★★★|⭐{1,5})\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim());
}

function extractReviewImageUrl(value: string): { text: string; imageUrl?: string } {
  const match = value.match(/https?:\/\/\S+\.(?:jpg|jpeg|png|webp|gif)(?:\?\S*)?/i)
    || value.match(/https?:\/\/(?:ae01|ae02|ae03|ae04|ae05|ae-pic|img)\S+/i);
  if (!match) return { text: value };
  return {
    text: value.replace(match[0], ' ').replace(/\s+/g, ' ').trim(),
    imageUrl: match[0],
  };
}

function parseAliExpressReviews(text: string): ImportedReview[] {
  const seen = new Set<string>();
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const extracted = extractReviewImageUrl(line);
      const lineText = extracted.text;
      const tabParts = lineText.split(/\t|\|/).map((part) => cleanReviewQuote(part)).filter(Boolean);
      if (tabParts.length > 1) {
        const quote = tabParts.reduce((longest, part) => (part.length > longest.length ? part : longest), '');
        const name = tabParts.find((part) => part !== quote && part.length <= 40);
        return { quote, name, role: 'AliExpress review', imageUrl: extracted.imageUrl };
      }

      const match = line.match(/^(.{2,40}?)(?:\s*[:\-–]\s+)(.{8,})$/);
      const betterMatch = lineText.match(/^(.{2,40}?)(?:\s*[:\-–]\s+)(.{8,})$/) || match;
      if (betterMatch) {
        return {
          name: cleanReviewQuote(betterMatch[1]),
          quote: cleanReviewQuote(betterMatch[2]),
          role: 'AliExpress review',
          imageUrl: extracted.imageUrl,
        };
      }

      return { quote: cleanReviewQuote(lineText), role: 'AliExpress review', imageUrl: extracted.imageUrl };
    })
    .filter((review) => review.quote.length >= 8 && isLikelyEnglishReview(review.quote))
    .filter((review) => {
      const key = review.quote.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 15);
}

function formatBuildTime(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

const DEMO_PRODUCT_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700" viewBox="0 0 900 700">
  <rect width="900" height="700" rx="48" fill="#f8fafc"/>
  <rect x="130" y="90" width="640" height="520" rx="44" fill="#ffffff" stroke="#e2e8f0" stroke-width="4"/>
  <circle cx="450" cy="310" r="126" fill="#eef2ff"/>
  <circle cx="366" cy="302" r="34" fill="#f8fafc" stroke="#c7d2fe" stroke-width="8"/>
  <circle cx="450" cy="252" r="42" fill="#ffffff" stroke="#a5b4fc" stroke-width="8"/>
  <circle cx="534" cy="302" r="34" fill="#f8fafc" stroke="#c7d2fe" stroke-width="8"/>
  <path d="M344 354c60 64 152 64 212 0" fill="none" stroke="#4f46e5" stroke-width="14" stroke-linecap="round"/>
  <text x="450" y="500" text-anchor="middle" font-family="Arial, sans-serif" font-size="44" font-weight="800" fill="#0f172a">Pearl Bloom</text>
  <text x="450" y="542" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#64748b">Jade Loom product</text>
</svg>
`)}`;

const DEMO_PRODUCT: ShopifyProduct = {
  id: -1,
  title: 'Pearl Bloom Necklace',
  description: 'A luminous freshwater pearl necklace with gift-ready packaging, easy returns, and free shipping for a limited launch.',
  vendor: 'Jade Loom',
  productType: 'Jewelry',
  tags: ['gift', 'jewelry', 'premium'],
  price: '79.00',
  comparePrice: null,
  image: DEMO_PRODUCT_IMAGE,
  handle: 'pearl-bloom-necklace',
  variantCount: 1,
};

interface Props {
  onClose: () => void;
}

export default function ProductPickerModal({ onClose }: Props) {
  const { addBlock, setPageGoal, setPageTitle, newProject } = usePageStore();
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<number | 'auto' | null>(null);
  const [fixingProductId, setFixingProductId] = useState<number | null>(null);
  const [buildStartedAt, setBuildStartedAt] = useState<number | null>(null);
  const [buildTick, setBuildTick] = useState(Date.now());
  const [error, setError] = useState('');
  const [reinstallUrl, setReinstallUrl] = useState('');
  const [query, setQuery] = useState('');
  const [reviewInput, setReviewInput] = useState(() => {
    try { return localStorage.getItem(REVIEW_STORAGE_KEY) || ''; }
    catch { return ''; }
  });

  const shop = getShopFromUrl() || getShopifyCredentials()?.shop || '';
  const isAnyGenerating = generating !== null;
  const importedReviews = parseAliExpressReviews(reviewInput);
  const photoReviewCount = importedReviews.filter((review) => review.imageUrl).length;
  const elapsedSeconds = buildStartedAt ? Math.floor((buildTick - buildStartedAt) / 1000) : 0;
  const secondsLeft = Math.max(0, BUILD_ESTIMATE_SECONDS - elapsedSeconds);
  const buildProgress = Math.min(100, Math.max(8, Math.round((elapsedSeconds / BUILD_ESTIMATE_SECONDS) * 100)));
  const activeProduct = typeof generating === 'number'
    ? [...products, DEMO_PRODUCT].find((product) => product.id === generating)
    : null;
  const activeProductTitle = generating === 'auto'
    ? 'Choosing the best product'
    : activeProduct?.title || 'your product';

  useEffect(() => {
    if (!isAnyGenerating) return;
    const timer = window.setInterval(() => setBuildTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isAnyGenerating]);

  useEffect(() => {
    if (!shop) {
      setError('Open PageGenie from Shopify admin to load your real products.');
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
      const reinstall = err.response?.data?.reinstallUrl || '';
      // If embedded in Shopify and session expired, auto-redirect silently
      if (reinstall && (window !== window.top || new URLSearchParams(window.location.search).get('shop'))) {
        window.location.href = reinstall;
        return;
      }
      setError(err.response?.data?.error || err.message || 'Failed to load products');
      setReinstallUrl(reinstall);
    } finally {
      setLoading(false);
    }
  };

  const buildPageForProduct = async (product: ShopifyProduct) => {
    setGenerating(product.id);
    setBuildStartedAt(Date.now());
    setBuildTick(Date.now());
    try {
      const { blocks, tagline } = await generatePageFromProduct(product, shop, importedReviews);
      if (blocks.length === 0) throw new Error('No blocks generated');

      newProject();
      setPageGoal(`Build the best Shopify landing page for ${product.title}. Use the real price, product image, benefits, ${importedReviews.length ? 'pasted AliExpress reviews' : 'reviews'}, FAQ, and a clear buy button.`);

      for (const b of blocks) {
        const def = BLOCK_DEFS.find((d) => d.type === b.type);
        if (def) addBlock(b.type, { ...def.defaultData, ...b.data });
      }

      setPageTitle(tagline || `${product.title} Landing Page`);
      toast.success(
        importedReviews.length
          ? `AI built the page with ${importedReviews.length} pasted reviews`
          : `AI built a landing page for ${product.title}`,
        { duration: 4000 }
      );
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Page generation failed');
    } finally {
      setGenerating(null);
      setBuildStartedAt(null);
    }
  };

  const autoPickBest = async () => {
    if (products.length === 0) return;
    setGenerating('auto');
    setBuildStartedAt(Date.now());
    setBuildTick(Date.now());
    const candidates = products.some((product) => product.available !== false)
      ? products.filter((product) => product.available !== false)
      : products;
    const scored = candidates
      .map((p) => ({
        product: p,
        score: (p.description?.length || 0) * 0.3 + parseFloat(p.price || '0') * 0.7 + (p.image ? 25 : 0),
      }))
      .sort((a, b) => b.score - a.score);
    await buildPageForProduct(scored[0].product);
  };

  const fixAvailability = async (product: ShopifyProduct) => {
    if (!shop) {
      toast.error('Reconnect Shopify before fixing availability');
      return;
    }
    setFixingProductId(product.id);
    try {
      const result = await fixShopifyProductAvailability(product, shop);
      toast.success(
        result.changedCount > 0
          ? `Fixed ${result.changedCount} variant${result.changedCount === 1 ? '' : 's'}`
          : 'Product availability already looked fixed'
      );
      await loadProducts();
    } catch (err: any) {
      const reinstall = err.response?.data?.reinstallUrl || '';
      if (reinstall) setReinstallUrl(reinstall);
      const message = err.response?.data?.error || err.message || 'Could not fix availability';
      if (reinstall) setError(message);
      toast.error(message);
    } finally {
      setFixingProductId(null);
    }
  };

  const filtered = query.trim()
    ? products.filter((p) =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.productType?.toLowerCase().includes(query.toLowerCase()) ||
        p.vendor?.toLowerCase().includes(query.toLowerCase()) ||
        p.tags?.some((t) => t.toLowerCase().includes(query.toLowerCase()))
      )
    : products;

  const ProductCard = ({ product, demo = false }: { product: ShopifyProduct; demo?: boolean }) => {
    const isGen = generating === product.id;
    const isFixing = fixingProductId === product.id;
    const isUnavailable = product.available === false;
    const priceNum = parseFloat(product.price || '0');
    const hasDiscount = product.comparePrice && parseFloat(product.comparePrice) > priceNum;
    const discountPct = hasDiscount ? Math.round((1 - priceNum / parseFloat(product.comparePrice!)) * 100) : 0;

    return (
      <div
        className={`relative text-left bg-slate-900 border rounded-xl overflow-hidden transition-all group ${
          isGen ? 'border-indigo-500 ring-1 ring-indigo-500/50' : isUnavailable ? 'border-orange-600/60' : 'border-slate-700 hover:border-indigo-500/60 hover:bg-slate-800/60'
        } ${isAnyGenerating ? 'opacity-60' : ''}`}
      >
        <div className="aspect-video bg-slate-800 relative overflow-hidden">
          {product.image ? (
            <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag size={32} className="text-slate-600" />
            </div>
          )}
          {demo && <div className="absolute top-2 left-2 bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">Demo</div>}
          {!demo && isUnavailable && <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Unavailable</div>}
          {hasDiscount && <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">-{discountPct}%</div>}
          {isGen && (
            <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={20} className="animate-spin text-indigo-400" />
                <p className="text-xs text-indigo-300 font-medium">One moment please...</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-3">
          <p className="text-white font-medium text-sm leading-tight mb-1 line-clamp-2">{product.title}</p>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-400 font-bold text-sm">${product.price}</span>
            {hasDiscount && <span className="text-slate-500 text-xs line-through">${product.comparePrice}</span>}
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {product.vendor && <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">{product.vendor}</span>}
            {product.productType && (
              <span className="flex items-center gap-1 text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                <Tag size={9} />
                {product.productType}
              </span>
            )}
            {!demo && product.availableVariantCount !== undefined && (
              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                isUnavailable ? 'bg-orange-950/50 text-orange-300 border-orange-800/60' : 'bg-green-950/40 text-green-300 border-green-800/50'
              }`}>
                {product.availableVariantCount}/{product.variantCount} available
              </span>
            )}
          </div>
          {product.description && <p className="text-xs text-slate-500 line-clamp-2">{product.description}</p>}
          {!demo && product.availabilityWarning && (
            <p className="mt-2 rounded-lg border border-orange-800/50 bg-orange-950/25 px-2 py-1.5 text-[11px] leading-4 text-orange-200">
              {product.availabilityWarning}
            </p>
          )}
          <div className="mt-3 grid gap-2">
            {!demo && isUnavailable && (
              <button
                type="button"
                onClick={() => fixAvailability(product)}
                disabled={isAnyGenerating || isFixing}
                className="w-full rounded-lg border border-orange-700 bg-orange-500/15 py-1.5 text-xs font-semibold text-orange-200 transition-all hover:bg-orange-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isFixing ? (
                  <span className="flex items-center justify-center gap-1.5"><Loader2 size={11} className="animate-spin" /> Fixing...</span>
                ) : (
                  'Fix availability'
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => !isAnyGenerating && buildPageForProduct(product)}
              disabled={isAnyGenerating || isFixing}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold text-center transition-all ${
                isGen ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 group-hover:bg-indigo-600 group-hover:text-white border border-slate-700 group-hover:border-transparent'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {isGen ? (
                <span className="flex items-center justify-center gap-1.5"><Loader2 size={11} className="animate-spin" /> Generating...</span>
              ) : (
                <span className="flex items-center justify-center gap-1.5"><Sparkles size={11} /> {importedReviews.length ? 'Build With Reviews' : 'Build Best Landing Page'}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={!isAnyGenerating ? onClose : undefined} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {isAnyGenerating && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/82 px-4 backdrop-blur-md">
            <div className="w-full max-w-md rounded-2xl border border-indigo-400/30 bg-slate-900 p-6 text-center shadow-2xl shadow-indigo-950/40">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-400/30 bg-indigo-500/15 text-indigo-200">
                <Loader2 size={24} className="animate-spin" />
              </div>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-indigo-300">AI page builder</p>
              <h3 className="mt-2 text-2xl font-black leading-tight text-white">
                One moment please, we are building your page.
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                PageGenie is writing sections, arranging product images, adding reviews, and preparing the page for Shopify.
              </p>
              <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950 p-4">
                <div className="mb-3 flex items-center justify-between gap-3 text-left">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">{activeProductTitle}</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                      {secondsLeft > 0 ? 'Estimated time remaining' : 'Almost done'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-3 py-1.5 text-sm font-black text-indigo-200">
                    <Clock size={13} />
                    {secondsLeft > 0 ? formatBuildTime(secondsLeft) : 'Finalizing'}
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-300 transition-all duration-700"
                    style={{ width: `${secondsLeft > 0 ? buildProgress : 100}%` }}
                  />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-left text-[11px] font-bold text-slate-400">
                  {['Hero section', 'Benefits', 'Reviews', 'FAQ'].map((item) => (
                    <div key={item} className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                Please keep this window open. Most pages finish in about 1-2 minutes.
              </p>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-600/20 border border-green-600/40 flex items-center justify-center">
              <ShoppingBag size={17} className="text-green-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-base">Choose a product</h2>
              <p className="text-slate-500 text-xs">AI builds the complete landing page from product data.</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isAnyGenerating}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-all disabled:opacity-40">
            <X size={16} />
          </button>
        </div>

        {!loading && !error && products.length > 0 && (
          <div className="px-5 py-4 border-b border-slate-700 flex-shrink-0 bg-indigo-950/40">
            <button
              onClick={autoPickBest}
              disabled={isAnyGenerating}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all"
            >
              {generating === 'auto' ? <><Loader2 size={15} className="animate-spin" /> AI is choosing...</> : <><Sparkles size={15} /> Let AI choose the best product</>}
            </button>
            <div className="grid grid-cols-5 gap-1.5 mt-3">
              {['Hero', 'Benefits', 'Reviews', 'FAQ', 'Buy CTA'].map((item) => (
                <div key={item} className="rounded-lg bg-slate-900/70 border border-slate-700 px-2 py-1.5 text-center text-[10px] font-bold text-slate-300">
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/70 p-3">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Star size={13} className="text-orange-400 flex-shrink-0" />
                  <p className="text-xs font-semibold text-slate-200">AliExpress reviews</p>
                </div>
                <p className={`hidden text-[11px] font-semibold ${importedReviews.length ? 'text-green-400' : 'text-slate-500'}`}>
                  {importedReviews.length}/15 ready{photoReviewCount ? ` • ${photoReviewCount} photos` : ''}
                </p>
                <p className={`text-[11px] font-semibold ${importedReviews.length ? 'text-green-400' : 'text-slate-500'}`}>
                  {importedReviews.length}/15 ready{photoReviewCount ? ` | ${photoReviewCount} customer photos` : ''}
                </p>
              </div>
              <textarea
                value={reviewInput}
                disabled={isAnyGenerating}
                onChange={(e) => {
                  setReviewInput(e.target.value);
                  try { localStorage.setItem(REVIEW_STORAGE_KEY, e.target.value); } catch {}
                }}
                placeholder={'Paste real reviews one per line. Add a real customer photo URL on the same line. Example: Nathan P. - Good product and good quality. https://...jpg'}
                rows={3}
                className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-orange-500 disabled:opacity-50"
              />
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                PageGenie only keeps English reviews. Use real review/customer photo links only, not the main product image.
              </p>
            </div>
          </div>
        )}

        {!loading && !error && products.length > 3 && (
          <div className="px-5 py-2.5 border-b border-slate-700 flex-shrink-0">
            <div className="flex items-center gap-2 bg-slate-900 rounded-lg px-3 py-2">
              <Search size={13} className="text-slate-500 flex-shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products..."
                className="flex-1 bg-transparent text-slate-200 text-sm placeholder-slate-600 focus:outline-none"
              />
              {query && <button onClick={() => setQuery('')} className="text-slate-500 hover:text-white"><X size={12} /></button>}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={28} className="animate-spin text-indigo-400" />
              <p className="text-slate-400 text-sm">Loading Shopify products...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex items-start gap-3 p-4 bg-red-950/30 border border-red-800/40 rounded-xl max-w-md w-full">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <a
                  href={reinstallUrl || 'https://admin.shopify.com'}
                  target={reinstallUrl ? undefined : '_blank'}
                  rel={reinstallUrl ? undefined : 'noopener noreferrer'}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition-all"
                >
                  <ExternalLink size={14} /> {reinstallUrl ? 'Reconnect Store' : 'Open Shopify Admin'}
                </a>
                {shop && (
                  <button onClick={loadProducts}
                    className="flex items-center gap-2 px-4 py-2.5 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 text-sm font-semibold rounded-xl transition-all">
                    <RefreshCw size={14} /> Try again
                  </button>
                )}
              </div>
              <div className="w-full max-w-sm">
                <p className="mb-2 text-center text-xs text-slate-500">Test the same flow with a demo product:</p>
                <ProductCard product={DEMO_PRODUCT} demo />
              </div>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-10">
              <p className="text-slate-400 text-sm">No products match "{query}"</p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          )}
        </div>

        {!loading && !error && products.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-700 flex items-center justify-between flex-shrink-0">
            <p className="text-xs text-slate-500">{products.length} product{products.length !== 1 ? 's' : ''} ready</p>
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
