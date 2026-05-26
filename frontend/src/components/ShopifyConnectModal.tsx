import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, CheckCircle, ExternalLink, Eye, EyeOff, AlertCircle } from 'lucide-react';

const STORAGE_KEY = 'ai-pb-shopify-creds';

export interface ShopifyCredentials {
  shop: string;
  token: string;
  connectedAt: number;
}

export function getShopifyCredentials(): ShopifyCredentials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveShopifyCredentials(shop: string, token: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ shop, token, connectedAt: Date.now() }));
}

export function clearShopifyCredentials(): void {
  localStorage.removeItem(STORAGE_KEY);
}

interface Props {
  onClose: () => void;
  onConnected: (creds: ShopifyCredentials) => void;
}

export default function ShopifyConnectModal({ onClose, onConnected }: Props) {
  const [shop, setShop] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'instructions'>('form');

  useEffect(() => {
    const creds = getShopifyCredentials();
    if (creds) { setShop(creds.shop); setToken(creds.token); }
  }, []);

  const handleConnect = async () => {
    if (!shop.trim() || !token.trim()) { setError('Both fields are required'); return; }
    setTesting(true);
    setError('');
    try {
      const cleanShop = shop.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
      // Test by fetching shop info
      const res = await fetch('/api/shopify/direct-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: cleanShop,
          token: token.trim(),
          pageTitle: '__connection_test__',
          html: '<p>test</p>',
        }),
      });
      const data = await res.json() as { success: boolean; error?: string; page?: { id: number } };

      if (data.success && data.page?.id) {
        // Immediately delete the test page
        await fetch(`https://${cleanShop}/admin/api/2024-01/pages/${data.page.id}.json`, {
          method: 'DELETE',
          headers: { 'X-Shopify-Access-Token': token.trim() },
        }).catch(() => {});

        const creds: ShopifyCredentials = { shop: cleanShop, token: token.trim(), connectedAt: Date.now() };
        saveShopifyCredentials(cleanShop, token.trim());
        onConnected(creds);
        onClose();
      } else {
        setError(data.error || 'Connection failed. Check your token and try again.');
      }
    } catch {
      setError('Could not reach Shopify. Check your store domain.');
    }
    setTesting(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-green-400" />
            <h2 className="text-white font-semibold text-lg">Connect Shopify Store</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 border-b border-slate-700 pb-3">
          <button onClick={() => setStep('form')} className={`text-xs px-3 py-1.5 rounded-lg transition-all ${step === 'form' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            Connect
          </button>
          <button onClick={() => setStep('instructions')} className={`text-xs px-3 py-1.5 rounded-lg transition-all ${step === 'instructions' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            How to get token
          </button>
        </div>

        {step === 'instructions' ? (
          <div className="space-y-3 text-sm text-slate-300">
            <p className="text-slate-400 text-xs mb-3">Follow these steps in your Shopify admin:</p>
            {[
              { n: 1, t: 'Open your Shopify Admin', d: 'Go to your store\'s admin dashboard' },
              { n: 2, t: 'Settings → Apps and sales channels', d: 'Find "Develop apps" at the bottom' },
              { n: 3, t: 'Create a new app', d: 'Click "Create an app" and give it any name' },
              { n: 4, t: 'Configure Admin API scopes', d: 'Enable: write_content, read_content, read_themes' },
              { n: 5, t: 'Install the app', d: 'Click "Install app" to generate the access token' },
              { n: 6, t: 'Copy the token', d: 'Copy the "Admin API access token" — you only see it once!' },
            ].map(({ n, t, d }) => (
              <div key={n} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-600/50 text-indigo-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{n}</div>
                <div><p className="font-medium text-white text-xs">{t}</p><p className="text-slate-500 text-xs">{d}</p></div>
              </div>
            ))}
            <a
              href="https://admin.shopify.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-all"
            >
              <ExternalLink size={12} /> Open Shopify Admin
            </a>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Store Domain</label>
                <input
                  type="text"
                  value={shop}
                  onChange={(e) => setShop(e.target.value)}
                  placeholder="yourstore.myshopify.com"
                  className="w-full bg-slate-900 text-slate-200 text-sm px-3 py-2.5 rounded-lg border border-slate-700 focus:border-indigo-500 focus:outline-none placeholder-slate-600"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Admin API Access Token</label>
                  <button onClick={() => setStep('instructions')} className="text-xs text-indigo-400 hover:text-indigo-300">
                    How to get this →
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="shpat_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-slate-900 text-slate-200 text-sm px-3 py-2.5 pr-10 rounded-lg border border-slate-700 focus:border-indigo-500 focus:outline-none placeholder-slate-600 font-mono"
                  />
                  <button onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-xs text-slate-600 mt-1">Stored locally in your browser only. Never sent to our servers except to publish pages.</p>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-950/40 border border-red-800/50 rounded-lg">
                <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={testing || !shop.trim() || !token.trim()}
              className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {testing ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Testing connection…</>
              ) : (
                <><CheckCircle size={16} /> Connect Store</>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
