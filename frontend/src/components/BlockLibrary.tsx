import React, { useState } from 'react';
import { Plus, Sparkles, Loader2, Search, LayoutTemplate, List, EyeOff, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import BLOCK_DEFS from '../blocks/blockDefs';
import { usePageStore } from '../store/pageStore';
import { generateFullPage, generateBlockContent } from '../lib/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['Navigation', 'Hero', 'Content', 'Media', 'Social Proof', 'Conversion', 'Layout', 'Social', 'CTA', 'Footer'];

const PAGE_TEMPLATES = [
  {
    name: 'SaaS Startup',
    emoji: '🚀',
    blocks: [
      { type: 'navbar', overrides: { brand: 'StartupCo', links: 'Features,Pricing,Blog,Docs', ctaText: 'Start Free Trial' } },
      { type: 'hero', overrides: { eyebrow: 'Now in Public Beta', headline: 'The Smarter Way to Manage Your Team', subheadline: 'Boost productivity by 40%. Used by 10,000+ teams worldwide. No credit card required.', primaryBtn: 'Start Free — No CC', secondaryBtn: 'See Live Demo', variant: 'centered' } },
      { type: 'logo-cloud', overrides: { title: 'Trusted by industry leaders' } },
      { type: 'features', overrides: { title: 'Built for Modern Teams', subtitle: 'Everything you need to ship faster, collaborate better, and scale effortlessly.' } },
      { type: 'steps', overrides: { title: 'Up and Running in 3 Steps' } },
      { type: 'testimonials', overrides: { title: 'Teams Love StartupCo' } },
      { type: 'pricing', overrides: {} },
      { type: 'faq', overrides: {} },
      { type: 'cta', overrides: { headline: 'Ready to 10x Your Team\'s Output?', primaryBtn: 'Get Started Free', secondaryBtn: 'Talk to sales' } },
      { type: 'footer', overrides: { brand: 'StartupCo' } },
    ],
  },
  {
    name: 'Agency',
    emoji: '🎨',
    blocks: [
      { type: 'navbar', overrides: { brand: 'CreativeStudio', links: 'Work,Services,About,Contact', ctaText: 'Start a Project' } },
      { type: 'hero', overrides: { variant: 'minimal', eyebrow: 'Award-Winning Creative Agency', headline: 'We Build Brands That Move People', subheadline: 'From identity to digital experience, we craft work that drives real business results.' } },
      { type: 'stats', overrides: { title: 'Results That Speak for Themselves', stats: [{ value: '150+', label: 'Projects Delivered' }, { value: '$2M+', label: 'Client Revenue' }, { value: '98%', label: 'Satisfaction Rate' }, { value: '12yr', label: 'Experience' }] } },
      { type: 'features', overrides: { title: 'Full-Service Creative', variant: 'alternating' } },
      { type: 'testimonials', overrides: {} },
      { type: 'cta', overrides: { headline: 'Let\'s Build Something Extraordinary', primaryBtn: 'Start Your Project', secondaryBtn: 'View Our Work' } },
      { type: 'footer', overrides: { brand: 'CreativeStudio' } },
    ],
  },
  {
    name: 'Product',
    emoji: '📦',
    blocks: [
      { type: 'navbar', overrides: { brand: 'ProductName', links: 'Features,Reviews,FAQ,Pricing', ctaText: 'Buy Now' } },
      { type: 'hero', overrides: { variant: 'split', eyebrow: 'New Arrival', headline: 'The Only Tool You\'ll Ever Need', subheadline: 'Designed for people who demand the best. Premium quality, unbeatable value.' } },
      { type: 'features', overrides: { title: 'Why People Love It' } },
      { type: 'testimonials', overrides: { title: 'Thousands of Happy Customers' } },
      { type: 'stats', overrides: { title: 'The Numbers Say It All' } },
      { type: 'faq', overrides: {} },
      { type: 'newsletter', overrides: { headline: 'Get 10% Off Your First Order', subtext: 'Subscribe and get exclusive discounts and early access to new products.', btnText: 'Claim Discount' } },
      { type: 'footer', overrides: { brand: 'ProductName' } },
    ],
  },
  {
    name: 'Restaurant',
    emoji: '🍽️',
    blocks: [
      { type: 'navbar', overrides: { brand: 'La Maison', links: 'Menu,About,Reservations,Gallery', ctaText: 'Reserve a Table' } },
      { type: 'hero', overrides: { variant: 'centered', eyebrow: 'Fine Dining Experience', headline: 'Where Every Meal Becomes a Memory', subheadline: 'Handcrafted dishes made from locally-sourced ingredients. Open Tuesday–Sunday, 5PM–11PM.', primaryBtn: 'Reserve a Table', secondaryBtn: 'View Menu' } },
      { type: 'features', overrides: { variant: 'grid', title: 'A Dining Experience Unlike Any Other', features: [{ icon: '🥩', title: 'Farm-to-Table', description: 'Fresh ingredients sourced from local farms every morning.' }, { icon: '🍷', title: 'Award-Winning Wine', description: '200+ curated labels from the world\'s finest vineyards.' }, { icon: '👨‍🍳', title: 'Michelin Star Chef', description: '20 years of culinary mastery in every bite.' }, { icon: '🕯️', title: 'Intimate Atmosphere', description: 'Private dining rooms for special occasions.' }, { icon: '🎵', title: 'Live Jazz Fridays', description: 'Enjoy live music every Friday and Saturday evening.' }, { icon: '🚗', title: 'Valet Parking', description: 'Complimentary valet service for all guests.' }] } },
      { type: 'testimonials', overrides: { title: 'What Our Guests Are Saying' } },
      { type: 'stats', overrides: { title: 'Our Story in Numbers', stats: [{ value: '15yr', label: 'Years of Excellence' }, { value: '50K+', label: 'Happy Guests' }, { value: '4.9★', label: 'Average Rating' }, { value: '3', label: 'Michelin Stars' }] } },
      { type: 'cta', overrides: { headline: 'Make Your Reservation Today', subtext: 'Tables fill up fast on weekends. Book early to secure your spot.', primaryBtn: 'Reserve Now', secondaryBtn: 'View Full Menu' } },
      { type: 'footer', overrides: { brand: 'La Maison', tagline: 'Fine dining since 2009' } },
    ],
  },
  {
    name: 'Portfolio',
    emoji: '🎭',
    blocks: [
      { type: 'navbar', overrides: { brand: 'Alex Kim', links: 'Work,About,Services,Contact', ctaText: 'Hire Me' } },
      { type: 'hero', overrides: { variant: 'split', eyebrow: 'Available for Freelance', headline: 'I Design Products People Love to Use', subheadline: '5+ years crafting digital experiences for startups and Fortune 500 companies. Currently open to new projects.', primaryBtn: 'View My Work', secondaryBtn: 'Download Resume' } },
      { type: 'stats', overrides: { title: 'What I\'ve Accomplished', stats: [{ value: '60+', label: 'Projects Completed' }, { value: '$5M+', label: 'Revenue Generated' }, { value: '35+', label: 'Happy Clients' }, { value: '5yr', label: 'Experience' }] } },
      { type: 'features', overrides: { title: 'What I Do Best', variant: 'alternating', features: [{ icon: '🎨', title: 'UI/UX Design', description: 'Clean, intuitive interfaces that convert visitors into customers.' }, { icon: '💻', title: 'Frontend Development', description: 'Pixel-perfect implementation in React, Vue, and Svelte.' }, { icon: '📊', title: 'Product Strategy', description: 'Data-driven decisions that move the needle on growth.' }] } },
      { type: 'testimonials', overrides: { title: 'Kind Words from Clients' } },
      { type: 'cta', overrides: { headline: 'Ready to Build Something Amazing?', subtext: 'Let\'s talk about your project. I respond within 24 hours.', primaryBtn: 'Start a Conversation', secondaryBtn: 'View Pricing' } },
      { type: 'footer', overrides: { brand: 'Alex Kim', tagline: 'Designer & Developer' } },
    ],
  },
  {
    name: 'Mobile App',
    emoji: '📱',
    blocks: [
      { type: 'navbar', overrides: { brand: 'AppName', links: 'Features,Reviews,Pricing,Blog', ctaText: 'Download Free' } },
      { type: 'hero', overrides: { variant: 'centered', eyebrow: '⭐ App of the Year 2024', headline: 'The App That Changes How You Work', subheadline: 'Join 500,000+ users who save 3 hours every day with AI-powered productivity. Free forever.', primaryBtn: '⬇️ Download for iOS', secondaryBtn: 'Get Android App' } },
      { type: 'logo-cloud', overrides: { title: 'Featured In' } },
      { type: 'features', overrides: { title: 'Everything You Need, Nothing You Don\'t' } },
      { type: 'steps', overrides: { title: 'Get Started in Seconds' } },
      { type: 'testimonials', overrides: { title: 'Loved by Half a Million People' } },
      { type: 'pricing', overrides: { title: 'Simple, Transparent Pricing' } },
      { type: 'faq', overrides: {} },
      { type: 'cta', overrides: { headline: 'Download Free — No Credit Card', subtext: 'Available on iOS and Android. Cancel anytime.', primaryBtn: 'Download for iOS', secondaryBtn: 'Get on Android' } },
      { type: 'footer', overrides: { brand: 'AppName' } },
    ],
  },
  {
    name: 'E-Commerce',
    emoji: '🛒',
    blocks: [
      { type: 'banner', overrides: { text: '🎁 Free shipping on orders over $50 — Limited time offer!', linkText: 'Shop Now →', bgColor: '#059669' } },
      { type: 'navbar', overrides: { brand: 'ShopName', links: 'Shop,Collections,About,Reviews', ctaText: 'View Cart' } },
      { type: 'hero', overrides: { variant: 'split', eyebrow: '🔥 Best Seller', headline: 'Premium Quality, Prices You\'ll Love', subheadline: 'Discover handpicked products crafted for the modern lifestyle. Fast shipping, easy returns, guaranteed quality.', primaryBtn: 'Shop Best Sellers', secondaryBtn: 'View All Collections' } },
      { type: 'logo-cloud', overrides: { title: 'As seen in' } },
      { type: 'features', overrides: { title: 'Why Thousands Choose Us', features: [{ icon: '🚚', title: 'Free Fast Shipping', description: 'Free 2-day shipping on all orders over $50. Same-day dispatch before 2PM.' }, { icon: '↩️', title: '30-Day Returns', description: 'Not happy? Return it hassle-free within 30 days, no questions asked.' }, { icon: '✅', title: 'Quality Guarantee', description: 'Every product is inspected before shipping. If it\'s not perfect, we make it right.' }, { icon: '🔒', title: 'Secure Checkout', description: 'SSL encrypted, PCI compliant. Shop with confidence knowing you\'re protected.' }, { icon: '💬', title: '24/7 Support', description: 'Our team is available around the clock to help with any questions.' }, { icon: '🎁', title: 'Loyalty Rewards', description: 'Earn points on every purchase and unlock exclusive discounts.' }] } },
      { type: 'stats', overrides: { title: 'Trusted by Customers Worldwide', stats: [{ value: '150K+', label: 'Happy Customers' }, { value: '4.9★', label: 'Average Rating' }, { value: '98%', label: 'Would Recommend' }, { value: '24h', label: 'Support Response' }] } },
      { type: 'testimonials', overrides: { title: 'Real Reviews From Real Customers' } },
      { type: 'faq', overrides: { items: [{ question: 'How long does shipping take?', answer: 'Standard orders arrive in 3-5 business days. With Express, get it in 1-2 days.' }, { question: 'What is your return policy?', answer: 'We offer free returns within 30 days. Just contact support and we\'ll handle everything.' }, { question: 'Is my payment information secure?', answer: 'Yes — we use industry-standard SSL encryption and never store your card details.' }, { question: 'Do you ship internationally?', answer: 'We ship to 50+ countries. International orders typically arrive in 7-14 business days.' }] } },
      { type: 'newsletter', overrides: { headline: 'Get 15% Off Your First Order', subtext: 'Join our VIP list for exclusive deals, new arrivals, and early access to sales.', btnText: 'Claim My 15% Off' } },
      { type: 'footer', overrides: { brand: 'ShopName', tagline: 'Premium products, exceptional service.' } },
    ],
  },
  {
    name: 'Blog / Newsletter',
    emoji: '✍️',
    blocks: [
      { type: 'navbar', overrides: { brand: 'The Digest', links: 'Articles,Topics,About,Archive', ctaText: 'Subscribe Free' } },
      { type: 'hero', overrides: { variant: 'minimal', eyebrow: 'Weekly Newsletter', headline: 'Ideas Worth Reading, Every Sunday', subheadline: 'Join 25,000+ subscribers who get curated insights on technology, business, and design. 5 minutes. Always free.', primaryBtn: 'Subscribe — It\'s Free', secondaryBtn: 'Read Past Issues' } },
      { type: 'stats', overrides: { title: '', stats: [{ value: '25K+', label: 'Subscribers' }, { value: '200+', label: 'Issues Published' }, { value: '72%', label: 'Open Rate' }, { value: '4.9/5', label: 'Reader Rating' }] } },
      { type: 'features', overrides: { title: 'What You Get Every Sunday', features: [{ icon: '📰', title: 'Top Stories', description: 'The 5 most important stories of the week, curated and summarized for busy people.' }, { icon: '🔍', title: 'Deep Dives', description: 'One long-form analysis per week on the trend that matters most.' }, { icon: '🛠️', title: 'Tools & Resources', description: 'The best tools, templates, and frameworks discovered this week.' }, { icon: '💡', title: 'One Big Idea', description: 'A single counterintuitive idea to make you think differently.' }, { icon: '📊', title: 'Data Snapshot', description: 'Charts and stats that tell the story of what\'s happening in the world.' }, { icon: '🎙️', title: 'Creator Spotlight', description: 'An interview with a creator, founder, or expert building something interesting.' }] } },
      { type: 'testimonials', overrides: { title: 'What Readers Are Saying' } },
      { type: 'comparison', overrides: { title: 'Why Read The Digest?', col1: 'Doom-scrolling News', col2: 'The Digest', rows: [{ feature: 'Time to feel informed', col1: '45 min of anxiety', col2: '5 focused minutes' }, { feature: 'Signal vs noise', col1: 'Mostly noise', col2: 'Only signal' }, { feature: 'Actionable insights', col1: 'Rarely', col2: 'Every issue' }, { feature: 'Cost', col1: 'Free (+ your sanity)', col2: 'Free forever' }] } },
      { type: 'newsletter', overrides: { headline: 'Join 25,000+ Readers This Sunday', subtext: 'Free forever. No spam. Unsubscribe with one click anytime.', btnText: 'Subscribe Now' } },
      { type: 'footer', overrides: { brand: 'The Digest', tagline: 'Ideas worth reading, every Sunday.' } },
    ],
  },
];

export default function BlockLibrary() {
  const { addBlock, page, pageGoal, setPageGoal, setPageTitle, loadPage, selectBlock, selectedBlockId, moveBlock, deleteBlock, toggleBlockVisibility, updateBlock } = usePageStore();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [polishProgress, setPolishProgress] = useState(0);
  const [tab, setTab] = useState<'blocks' | 'templates' | 'outline'>('blocks');

  const handleLoadTemplate = (template: typeof PAGE_TEMPLATES[0]) => {
    if (page.blocks.length > 0 && !confirm(`Replace current page with "${template.name}" template?`)) return;
    loadPage({ id: page.id, title: template.name + ' Page', blocks: [] });
    template.blocks.forEach(({ type, overrides }) => {
      const def = BLOCK_DEFS.find((b) => b.type === type);
      if (def) addBlock(type, { ...def.defaultData, ...overrides });
    });
    setPageTitle(template.name + ' Page');
    toast.success(`"${template.name}" template loaded!`);
  };

  const filtered = BLOCK_DEFS.filter((b) => {
    const matchesCategory = !activeCategory || b.category === activeCategory;
    const matchesSearch = !search || b.label.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAdd = async (type: string) => {
    const def = BLOCK_DEFS.find((b) => b.type === type);
    if (!def) return;
    addBlock(type, { ...def.defaultData });

    // Smart autofill: if page goal is set, generate content for this block
    if (pageGoal.trim() && !['navbar', 'banner', 'footer', 'divider', 'custom-html', 'embed', 'cookie-consent'].includes(type)) {
      const blockId = usePageStore.getState().selectedBlockId;
      if (!blockId) { toast.success(`${def.label} added`); return; }
      const toastId = toast.loading(`Filling ${def.label} with AI…`);
      try {
        const newData = await generateBlockContent(
          type,
          'Generate compelling content that matches the page goal. Make it specific and conversion-optimized.',
          def.defaultData,
          'marketing',
          pageGoal
        );
        updateBlock(blockId, { ...def.defaultData, ...newData });
        toast.success(`${def.label} added with AI content! ✨`, { id: toastId });
      } catch {
        toast.success(`${def.label} added`, { id: toastId });
      }
    } else {
      toast.success(`${def.label} added`);
    }
  };

  const handlePolishPage = async () => {
    const writableBlocks = page.blocks.filter((b) => !['navbar', 'banner', 'footer'].includes(b.type));
    if (writableBlocks.length === 0) { toast.error('Add some content sections first'); return; }
    setPolishing(true);
    setPolishProgress(0);
    const toastId = toast.loading('Polishing page with AI…');
    try {
      for (let i = 0; i < writableBlocks.length; i++) {
        const block = writableBlocks[i];
        setPolishProgress(Math.round(((i + 1) / writableBlocks.length) * 100));
        const def = BLOCK_DEFS.find((d) => d.type === block.type);
        if (!def) continue;
        try {
          const newData = await generateBlockContent(
            block.type,
            'Make this more compelling, benefit-focused, and conversion-optimized. Keep the same structure and layout. Improve the headlines and copy only.',
            block.data,
            'marketing',
            pageGoal || undefined
          );
          updateBlock(block.id, { ...block.data, ...newData });
        } catch {}
      }
      toast.success(`Polished ${writableBlocks.length} sections!`, { id: toastId, duration: 4000 });
    } catch (err: any) {
      toast.error('Polish failed — please try again', { id: toastId });
    } finally {
      setPolishing(false);
      setPolishProgress(0);
    }
  };

  const handleGeneratePage = async () => {
    if (!pageGoal.trim()) return;
    setGenerating(true);
    const toastId = toast.loading('Writing your page with AI…');
    try {
      const { tagline, blocks } = await generateFullPage(pageGoal);
      if (!blocks?.length) throw new Error('No blocks returned — please try again');
      const newPage = { id: page.id, title: tagline || pageGoal, blocks: [] };
      loadPage(newPage);
      let added = 0;
      blocks.forEach(({ type, data }: { type: string; data: any }) => {
        const def = BLOCK_DEFS.find((b) => b.type === type);
        if (def) { addBlock(type, { ...def.defaultData, ...data }); added++; }
      });
      if (tagline) setPageTitle(tagline);
      toast.success(`Done — ${added} sections generated!`, { id: toastId, duration: 4000 });
    } catch (err: any) {
      toast.error(err.message || 'Generation failed — please try again', { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-700 flex-shrink-0">
        <button
          onClick={() => setTab('blocks')}
          className={`flex-1 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${tab === 'blocks' ? 'text-white border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Plus size={11} /> Blocks
        </button>
        <button
          onClick={() => setTab('templates')}
          className={`flex-1 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${tab === 'templates' ? 'text-white border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <LayoutTemplate size={11} /> Templates
        </button>
        <button
          onClick={() => setTab('outline')}
          className={`flex-1 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${tab === 'outline' ? 'text-white border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <List size={11} /> Outline
        </button>
      </div>

      {/* Templates Panel */}
      {tab === 'templates' && (
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
          <p className="text-xs text-slate-500 text-center">Pre-built pages — click to load instantly</p>
          {PAGE_TEMPLATES.map((tpl) => (
            <button
              key={tpl.name}
              onClick={() => handleLoadTemplate(tpl)}
              className="w-full text-left p-3 rounded-xl border border-slate-700 hover:border-indigo-500 hover:bg-indigo-950/30 transition-all group"
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-xl">{tpl.emoji}</span>
                <span className="text-sm font-semibold text-slate-200 group-hover:text-white">{tpl.name}</span>
              </div>
              <p className="text-xs text-slate-500">{tpl.blocks.length} sections</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {tpl.blocks.slice(0, 6).map((b, i) => {
                  const d = BLOCK_DEFS.find((x) => x.type === b.type);
                  return d ? <span key={i} className="text-base" title={d.label}>{d.emoji}</span> : null;
                })}
                {tpl.blocks.length > 6 && <span className="text-xs text-slate-600 self-center">+{tpl.blocks.length - 6}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {tab === 'blocks' && <>
      {/* AI Page Generator */}
      <div className="p-3 border-b border-slate-700">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles size={11} className="text-indigo-400" />
          AI Page Generator
        </p>
        <textarea
          value={pageGoal}
          onChange={(e) => setPageGoal(e.target.value)}
          placeholder='e.g. "SaaS for project management", "handmade candle shop", "personal fitness coach"'
          className="w-full bg-slate-900 text-slate-200 text-xs rounded-lg px-3 py-2 resize-none border border-slate-700 focus:border-indigo-500 focus:outline-none placeholder-slate-500"
          rows={2}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGeneratePage(); }}
        />
        <div className="mt-2 flex gap-2">
          <button
            onClick={handleGeneratePage}
            disabled={generating || polishing || !pageGoal.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-all"
          >
            {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {generating ? 'Building…' : 'Generate Page'}
          </button>
          {page.blocks.length > 0 && (
            <button
              onClick={handlePolishPage}
              disabled={generating || polishing}
              title="Rewrite all section copy to be more compelling"
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-all"
            >
              {polishing ? <Loader2 size={12} className="animate-spin" /> : '✨'}
              {polishing ? `${polishProgress}%` : 'Polish'}
            </button>
          )}
        </div>
        {(generating || polishing) && (
          <p className="text-xs text-indigo-400 text-center mt-1.5 animate-pulse">
            {generating ? 'Writing real copy for every section…' : `Polishing section ${Math.round(polishProgress / 100 * page.blocks.length)} of ${page.blocks.length}…`}
          </p>
        )}
      </div>

      {/* Search */}
      <div className="px-3 pt-2 pb-1 border-b border-slate-700">
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blocks…"
            className="w-full bg-slate-900 text-slate-200 text-xs pl-7 pr-3 py-1.5 rounded-md border border-slate-700 focus:border-indigo-500 focus:outline-none placeholder-slate-500"
          />
        </div>
      </div>

      {/* Category Filters */}
      {!search && (
        <div className="flex gap-1 px-2 pt-2 pb-1 flex-wrap">
          <button
            onClick={() => setActiveCategory(null)}
            className={`text-xs px-2 py-0.5 rounded-md transition-all ${!activeCategory ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`text-xs px-2 py-0.5 rounded-md transition-all ${activeCategory === cat ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Block List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No blocks match "{search}"</p>
        ) : (
          filtered.map((def) => (
            <button
              key={def.type}
              onClick={() => handleAdd(def.type)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-700 text-left transition-all group border border-transparent hover:border-slate-600"
            >
              <span className="text-xl flex-shrink-0">{def.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 group-hover:text-white">{def.label}</p>
                <p className="text-xs text-slate-500">{def.category}</p>
              </div>
              <Plus size={14} className="text-slate-600 group-hover:text-indigo-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-700">
        <p className="text-xs text-slate-500 text-center">
          {page.blocks.length} section{page.blocks.length !== 1 ? 's' : ''} · {BLOCK_DEFS.length} available
        </p>
      </div>
      </>}

      {/* Outline Panel */}
      {tab === 'outline' && (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {page.blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <p className="text-slate-500 text-xs">No blocks yet.<br/>Add sections to see them here.</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {page.blocks.map((block, idx) => {
                const def = BLOCK_DEFS.find((b) => b.type === block.type);
                const isSelected = selectedBlockId === block.id;
                return (
                  <div
                    key={block.id}
                    onClick={() => selectBlock(block.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all group ${isSelected ? 'bg-indigo-600/30 border border-indigo-500/50' : 'hover:bg-slate-700 border border-transparent'}`}
                  >
                    <span className="text-base flex-shrink-0">{def?.emoji || '📄'}</span>
                    <span className={`flex-1 text-xs font-medium truncate ${block.hidden ? 'text-slate-600 line-through' : isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {def?.label || block.type}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => moveBlock(block.id, page.blocks[Math.max(0, idx - 1)].id)} disabled={idx === 0}
                        className="p-0.5 text-slate-500 hover:text-white disabled:opacity-30"><ChevronUp size={10} /></button>
                      <button onClick={() => moveBlock(block.id, page.blocks[Math.min(page.blocks.length - 1, idx + 1)].id)} disabled={idx === page.blocks.length - 1}
                        className="p-0.5 text-slate-500 hover:text-white disabled:opacity-30"><ChevronDown size={10} /></button>
                      <button onClick={() => toggleBlockVisibility(block.id)}
                        className={`p-0.5 ${block.hidden ? 'text-yellow-500' : 'text-slate-500 hover:text-slate-300'}`}>
                        <EyeOff size={10} /></button>
                      <button onClick={() => { deleteBlock(block.id); }} className="p-0.5 text-slate-500 hover:text-red-400"><Trash2 size={10} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="p-3 border-t border-slate-700">
            <p className="text-xs text-slate-600 text-center">{page.blocks.length} sections · {page.blocks.filter(b => b.hidden).length} hidden</p>
          </div>
        </div>
      )}
    </div>
  );
}
