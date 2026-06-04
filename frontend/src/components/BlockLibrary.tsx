import React, { useState } from 'react';
import { Plus, Sparkles, Loader2, Search, LayoutTemplate, List, EyeOff, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import BLOCK_DEFS from '../blocks/blockDefs';
import { usePageStore } from '../store/pageStore';
import { generateFullPage, generateBlockContent } from '../lib/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['Navigation', 'Hero', 'Content', 'Media', 'Social Proof', 'Conversion', 'Layout', 'Social', 'CTA', 'Footer'];

function makeWhiteTemplateBlockData(type: string, data: Record<string, any>) {
  if (type === 'navbar') return { ...data, bgColor: '#ffffff', sticky: 'solid' };
  if (type === 'hero') return { ...data, variant: data.imageUrl ? 'split' : 'minimal', bgFrom: '#ffffff', bgTo: '#ffffff' };
  if (type === 'cta-banner') return { ...data, bgColor: '#ffffff', textColor: '#0f172a', btnColor: '#4f46e5' };
  if (['stats', 'cta', 'footer', 'newsletter', 'content', 'steps', 'testimonial-single'].includes(type)) return { ...data, bgColor: '#ffffff' };
  return data;
}

const LEGACY_PAGE_TEMPLATES = [
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
      { type: 'faq', overrides: { title: 'Common Questions', items: [{ question: 'How often do you publish?', answer: 'Every Sunday, without fail.' }, { question: 'Is it really free?', answer: 'Yes, always free. No credit card needed.' }, { question: 'Can I unsubscribe?', answer: 'One click, any time.' }, { question: 'What topics do you cover?', answer: 'Technology, business, and design — curated for clarity.' }] } },
      { type: 'newsletter', overrides: { headline: 'Join 25,000+ Readers This Sunday', subtext: 'Free forever. No spam. Unsubscribe with one click anytime.', btnText: 'Subscribe Now' } },
      { type: 'footer', overrides: { brand: 'The Digest', tagline: 'Ideas worth reading, every Sunday.' } },
    ],
  },
];

