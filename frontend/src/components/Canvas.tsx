import React, { useEffect, useState, useRef } from 'react';
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
import { GripVertical, Trash2, Copy, EyeOff, Code, Sparkles, Loader2, Wand2, ArrowRight, Zap, Languages, X, Lock, Unlock, ChevronUp, ChevronDown, Monitor, Tablet, Smartphone, ShoppingBag, LayoutTemplate, Star, ShieldCheck } from 'lucide-react';
import ProductPickerModal from './ProductPickerModal';
import { usePageStore } from '../store/pageStore';
import { getBlockDef } from '../blocks/blockDefs';
import { Block, BlockStyle } from '../types';
import BLOCK_DEFS from '../blocks/blockDefs';
import { generateBlockContent, generateFullPage, translatePage } from '../lib/api';
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

const SAMPLE_PRODUCT_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
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

const SAMPLE_PRODUCT = {
  brand: 'Jade Loom',
  name: 'Pearl Bloom Necklace',
  price: '$79',
  imageUrl: SAMPLE_PRODUCT_IMAGE,
  photoCredit: 'Demo product visual',
  sourceUrl: '#',
};

const SAMPLE_PAGES = [
  {
    title: 'Product Launch',
    goal: 'Launch page for a new premium product with benefits, social proof, and a strong buy now CTA',
    sections: ['Hero', 'Benefits', 'Reviews', 'FAQ'],
  },
  {
    title: 'Sale Campaign',
    goal: 'Limited-time Shopify sale page with urgency, offer details, testimonials, and discount CTA',
    sections: ['Offer', 'Countdown', 'Proof', 'CTA'],
  },
  {
    title: 'Premium Brand',
    goal: 'Luxury brand landing page for handmade jewelry with story, quality promise, reviews, and product CTA',
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

function makeWhiteSampleBlockData(type: string, data: Record<string, any>) {
  if (type === 'navbar') {
    return { ...data, bgColor: '#ffffff', sticky: 'solid' };
  }
  if (type === 'hero') {
    return {
      ...data,
      variant: data.imageUrl ? 'split' : 'minimal',
      bgFrom: '#ffffff',
      bgTo: '#ffffff',
    };
  }
  if (['stats', 'cta', 'footer', 'newsletter', 'content', 'steps', 'testimonial-single'].includes(type)) {
    return { ...data, bgColor: '#ffffff' };
  }
  return data;
}

function getBuiltInSampleBlocks() {
  return [
    {
      type: 'navbar',
      data: {
        brand: SAMPLE_PRODUCT.brand,
        links: 'Benefits,Reviews,FAQ',
        ctaText: 'Shop Now',
        bgColor: '#ffffff',
        sticky: 'solid',
      },
    },
    {
      type: 'hero',
      data: {
        variant: 'split',
        eyebrow: 'Handmade jewelry drop',
        headline: 'A pearl necklace made for everyday glow',
        subheadline: 'Hand-finished freshwater pearls with a soft shine, gift-ready packaging, easy returns, and free shipping this week.',
        primaryBtn: `Buy Now - ${SAMPLE_PRODUCT.price}`,
        primaryBtnHref: '#',
        secondaryBtn: 'Read Reviews',
        imageUrl: SAMPLE_PRODUCT.imageUrl,
        bgFrom: '#ffffff',
        bgTo: '#ffffff',
      },
    },
    {
      type: 'features',
      data: {
        variant: 'grid',
        title: 'Why shoppers choose Pearl Bloom',
        subtitle: 'A simple product story that makes the buying decision feel clear, premium, and low-risk.',
        features: [
          { icon: '01', title: 'Freshwater pearls', description: 'Soft natural shine that feels refined without looking too formal.' },
          { icon: '02', title: 'Gift-ready packaging', description: 'Arrives ready to give, with a polished unboxing moment.' },
          { icon: '03', title: 'Everyday styling', description: 'Pairs easily with casual outfits, workwear, and special occasions.' },
          { icon: '04', title: 'Limited batch', description: 'Small-run details help the piece feel personal and considered.' },
          { icon: '05', title: 'Free shipping', description: 'A clear offer reduces hesitation before checkout.' },
          { icon: '06', title: 'Easy returns', description: 'A 30-day return promise gives first-time buyers confidence.' },
        ],
      },
    },
    {
      type: 'stats',
      data: {
        title: 'Built for buyer confidence',
        bgColor: '#ffffff',
        stats: [
          { value: '4.9/5', label: 'Average rating' },
          { value: '30 days', label: 'Easy returns' },
          { value: 'Free', label: 'Shipping this week' },
          { value: '24h', label: 'Fast support' },
        ],
      },
    },
    {
      type: 'testimonials',
      data: {
        title: 'What customers notice first',
        testimonials: [
          { quote: 'It looked delicate online and even better in person. The packaging made it feel special.', name: 'Avery M.', role: 'Verified buyer', avatar: 'AM', avatarBg: '#4f46e5' },
          { quote: 'I bought it as a gift and did not need to wrap anything extra. Beautiful and easy.', name: 'Jordan P.', role: 'Gift shopper', avatar: 'JP', avatarBg: '#0891b2' },
          { quote: 'The page answered my questions about shipping and returns, so checkout felt simple.', name: 'Mina R.', role: 'First-time customer', avatar: 'MR', avatarBg: '#059669' },
        ],
      },
    },
    {
      type: 'faq',
      data: {
        title: 'Questions before you order',
        items: [
          { question: 'How fast will it ship?', answer: 'Orders are prepared quickly, and free shipping is available during this sample offer.' },
          { question: 'Is it good for gifting?', answer: 'Yes. Pearl Bloom arrives in gift-ready packaging, so it is easy to send or give in person.' },
          { question: 'Can I return it?', answer: 'Yes. The page includes a simple 30-day return promise to reduce buyer hesitation.' },
          { question: 'What makes it feel premium?', answer: 'The product story highlights materials, finish, packaging, reviews, and clear checkout details.' },
        ],
      },
    },
    {
      type: 'cta',
      data: {
        headline: 'Ready to make the page shoppable?',
        subtext: 'Use this sample as a starting point, then edit the words, offer, images, and sections for your real Shopify product.',
        primaryBtn: 'Customize This Page',
        secondaryBtn: 'See Details',
        bgColor: '#ffffff',
      },
    },
    {
      type: 'footer',
      data: {
        brand: SAMPLE_PRODUCT.brand,
        tagline: 'Handmade jewelry pages built with PageGenie.',
        copyright: '(c) 2026 Jade Loom. All rights reserved.',
        links: 'Shop,Shipping,Returns,Contact',
        bgColor: '#ffffff',
      },
    },
  ].map((block) => ({ ...block, data: makeWhiteSampleBlockData(block.type, block.data) }));
}

function addBuiltInSamplePage(
  addBlock: (type: string, data: Record<string, any>) => void,
  setPageGoal: (goal: string) => void,
  setPageTitle: (title: string) => void,
  goal = HERO_DEMO_GOAL,
  title = `${SAMPLE_PRODUCT.name} Sample Page`,
) {
  setPageGoal(goal);
  getBuiltInSampleBlocks().forEach((block) => addBlock(block.type, block.data));
  setPageTitle(title);
  toast.success('Sample page loaded');
}

function AiSampleLandingPage({ generating, onGenerate }: { generating: boolean; onGenerate: () => void }) {
  return (
    <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/70">
      <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
        <div className="border-b border-slate-100 bg-white p-5 text-slate-900 lg:border-b-0 lg:border-r">
          <p className="text-xs font-black uppercase tracking-wider text-indigo-600">AI sample page</p>
          <h3 className="mt-2 text-2xl font-black leading-tight">Show shoppers what PageGenie can create</h3>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            A strong sample helps people trust the app before they try it. This preview shows the kind of landing page AI can build from one product idea.
          </p>
          <button
            onClick={onGenerate}
            disabled={generating}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {generating ? 'Building sample...' : 'Generate a page like this'}
          </button>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {['Hero', 'Proof', 'CTA'].map((item) => (
              <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-bold text-slate-600">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4">
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
              <div className="border-t border-slate-100 bg-white p-5 md:border-l md:border-t-0">
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
            <div className="border-t border-slate-100 bg-white p-5">
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
    <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/70">
      <div className="grid lg:grid-cols-[0.75fr_1.25fr]">
        <div className="border-b border-slate-100 bg-white p-6 text-slate-900 lg:border-b-0 lg:border-r">
          <p className="text-xs font-black uppercase tracking-wider text-indigo-600">Simple pricing</p>
          <h3 className="mt-2 text-2xl font-black leading-tight">Try it free, then keep building for $19/month</h3>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Clear pricing helps shoppers understand the value before they commit. PageGenie gives merchants time to try the AI builder first.
          </p>
          <button
            onClick={onTryDemo}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-500"
          >
            <Zap size={15} />
            Try the demo page
          </button>
        </div>
        <div className="grid gap-4 bg-white p-5 md:grid-cols-2">
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

function DashboardStart({
  generating,
  goal,
  setGoal,
  inputRef,
  onChooseProduct,
  onTryDemo,
  onGenerate,
}: {
  generating: boolean;
  goal: string;
  setGoal: (goal: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  onChooseProduct: () => void;
  onTryDemo: () => void;
  onGenerate: (customGoal?: string) => void;
}) {
  const stats = [
    { icon: <LayoutTemplate size={20} />, label: 'Product pages', value: '0', detail: 'in workspace' },
    { icon: <Sparkles size={20} />, label: 'AI sections', value: '9+', detail: 'per page' },
    { icon: <Star size={20} fill="currentColor" />, label: 'Reviews', value: '15', detail: 'per page' },
    { icon: <ShieldCheck size={20} />, label: 'Publish flow', value: 'Ready', detail: 'preview' },
  ];

  const tools = [
    {
      title: 'Create Product Page',
      body: 'Choose a Shopify product and generate the full landing page.',
      action: 'Create page',
      icon: <ShoppingBag size={21} />,
      primary: true,
      onClick: onChooseProduct,
    },
    {
      title: 'Try Demo Page',
      body: 'Load a finished sample page so you can see what the app creates.',
      action: 'Open demo',
      icon: <Zap size={21} />,
      primary: false,
      onClick: onTryDemo,
    },
    {
      title: 'Custom AI Page',
      body: 'Describe a product or offer when you do not have Shopify data yet.',
      action: 'Use prompt',
      icon: <Wand2 size={21} />,
      primary: false,
      onClick: () => inputRef.current?.focus(),
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-100 p-6 cursor-default">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-indigo-600">Welcome to PageGenie</p>
            <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Build your next product page</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Pick one Shopify product. PageGenie turns it into a clean landing page with photos, benefits, reviews, FAQ, and buy buttons.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={onTryDemo}
              disabled={generating}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm hover:border-indigo-200 hover:bg-indigo-50 disabled:opacity-60"
            >
              {generating ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
              Watch Demo
            </button>
            <button
              onClick={onChooseProduct}
              disabled={generating}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-slate-300 hover:bg-slate-800 disabled:opacity-60"
            >
              <Sparkles size={15} />
              Create Product Page
            </button>
          </div>
        </div>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-black text-slate-950">Statistics</h3>
            <p className="text-sm text-slate-500">Your page-building workspace</p>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between text-slate-400">
                  {stat.icon}
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <p className="text-sm font-black text-slate-700">{stat.label}</p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="text-3xl font-black leading-none text-slate-950">{stat.value}</span>
                  <span className="pb-0.5 text-xs font-bold text-slate-400">{stat.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-base font-black text-slate-950">Helpful tools</h3>
              <p className="text-sm text-slate-500">Start with the fastest option.</p>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">Recommended: Create Product Page</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {tools.map((tool) => (
              <button
                key={tool.title}
                onClick={tool.onClick}
                disabled={generating}
                className={`group min-h-[190px] rounded-2xl border p-5 text-left transition-all disabled:opacity-60 ${
                  tool.primary
                    ? 'border-slate-900 bg-slate-950 text-white shadow-xl shadow-slate-300'
                    : 'border-slate-200 bg-white text-slate-950 hover:border-indigo-200 hover:bg-indigo-50'
                }`}
              >
                <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl ${
                  tool.primary ? 'bg-cyan-400 text-slate-950' : 'bg-indigo-50 text-indigo-600'
                }`}>
                  {tool.icon}
                </div>
                <h4 className={`text-lg font-black ${tool.primary ? 'text-white' : 'text-slate-950'}`}>{tool.title}</h4>
                <p className={`mt-2 min-h-[44px] text-sm leading-6 ${tool.primary ? 'text-slate-300' : 'text-slate-500'}`}>{tool.body}</p>
                <div className={`mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black ${
                  tool.primary ? 'bg-white text-slate-950' : 'bg-slate-950 text-white'
                }`}>
                  {tool.action}
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_0.72fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-950">Product pages</h3>
                <p className="text-sm text-slate-500">Create, preview, and manage generated pages.</p>
              </div>
              <button onClick={onChooseProduct} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-500">
                New page
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-[1fr_120px_120px] bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-400">
                <span>Product</span>
                <span>Status</span>
                <span>Action</span>
              </div>
              <div className="grid grid-cols-[1fr_120px_120px] items-center px-4 py-4 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-800">2-in-1 Charging Cable Page</p>
                  <p className="mt-0.5 text-xs text-slate-500">High-converting preview page</p>
                </div>
                <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">Ready</span>
                <a href="/share/agtej00v8" className="text-xs font-black text-indigo-600 hover:text-indigo-500">Open</a>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-black text-slate-950">Custom page prompt</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">Use this only when you want to test without choosing a Shopify product.</p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-1">
              <input
                ref={inputRef}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !generating) onGenerate(); }}
                placeholder="Example: landing page for a charging cable"
                className="w-full rounded-lg px-3 py-3 text-sm text-slate-700 outline-none placeholder-slate-400"
                disabled={generating}
              />
              <button
                onClick={() => onGenerate()}
                disabled={generating}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generating ? (
                  <><Loader2 size={14} className="animate-spin" /> Building...</>
                ) : (
                  <><Wand2 size={14} /> Generate Custom Page</>
                )}
              </button>
            </div>
          </div>
        </section>
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
  const handleLoadSamplePage = (goal = HERO_DEMO_GOAL, title = `${SAMPLE_PRODUCT.name} Sample Page`) => {
    setGenerating(true);
    addBuiltInSamplePage(addBlock, setPageGoal, setPageTitle, goal, title);
    setGenerating(false);
  };

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
        if (def) addBlock(b.type, makeWhiteSampleBlockData(b.type, { ...def.defaultData, ...b.data }));
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
      <DashboardStart
        generating={generating}
        goal={goal}
        setGoal={setGoal}
        inputRef={inputRef}
        onChooseProduct={() => setShowProductPicker(true)}
        onTryDemo={() => { setGoal(HERO_DEMO_GOAL); handleLoadSamplePage(); }}
        onGenerate={handleGenerate}
      />
    </>
  );

  return (
    <>
      {showProductPicker && <ProductPickerModal onClose={() => setShowProductPicker(false)} />}
      <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,#f8fafc_34%,#eef2ff_100%)] p-6 cursor-default">
        <div className="mx-auto w-full max-w-6xl">
          {/* Header */}
          <section className="mb-6 overflow-hidden rounded-3xl border border-white/70 bg-slate-950 text-white shadow-2xl shadow-indigo-200/70">
            <div className="grid lg:grid-cols-[1.02fr_0.98fr]">
              <div className="p-6 sm:p-8 lg:p-10">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-white/8 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-cyan-100">
                  <Sparkles size={13} />
                  AI Shopify landing pages
                </div>
                <h2 className="max-w-2xl text-4xl font-black leading-[1.02] tracking-tight text-white sm:text-5xl">
                  Turn one Shopify product into a page shoppers want to buy from.
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
                  Choose a product, add reviews if you have them, and PageGenie builds a polished sales page with product photos, benefits, proof, FAQ, and buying buttons.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => setShowProductPicker(true)}
                    disabled={generating}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-950/20 transition-all hover:bg-cyan-300 disabled:opacity-60"
                  >
                    <ShoppingBag size={15} />
                    Choose Product from Shopify
                  </button>
                  <button
                    onClick={() => { setGoal(HERO_DEMO_GOAL); handleLoadSamplePage(); }}
                    disabled={generating}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition-all hover:bg-white/15 disabled:opacity-60"
                  >
                    {generating ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
                    Try Demo Product
                  </button>
                </div>
                <div className="mt-7 grid gap-2 sm:grid-cols-3">
                  {[
                    ['1 product', 'AI page source'],
                    ['15 reviews', 'Proof section ready'],
                    ['$19/mo', 'Simple app pricing'],
                  ].map(([title, detail]) => (
                    <div key={title} className="rounded-xl border border-white/10 bg-white/8 p-3">
                      <p className="text-sm font-black text-white">{title}</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-400">{detail}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-white/10 bg-white p-5 text-slate-950 lg:border-l lg:border-t-0 lg:p-7">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/10">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">AI page ready</span>
                  </div>
                  <div className="grid gap-0 md:grid-cols-[1fr_170px]">
                    <div className="p-5">
                      <div className="mb-3 flex items-center gap-2 text-yellow-400">
                        {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={14} fill="currentColor" />)}
                        <span className="text-xs font-black text-slate-500">4.9/5 from 700+ reviews</span>
                      </div>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-indigo-600">Generated from Shopify</p>
                      <h3 className="text-3xl font-black leading-tight tracking-tight text-slate-950">A product page that explains why to buy now.</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-500">Hero, product images, benefits, comparison, reviews, FAQ, and final CTA are written together.</p>
                      <div className="mt-5 flex gap-2">
                        <div className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white">Shop the product</div>
                        <div className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700">See reviews</div>
                      </div>
                    </div>
                    <div className="border-t border-slate-100 bg-slate-50 p-4 md:border-l md:border-t-0">
                      <div className="overflow-hidden rounded-2xl border border-white bg-white p-3 shadow-lg">
                        <img src={SAMPLE_PRODUCT.imageUrl} alt={SAMPLE_PRODUCT.name} className="aspect-square w-full rounded-xl object-cover" />
                        <p className="mt-3 text-xs font-black text-slate-900">{SAMPLE_PRODUCT.name}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-xs font-black text-emerald-600">{SAMPLE_PRODUCT.price}</p>
                          <ShieldCheck size={15} className="text-emerald-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid border-t border-slate-100 sm:grid-cols-3">
                    {[
                      ['Product data', 'title, price, image'],
                      ['Sales copy', 'benefits and CTA'],
                      ['Trust proof', 'reviews and FAQ'],
                    ].map(([title, detail]) => (
                      <div key={title} className="border-b border-slate-100 p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                        <p className="text-sm font-black text-slate-900">{title}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="mb-6 grid gap-3 md:grid-cols-3">
            {[
              ['Choose product', 'Open your Shopify catalog and pick the item you want to sell.'],
              ['Generate page', 'AI builds the sales story, sections, proof, and CTA.'],
              ['Preview and publish', 'Edit anything, test mobile, then publish when ready.'],
            ].map(([title, body], index) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-sm font-black text-indigo-600">{index + 1}</div>
                <p className="text-sm font-black text-slate-950">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{body}</p>
              </div>
            ))}
          </div>

          {/* Build from Product — prominent if Shopify connected */}
          <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_0.85fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
              <p className="text-xs font-black uppercase tracking-wider text-indigo-600">Start here</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">Most users should click one button.</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Pick a Shopify product and PageGenie will build the landing page from the real product title, price, photos, and description.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => setShowProductPicker(true)}
                  disabled={generating}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-500 disabled:opacity-60"
                >
                  <ShoppingBag size={16} />
                  Choose Product
                </button>
                <button
                  onClick={() => { setGoal(HERO_DEMO_GOAL); handleLoadSamplePage(); }}
                  disabled={generating}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition-all hover:border-indigo-200 hover:bg-indigo-50 disabled:opacity-60"
                >
                  {generating ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
                  Try Demo
                </button>
              </div>
              <div className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50">
                {[
                  ['1. Choose product', 'Select the product you want to sell.'],
                  ['2. Add reviews', 'Paste English reviews only if you have them.'],
                  ['3. Generate page', 'AI creates sections you can edit and publish.'],
                ].map(([title, body]) => (
                  <div key={title} className="p-3">
                    <p className="text-sm font-black text-slate-800">{title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Optional</p>
              <h3 className="mt-1 text-lg font-black text-slate-950">Describe a page instead</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Use this only when you are testing an idea without a Shopify product.
              </p>
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-1">
                <input
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !generating) handleGenerate(); }}
                  placeholder="Example: product launch page for a charging cable"
                  className="w-full rounded-lg px-3 py-3 text-sm text-slate-700 outline-none placeholder-slate-400"
                  disabled={generating}
                />
                <button
                  onClick={() => handleGenerate()}
                  disabled={generating}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {generating ? (
                    <><Loader2 size={14} className="animate-spin" /> Building...</>
                  ) : (
                    <><Wand2 size={14} /> Generate Custom Page</>
                  )}
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {QUICK_GOALS.slice(0, 4).map((q) => (
                  <button
                    key={q.label}
                    onClick={() => { setGoal(q.goal); handleGenerate(q.goal); }}
                    disabled={generating}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <details className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <summary className="cursor-pointer text-sm font-black text-slate-700">Advanced: add sections manually</summary>
            <div className="mt-4 flex flex-wrap gap-2">
              {['hero', 'features', 'testimonials', 'cta', 'faq'].map((type) => {
                const def = BLOCK_DEFS.find((b) => b.type === type);
                if (!def) return null;
                return (
                  <button
                    key={def.type}
                    onClick={() => { addBlock(def.type, { ...def.defaultData }); toast.success(`${def.label} added`); }}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 transition-all hover:border-indigo-300 hover:text-indigo-700"
                  >
                    <span className="opacity-70">{def.emoji}</span>
                    <span className="font-medium">{def.label}</span>
                  </button>
                );
              })}
            </div>
          </details>

          <div className="hidden" aria-hidden="true">
          <AiSampleLandingPage
            generating={generating}
            onGenerate={() => { setGoal(HERO_DEMO_GOAL); handleLoadSamplePage(); }}
          />

          <ReviewShowcase />

          <PricingShowcase
            onTryDemo={() => { setGoal(HERO_DEMO_GOAL); handleLoadSamplePage(); }}
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
                    onClick={() => { setGoal(sample.goal); handleLoadSamplePage(sample.goal, `${sample.title} Sample Page`); }}
                    disabled={generating}
                    className="group text-left rounded-xl overflow-hidden border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all disabled:opacity-50"
                  >
                    <div className="h-20 border-b border-slate-100 bg-white p-3">
                      <div className="mb-3 flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-indigo-100" />
                        <span className="h-2.5 w-2.5 rounded-full bg-green-100" />
                        <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                      </div>
                      <div className="w-16 h-2 rounded-full bg-slate-200 mb-2" />
                      <div className="w-24 h-3 rounded-full bg-slate-300" />
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

            <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/70 p-5 overflow-hidden relative">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-3">Before / after</p>
              <div className="grid grid-cols-2 gap-3 relative">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <p className="text-xs font-semibold text-slate-500 mb-3">Product page</p>
                  <div className="h-20 rounded-lg bg-slate-200 mb-3" />
                  <div className="space-y-2">
                    <div className="h-2 rounded bg-slate-300" />
                    <div className="h-2 rounded bg-slate-200 w-4/5" />
                    <div className="h-2 rounded bg-slate-200 w-2/3" />
                  </div>
                </div>
                <div className="rounded-xl bg-white text-slate-900 border border-indigo-200 p-3 shadow-lg">
                  <p className="text-xs font-semibold text-indigo-600 mb-3">PageGenie page</p>
                  <div className="h-6 rounded bg-slate-200 mb-2" />
                  <div className="h-3 rounded bg-indigo-200 mb-3 w-4/5" />
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    <div className="h-8 rounded bg-indigo-50 border border-indigo-100" />
                    <div className="h-8 rounded bg-indigo-50 border border-indigo-100" />
                    <div className="h-8 rounded bg-indigo-50 border border-indigo-100" />
                  </div>
                  <div className="h-8 rounded-lg bg-indigo-600" />
                </div>
              </div>
              <p className="relative text-xs text-slate-500 mt-4">
                Go from a basic product listing to a campaign-ready page with offer, benefits, proof, and CTA.
              </p>
            </div>
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
  const [translating, setTranslating] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [demoGenerating, setDemoGenerating] = useState(false);
  const [whiteSampleApplied, setWhiteSampleApplied] = useState(false);

  useEffect(() => {
    if (whiteSampleApplied || page.blocks.length === 0) return;
    const sampleContext = `${page.title} ${pageGoal}`.toLowerCase();
    const isSamplePage = /demo|sample|shopify|product|launch|sale|collection|lead capture/.test(sampleContext);
    if (!isSamplePage) return;

    let changed = false;
    page.blocks.forEach((block) => {
      const nextData = makeWhiteSampleBlockData(block.type, block.data || {});
      if (JSON.stringify(nextData) !== JSON.stringify(block.data || {})) {
        updateBlock(block.id, nextData);
        changed = true;
      }
    });
    if (changed || isSamplePage) setWhiteSampleApplied(true);
  }, [page.blocks, page.title, pageGoal, updateBlock, whiteSampleApplied]);
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
      newProject();
      addBuiltInSamplePage(addBlock, setPageGoal, setPageTitle, HERO_DEMO_GOAL, 'Demo Sales Page');
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
            {/* Translate */}
            <div className="relative">
              <button
                onClick={() => setShowLangPicker(!showLangPicker)}
                disabled={translating}
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
                      disabled={demoGenerating || translating}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
                    >
                      {demoGenerating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                      {demoGenerating ? 'Creating demo...' : 'Try fresh demo'}
                    </button>
                    <button
                      onClick={() => setShowProductPicker(true)}
                      disabled={demoGenerating || translating}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:border-green-300 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
                    >
                      <ShoppingBag size={14} className="text-green-500" />
                      Choose another product
                    </button>
                  </div>
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
                    disabled={demoGenerating || translating}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
                  >
                    {demoGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {demoGenerating ? 'Building...' : 'View sample page'}
                  </button>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600">{SAMPLE_PRODUCT.brand}</div>
                  <div className="p-3">
                    <div className="mb-3 aspect-[4/3] overflow-hidden rounded-lg bg-slate-100">
                      <img
                        src={SAMPLE_PRODUCT.imageUrl}
                        alt={SAMPLE_PRODUCT.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="mb-2 h-3 w-16 rounded bg-indigo-100" />
                    <div className="mb-1.5 h-4 rounded bg-slate-200" />
                    <div className="mb-3 h-4 w-4/5 rounded bg-slate-200" />
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
