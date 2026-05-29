import React from 'react';
import { Zap, X } from 'lucide-react';
import { BillingStatus, createCheckoutSession } from '../lib/billing';
import toast from 'react-hot-toast';

interface Props {
  clientId: string;
  billing: BillingStatus;
  onDismiss: () => void;
  onUpgraded: () => void;
}

export default function TrialBanner({ clientId, billing, onDismiss }: Props) {
  const [loading, setLoading] = React.useState(false);

  if (billing.status !== 'trial' || billing.daysLeft > 7) return null;

  const isLastDay = billing.daysLeft <= 1;
  const bg = isLastDay ? 'bg-red-900/80 border-red-700/60' : 'bg-amber-900/60 border-amber-700/50';
  const text = isLastDay ? 'text-red-200' : 'text-amber-200';
  const btn = isLastDay ? 'bg-red-500 hover:bg-red-400' : 'bg-amber-500 hover:bg-amber-400';

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

  return (
    <div className={`flex items-center justify-between px-4 py-2 border-b ${bg} ${text} text-xs flex-shrink-0`}>
      <div className="flex items-center gap-2">
        <Zap size={13} className="flex-shrink-0" />
        <span>
          {isLastDay
            ? 'Your free trial ends today. Approve Shopify billing to keep building.'
            : `${billing.daysLeft} days left in your free trial.`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className={`${btn} text-white font-semibold px-3 py-1 rounded-md transition-all disabled:opacity-60 text-xs`}
        >
          {loading ? 'Loading...' : `Approve - $${billing.price}/mo`}
        </button>
        <button onClick={onDismiss} className="p-0.5 opacity-60 hover:opacity-100 transition-opacity">
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
