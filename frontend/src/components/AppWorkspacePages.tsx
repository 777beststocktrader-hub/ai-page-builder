import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  Copy,
  CreditCard,
  Eye,
  FileText,
  ImagePlus,
  LayoutTemplate,
  PencilLine,
  SearchCheck,
  Share2,
  ShoppingBag,
  Sparkles,
  Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import BLOCK_DEFS from '../blocks/blockDefs';
import { usePageStore } from '../store/pageStore';
import { BillingStatus } from '../lib/billing';
import { AppSection } from './AppSidebar';

type Template = {
  name: string;
  label: string;
  goal: string;
  description: string;
  sections: string[];
  blocks: Array<{ type: string; overrides?: Record<string, any> }>;
};

const TEMPLATES: Template[] = [
  {
    name: 'Product Launch',
    label: 'New product',
    goal: 'Launch a Shopify product with a white, premium page that explains the offer, benefits, reviews, FAQ, and checkout CTA.',
    description: 'Best for a new item, bestseller, or product you want shoppers to understand fast.',
    sections: ['Hero', 'Benefits', 'Proof', 'FAQ', 'Buy CTA'],
    blocks: [
      { type: 'navbar', overrides: { brand: 'Your Store', links: 'Benefits,Reviews,FAQ', ctaText: 'Shop Now' } },
      { type: 'hero', overrides: { eyebrow: 'New arrival', headline: 'Make this product feel easy to buy', subheadline: 'Show the product, explain why it matters, and give shoppers a clear reason to checkout today.', primaryBtn: 'Shop the Product', secondaryBtn: 'See Benefits' } },
      { type: 'features', overrides: { title: 'Why customers choose it', subtitle: 'Turn the strongest product details into simple buying reasons.', features: [
        { icon: '01', title: 'Clear product value', description: 'Explain the result, material, quality, or use case that makes the item worth buying.' },
        { icon: '02', title: 'Easy decision path', description: 'Keep the offer, reviews, shipping, and return promise close to the checkout action.' },
        { icon: '03', title: 'Built for trust', description: 'Use proof, guarantees, and real product details to lower hesitation.' },
      ] } },
      { type: 'stats', overrides: { title: 'Trust signals shoppers look for', stats: [{ value: '4.9/5', label: 'Average rating' }, { value: '30 days', label: 'Easy returns' }, { value: 'Free', label: 'Shipping offer' }, { value: '24h', label: 'Support response' }] } },
      { type: 'testimonials', overrides: { title: 'Customer proof' } },
      { type: 'faq', overrides: { title: 'Questions before checkout' } },
      { type: 'cta-banner', overrides: { headline: 'Ready to make it yours?', subtext: 'Add a final buying section with the offer, reassurance, and a simple checkout button.', btnText: 'Buy Now', secondBtnText: 'See Details' } },
      { type: 'footer', overrides: { brand: 'Your Store', tagline: 'Premium product pages built with PageGenie.' } },
    ],
  },
  {
    name: 'Flash Sale',
    label: 'Limited offer',
    goal: 'Promote a Shopify flash sale with urgency, savings, trust proof, FAQ, and a strong sale CTA.',
    description: 'Best for a weekend sale, limited inventory push, or quick campaign.',
    sections: ['Sale bar', 'Offer', 'Urgency', 'Reviews', 'CTA'],
    blocks: [
      { type: 'banner', overrides: { text: 'Limited-time offer ends soon', linkText: 'Shop now', bgColor: '#4f46e5' } },
      { type: 'navbar', overrides: { brand: 'Your Store', links: 'Sale,Reviews,FAQ', ctaText: 'Claim Deal' } },
      { type: 'hero', overrides: { eyebrow: 'Flash sale', headline: 'Give shoppers a reason to buy today', subheadline: 'Lead with the discount, make the savings obvious, and answer the questions that stop checkout.', primaryBtn: 'Claim the Deal', secondaryBtn: 'See What Is Included' } },
      { type: 'features', overrides: { title: 'Why this deal is worth it', subtitle: 'Make the sale feel valuable, not random.', features: [
        { icon: '01', title: 'Clear savings', description: 'State exactly what shoppers save and what they get.' },
        { icon: '02', title: 'Limited window', description: 'Create urgency without making the page feel messy.' },
        { icon: '03', title: 'Checkout confidence', description: 'Keep shipping, returns, and support near the call to action.' },
      ] } },
      { type: 'testimonials', overrides: { title: 'Shoppers love it' } },
      { type: 'faq', overrides: { title: 'Sale questions' } },
      { type: 'cta-banner', overrides: { headline: 'Get the offer before it ends', subtext: 'Close with one clear button and the strongest reason to act now.', btnText: 'Shop Sale', secondBtnText: 'View Details' } },
      { type: 'footer', overrides: { brand: 'Your Store', tagline: 'Limited-time offers made clear.' } },
    ],
  },
  {
    name: 'Collection Drop',
    label: 'New collection',
    goal: 'Showcase a Shopify collection with a premium white page, product highlights, trust points, reviews, and collection CTA.',
    description: 'Best for jewelry drops, boutique collections, seasonal edits, and curated product groups.',
    sections: ['Collection', 'Gallery', 'Benefits', 'Proof', 'CTA'],
    blocks: [
      { type: 'navbar', overrides: { brand: 'Your Store', links: 'Collection,Benefits,Reviews', ctaText: 'Browse' } },
      { type: 'hero', overrides: { eyebrow: 'New collection', headline: 'A collection built around your customer', subheadline: 'Introduce the mood, the product range, and why this edit is worth browsing now.', primaryBtn: 'Browse Collection', secondaryBtn: 'View Highlights' } },
      { type: 'gallery', overrides: { title: 'Featured pieces', subtitle: 'Show the range with clean product visuals and a simple shopping path.' } },
      { type: 'features', overrides: { title: 'Designed for everyday use', subtitle: 'Help shoppers compare the collection quickly.' } },
      { type: 'stats', overrides: { title: 'Trusted by shoppers' } },
      { type: 'testimonials', overrides: { title: 'What customers are saying' } },
      { type: 'cta-banner', overrides: { headline: 'Find your favorite', subtext: 'Send shoppers back into the collection with a confident final CTA.', btnText: 'Shop Collection', secondBtnText: 'See Reviews' } },
      { type: 'footer', overrides: { brand: 'Your Store', tagline: 'Collections shoppers can scan and trust.' } },
    ],
  },
  {
    name: 'Bundle Offer',
    label: 'Increase order value',
    goal: 'Sell a Shopify bundle with savings, what is included, reasons to buy, FAQ, reviews, and bundle CTA.',
    description: 'Best for bundles, kits, sets, subscriptions, and value packs.',
    sections: ['Bundle', 'Savings', 'Included', 'FAQ', 'Buy'],
    blocks: [
      { type: 'navbar', overrides: { brand: 'Your Store', links: 'Bundle,Savings,FAQ', ctaText: 'Build Bundle' } },
      { type: 'hero', overrides: { eyebrow: 'Bundle and save', headline: 'Make the bigger order feel like the smarter choice', subheadline: 'Show what is included, explain the savings, and reduce hesitation before checkout.', primaryBtn: 'Shop the Bundle', secondaryBtn: 'See What Is Inside' } },
      { type: 'features', overrides: { title: 'What the bundle includes', subtitle: 'Make every item in the set feel useful and valuable.' } },
      { type: 'comparison', overrides: { title: 'Why bundle instead of buying one item?', col1: 'Single item', col2: 'Bundle offer' } },
      { type: 'testimonials', overrides: { title: 'Why customers choose the set' } },
      { type: 'faq', overrides: { title: 'Bundle questions' } },
      { type: 'cta-banner', overrides: { headline: 'Ready to bundle and save?', subtext: 'Give shoppers one clear path to choose the higher-value offer.', btnText: 'Shop Bundle', secondBtnText: 'Compare Options' } },
      { type: 'footer', overrides: { brand: 'Your Store', tagline: 'Bundle pages built to lift average order value.' } },
    ],
  },
  {
    name: 'Waitlist Page',
    label: 'Before launch',
    goal: 'Capture emails for a Shopify product drop, waitlist, or launch announcement with a clean white landing page.',
    description: 'Best before a product is ready, when you want demand before inventory goes live.',
    sections: ['Early access', 'Benefits', 'Signup', 'FAQ'],
    blocks: [
      { type: 'navbar', overrides: { brand: 'Your Store', links: 'Preview,Benefits,FAQ', ctaText: 'Join Waitlist' } },
      { type: 'hero', overrides: { eyebrow: 'Early access', headline: 'Build demand before the drop goes live', subheadline: 'Collect emails, explain the product promise, and make shoppers feel first in line.', primaryBtn: 'Join Waitlist', secondaryBtn: 'See Preview' } },
      { type: 'features', overrides: { title: 'What subscribers get first', subtitle: 'Explain why joining the list is worth it.' } },
      { type: 'newsletter', overrides: { headline: 'Join the early list', subtext: 'Get first access, launch updates, and the opening offer.', placeholder: 'Enter your email', btnText: 'Notify Me' } },
      { type: 'faq', overrides: { title: 'Launch details' } },
      { type: 'footer', overrides: { brand: 'Your Store', tagline: 'Launch pages that start demand early.' } },
    ],
  },
];

