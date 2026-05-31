import React from 'react';

type Props = {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
};

const sizes = {
  sm: { mark: 'h-8 w-8', title: 'text-sm', subtitle: 'text-[10px]' },
  md: { mark: 'h-10 w-10', title: 'text-base', subtitle: 'text-[11px]' },
  lg: { mark: 'h-14 w-14', title: 'text-2xl', subtitle: 'text-xs' },
};

export default function PageGenieLogo({ size = 'md', showWordmark = true }: Props) {
  const s = sizes[size];

  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox="0 0 64 64"
        role="img"
        aria-label="PageGenie logo"
        className={`${s.mark} flex-shrink-0 drop-shadow-lg`}
      >
        <defs>
          <linearGradient id="pagegenie-bg" x1="8" y1="6" x2="56" y2="60" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4f46e5" />
            <stop offset="0.55" stopColor="#2563eb" />
            <stop offset="1" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="pagegenie-robot" x1="18" y1="18" x2="48" y2="51" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" />
            <stop offset="1" stopColor="#dbeafe" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="18" fill="url(#pagegenie-bg)" />
        <path d="M32 13v7" stroke="#dbeafe" strokeWidth="3" strokeLinecap="round" />
        <circle cx="32" cy="11" r="4" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
        <rect x="16" y="20" width="32" height="29" rx="10" fill="url(#pagegenie-robot)" stroke="rgba(255,255,255,0.75)" strokeWidth="1.6" />
        <rect x="12" y="30" width="5" height="12" rx="2.5" fill="#bfdbfe" />
        <rect x="47" y="30" width="5" height="12" rx="2.5" fill="#bfdbfe" />
        <circle cx="25" cy="32" r="4" fill="#4f46e5" />
        <circle cx="39" cy="32" r="4" fill="#4f46e5" />
        <path d="M25 41c4.5 3.5 9.5 3.5 14 0" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
        <rect x="22" y="51" width="20" height="4" rx="2" fill="#dbeafe" opacity="0.9" />
        <path d="M48 18l1.5-4 1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5Z" fill="#ffffff" opacity="0.95" />
      </svg>

      {showWordmark && (
        <div className="min-w-0">
          <p className={`${s.title} font-black leading-tight text-white`}>PageGenie</p>
          <p className={`${s.subtitle} font-semibold leading-tight text-slate-500`}>AI commerce pages</p>
        </div>
      )}
    </div>
  );
}
