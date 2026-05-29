import React, { useState } from 'react';
import { Zap, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { BillingStatus, createCheckoutSession, openBillingPortal } from '../lib/billing';
import toast from 'react-hot-toast';

const FEATURES = [
  'Unlimited AI page generation',
  'Generate pages from your products',
  'AI content polish and rewriting',
  'Publish to Shopify and web hosting',
  'A/B headline testing',
  'Page translation',
  'Priority support',
];

interface Props {
  clientId: string;
  billing: BillingStatus;
  onClose?: () => void;
}

export default function PaywallModal({ clientId, billing, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const isExpired = billing.status === 'expired';

  const handleUpgrade = async () => {
    if (billing.billingProvider !== 'shopify' || !billing.billingReady) {
      toast.error('Open PageGenie inside Shopify admin to approve billing.');
      return;
    }

    setLoading(true);
    try {
      const url = await createCheckoutSession(clientId);
      window.location.href = url;
    } catch (err: any) {
      toast.error(err.message || 'Could not open Shopify billing');
    }
    setLoading(false);
  };

  const handleManage = async () => {
    setLoading(true);
    try {
      const url = await openBillingPortal(clientId);
      window.open(url, '_blank');
    } catch (err: any) {
      toast.error(err.message || 'Could not open Shopify billing');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 px-6 py-6 text-center">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Zap size={24} className="text-white" />
          </div>
          <h2 className="text-white font-bold text-xl mb-1">
            {isExpired ? 'Your free trial has ended' : 'Upgrade PageGenie'}
          </h2>
          <p className="text-indigo-200 text-sm">
            {isExpired
              ? 'Approve billing in Shopify to keep building landing pages with AI.'
              : 'Unlock unlimited AI generation and all premium features.'}
          </p>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-baseline justify-center gap-1 mb-4">
            <span className="text-4xl font-bold text-white">${billing.price}</span>
            <span className="text-slate-400 text-sm">/month</span>
          </div>

          <ul className="space-y-2 mb-5">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 text-sm text-slate-300">
                <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Opening Shopify approval...</>
            ) : (
              <><Zap size={16} /> Approve in Shopify - ${billing.price}/mo</>
            )}
          </button>

          {billing.isPaid && (
            <button
              onClick={handleManage}
              className="w-full mt-2 py-2 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
            >
              <ExternalLink size={11} /> Manage billing in Shopify
            </button>
          )}

          <p className="text-center text-xs text-slate-600 mt-3">
            Billing is handled by Shopify. Cancel anytime from Shopify admin.
          </p>

          {onClose && !isExpired && (
            <button onClick={onClose} className="w-full mt-2 text-xs text-slate-600 hover:text-slate-400 transition-colors">
              Continue with free trial
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