function applyTemplate(template: Template) {
  const store = usePageStore.getState();
  const blocks = createBlocks(template.blocks);

  store.loadPage({ id: crypto.randomUUID(), title: `${template.name} Page`, blocks });
  store.setPageGoal(template.goal);
  toast.success(`${template.name} loaded`);
}

function createBlocks(blocks: Template['blocks']) {
  return blocks.flatMap(({ type, overrides }) => {
    const def = BLOCK_DEFS.find((block) => block.type === type);
    return def ? [{ id: crypto.randomUUID(), type, data: makeWhiteTemplateBlockData(type, { ...def.defaultData, ...overrides }) }] : [];
  });
}

function makeWhiteTemplateBlockData(type: string, data: Record<string, any>) {
  if (type === 'navbar') return { ...data, bgColor: '#ffffff', sticky: 'solid' };
  if (type === 'hero') return { ...data, variant: data.imageUrl ? 'split' : 'minimal', bgFrom: '#ffffff', bgTo: '#ffffff' };
  if (type === 'cta-banner') return { ...data, bgColor: '#ffffff', textColor: '#0f172a', btnColor: '#4f46e5' };
  if (['stats', 'cta', 'footer', 'newsletter', 'content', 'steps', 'testimonial-single'].includes(type)) return { ...data, bgColor: '#ffffff' };
  return data;
}