const PAGE_TEMPLATES = [
  {
    name: 'Product Launch',
    emoji: 'P',
    goal: 'Launch a Shopify product with benefits, reviews, FAQ, and a strong buy call to action.',
    blocks: [
      { type: 'navbar', overrides: { brand: 'Your Store', links: 'Benefits,Reviews,FAQ', ctaText: 'Shop Now' } },
      { type: 'hero', overrides: { eyebrow: 'New arrival', headline: 'Make this product feel easy to buy', subheadline: 'Show the product, explain why it matters, and give shoppers a clear reason to checkout today.', primaryBtn: 'Shop the Product', secondaryBtn: 'See Benefits' } },
      { type: 'features', overrides: { title: 'Why customers choose it', subtitle: 'Turn product details into simple buying reasons.' } },
      { type: 'stats', overrides: { title: 'Trust signals shoppers look for', stats: [{ value: '4.9/5', label: 'Average rating' }, { value: '30 days', label: 'Easy returns' }, { value: 'Free', label: 'Shipping offer' }, { value: '24h', label: 'Support response' }] } },
      { type: 'testimonials', overrides: { title: 'Customer proof' } },
      { type: 'faq', overrides: { title: 'Questions before checkout' } },
      { type: 'cta-banner', overrides: { headline: 'Ready to make it yours?', subtext: 'Close with the offer, reassurance, and a simple checkout button.', btnText: 'Buy Now', secondBtnText: 'See Details' } },
      { type: 'footer', overrides: { brand: 'Your Store', tagline: 'Premium product pages built with PageGenie.' } },
    ],
  },
  {
    name: 'Flash Sale',
    emoji: '%',
    goal: 'Promote a limited-time Shopify offer with savings, urgency, trust, and checkout clarity.',
    blocks: [
      { type: 'banner', overrides: { text: 'Limited-time offer ends soon', linkText: 'Shop now', bgColor: '#4f46e5' } },
      { type: 'navbar', overrides: { brand: 'Your Store', links: 'Sale,Reviews,FAQ', ctaText: 'Claim Deal' } },
      { type: 'hero', overrides: { eyebrow: 'Flash sale', headline: 'Give shoppers a reason to buy today', subheadline: 'Lead with the discount, make the savings obvious, and answer the questions that stop checkout.', primaryBtn: 'Claim the Deal', secondaryBtn: 'See Details' } },
      { type: 'features', overrides: { title: 'Why this deal is worth it', subtitle: 'Make the sale feel valuable, not random.' } },
      { type: 'testimonials', overrides: { title: 'Shoppers love it' } },
      { type: 'faq', overrides: { title: 'Sale questions' } },
      { type: 'cta-banner', overrides: { headline: 'Get the offer before it ends', subtext: 'Close with one clear button and the strongest reason to act now.', btnText: 'Shop Sale', secondBtnText: 'View Details' } },
      { type: 'footer', overrides: { brand: 'Your Store', tagline: 'Limited-time offers made clear.' } },
    ],
  },
  {
    name: 'Collection Drop',
    emoji: 'C',
    goal: 'Showcase a Shopify collection with product highlights, trust points, reviews, and collection CTA.',
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
    emoji: 'B',
    goal: 'Sell a Shopify bundle with savings, what is included, reasons to buy, FAQ, reviews, and bundle CTA.',
    blocks: [
      { type: 'navbar', overrides: { brand: 'Your Store', links: 'Bundle,Savings,FAQ', ctaText: 'Build Bundle' } },
      { type: 'hero', overrides: { eyebrow: 'Bundle and save', headline: 'Make the bigger order feel smarter', subheadline: 'Show what is included, explain the savings, and reduce hesitation before checkout.', primaryBtn: 'Shop the Bundle', secondaryBtn: 'See What Is Inside' } },
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
    emoji: 'W',
    goal: 'Capture emails for a Shopify product drop, waitlist, or launch announcement.',
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

export default function BlockLibrary() {
  const { addBlock, page, pageGoal, setPageGoal, setPageTitle, loadPage, selectBlock, selectedBlockId, moveBlock, deleteBlock, toggleBlockVisibility, updateBlock } = usePageStore();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState<'blocks' | 'templates' | 'outline'>('blocks');

  const handleLoadTemplate = (template: typeof PAGE_TEMPLATES[0]) => {
    if (page.blocks.length > 0 && !confirm(`Replace current page with "${template.name}" template?`)) return;
    loadPage({ id: page.id, title: template.name + ' Page', blocks: [] });
    template.blocks.forEach(({ type, overrides }) => {
      const def = BLOCK_DEFS.find((b) => b.type === type);
      if (def) addBlock(type, makeWhiteTemplateBlockData(type, { ...def.defaultData, ...overrides }));
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
          <p className="text-xs text-slate-500 text-center">Pre-built pages you can customize</p>
          {PAGE_TEMPLATES.map((tpl) => (
            <button
              key={tpl.name}
              onClick={() => handleLoadTemplate(tpl)}
              className="w-full text-left p-3 rounded-xl border border-slate-700 hover:border-indigo-500 hover:bg-indigo-950/30 transition-all group"
            >
              <div className="flex items-center gap-2.5 mb-1.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-sm opacity-80">{tpl.emoji}</span>
                <span className="text-sm font-semibold text-slate-200 group-hover:text-white">{tpl.name}</span>
              </div>
              <p className="text-xs text-slate-500">{tpl.blocks.length} sections</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {tpl.blocks.slice(0, 6).map((b, i) => {
                  const d = BLOCK_DEFS.find((x) => x.type === b.type);
                  return d ? <span key={i} className="text-xs opacity-60" title={d.label}>{d.emoji}</span> : null;
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
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
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
            disabled={generating || !pageGoal.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-all"
          >
            {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {generating ? 'Building…' : 'Generate Page'}
          </button>
        </div>
        {generating && (
          <p className="text-xs text-indigo-400 text-center mt-1.5 animate-pulse">
            Writing real copy for every section…
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
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900/70 text-sm flex-shrink-0 opacity-80 group-hover:opacity-100">{def.emoji}</span>
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
