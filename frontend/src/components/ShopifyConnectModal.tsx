import React from 'react';
import { X, ShoppingBag, CheckCircle, ExternalLink } from 'lucide-react';

const STORAGE_KEY = 'ai-pb-shopify-store';
const LEGACY_TOKEN_STORAGE_KEY = 'ai-pb-shopify-creds';

export interface ShopifyCredentials {
  shop: string;
  connectedAt: number;
}

export function getShopifyCredentials(): ShopifyCredentials | null {
  try {
    localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveShopifyCredentials(shop: string): void {
  localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ shop, connectedAt: Date.now() }));
}

export function clearShopifyCredentials(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
}

interface Props {
  onClose: () => void;
  onConnected: (creds: ShopifyCredentials) => void;
}

export default function ShopifyConnectModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-green-400" />
            <h2 className="text-white font-semibold text-lg">Open PageGenie in Shopify</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="rounded-xl border border-green-800/40 bg-green-950/25 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle size={16} className="mt-0.5 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-100">Secure Shopify install</p>
              <p className="mt-1 text-xs leading-5 text-green-200/75">
                PageGenie connects through Shopify OAuth and session tokens. Open the app from Shopify admin so Shopify can pass your store securely.
              </p>
            </div>
          </div>
        </div>

        <a
          href="https://admin.shopify.com"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <ExternalLink size={16} /> Open Shopify Admin
        </a>
      </div>
    </div>
  );
}