function escapeSvgText(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  }[char] || char));
}

function makeProductImage(product: string, style: string, palette: string) {
  const [from, to] = palette.split('/');
  const safeProduct = escapeSvgText(product || 'Product');
  const safeStyle = escapeSvgText(style);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="bg" x1="120" y1="80" x2="1080" y2="860" gradientUnits="userSpaceOnUse">
          <stop stop-color="${from}"/>
          <stop offset="1" stop-color="${to}"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="28" stdDeviation="24" flood-color="#0f172a" flood-opacity="0.28"/>
        </filter>
      </defs>
      <rect width="1200" height="900" rx="54" fill="url(#bg)"/>
      <circle cx="214" cy="184" r="120" fill="#fff" opacity="0.12"/>
      <circle cx="994" cy="704" r="170" fill="#fff" opacity="0.12"/>
      <rect x="230" y="185" width="740" height="530" rx="44" fill="#fff" opacity="0.93" filter="url(#shadow)"/>
      <rect x="310" y="265" width="580" height="360" rx="36" fill="#f8fafc"/>
      <circle cx="600" cy="445" r="132" fill="${from}" opacity="0.14"/>
      <path d="M510 490c52 42 128 42 180 0" fill="none" stroke="${to}" stroke-width="18" stroke-linecap="round"/>
      <circle cx="532" cy="410" r="38" fill="${from}"/>
      <circle cx="600" cy="390" r="50" fill="${to}"/>
      <circle cx="668" cy="410" r="38" fill="${from}"/>
      <text x="600" y="694" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="46" font-weight="900" fill="#0f172a">${safeProduct}</text>
      <text x="600" y="746" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700" fill="#64748b">${safeStyle}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex-1 overflow-y-auto bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-black text-slate-950">{title}</h1>
        <div className="mt-5">{children}</div>
      </div>
    </main>
  );
}

