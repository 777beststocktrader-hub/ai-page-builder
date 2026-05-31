import React from 'react';
import { CreditCard, HelpCircle, ImagePlus, LayoutTemplate, SearchCheck, Wand2 } from 'lucide-react';
import PageGenieLogo from './PageGenieLogo';

export type AppSection = 'create' | 'templates' | 'images' | 'research' | 'help' | 'billing';

type NavItem = {
  id: AppSection;
  label: string;
  icon: React.ReactNode;
};

export default function AppSidebar({
  activeSection,
  onNavigate,
}: {
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
}) {
  const items: NavItem[] = [
    { id: 'create', label: 'Choose Product', icon: <Wand2 size={17} /> },
    { id: 'templates', label: 'Page Templates', icon: <LayoutTemplate size={17} /> },
    { id: 'images', label: 'AI Product Images', icon: <ImagePlus size={17} /> },
    { id: 'research', label: 'Product Research', icon: <SearchCheck size={17} /> },
    { id: 'help', label: 'Help', icon: <HelpCircle size={17} /> },
    { id: 'billing', label: 'Billing', icon: <CreditCard size={17} /> },
  ];

  return (
    <aside className="flex w-64 flex-shrink-0 flex-col border-r border-slate-800 bg-slate-950">
      <div className="flex items-center justify-start gap-3 border-b border-slate-800 px-4 py-4">
        <PageGenieLogo size="md" />
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const active = item.id === activeSection;
          return (
            <button
              key={item.label}
              onClick={() => onNavigate(item.id)}
              title={item.label}
              className={`group flex w-full items-center justify-start gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition-all ${
                active
                  ? 'bg-white text-slate-950 shadow-lg shadow-slate-950/20'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                active ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-500 group-hover:text-slate-300'
              }`}>
                {item.icon}
              </span>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
