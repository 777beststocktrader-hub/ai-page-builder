import React, { useState, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Copy, EyeOff, Code, Sparkles, Loader2, Wand2, ArrowRight, Zap, Languages, X, Lock, Unlock, ChevronUp, ChevronDown, Monitor, Tablet, Smartphone, ShoppingBag, LayoutTemplate } from 'lucide-react';
import ProductPickerModal from './ProductPickerModal';
import { usePageStore } from '../store/pageStore';
import { getBlockDef } from '../blocks/blockDefs';
import { Block, BlockStyle } from '../types';
import BLOCK_DEFS from '../blocks/blockDefs';
import { generateBlockContent, generateFullPage, polishPage, translatePage } from '../lib/api';
import { getShopifyCredentials } from './ShopifyConnectModal';
import toast from 'react-hot-toast';

function getSmartSuggestions(existingTypes: string[]): string[] {
  const priority = ['hero', 'features', 'testimonials', 'pricing', 'cta', 'steps', 'faq', 'stats', 'newsletter', 'comparison', 'gallery', 'video', 'countdown', 'team', 'contact', 'testimonial-single', 'cta-banner'];
  const missing = priority.filter((t) => !existingTypes.includes(t));
  return missing.slice(0, 6);
}

function ContextMenu({ x, y, block, onClose }: { x: number; y: number; block: Block; onClose: () => void }) {
  const { deleteBlock, duplicateBlock, moveBlock, toggleBlockVisibility, lockBlock, page } = usePageStore();
  const def = getBlockDef(block.type);
  const idx = page.blocks.findIndex(b => b.id === block.id);

  const item = (icon: React.ReactNode, label: string, onClick: () => void, danger?: boolean) => (
    <button
      key={label}
      onClick={() => { onClick(); onClose(); }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors rounded-md ${danger ? 'text-red-400 hover:bg-red-950/40' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div
      className="fixed z-[200] bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-1.5 w-48"
      style={{ left: x, top: y }}
      onClick={e => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 border-b border-slate-700 mb-1">
        <p className="text-xs font-semibold text-slate-400">{def?.emoji} {def?.label}</p>
      </div>
      {item(<Copy size={12} />, 'Duplicate', () => duplicateBlock(block.id))}
      {item(<ChevronUp size={12} />, 'Move Up', () => idx > 0 && moveBlock(block.id, page.blocks[idx - 1].id), false)}
      {item(<ChevronDown size={12} />, 'Move Down', () => idx < page.blocks.length - 1 && moveBlock(block.id, page.blocks[idx + 1].id), false)}
      <div className="border-t border-slate-700 my-1" />
      {item(block.hidden ? <EyeOff size={12} /> : <EyeOff size={12} />, block.hidden ? 'Show Block' : 'Hide Block', () => toggleBlockVisibility(block.id))}
      {item(block.locked ? <Unlock size={12} /> : <Lock size={12} />, block.locked ? 'Unlock Block' : 'Lock Block', () => lockBlock(block.id))}
      {item(<Code size={12} />, 'Copy HTML', () => {
        const html = def?.exportHtml(block.data) || '';
        navigator.clipboard.writeText(html).then(() => toast.success('Block HTML copied!'));
      })}
      <div className="border-t border-slate-700 my-1" />
      {item(<Trash2 size={12} />, 'Delete Block', () => { deleteBlock(block.id); }, true)}
    </div>
  );
}

function SortableBlock({ block, selected, existingTypes }: { block: Block; selected: boolean; existingTypes: string[] }) {
  const { selectBlock, deleteBlock, duplicateBlock, addBlock, updateBlock, pageGoal, moveBlock, toggleBlockVisibility, lockBlock, page } = usePageStore();
  const def = getBlockDef(block.type);
  const [rewriting, setRewriting] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleAiRewrite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!def || rewriting) return;
    setRewriting(true);
    try {
      const newData = await generateBlockContent(
        block.type,
        'Make this section more compelling, benefit-focused, and conversion-optimized. Keep the same structure.',
        block.data,
        'marketing',
        pageGoal || undefined
      );
      updateBlock(block.id, { ...block.data, ...newData });
      toast.success('Block rewritten!');
    } catch {
      toast.error('AI rewrite failed');
    }
    setRewriting(false);
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  if (!def) return null;

  const onUpdate = selected
    ? (key: string, val: string) => updateBlock(block.id, { ...block.data, [key]: val })
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-block-id={block.id}
      className={`relative group canvas-block-enter ${selected ? 'block-selected' : 'hover:block-hover-outline'}`}
      onClick={(e) => { e.stopPropagation(); selectBlock(block.id); if (contextMenu) setContextMenu(null); }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY }); selectBlock(block.id); }}
    >
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          block={block}
          onClose={() => setContextMenu(null)}
        />
      )}
      {/* Block Controls */}
      <div className={`absolute top-2 right-2 z-50 flex items-center gap-1 transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <div
          {...attributes}
          {...listeners}
          className="p-1.5 bg-slate-800/90 backdrop-blur-sm text-slate-400 hover:text-white rounded-md cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical size={14} />
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }}
          className="p-1.5 bg-slate-800/90 backdrop-blur-sm text-slate-400 hover:text-blue-400 rounded-md"
          title="Duplicate"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={handleAiRewrite}
          disabled={rewriting}
          className="p-1.5 bg-slate-800/90 backdrop-blur-sm text-slate-400 hover:text-purple-400 rounded-md disabled:opacity-50"
          title="AI rewrite this block"
        >
          {rewriting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            const html = def.exportHtml(block.data);
            navigator.clipboard.writeText(html).then(() => toast.success('Block HTML copied!'));
          }}
          className="p-1.5 bg-slate-800/90 backdrop-blur-sm text-slate-400 hover:text-green-400 rounded-md"
          title="Copy block HTML"
        >
          <Code size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); selectBlock(null); }}
          className="p-1.5 bg-slate-800/90 backdrop-blur-sm text-slate-400 hover:text-red-400 rounded-md"
          title="Delete (Del)"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Section Label */}
      <div className={`absolute top-2 left-2 z-50 transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <span className="px-2 py-1 bg-indigo-600/90 backdrop-blur-sm text-white text-xs rounded-md font-medium">
          {def.emoji} {def.label}
        </span>
      </div>

      {/* Inline edit hint */}
      {selected && (
        <div className="absolute bottom-2 left-2 z-50 pointer-events-none">
          <span className="px-2 py-0.5 bg-black/50 backdrop-blur-sm text-white/70 text-xs rounded">
            Click text to edit inline
          </span>
        </div>
      )}

      {/* Hidden block overlay */}
      {block.hidden && (
        <div className="absolute inset-0 z-40 bg-slate-900/60 flex items-center justify-center pointer-events-none">
          <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded-lg font-medium">
            <EyeOff size={12} /> Hidden — excluded from export
          </span>
        </div>
      )}

      {/* Block Content — pointer events enabled when selected for inline editing */}
      <div
        className={`${selected ? '' : 'pointer-events-none select-none'} ${block.hidden ? 'opacity-30' : ''}`}
        style={block.style?.bgType === 'solid' ? { backgroundColor: block.style.bgColor } : block.style?.bgType === 'gradient' ? { background: block.style.bgGradient } : undefined}
      >
        {def.renderCanvas(block.data, onUpdate)}
      </div>

      {/* Smart Add Button between blocks */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-50 transition-opacity opacity-0 group-hover:opacity-100">
        <div className="relative">
          <div className="w-px h-4 bg-indigo-500 mx-auto" />
          <div className="flex gap-1 bg-slate-900 border border-slate-600 rounded-lg p-1 shadow-lg items-center">
            <span className="text-slate-600 text-xs px-1">Add:</span>
            {getSmartSuggestions(existingTypes).map((type) => {
              const d = BLOCK_DEFS.find((b) => b.type === type);
              if (!d) return null;
              return (
                <button
                  key={d.type}
                  onClick={(e) => {
                    e.stopPropagation();
                    addBlock(d.type, { ...d.defaultData }, block.id);
                    toast.success(`${d.label} added`);
                  }}
                  title={`Add ${d.label}`}
                  className="p-1 text-base hover:bg-slate-700 rounded"
                >
                  {d.emoji}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function estimateReadingTime(blocks: import('../types').Block[]): string {
  const text = blocks.map((b) => JSON.stringify(b.data)).join(' ');
  const words = text.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `~${minutes} min read`;
}

const QUICK_GOALS = [
  { label: 'Jewelry drop', goal: 'Shopify landing page for a handmade jewelry drop with premium product story, reviews, free shipping offer, and buy now CTA' },
  { label: 'Skincare launch', goal: 'Shopify skincare product launch page for busy women with benefits, ingredients, trust proof, FAQ, and shop now CTA' },
  { label: 'Flash sale', goal: 'Limited-time Shopify flash sale page with urgency, discount offer, social proof, and a strong checkout CTA' },
  { label: 'Gift guide', goal: 'Shopify gift guide landing page with curated product sections, gift reasons, reviews, and clear shop CTA' },
  { label: 'Boutique drop', goal: 'Fashion boutique new collection landing page with style story, product highlights, scarcity, and buy now CTA' },
  { label: 'Bundle offer', goal: 'Shopify bundle offer page that explains the savings, shows what is included, answers questions, and pushes a bundle CTA' },
];

const HERO_DEMO_GOAL = 'Create a Shopify sales page for a premium handmade jewelry product. Make it feel polished, trustworthy, and easy to buy with a clear offer, benefits, social proof, FAQ, and shop now CTA.';

const SAMPLE_PRODUCT = {
  brand: 'Jade Loom',
  name: 'Pearl Bloom Necklace',
  price: '$79',
  imageUrl: 'https://images.unsplash.com/photo-1742137189543-38412344c2ca?auto=format&fit=crop&w=900&q=80',
  photoCredit: 'Photo by pure julia on Unsplash',
  sourceUrl: 'https://unsplash.com/photos/a-pearl-necklace-adorns-a-gray-fabric-DAStvFz1cZg',
};

const SAMPLE_PAGES = [
  {
    title: 'Product Launch',
    goal: 'Launch page for a new premium product with benefits, social proof, and a strong buy now CTA',
    gradient: 'from-indigo-600 to-violet-600',
    sections: ['Hero', 'Benefits', 'Reviews', 'FAQ'],
  },
  {
    title: 'Sale Campaign',
    goal: 'Limited-time Shopify sale page with urgency, offer details, testimonials, and discount CTA',
    gradient: 'from-rose-500 to-orange-500',
    sections: ['Offer', 'Countdown', 'Proof', 'CTA'],
  },
  {
    title: 'Premium Brand',
    goal: 'Luxury brand landing page for handmade jewelry with story, quality promise, reviews, and product CTA',
    gradient: 'from-slate-800 to-slate-600',
    sections: ['Story', 'Craft', 'Gallery', 'Buy'],
  },
];

const CAMPAIGN_GOALS = [
  {
    id: 'product-launch',
    label: 'Launch',
    title: 'Launch a product',
    goal: 'A Shopify product launch page with a clear hero, product benefits, trust proof, FAQ, and a strong buy now CTA',
  },
  {
    id: 'sale',
    label: 'Sale',
    title: 'Run a sale',
    goal: 'A limited-time Shopify sale page with urgency, offer details, objections answered, testimonials, and a discount CTA',
  },
  {
    id: 'premium',
    label: 'Premium',
    title: 'Sell premium',
    goal: 'A premium Shopify landing page with brand story, craftsmanship, quality proof, product imagery, and a confident CTA',
  },
  {
    id: 'bundle',
    label: 'Bundle',
    title: 'Promote a bundle',
    goal: 'A Shopify bundle offer page that explains the savings, shows what is included, handles questions, and pushes a buy now CTA',
  },
];

const OFFER_PRESETS = [
  {
    id: 'free-shipping',
    label: 'Free shipping',
    goal: 'Lead with free shipping as the offer',
    headline: 'Get free shipping on your order',
    subtext: 'Make the decision easy with a clear offer, fast delivery, and a checkout path shoppers can trust.',
    btnText: 'Shop the offer',
  },
  {
    id: 'limited-drop',
    label: 'Limited drop',
    goal: 'Create urgency around limited stock',
    headline: 'Limited stock is available now',
    subtext: 'Highlight what makes this drop special and give shoppers a simple reason to act today.',
    btnText: 'Buy before it sells out',
  },
  {
    id: 'bundle-save',
    label: 'Bundle save',
    goal: 'Promote a bundle with savings',
    headline: 'Bundle your favorites and save',
    subtext: 'Give customers a higher-value way to buy with a simple bundle offer and a stronger average order value.',
    btnText: 'Build my bundle',
  },
  {
    id: 'first-order',
    label: 'First order',
    goal: 'Give first-time buyers a reason to try',
    headline: 'Your first order should feel easy',
    subtext: 'Remove hesitation with a welcoming offer, clear benefits, and trust signals near the CTA.',
    btnText: 'Claim my offer',
  },
];

const SAMPLE_REVIEWS = [
  {
    quote: 'The page explained the product so clearly that I knew what made it special right away.',
    name: 'Example shopper',
    detail: 'Product clarity',
  },
  {
    quote: 'The reviews, shipping details, and return promise made checkout feel easy.',
    name: 'Example shopper',
    detail: 'Trust signals',
  },
  {
    quote: 'I liked seeing the benefits and offer in one place instead of hunting around the store.',
    name: 'Example shopper',
    detail: 'Easy decision',
  },
];

const APP_PRICING_PLANS = [
  {
    name: 'Free Trial',
    price: '$0',
    period: 'for 30 days',
    description: 'Try PageGenie and build your first AI landing pages before paying.',
    cta: 'Start free',
    highlighted: false,
    features: ['AI page generation', 'Product-page samples', 'Conversion checklist', 'No credit card pressure'],
  },
  {
    name: 'PageGenie Pro',
    price: '$19',
    period: '/month',
    description: 'Keep building and publishing Shopify landing pages with all premium AI tools.',
    cta: 'Upgrade when ready',
    highlighted: true,
    features: ['Unlimited AI page generation', 'Build from Shopify products', 'AI rewrite and polish', 'Publish to Shopify and web'],
  },
];

const SECTION_ACTIONS = [
  { label: 'Add proof', detail: 'Reviews and trust', type: 'testimonials' },
  { label: 'Add FAQ', detail: 'Answer objections', type: 'faq' },
  { label: 'Add benefits', detail: 'Why buy now', type: 'features' },
  { label: 'Add CTA', detail: 'Stronger close', type: 'cta-banner' },
];

function hasAnyBlock(blocks: Block[], types: string[]) {
  return blocks.some((block) => types.includes(block.type));
}

function getConversionChecks(blocks: Block[]) {
  const serialized = blocks.map((block) => JSON.stringify(block.data || {})).join(' ').toLowerCase();
  const checks = [
    {
      key: 'hero',
      label: 'Clear hero',
      hint: 'Add a headline and CTA above the fold.',
      passed: hasAnyBlock(blocks, ['hero', 'hero-product', 'hero-split', 'hero-video']),
    },
    {
      key: 'benefits',
      label: 'Benefits',
      hint: 'Explain why this product is worth buying.',
      passed: hasAnyBlock(blocks, ['features', 'steps', 'comparison', 'stats']),
    },
    {
      key: 'proof',
      label: 'Proof',
      hint: 'Use reviews, numbers, or trust signals.',
      passed: hasAnyBlock(blocks, ['testimonials', 'testimonial-single', 'stats', 'logos']),
    },
    {
      key: 'objections',
      label: 'Objections',
      hint: 'Answer shipping, quality, fit, price, or guarantee questions.',
      passed: hasAnyBlock(blocks, ['faq', 'comparison']),
    },
    {
      key: 'cta',
      label: 'Buy CTA',
      hint: 'Repeat the buying action near the end.',
      passed: hasAnyBlock(blocks, ['cta', 'cta-banner', 'pricing', 'newsletter']) || /buy|shop|order|claim|get started|add to cart/.test(serialized),
    },
  ];
  const score = Math.round((checks.filter((check) => check.passed).length / checks.length) * 100);
  return {
    checks,
    score,
    label: score >= 85 ? 'Strong' : score >= 60 ? 'Getting close' : 'Needs work',
  };
}

function getSectionData(type: string, pageTitle: string) {
  if (type === 'testimonials') {
    return {
      title: 'Why customers trust this',
      testimonials: [
        { quote: 'The quality felt even better in person. Ordering was easy and delivery was fast.', name: 'Avery M.', role: 'Verified customer', avatar: 'AM', avatarBg: '#4f46e5' },
        { quote: 'I bought this as a gift and it made the whole moment feel special.', name: 'Jordan P.', role: 'Repeat buyer', avatar: 'JP', avatarBg: '#0891b2' },
        { quote: 'Beautiful details, clear communication, and exactly what I hoped for.', name: 'Mina R.', role: 'Happy customer', avatar: 'MR', avatarBg: '#059669' },
      ],
    };
  }
  if (type === 'faq') {
    return {
      title: 'Questions before you order',
      items: [
        { question: 'How fast will my order ship?', answer: 'Most orders are prepared quickly, and shipping details are shown before checkout so customers know what to expect.' },
        { question: 'What makes this worth the price?', answer: 'Use this answer to explain the materials, craftsmanship, benefits, or result that makes the product feel valuable.' },
        { question: 'Can I return or exchange it?', answer: 'Share your store policy in simple language so buyers feel comfortable taking the next step.' },
        { question: 'Is this a good gift?', answer: 'Explain who the product is best for and why it creates a thoughtful buying moment.' },
      ],
    };
  }
  if (type === 'features') {
    return {
      title: 'Why shoppers choose this',
      subtitle: 'Show the strongest reasons to buy in a way that is easy to scan.',
      features: [
        { icon: '1', title: 'Made to stand out', description: 'Use this point to describe the product detail customers notice first.' },
        { icon: '2', title: 'Easy to love', description: 'Explain how it fits into daily life, gifting, style, or the customer goal.' },
        { icon: '3', title: 'Built with care', description: 'Mention quality, materials, process, or the promise behind the product.' },
      ],
    };
  }
  if (type === 'cta-banner') {
    return {
      headline: `Ready to choose ${pageTitle || 'your favorite'}?`,
      subtext: 'Make the next step simple with a clear offer, a confident promise, and a button shoppers can act on.',
      btnText: 'Shop now',
      secondBtnText: 'See details',
      bgColor: '#4f46e5',
      textColor: '#ffffff',
      btnColor: '#ffffff',
    };
  }
  return {};
}

function AiSampleLandingPage({ generating, onGenerate }: { generating: boolean; onGenerate: () => void }) {
  return (
    <div className="mb-6 overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-2xl shadow-indigo-100/70">
      <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
        <div className="bg-slate-900 p-5 text-white">
          <p className="text-xs font-black uppercase tracking-wider text-indigo-300">AI sample page</p>
          <h3 className="mt-2 text-2xl font-black leading-tight">Show shoppers what PageGenie can create</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            A strong sample helps people trust the app before they try it. This preview shows the kind of landing page AI can build from one product idea.
          </p>
          <button
            onClick={onGenerate}
            disabled={generating}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-950/30 transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {generating ? 'Building sample...' : 'Generate a page like this'}
          </button>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {['Hero', 'Proof', 'CTA'].map((item) => (
              <div key={item} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-center text-xs font-bold text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <div className="text-sm font-black text-slate-900">{SAMPLE_PRODUCT.brand}</div>
              <div className="hidden items-center gap-4 text-xs font-semibold text-slate-400 sm:flex">
                <span>Shop</span>
                <span>Reviews</span>
                <span>Shipping</span>
              </div>
              <div className="rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">Shop now</div>
            </div>
            <div className="grid md:grid-cols-[1fr_0.82fr]">
              <div className="p-6">
                <p className="mb-3 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-700">
                  Handmade jewelry drop
                </p>
                <h4 className="text-3xl font-black leading-tight text-slate-950">
                  A pearl necklace made for everyday glow
                </h4>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Hand-finished freshwater pearls with a soft shine, gift-ready packaging, and free shipping this week.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <div className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">Shop the drop</div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">See reviews</div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {[
                    ['4.9/5', 'Customer rating'],
                    ['Free', 'Shipping offer'],
                    ['30 days', 'Easy returns'],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-sm font-black text-slate-900">{value}</p>
                      <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-indigo-50 p-5">
                <div className="rounded-3xl border border-white bg-white p-3 shadow-lg">
                  <div className="aspect-square overflow-hidden rounded-2xl bg-slate-100">
                    <img
                      src={SAMPLE_PRODUCT.imageUrl}
                      alt={SAMPLE_PRODUCT.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-900">{SAMPLE_PRODUCT.name}</p>
                      <p className="text-xs text-slate-400">Limited batch</p>
                    </div>
                    <p className="text-sm font-black text-green-600">{SAMPLE_PRODUCT.price}</p>
                  </div>
                  <p className="mt-2 text-[10px] font-semibold text-slate-400">{SAMPLE_PRODUCT.photoCredit}</p>
                </div>
              </div>
            </div>
            <div className="grid border-t border-slate-100 md:grid-cols-3">
              {[
                ['Gift-ready', 'Arrives in a premium box with a handwritten note option.'],
                ['Hand-finished', 'Each piece is checked for shine, clasp quality, and comfort.'],
                ['Easy to style', 'Designed to work with everyday outfits and special moments.'],
              ].map(([title, body]) => (
                <div key={title} className="border-slate-100 p-5 md:border-r md:last:border-r-0">
                  <p className="text-sm font-black text-slate-900">{title}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{body}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 bg-slate-50 p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Customer reviews</p>
                <p className="text-xs font-black text-green-600">4.9/5 rating</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {SAMPLE_REVIEWS.map((review) => (
                  <div key={review.detail} className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="mb-2 flex gap-0.5 text-xs text-green-500">
                      {[1, 2, 3, 4, 5].map((star) => <span key={star}>*</span>)}
                    </div>
                    <p className="text-xs font-semibold leading-5 text-slate-700">"{review.quote}"</p>
                    <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">{review.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewShowcase() {
  return (
    <div className="mb-6 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-xl shadow-slate-200/60">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-indigo-600">Review sections included</p>
          <h3 className="mt-1 text-xl font-black text-slate-900">Show trust before shoppers hesitate</h3>
        </div>
        <p className="max-w-sm text-xs leading-5 text-slate-500">
          PageGenie can add review-style proof blocks to make generated pages feel more believable and easier to buy from.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {SAMPLE_REVIEWS.map((review) => (
          <div key={review.detail} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex gap-0.5 text-xs text-green-500">
                {[1, 2, 3, 4, 5].map((star) => <span key={star}>*</span>)}
              </div>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-500">{review.detail}</span>
            </div>
            <p className="text-sm font-semibold leading-6 text-slate-700">"{review.quote}"</p>
            <p className="mt-4 text-xs font-bold text-slate-400">{review.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingShowcase({ onTryDemo }: { onTryDemo: () => void }) {
  return (
    <div className="mb-6 overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-2xl shadow-indigo-100/60">
      <div className="grid lg:grid-cols-[0.75fr_1.25fr]">
        <div className="bg-indigo-600 p-6 text-white">
          <p className="text-xs font-black uppercase tracking-wider text-indigo-100">Simple pricing</p>
          <h3 className="mt-2 text-2xl font-black leading-tight">Try it free, then keep building for $19/month</h3>
          <p className="mt-3 text-sm leading-6 text-indigo-100">
            Clear pricing helps shoppers understand the value before they commit. PageGenie gives merchants time to try the AI builder first.
          </p>
          <button
            onClick={onTryDemo}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-indigo-700 shadow-lg transition-all hover:bg-indigo-50"
          >
            <Zap size={15} />
            Try the demo page
          </button>
        </div>
        <div className="grid gap-4 bg-slate-50 p-5 md:grid-cols-2">
          {APP_PRICING_PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-5 ${
                plan.highlighted
                  ? 'border-indigo-300 bg-white shadow-xl shadow-indigo-100'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className={`text-xs font-black uppercase tracking-wider ${plan.highlighted ? 'text-indigo-600' : 'text-slate-400'}`}>{plan.name}</p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-950">{plan.price}</span>
                    <span className="text-sm font-bold text-slate-400">{plan.period}</span>
                  </div>
                </div>
                {plan.highlighted && (
                  <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-green-700">
                    Best value
                  </span>
                )}
              </div>
              <p className="min-h-[48px] text-sm leading-6 text-slate-500">{plan.description}</p>
              <ul className="mt-5 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm font-semibold text-slate-700">
                    <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[9px] font-black text-white">OK</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={onTryDemo}
                className={`mt-5 w-full rounded-xl px-4 py-3 text-sm font-black transition-all ${
                  plan.highlighted
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                    : 'border border-slate-200 bg-white text-slate-800 hover:border-indigo-200 hover:bg-indigo-50'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const { addBlock, setPageGoal, setPageTitle } = usePageStore();
  const [goal, setGoal] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState(CAMPAIGN_GOALS[0].id);
  const [selectedOffer, setSelectedOffer] = useState(OFFER_PRESETS[0].id);
  const [generating, setGenerating] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const shopParam = new URLSearchParams(window.location.search).get('shop');
  const savedShop = getShopifyCredentials()?.shop;
  const hasShopify = !!(shopParam || savedShop);
  const selectedCampaignItem = CAMPAIGN_GOALS.find((item) => item.id === selectedCampaign) || CAMPAIGN_GOALS[0];
  const selectedOfferItem = OFFER_PRESETS.find((item) => item.id === selectedOffer) || OFFER_PRESETS[0];
  const wizardGoal = `${selectedCampaignItem.goal}. Offer angle: ${selectedOfferItem.goal}.`;

  const handleGenerate = async (customGoal?: string) => {
    const finalGoal = customGoal || goal;
    if (!finalGoal.trim()) { inputRef.current?.focus(); return; }
    setGenerating(true);
    setPageGoal(finalGoal);
    try {
      const { blocks, tagline } = await generateFullPage(finalGoal);
      if (blocks.length === 0) throw new Error('No blocks generated');
      for (const b of blocks) {
        const def = BLOCK_DEFS.find((d) => d.type === b.type);
        if (def) addBlock(b.type, { ...def.defaultData, ...b.data });
      }
      if (tagline) setPageTitle(tagline);
      toast.success(`Page generated with ${blocks.length} sections! ✨`);
    } catch (err: any) {
      toast.error(err.message || 'Generation failed — try again');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      {showProductPicker && <ProductPickerModal onClose={() => setShowProductPicker(false)} />}
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-indigo-50 cursor-default p-8 overflow-y-auto">
        <div className="w-full max-w-5xl">
          {/* Header */}
          <div className="grid lg:grid-cols-[1.02fr_0.98fr] gap-8 items-center mb-8">
            <div className="text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-indigo-100 text-xs font-semibold text-indigo-700 shadow-sm mb-4">
                <Sparkles size={13} />
                For Shopify stores ready to launch faster
              </div>
              <h2 className="text-5xl font-black text-slate-900 mb-4 leading-[1.02] tracking-tight">
                Create a sales page people actually want to click
              </h2>
              <p className="text-slate-600 text-base leading-7 max-w-xl">
                Start with a product, an offer, or one sentence. PageGenie turns it into a polished Shopify landing page with the sections shoppers expect before they buy.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => { setGoal(HERO_DEMO_GOAL); handleGenerate(HERO_DEMO_GOAL); }}
                  disabled={generating}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all"
                >
                  {generating ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
                  Try a demo page
                </button>
                <button
                  onClick={() => hasShopify ? setShowProductPicker(true) : inputRef.current?.focus()}
                  disabled={generating}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-800 text-sm font-bold rounded-xl border border-slate-200 shadow-sm transition-all"
                >
                  <ShoppingBag size={15} className="text-green-500" />
                  {hasShopify ? 'Use my products' : 'Write my own idea'}
                </button>
              </div>
              <div className="mt-5 grid sm:grid-cols-3 gap-2">
                {[
                  ['No blank page', 'Hero, proof, FAQ, CTA'],
                  ['Offer-first', 'Sale, bundle, launch'],
                  ['Ready to polish', 'Score and improve'],
                ].map(([title, detail]) => (
                  <div key={title} className="rounded-xl bg-white/80 border border-slate-200 p-3 shadow-sm">
                    <p className="text-sm font-bold text-slate-800">{title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute -left-5 top-10 rounded-2xl bg-white border border-green-100 shadow-xl px-4 py-3 z-10">
                  <p className="text-[10px] font-black uppercase tracking-wider text-green-600">Conversion score</p>
                  <p className="text-3xl font-black text-slate-900 leading-none mt-1">92</p>
                </div>
                <div className="absolute -right-4 bottom-8 rounded-2xl bg-slate-900 text-white shadow-xl px-4 py-3 z-10">
                  <p className="text-[10px] font-black uppercase tracking-wider text-indigo-300">Generated</p>
                  <p className="text-sm font-bold mt-1">Hero + proof + CTA</p>
                </div>
              <div className="rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-indigo-200/50 p-4 rotate-1">
                <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                  <div className="h-9 bg-slate-900 flex items-center gap-1.5 px-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <div className="p-5 bg-gradient-to-br from-white to-indigo-50">
                    <div className="grid grid-cols-[1fr_120px] gap-4 items-center">
                      <div>
                        <div className="inline-flex rounded-full bg-indigo-100 text-indigo-700 px-3 py-1 text-[10px] font-black uppercase tracking-wider mb-3">New drop</div>
                        <div className="w-full h-8 rounded bg-slate-900 mb-2" />
                        <div className="w-5/6 h-8 rounded bg-slate-900 mb-4" />
                        <div className="space-y-2 mb-5">
                          <div className="w-full h-2 rounded bg-slate-200" />
                          <div className="w-5/6 h-2 rounded bg-slate-200" />
                          <div className="w-2/3 h-2 rounded bg-slate-200" />
                        </div>
                        <div className="flex gap-2">
                          <div className="h-9 w-28 rounded-lg bg-indigo-600" />
                          <div className="h-9 w-24 rounded-lg bg-white border border-slate-200" />
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white border border-slate-200 shadow-lg p-3">
                        <div className="aspect-square overflow-hidden rounded-xl bg-slate-100 mb-3">
                          <img
                            src={SAMPLE_PRODUCT.imageUrl}
                            alt={SAMPLE_PRODUCT.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <p className="mb-1 text-[10px] font-black text-slate-800">{SAMPLE_PRODUCT.name}</p>
                        <p className="mb-3 text-[10px] font-bold text-green-600">{SAMPLE_PRODUCT.price}</p>
                        <div className="h-7 rounded-lg bg-green-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-5">
                      {['Benefit', 'Review', 'FAQ'].map((item) => (
                        <div key={item} className="rounded-xl bg-white/90 border border-slate-200 p-3">
                          <div className="h-6 w-6 rounded-lg bg-indigo-100 mb-2" />
                          <p className="text-[10px] font-black text-slate-700">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>

          {/* Build from Product — prominent if Shopify connected */}
          <AiSampleLandingPage
            generating={generating}
            onGenerate={() => { setGoal(HERO_DEMO_GOAL); handleGenerate(HERO_DEMO_GOAL); }}
          />

          <ReviewShowcase />

          <PricingShowcase
            onTryDemo={() => { setGoal(HERO_DEMO_GOAL); handleGenerate(HERO_DEMO_GOAL); }}
          />

          {hasShopify && (
            <button
              onClick={() => setShowProductPicker(true)}
              disabled={generating}
              className="w-full mb-4 flex items-center gap-4 p-4 bg-white border-2 border-green-300 hover:border-green-500 hover:bg-green-50 rounded-2xl shadow-md transition-all group disabled:opacity-50"
            >
              <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-200 group-hover:scale-105 transition-transform">
                <ShoppingBag size={22} className="text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="text-slate-800 font-bold text-sm">Build from products</p>
                <p className="text-slate-500 text-xs mt-0.5">Use real product titles, descriptions, prices, and images from your Shopify store.</p>
              </div>
              <ArrowRight size={18} className="text-green-500 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

          {/* Divider */}
          {hasShopify && (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-slate-300" />
              <span className="text-xs text-slate-400 font-medium">or describe the goal</span>
              <div className="flex-1 h-px bg-slate-300" />
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-100 p-4 mb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Campaign builder</p>
                <h3 className="text-lg font-bold text-slate-900">Choose the sales angle first</h3>
              </div>
              <button
                onClick={() => { setGoal(wizardGoal); handleGenerate(wizardGoal); }}
                disabled={generating}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                Build this sales page
              </button>
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-slate-500 mb-2">Page goal</p>
                <div className="grid grid-cols-2 gap-2">
                  {CAMPAIGN_GOALS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedCampaign(item.id)}
                      disabled={generating}
                      className={`text-left rounded-xl border px-3 py-2 transition-all ${
                        selectedCampaign === item.id
                          ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/40'
                      }`}
                    >
                      <span className="block text-xs font-black uppercase tracking-wide">{item.label}</span>
                      <span className="block text-xs mt-0.5">{item.title}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 mb-2">Offer angle</p>
                <div className="grid grid-cols-2 gap-2">
                  {OFFER_PRESETS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedOffer(item.id)}
                      disabled={generating}
                      className={`text-left rounded-xl border px-3 py-2 transition-all ${
                        selectedOffer === item.id
                          ? 'border-green-400 bg-green-50 text-green-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-green-200 hover:bg-green-50/50'
                      }`}
                    >
                      <span className="block text-xs font-black uppercase tracking-wide">{item.label}</span>
                      <span className="block text-xs mt-0.5">{item.goal}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI input */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-100 p-1 mb-4 flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-400 ml-3 flex-shrink-0" />
            <input
              ref={inputRef}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !generating) handleGenerate(); }}
              placeholder="What are you selling, who is it for, and what should visitors do?"
              className="flex-1 text-sm text-slate-700 bg-transparent outline-none py-3 placeholder-slate-400"
              disabled={generating}
            />
            <button
              onClick={() => handleGenerate()}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all flex-shrink-0"
            >
              {generating ? (
                <><Loader2 size={14} className="animate-spin" /> Building…</>
              ) : (
                <><Zap size={14} /> Generate page</>
              )}
            </button>
          </div>

          {/* Quick goals */}
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {QUICK_GOALS.map((q) => (
              <button
                key={q.label}
                onClick={() => { setGoal(q.goal); handleGenerate(q.goal); }}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-full text-xs font-medium text-slate-600 hover:text-indigo-700 transition-all disabled:opacity-50 shadow-sm"
              >
                {q.label} <ArrowRight size={10} />
              </button>
            ))}
          </div>

          {/* Or add manually */}
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-3">Add sections manually</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['hero', 'features', 'pricing', 'testimonials', 'cta', 'faq'].map((type) => {
                const def = BLOCK_DEFS.find((b) => b.type === type);
                if (!def) return null;
                return (
                  <button
                    key={def.type}
                    onClick={() => { addBlock(def.type, { ...def.defaultData }); toast.success(`${def.label} added`); }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs hover:border-indigo-300 hover:shadow-sm transition-all text-slate-600 hover:text-indigo-700"
                  >
                    <span className="opacity-70">{def.emoji}</span>
                    <span className="font-medium">{def.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-10 grid lg:grid-cols-[1fr_0.9fr] gap-6 items-stretch">
            <div className="bg-white/80 border border-slate-200 rounded-2xl shadow-lg shadow-slate-200/60 p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Page examples</p>
                  <h3 className="text-lg font-bold text-slate-900">Start from a proven sales page</h3>
                </div>
                <LayoutTemplate size={20} className="text-indigo-500 flex-shrink-0" />
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {SAMPLE_PAGES.map((sample) => (
                  <button
                    key={sample.title}
                    onClick={() => { setGoal(sample.goal); handleGenerate(sample.goal); }}
                    disabled={generating}
                    className="group text-left rounded-xl overflow-hidden border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all disabled:opacity-50"
                  >
                    <div className={`h-20 bg-gradient-to-br ${sample.gradient} p-3`}>
                      <div className="w-16 h-2 rounded-full bg-white/70 mb-2" />
                      <div className="w-24 h-3 rounded-full bg-white/90" />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-700">{sample.title}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {sample.sections.map((section) => (
                          <span key={section} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                            {section}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 text-white rounded-2xl shadow-xl shadow-indigo-200/50 p-5 overflow-hidden relative">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl" />
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-3">Before / after</p>
              <div className="grid grid-cols-2 gap-3 relative">
                <div className="rounded-xl bg-slate-800 border border-slate-700 p-3">
                  <p className="text-xs font-semibold text-slate-400 mb-3">Product page</p>
                  <div className="h-20 rounded-lg bg-slate-700 mb-3" />
                  <div className="space-y-2">
                    <div className="h-2 rounded bg-slate-600" />
                    <div className="h-2 rounded bg-slate-700 w-4/5" />
                    <div className="h-2 rounded bg-slate-700 w-2/3" />
                  </div>
                </div>
                <div className="rounded-xl bg-white text-slate-900 border border-indigo-200 p-3 shadow-lg">
                  <p className="text-xs font-semibold text-indigo-600 mb-3">PageGenie page</p>
                  <div className="h-6 rounded bg-slate-900 mb-2" />
                  <div className="h-3 rounded bg-indigo-200 mb-3 w-4/5" />
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    <div className="h-8 rounded bg-indigo-50 border border-indigo-100" />
                    <div className="h-8 rounded bg-indigo-50 border border-indigo-100" />
                    <div className="h-8 rounded bg-indigo-50 border border-indigo-100" />
                  </div>
                  <div className="h-8 rounded-lg bg-indigo-600" />
                </div>
              </div>
              <p className="relative text-xs text-slate-300 mt-4">
                Go from a basic product listing to a campaign-ready page with offer, benefits, proof, and CTA.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const LANGUAGES = [
  'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Dutch',
  'Japanese', 'Korean', 'Chinese (Simplified)', 'Arabic', 'Hindi', 'Russian',
  'Turkish', 'Polish', 'Swedish', 'Norwegian', 'Danish', 'Finnish',
];

export default function Canvas() {
  const { page, selectedBlockId, selectBlock, moveBlock, addBlock, updateBlock, pageGoal, theme, previewMode, setPreviewMode, setPageGoal, setPageTitle, newProject } = usePageStore();
  const [polishing, setPolishing] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [demoGenerating, setDemoGenerating] = useState(false);
  const [polishTone, setPolishTone] = useState<'marketing' | 'professional' | 'casual' | 'playful'>('marketing');
  const shopParam = new URLSearchParams(window.location.search).get('shop');
  const savedShop = getShopifyCredentials()?.shop;
  const hasShopify = !!(shopParam || savedShop);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      moveBlock(active.id as string, over.id as string);
    }
  };

  const handlePolish = async () => {
    if (polishing || page.blocks.length === 0) return;
    setPolishing(true);
    try {
      const input = page.blocks.map(b => ({ type: b.type, data: b.data }));
      const polished = await polishPage(input, pageGoal || page.title, polishTone);
      polished.forEach((pb, i) => {
        if (page.blocks[i]) updateBlock(page.blocks[i].id, pb.data);
      });
      toast.success(`Page polished! ✨ All ${page.blocks.length} sections rewritten.`);
    } catch (err: any) {
      toast.error(err.message || 'Polish failed');
    }
    setPolishing(false);
  };

  const handleTranslate = async (lang: string) => {
    setShowLangPicker(false);
    setTranslating(true);
    try {
      const input = page.blocks.map(b => ({ type: b.type, data: b.data }));
      const translated = await translatePage(input, lang);
      translated.forEach((tb, i) => {
        if (page.blocks[i]) updateBlock(page.blocks[i].id, tb.data);
      });
      toast.success(`Translated to ${lang}! 🌐`);
    } catch (err: any) {
      toast.error(err.message || 'Translation failed');
    }
    setTranslating(false);
  };

  const conversion = getConversionChecks(page.blocks);

  const handleAddConversionSection = (type: string) => {
    const def = BLOCK_DEFS.find((blockDef) => blockDef.type === type);
    if (!def) return;
    addBlock(type, { ...def.defaultData, ...getSectionData(type, page.title) });
    toast.success(`${def.label} added`);
  };

  const handleAddOffer = (offer: typeof OFFER_PRESETS[number]) => {
    const def = BLOCK_DEFS.find((blockDef) => blockDef.type === 'cta-banner');
    if (!def) return;
    addBlock('cta-banner', {
      ...def.defaultData,
      headline: offer.headline,
      subtext: offer.subtext,
      btnText: offer.btnText,
      secondBtnText: 'See details',
      bgColor: '#4f46e5',
      textColor: '#ffffff',
      btnColor: '#ffffff',
    });
    toast.success(`${offer.label} offer added`);
  };

  const handleStartDemoPage = async () => {
    if (demoGenerating) return;
    setDemoGenerating(true);
    try {
      const { blocks, tagline } = await generateFullPage(HERO_DEMO_GOAL);
      if (blocks.length === 0) throw new Error('No blocks generated');
      newProject();
      setPageGoal(HERO_DEMO_GOAL);
      for (const b of blocks) {
        const def = BLOCK_DEFS.find((d) => d.type === b.type);
        if (def) addBlock(b.type, { ...def.defaultData, ...b.data });
      }
      setPageTitle(tagline || 'Demo Sales Page');
      toast.success(`Demo page created with ${blocks.length} sections`);
    } catch (err: any) {
      toast.error(err.message || 'Demo generation failed');
    } finally {
      setDemoGenerating(false);
    }
  };

  if (page.blocks.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      className="flex-1 overflow-y-auto bg-slate-200 relative"
      style={{ '--brand': theme.primaryColor } as React.CSSProperties}
      onClick={() => { selectBlock(null); setShowLangPicker(false); }}
    >
      {showProductPicker && <ProductPickerModal onClose={() => setShowProductPicker(false)} />}
      {page.blocks.length > 0 && (
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-1.5 bg-slate-100/80 backdrop-blur-sm border-b border-slate-200">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>{page.blocks.length} section{page.blocks.length !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{estimateReadingTime(page.blocks)}</span>
            <span>·</span>
            {/* Preview mode toggle */}
            <div className="flex items-center gap-0.5 bg-slate-200 rounded-lg p-0.5">
              {([['desktop', Monitor, 'Desktop'], ['tablet', Tablet, 'Tablet (768px)'], ['mobile', Smartphone, 'Mobile (390px)']] as const).map(([mode, Icon, label]) => (
                <button
                  key={mode}
                  onClick={() => setPreviewMode(mode)}
                  title={label}
                  className={`p-1 rounded-md transition-all ${previewMode === mode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Icon size={12} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            {/* Polish Page */}
            <select
              value={polishTone}
              onChange={e => setPolishTone(e.target.value as any)}
              disabled={polishing || translating}
              className="py-1 px-1.5 bg-slate-700 text-slate-300 text-xs rounded-md border border-slate-600 focus:outline-none focus:border-purple-500 disabled:opacity-50"
              title="Tone for Polish Page"
            >
              <option value="marketing">Marketing</option>
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="playful">Playful</option>
            </select>
            <button
              onClick={handlePolish}
              disabled={polishing || translating}
              title="Polish Page — AI rewrites all sections for consistent, compelling copy"
              className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-md transition-all"
            >
              {polishing ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              {polishing ? 'Polishing…' : 'Polish Page'}
            </button>
            {/* Translate */}
            <div className="relative">
              <button
                onClick={() => setShowLangPicker(!showLangPicker)}
                disabled={polishing || translating}
                title="Translate all content to another language"
                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 text-xs font-medium rounded-md transition-all border border-slate-600"
              >
                {translating ? <Loader2 size={11} className="animate-spin" /> : <Languages size={11} />}
                {translating ? 'Translating…' : 'Translate'}
              </button>
              {showLangPicker && (
                <div className="absolute right-0 top-8 z-[100] w-52 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
                    <span className="text-xs font-semibold text-slate-300">Translate to…</span>
                    <button onClick={() => setShowLangPicker(false)} className="p-0.5 text-slate-500 hover:text-white"><X size={11} /></button>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {LANGUAGES.map(lang => (
                      <button key={lang} onClick={() => handleTranslate(lang)}
                        className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/30 last:border-0">
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto mt-4 max-w-5xl px-4">
        <div className="rounded-2xl bg-white border border-indigo-100 shadow-lg shadow-indigo-100/60 overflow-hidden">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
            <div className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-2">PageGenie sales engine</p>
                  <h2 className="text-2xl font-black text-slate-900 leading-tight">Make this page easier to buy from</h2>
                  <p className="text-sm text-slate-500 mt-2 max-w-xl">
                    Use the checklist and quick actions to add the sections most Shopify landing pages need before they are ready to publish.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                    <button
                      onClick={handleStartDemoPage}
                      disabled={demoGenerating || polishing || translating}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
                    >
                      {demoGenerating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                      {demoGenerating ? 'Creating demo...' : 'Try fresh demo'}
                    </button>
                    <button
                      onClick={() => hasShopify ? setShowProductPicker(true) : toast('Connect Shopify to build from products')}
                      disabled={demoGenerating || polishing || translating}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:border-green-300 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
                    >
                      <ShoppingBag size={14} className="text-green-500" />
                      Build from products
                    </button>
                  </div>
                </div>
                <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-3 min-w-[124px]">
                  <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">Score</p>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-black text-slate-900 leading-none">{conversion.score}</span>
                    <span className="text-xs font-bold text-slate-400 mb-1">/100</span>
                  </div>
                  <p className="text-xs font-semibold text-indigo-700 mt-1">{conversion.label}</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-4 gap-2 mt-4">
                {SECTION_ACTIONS.map((action) => {
                  const alreadyAdded = action.type !== 'cta-banner' && hasAnyBlock(page.blocks, [action.type]);
                  return (
                    <button
                      key={action.label}
                      onClick={(event) => { event.stopPropagation(); handleAddConversionSection(action.type); }}
                      className={`text-left rounded-xl border px-3 py-2 transition-all ${
                        alreadyAdded
                          ? 'bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-200'
                          : 'bg-white border-indigo-100 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                    >
                      <span className="block text-xs font-black">{action.label}</span>
                      <span className="block text-[11px] text-slate-400 mt-0.5">{alreadyAdded ? 'Already on page' : action.detail}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {SAMPLE_REVIEWS.map((review) => (
                  <div key={review.detail} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="mb-2 flex gap-0.5 text-[10px] text-green-500">
                      {[1, 2, 3, 4, 5].map((star) => <span key={star}>*</span>)}
                    </div>
                    <p className="text-xs font-semibold leading-5 text-slate-700">"{review.quote}"</p>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-slate-400">{review.detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                {APP_PRICING_PLANS.map((plan) => (
                  <div
                    key={plan.name}
                    className={`rounded-xl border p-3 ${
                      plan.highlighted
                        ? 'border-indigo-200 bg-indigo-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-slate-900">{plan.price}</span>
                      <span className="text-xs font-bold text-slate-500">{plan.period}</span>
                    </div>
                    <p className="mt-1 text-xs font-black text-slate-800">{plan.name}</p>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500">{plan.description}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_180px]">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-indigo-600">AI sample</p>
                  <h3 className="mt-1 text-lg font-black leading-tight text-slate-900">{SAMPLE_PRODUCT.name} product page</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    A polished sample with product story, offer, review proof, benefits, and a buy CTA.
                  </p>
                  <button
                    onClick={(event) => { event.stopPropagation(); handleStartDemoPage(); }}
                    disabled={demoGenerating || polishing || translating}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
                  >
                    {demoGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {demoGenerating ? 'Building...' : 'View sample page'}
                  </button>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-indigo-200">{SAMPLE_PRODUCT.brand}</div>
                  <div className="p-3">
                    <div className="mb-3 aspect-[4/3] overflow-hidden rounded-lg bg-slate-100">
                      <img
                        src={SAMPLE_PRODUCT.imageUrl}
                        alt={SAMPLE_PRODUCT.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="mb-2 h-3 w-16 rounded bg-indigo-100" />
                    <div className="mb-1.5 h-4 rounded bg-slate-900" />
                    <div className="mb-3 h-4 w-4/5 rounded bg-slate-900" />
                    <div className="mb-3 grid grid-cols-3 gap-1.5">
                      <div className="h-8 rounded bg-indigo-50" />
                      <div className="h-8 rounded bg-green-50" />
                      <div className="h-8 rounded bg-slate-100" />
                    </div>
                    <div className="h-7 rounded-lg bg-indigo-600" />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-slate-900 p-5 text-white">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Conversion checklist</p>
                <span className="text-[10px] font-bold text-slate-400">{conversion.checks.filter((check) => check.passed).length}/{conversion.checks.length} done</span>
              </div>
              <div className="space-y-2 mb-4">
                {conversion.checks.map((check) => (
                  <div key={check.key} className="flex items-start gap-2 text-sm">
                    <span className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${check.passed ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                      {check.passed ? 'OK' : '!'}
                    </span>
                    <div>
                      <p className={check.passed ? 'text-slate-200' : 'text-white'}>{check.label}</p>
                      {!check.passed && <p className="text-xs text-slate-400 mt-0.5">{check.hint}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-700 pt-4">
                <p className="text-xs font-semibold text-slate-300 mb-2">Add an offer block</p>
                <div className="grid grid-cols-2 gap-2">
                  {OFFER_PRESETS.map((offer) => (
                    <button
                      key={offer.id}
                      onClick={(event) => { event.stopPropagation(); handleAddOffer(offer); }}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:border-indigo-400 hover:bg-slate-700 transition-all"
                    >
                      {offer.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="min-h-full bg-white mx-auto shadow-xl my-4 transition-all duration-300"
        style={{
          maxWidth: previewMode === 'mobile' ? 390 : previewMode === 'tablet' ? 768 : undefined,
          width: previewMode !== 'desktop' ? '100%' : undefined,
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={page.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="divide-y divide-slate-100">
              {page.blocks.map((block) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  selected={selectedBlockId === block.id}
                  existingTypes={page.blocks.map((b) => b.type)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