function TemplatesPage({ onOpenBuilder }: { onOpenBuilder: () => void }) {
  return (
    <PageShell title="Page Templates">
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-indigo-600">Shopify page starters</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Choose the kind of page you want to build</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Each template loads a complete white landing page into the builder with sections made for selling products.
            </p>
          </div>
          <div className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700">
            {TEMPLATES.length} templates
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {TEMPLATES.map((template) => (
          <button
            key={template.name}
            onClick={() => {
              applyTemplate(template);
              onOpenBuilder();
            }}
            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-xl"
          >
            <div className="border-b border-slate-100 bg-white p-4">
              <div className="mb-4 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-100" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-100" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              </div>
              <div className="mb-2 h-4 w-28 rounded bg-slate-200" />
              <div className="mb-2 h-6 w-4/5 rounded bg-slate-300" />
              <div className="h-2 w-2/3 rounded bg-slate-100" />
              <div className="mt-4 grid grid-cols-3 gap-2">
                {template.sections.slice(0, 3).map((section) => (
                  <div key={`${template.name}-${section}-preview`} className="h-8 rounded-lg border border-slate-100 bg-slate-50" />
                ))}
              </div>
            </div>
            <div className="p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <LayoutTemplate size={21} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">{template.label}</p>
                    <p className="mt-0.5 text-lg font-black text-slate-950">{template.name}</p>
                  </div>
                </div>
                <ArrowRight size={18} className="mt-2 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-500" />
              </div>
              <p className="text-sm leading-6 text-slate-500">{template.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {template.sections.map((section) => (
                  <span key={`${template.name}-${section}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                    {section}
                  </span>
                ))}
              </div>
              <div className="mt-5 rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-black text-white transition-all group-hover:bg-indigo-500">
                Use this template
              </div>
            </div>
          </button>
        ))}
      </div>
    </PageShell>
  );
}

function ProductImagesPage({ onOpenBuilder }: { onOpenBuilder: () => void }) {
  const [product, setProduct] = useState('Pearl necklace');
  const [style, setStyle] = useState('luxury ecommerce');
  const [palette, setPalette] = useState('#4f46e5/#10b981');
  const prompt = useMemo(() => (
    `Create a ${style} product image for ${product}. Use a clean studio scene, soft directional lighting, premium materials, realistic shadows, crisp product detail, and room for a Shopify landing page headline.`
  ), [product, style]);
  const imageUrl = useMemo(() => makeProductImage(product, style, palette), [product, style, palette]);

  const applyToHero = () => {
    const store = usePageStore.getState();
    const hero = store.page.blocks.find((block) => block.type === 'hero');
    const heroDef = BLOCK_DEFS.find((block) => block.type === 'hero');
    const data = {
      ...(hero?.data || heroDef?.defaultData || {}),
      variant: 'split',
      eyebrow: 'Product spotlight',
      headline: product,
      subheadline: `A polished ${style} visual direction ready for your Shopify landing page.`,
      primaryBtn: 'Shop Now',
      imageUrl,
      bgFrom: '#ffffff',
      bgTo: '#ffffff',
    };

    if (hero) store.updateBlock(hero.id, data);
    else store.addBlock('hero', data);

    store.setPageGoal(`Create a Shopify product page for ${product} using a ${style} visual style.`);
    toast.success('Product image applied to the hero');
    onOpenBuilder();
  };

  return (
    <PageShell title="AI Product Images">
      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="text-xs font-black uppercase tracking-wide text-slate-400">Product</label>
          <input value={product} onChange={(e) => setProduct(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
          <label className="mt-4 block text-xs font-black uppercase tracking-wide text-slate-400">Image style</label>
          <select value={style} onChange={(e) => setStyle(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400">
            <option>luxury ecommerce</option>
            <option>clean studio</option>
            <option>social ad</option>
            <option>hero banner</option>
          </select>
          <label className="mt-4 block text-xs font-black uppercase tracking-wide text-slate-400">Color direction</label>
          <select value={palette} onChange={(e) => setPalette(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400">
            <option value="#4f46e5/#10b981">Indigo / emerald</option>
            <option value="#0f172a/#38bdf8">Midnight / sky</option>
            <option value="#7c3aed/#ec4899">Violet / pink</option>
            <option value="#134e4a/#f59e0b">Teal / amber</option>
          </select>
          <button onClick={applyToHero} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white hover:bg-indigo-500">
            <ImagePlus size={16} />
            Use on product page
          </button>
          <button onClick={() => navigator.clipboard.writeText(prompt).then(() => toast.success('Image prompt copied'))} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:border-indigo-200 hover:bg-indigo-50">
            <Copy size={16} />
            Copy image prompt
          </button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <img src={imageUrl} alt={`${product} concept`} className="mb-5 aspect-[4/3] w-full rounded-2xl object-cover shadow-lg" />
          <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900">
            <Sparkles size={16} className="text-indigo-600" />
            Product image brief
          </div>
          <p className="rounded-xl bg-slate-950 p-4 text-sm leading-7 text-slate-100">{prompt}</p>
        </div>
      </div>
    </PageShell>
  );
}

function ProductResearchPage({ onOpenBuilder }: { onOpenBuilder: () => void }) {
  const [product, setProduct] = useState('Pearl necklace');
  const [audience, setAudience] = useState('gift shoppers and boutique jewelry buyers');
  const [offer, setOffer] = useState('free shipping and an easy 30-day return promise');
  const angles = [
    ['Buyer', audience],
    ['Hook', 'Make the product feel like an easy upgrade, not a risky purchase'],
    ['Proof', 'Materials, close-up imagery, shipping clarity, return policy, and reviews'],
    ['Offer', offer],
  ];
  const brief = `Product: ${product}
Audience: ${audience}
Main hook: Make the product feel like an easy upgrade, not a risky purchase.
Proof needed: Materials, close-up imagery, shipping clarity, return policy, and reviews.
Offer: ${offer}`;

  const buildFromResearch = () => {
    const blocks = createBlocks([
      { type: 'navbar', overrides: { brand: 'Your Store', links: 'Benefits,Reviews,FAQ', ctaText: 'Shop Now' } },
      { type: 'hero', overrides: { eyebrow: 'Product spotlight', headline: product, subheadline: `Made for ${audience}. ${offer}.`, primaryBtn: 'Shop Now', secondaryBtn: 'See Details' } },
      { type: 'features', overrides: { title: `Why ${product} stands out` } },
      { type: 'testimonials', overrides: { title: 'What shoppers notice first' } },
      { type: 'faq', overrides: { title: 'Everything to know before buying' } },
      { type: 'cta-banner', overrides: { headline: `Ready to try ${product}?`, primaryBtn: 'Buy Now' } },
    ]);
    const store = usePageStore.getState();
    store.loadPage({ id: crypto.randomUUID(), title: `${product} Research Page`, blocks });
    store.setPageGoal(brief);
    toast.success('Research page built');
    onOpenBuilder();
  };

  return (
    <PageShell title="Product Research">
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-3">
        <div>
        <label className="text-xs font-black uppercase tracking-wide text-slate-400">Product</label>
        <input value={product} onChange={(e) => setProduct(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
        </div>
        <div>
          <label className="text-xs font-black uppercase tracking-wide text-slate-400">Audience</label>
          <input value={audience} onChange={(e) => setAudience(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
        </div>
        <div>
          <label className="text-xs font-black uppercase tracking-wide text-slate-400">Offer</label>
          <input value={offer} onChange={(e) => setOffer(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
        </div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {angles.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <SearchCheck size={16} className="text-indigo-600" />
              <p className="font-black text-slate-950">{label}</p>
            </div>
            <p className="text-sm leading-6 text-slate-500">{product}: {value}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-950">
          <FileText size={16} className="text-indigo-600" />
          Landing page brief
        </div>
        <pre className="whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-sm leading-7 text-slate-100">{brief}</pre>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button onClick={buildFromResearch} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-500">
            <ArrowRight size={16} />
            Build page from research
          </button>
          <button onClick={() => navigator.clipboard.writeText(brief).then(() => toast.success('Research brief copied'))} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:border-indigo-200 hover:bg-indigo-50">
            <Copy size={16} />
            Copy brief
          </button>
        </div>
      </div>
    </PageShell>
  );
}

function HelpPage({
  onOpenBuilder,
  onOpenBilling,
}: {
  onOpenBuilder: () => void;
  onOpenBilling: () => void;
}) {
  const workflow = [
    {
      icon: <ShoppingBag size={18} />,
      title: 'Choose a Shopify product',
      detail: 'Open Choose Product, connect your store if needed, then pick the product you want PageGenie to turn into a landing page.',
    },
    {
      icon: <Star size={18} />,
      title: 'Add English reviews',
      detail: 'Paste real English reviews if you have them. Add a real customer photo URL on the same line when the review has a photo.',
    },
    {
      icon: <Sparkles size={18} />,
      title: 'Build the page with AI',
      detail: 'Click Build Best Landing Page. PageGenie creates a product page with hero, product photos, benefits, reviews, FAQ, and checkout sections.',
    },
    {
      icon: <PencilLine size={18} />,
      title: 'Edit the page',
      detail: 'Click any section in the canvas. Use the right panel to change text, images, colors, buttons, spacing, and product details.',
    },
    {
      icon: <Eye size={18} />,
      title: 'Preview before publishing',
      detail: 'Use Preview and Share to check the live page. Make sure the buy button, reviews, product images, and mobile layout look right.',
    },
    {
      icon: <Share2 size={18} />,
      title: 'Publish to Shopify',
      detail: 'Publish when the page is ready. If Shopify says unauthorized, reconnect the store and try publishing again.',
    },
  ];

  const sections = [
    ['Choose Product', 'Start here. Pick a Shopify product and let AI build the full landing page.'],
    ['Page Templates', 'Use a ready layout when you want a quick product launch, sale page, bundle, collection, or waitlist.'],
    ['AI Product Images', 'Create product image prompts and apply a polished visual direction to the hero section.'],
    ['Product Research', 'Write buyer angles, offers, objections, and a landing page brief before building.'],
    ['Billing', 'Manage the plan, trial status, and upgrade screen for PageGenie.'],
  ];

  const reviewRules = [
    'Use English reviews only.',
    'Use real customer review photos only.',
    'Do not use the main product image as a customer photo.',
    'PageGenie fills the page to 15 reviews when fewer reviews are provided.',
  ];

  const publishChecklist = [
    'The product title, price, and photos are correct.',
    'The page has a clear buy button near the top and bottom.',
    'The reviews look trustworthy and use yellow stars.',
    'The page works on mobile preview.',
    'Shopify is connected before publishing.',
  ];

  return (
    <PageShell title="Help">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <BookOpen size={22} />
            </div>
            <p className="text-xs font-black uppercase tracking-wider text-indigo-600">How to use PageGenie</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Build a product page from one Shopify product</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Choose a product, add optional reviews, generate the page, edit the sections, preview it, then publish when it is ready.
            </p>
          </div>
          <button onClick={onOpenBuilder} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-500">
            <ShoppingBag size={16} />
            Start with product
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {workflow.map((step, index) => (
          <div key={step.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                {step.icon}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Step {index + 1}</p>
                <p className="font-black text-slate-950">{step.title}</p>
              </div>
            </div>
            <p className="text-sm leading-6 text-slate-500">{step.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <LayoutTemplate size={17} className="text-indigo-600" />
            <h3 className="font-black text-slate-950">What each section does</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {sections.map(([label, description]) => (
              <div key={label} className="grid gap-1 py-3 sm:grid-cols-[150px_1fr]">
                <p className="text-sm font-black text-slate-800">{label}</p>
                <p className="text-sm leading-6 text-slate-500">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Star size={17} className="text-yellow-400" />
              <h3 className="font-black text-slate-950">Review rules</h3>
            </div>
            <ul className="space-y-3">
              {reviewRules.map((rule) => (
                <li key={rule} className="flex gap-3 text-sm leading-6 text-slate-500">
                  <CheckCircle size={16} className="mt-1 flex-shrink-0 text-emerald-500" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle size={17} className="text-indigo-600" />
              <h3 className="font-black text-slate-950">Before you publish</h3>
            </div>
            <ul className="space-y-3">
              {publishChecklist.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-slate-500">
                  <CheckCircle size={16} className="mt-1 flex-shrink-0 text-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button onClick={onOpenBilling} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:border-indigo-200 hover:bg-indigo-50">
              <CreditCard size={16} />
              Check billing
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function BillingPage({ billing, onOpenBilling }: { billing: BillingStatus | null; onOpenBilling: () => void }) {
  return (
    <PageShell title="Billing">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <CreditCard size={22} />
            </div>
            <p className="text-xl font-black text-slate-950">{billing?.planName || 'PageGenie Pro'}</p>
            <p className="mt-1 text-sm text-slate-500">
              {billing ? `${billing.status} plan - $${billing.price}/month` : 'Loading billing status'}
            </p>
          </div>
          <button onClick={onOpenBilling} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-500">
            <CheckCircle size={16} />
            Manage billing
          </button>
        </div>
      </div>
    </PageShell>
  );
}

export default function AppWorkspacePages({
  section,
  billing,
  onOpenBuilder,
  onOpenBilling,
}: {
  section: Exclude<AppSection, 'create'>;
  billing: BillingStatus | null;
  onOpenBuilder: () => void;
  onOpenBilling: () => void;
}) {
  if (section === 'templates') return <TemplatesPage onOpenBuilder={onOpenBuilder} />;
  if (section === 'images') return <ProductImagesPage onOpenBuilder={onOpenBuilder} />;
  if (section === 'research') return <ProductResearchPage onOpenBuilder={onOpenBuilder} />;
  if (section === 'help') return <HelpPage onOpenBuilder={onOpenBuilder} onOpenBilling={onOpenBilling} />;
  return <BillingPage billing={billing} onOpenBilling={onOpenBilling} />;
}
