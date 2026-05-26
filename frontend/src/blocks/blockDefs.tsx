import React from 'react';
import { BlockDef } from '../types';
import IE from '../lib/InlineEditable';

function ContactFormBlock({ data, onUpdate }: { data: Record<string, any>; onUpdate?: (k: string, v: string) => void }) {
  const [form, setForm] = React.useState({ name: '', email: '', message: '' });
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!form.email.trim()) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <section className="py-20 px-8 bg-white">
        <div className="max-w-xl mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl mx-auto mb-4">✅</div>
          <IE as="h2" value={data.title} fieldKey="title" onUpdate={onUpdate}
            className="text-3xl font-bold text-gray-900 mb-2 block" />
          <p className="text-green-700 font-semibold">Message sent! We'll get back to you shortly.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-8 bg-white">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-10">
          <IE as="h2" value={data.title} fieldKey="title" onUpdate={onUpdate}
            className="text-4xl font-bold text-gray-900 mb-3 block" />
          <IE as="p" value={data.subtitle} fieldKey="subtitle" onUpdate={onUpdate}
            className="text-xl text-gray-500 block" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" onClick={e => e.stopPropagation()}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{data.nameLabel || 'Name'}</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{data.emailLabel || 'Email'}</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="your@email.com" required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{data.messageLabel || 'Message'}</label>
            <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Tell us about your project..."
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none" />
          </div>
          {status === 'error' && <p className="text-red-500 text-sm">Something went wrong. Please try again.</p>}
          <button type="submit" disabled={status === 'loading'}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-60">
            {status === 'loading' ? 'Sending…' : (data.btnText || 'Send Message')}
          </button>
        </form>
      </div>
    </section>
  );
}

function NewsletterBlock({ data, onUpdate }: { data: Record<string, any>; onUpdate?: (k: string, v: string) => void }) {
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!email.trim()) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <section className="py-20 px-8" style={{ backgroundColor: data.bgColor }}>
      <div className="max-w-xl mx-auto text-center">
        <IE as="h2" value={data.headline} fieldKey="headline" onUpdate={onUpdate}
          className="text-3xl font-bold text-gray-900 mb-4 block" />
        <IE as="p" value={data.subtext} fieldKey="subtext" onUpdate={onUpdate}
          className="text-gray-500 mb-8 leading-relaxed block" />
        {status === 'success' ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-3xl">✅</div>
            <p className="text-green-700 font-semibold">You're subscribed!</p>
            <p className="text-sm text-gray-500">Thanks for joining. Check your inbox.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto" onClick={e => e.stopPropagation()}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={data.placeholder}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-indigo-400 text-gray-700"
              required
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-500 transition-all whitespace-nowrap disabled:opacity-60"
            >
              {status === 'loading' ? '…' : <IE as="span" value={data.btnText} fieldKey="btnText" onUpdate={onUpdate} />}
            </button>
          </form>
        )}
        {status === 'error' && <p className="text-red-500 text-xs mt-2">Something went wrong. Please try again.</p>}
        <p className="text-xs text-gray-400 mt-3">Unsubscribe anytime. No credit card required.</p>
      </div>
    </section>
  );
}

const BLOCK_DEFS: BlockDef[] = [
  {
    type: 'banner',
    label: 'Announcement Bar',
    emoji: '📢',
    category: 'Navigation',
    fields: [
      { key: 'text', label: 'Announcement Text', type: 'text' },
      { key: 'linkText', label: 'Link Text', type: 'text', placeholder: 'Learn more →' },
      { key: 'bgColor', label: 'Background Color', type: 'color' },
    ],
    defaultData: {
      text: '🎉 New: AI Page Builder 2.0 is here. Generate pages 3x faster.',
      linkText: 'Try it free →',
      bgColor: '#4f46e5',
    },
    renderCanvas: (data, onUpdate) => (
      <div className="px-4 py-2.5 text-center text-sm font-medium text-white flex items-center justify-center gap-2 flex-wrap"
        style={{ backgroundColor: data.bgColor }}>
        <IE as="span" value={data.text} fieldKey="text" onUpdate={onUpdate} />
        {data.linkText && (
          <a href="#" className="underline underline-offset-2 text-white/90 font-semibold hover:text-white whitespace-nowrap">
            <IE as="span" value={data.linkText} fieldKey="linkText" onUpdate={onUpdate} />
          </a>
        )}
      </div>
    ),
    exportHtml: (data) => `
<div style="padding:10px 16px;text-align:center;font-size:14px;font-weight:500;color:#fff;background:${data.bgColor};display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;">
  <span>${data.text}</span>
  ${data.linkText ? `<a href="#" style="color:rgba(255,255,255,0.9);font-weight:600;text-decoration:underline;text-underline-offset:2px;">${data.linkText}</a>` : ''}
</div>`,
  },

  {
    type: 'navbar',
    label: 'Navigation',
    emoji: '🧭',
    category: 'Navigation',
    fields: [
      { key: 'brand', label: 'Brand / Logo Text', type: 'text' },
      { key: 'links', label: 'Nav Links (comma-separated)', type: 'text', placeholder: 'Features,Pricing,About,Blog' },
      { key: 'ctaText', label: 'CTA Button', type: 'text', placeholder: 'Get Started' },
      { key: 'bgColor', label: 'Background Color', type: 'color' },
      { key: 'sticky', label: 'Style', type: 'select', options: [
        { value: 'solid', label: 'Solid' },
        { value: 'transparent', label: 'Transparent (on hero)' },
        { value: 'blur', label: 'Frosted Glass' },
      ]},
    ],
    defaultData: {
      brand: 'YourBrand',
      links: 'Features,Pricing,About,Blog',
      ctaText: 'Get Started',
      bgColor: '#0f172a',
      sticky: 'solid',
    },
    renderCanvas: (data, onUpdate) => {
      const links = typeof data.links === 'string' ? data.links.split(',') : data.links || [];
      const isBlur = data.sticky === 'blur';
      const isTransparent = data.sticky === 'transparent';
      return (
        <nav
          className="px-8 py-4 flex items-center justify-between"
          style={{
            backgroundColor: isTransparent ? 'transparent' : isBlur ? 'rgba(15,23,42,0.8)' : data.bgColor,
            backdropFilter: isBlur ? 'blur(12px)' : undefined,
            borderBottom: isBlur ? '1px solid rgba(255,255,255,0.08)' : undefined,
          }}
        >
          <div className="flex items-center gap-8">
            <IE as="span" value={data.brand} fieldKey="brand" onUpdate={onUpdate}
              className="text-white font-bold text-lg" />
            <div className="hidden md:flex items-center gap-6">
              {links.map((link: string, i: number) => (
                <a key={i} href="#" className="text-slate-300 hover:text-white text-sm transition-colors">{link.trim()}</a>
              ))}
            </div>
          </div>
          <a href="#" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-all">
            <IE as="span" value={data.ctaText} fieldKey="ctaText" onUpdate={onUpdate} />
          </a>
        </nav>
      );
    },
    exportHtml: (data) => {
      const links = typeof data.links === 'string' ? data.links.split(',') : data.links || [];
      const isBlur = data.sticky === 'blur';
      const isTransparent = data.sticky === 'transparent';
      return `
<nav style="padding:16px 32px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;${isTransparent ? 'background:transparent;' : isBlur ? 'background:rgba(15,23,42,0.85);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,0.08);' : `background:${data.bgColor};`}">
  <div style="display:flex;align-items:center;gap:32px;">
    <span style="color:#fff;font-weight:700;font-size:1.125rem;">${data.brand}</span>
    <div style="display:flex;gap:24px;">
      ${links.map((l: string) => `<a href="#" style="color:rgba(203,213,225,1);font-size:14px;text-decoration:none;">${l.trim()}</a>`).join('')}
    </div>
  </div>
  <a href="#" style="padding:8px 16px;background:#4f46e5;color:#fff;border-radius:8px;font-size:14px;font-weight:600;">${data.ctaText}</a>
</nav>`;
    },
  },

  {
    type: 'hero',
    label: 'Hero',
    emoji: '🚀',
    category: 'Hero',
    fields: [
      { key: 'variant', label: 'Style', type: 'select', options: [
        { value: 'centered', label: 'Centered (gradient)' },
        { value: 'split', label: 'Split (text + image)' },
        { value: 'minimal', label: 'Minimal (light)' },
      ]},
      { key: 'eyebrow', label: 'Eyebrow Text', type: 'text', placeholder: 'Introducing...' },
      { key: 'headline', label: 'Headline', type: 'text', placeholder: 'Your main headline' },
      { key: 'subheadline', label: 'Subheadline', type: 'textarea', placeholder: 'Brief description' },
      { key: 'primaryBtn', label: 'Primary Button', type: 'text', placeholder: 'Get Started' },
      { key: 'secondaryBtn', label: 'Secondary Button', type: 'text', placeholder: 'Learn More' },
      { key: 'imageUrl', label: 'Image URL (for split)', type: 'url', placeholder: 'https://...' },
      { key: 'bgFrom', label: 'Gradient From', type: 'color' },
      { key: 'bgTo', label: 'Gradient To', type: 'color' },
    ],
    defaultData: {
      variant: 'centered',
      eyebrow: 'Introducing AI Page Builder',
      headline: 'Build Stunning Pages in Minutes',
      subheadline: 'The fastest way to create beautiful landing pages with AI. No design skills required — just describe what you want.',
      primaryBtn: 'Start Building Free',
      secondaryBtn: 'See Examples',
      imageUrl: '',
      bgFrom: '#0f172a',
      bgTo: '#1e1b4b',
    },
    renderCanvas: (data, onUpdate) => {
      const v = data.variant || 'centered';

      if (v === 'split') {
        return (
          <section style={{ background: `linear-gradient(135deg, ${data.bgFrom} 0%, ${data.bgTo} 100%)` }}
            className="py-20 px-8 text-white">
            <div className="max-w-5xl mx-auto flex items-center gap-12 flex-wrap lg:flex-nowrap">
              <div className="flex-1 min-w-[280px]">
                <IE as="span" value={data.eyebrow} fieldKey="eyebrow" onUpdate={onUpdate}
                  className="inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-5"
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }} />
                <IE as="h1" value={data.headline} fieldKey="headline" onUpdate={onUpdate}
                  className="text-4xl lg:text-5xl font-bold mb-5 leading-tight block" />
                <IE as="p" value={data.subheadline} fieldKey="subheadline" onUpdate={onUpdate}
                  className="text-lg text-blue-100 mb-8 leading-relaxed block" />
                <div className="flex flex-wrap gap-3">
                  <a href="#" className="px-7 py-3.5 bg-white text-indigo-900 rounded-xl font-semibold hover:bg-blue-50 transition-all shadow-lg">
                    <IE as="span" value={data.primaryBtn} fieldKey="primaryBtn" onUpdate={onUpdate} />
                  </a>
                  <a href="#" className="px-7 py-3.5 rounded-xl font-semibold border border-white/30 hover:bg-white/10 transition-all">
                    <IE as="span" value={data.secondaryBtn} fieldKey="secondaryBtn" onUpdate={onUpdate} />
                  </a>
                </div>
              </div>
              <div className="flex-1 min-w-[260px]">
                {data.imageUrl ? (
                  <img src={data.imageUrl} alt="" className="rounded-2xl shadow-2xl w-full object-cover" style={{ maxHeight: '420px' }} />
                ) : (
                  <div className="rounded-2xl bg-white/10 border-2 border-dashed border-white/20 aspect-video flex flex-col items-center justify-center gap-2">
                    <span className="text-4xl">🖼️</span>
                    <p className="text-white/40 text-sm text-center px-4">Paste an image URL in the<br/>Image URL field →</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      }

      if (v === 'minimal') {
        return (
          <section className="py-28 px-8 bg-white border-b border-slate-100">
            <div className="max-w-4xl mx-auto">
              <IE as="span" value={data.eyebrow} fieldKey="eyebrow" onUpdate={onUpdate}
                className="inline-block text-sm font-semibold tracking-widest uppercase text-indigo-600 mb-6" />
              <IE as="h1" value={data.headline} fieldKey="headline" onUpdate={onUpdate}
                className="text-6xl lg:text-7xl font-black text-gray-900 mb-6 leading-none tracking-tight block" />
              <IE as="p" value={data.subheadline} fieldKey="subheadline" onUpdate={onUpdate}
                className="text-xl text-gray-500 mb-10 max-w-2xl leading-relaxed block" />
              <div className="flex flex-wrap gap-4">
                <a href="#" className="px-8 py-4 bg-slate-900 text-white rounded-xl font-semibold text-lg hover:bg-slate-800 transition-all">
                  <IE as="span" value={data.primaryBtn} fieldKey="primaryBtn" onUpdate={onUpdate} />
                </a>
                <a href="#" className="px-8 py-4 text-slate-500 hover:text-slate-900 font-semibold text-lg transition-all flex items-center gap-2">
                  <IE as="span" value={data.secondaryBtn} fieldKey="secondaryBtn" onUpdate={onUpdate} /> →
                </a>
              </div>
            </div>
          </section>
        );
      }

      // centered (default)
      return (
        <section
          style={{ background: `linear-gradient(135deg, ${data.bgFrom} 0%, ${data.bgTo} 100%)` }}
          className="py-28 px-8 text-center text-white"
        >
          <div className="max-w-3xl mx-auto">
            <IE as="span" value={data.eyebrow} fieldKey="eyebrow" onUpdate={onUpdate}
              className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-6"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }} />
            <IE as="h1" value={data.headline} fieldKey="headline" onUpdate={onUpdate}
              className="text-5xl lg:text-6xl font-bold mb-6 leading-tight block w-full" />
            <IE as="p" value={data.subheadline} fieldKey="subheadline" onUpdate={onUpdate}
              className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed block" />
            <div className="flex flex-wrap gap-4 justify-center">
              <a href="#" className="px-8 py-4 bg-white text-indigo-900 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-all shadow-lg">
                <IE as="span" value={data.primaryBtn} fieldKey="primaryBtn" onUpdate={onUpdate} />
              </a>
              <a href="#" className="px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all border border-white/30">
                <IE as="span" value={data.secondaryBtn} fieldKey="secondaryBtn" onUpdate={onUpdate} /> →
              </a>
            </div>
          </div>
        </section>
      );
    },
    exportHtml: (data) => {
      const v = data.variant || 'centered';
      if (v === 'split') return `
<section style="background:linear-gradient(135deg,${data.bgFrom} 0%,${data.bgTo} 100%);padding:80px 32px;color:#fff;">
  <div style="max-width:960px;margin:0 auto;display:flex;align-items:center;gap:48px;flex-wrap:wrap;">
    <div style="flex:1;min-width:280px;">
      <span style="display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.8);margin-bottom:20px;">${data.eyebrow}</span>
      <h1 style="font-size:2.75rem;font-weight:700;margin-bottom:20px;line-height:1.15;">${data.headline}</h1>
      <p style="font-size:1.125rem;color:rgba(219,234,254,1);margin-bottom:32px;line-height:1.7;">${data.subheadline}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <a href="#" style="padding:14px 28px;background:#fff;color:#1e1b4b;border-radius:12px;font-weight:600;">${data.primaryBtn}</a>
        <a href="#" style="padding:14px 28px;border:1px solid rgba(255,255,255,0.3);color:#fff;border-radius:12px;font-weight:600;">${data.secondaryBtn}</a>
      </div>
    </div>
    <div style="flex:1;min-width:260px;">
      ${data.imageUrl ? `<img src="${data.imageUrl}" alt="" style="border-radius:16px;box-shadow:0 25px 50px rgba(0,0,0,0.3);width:100%;object-fit:cover;max-height:420px;" />` : `<div style="border-radius:16px;background:rgba(255,255,255,0.08);aspect-ratio:16/9;"></div>`}
    </div>
  </div>
</section>`;
      if (v === 'minimal') return `
<section style="padding:112px 32px;background:#fff;border-bottom:1px solid #f1f5f9;">
  <div style="max-width:896px;margin:0 auto;">
    <span style="display:inline-block;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#4f46e5;margin-bottom:24px;">${data.eyebrow}</span>
    <h1 style="font-size:5rem;font-weight:900;color:#0f172a;margin-bottom:24px;line-height:1;letter-spacing:-0.02em;">${data.headline}</h1>
    <p style="font-size:1.25rem;color:#6b7280;margin-bottom:40px;max-width:512px;line-height:1.7;">${data.subheadline}</p>
    <div style="display:flex;gap:16px;flex-wrap:wrap;">
      <a href="#" style="padding:16px 32px;background:#0f172a;color:#fff;border-radius:12px;font-weight:600;font-size:1.125rem;">${data.primaryBtn}</a>
      <a href="#" style="padding:16px 32px;color:#64748b;font-weight:600;font-size:1.125rem;">${data.secondaryBtn} →</a>
    </div>
  </div>
</section>`;
      return `
<section style="background:linear-gradient(135deg,${data.bgFrom} 0%,${data.bgTo} 100%);padding:112px 32px;text-align:center;color:#fff;">
  <div style="max-width:768px;margin:0 auto;">
    <span style="display:inline-block;padding:6px 16px;border-radius:999px;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.8);margin-bottom:24px;">${data.eyebrow}</span>
    <h1 style="font-size:3.5rem;font-weight:700;margin-bottom:24px;line-height:1.15;">${data.headline}</h1>
    <p style="font-size:1.25rem;color:rgba(219,234,254,1);margin-bottom:40px;max-width:512px;margin-left:auto;margin-right:auto;line-height:1.7;">${data.subheadline}</p>
    <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;">
      <a href="#" style="padding:16px 32px;background:#fff;color:#1e1b4b;border-radius:12px;font-weight:600;font-size:1.125rem;">${data.primaryBtn}</a>
      <a href="#" style="padding:16px 32px;border:1px solid rgba(255,255,255,0.3);color:#fff;border-radius:12px;font-weight:600;font-size:1.125rem;">${data.secondaryBtn} →</a>
    </div>
  </div>
</section>`;
    },
  },

  {
    type: 'features',
    label: 'Features',
    emoji: '✨',
    category: 'Content',
    fields: [
      { key: 'variant', label: 'Layout', type: 'select', options: [
        { value: 'grid', label: 'Card Grid' },
        { value: 'alternating', label: 'Alternating Rows' },
      ]},
      { key: 'title', label: 'Section Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      {
        key: 'features',
        label: 'Features',
        type: 'array',
        arrayItemFields: [
          { key: 'icon', label: 'Icon (emoji)', type: 'text' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
        ],
      },
    ],
    defaultData: {
      variant: 'grid',
      title: 'Everything You Need',
      subtitle: 'Powerful features built for modern teams who want to move fast without breaking things.',
      features: [
        { icon: '🤖', title: 'AI-Powered', description: 'Generate compelling copy and entire page sections with one click using Claude AI.' },
        { icon: '⚡', title: 'Lightning Fast', description: 'Build complete landing pages in minutes, not days. Ship faster than ever before.' },
        { icon: '🎨', title: 'Beautiful Design', description: 'Professional templates and design system out of the box. Always looks great.' },
        { icon: '📱', title: 'Fully Responsive', description: 'Every page looks stunning on desktop, tablet, and mobile automatically.' },
        { icon: '📦', title: 'Clean Export', description: 'Export production-ready HTML/CSS. No dependencies, no bloat, just clean code.' },
        { icon: '🔒', title: 'Secure & Private', description: 'Your pages and API keys stay private. Built with security first.' },
      ],
    },
    renderCanvas: (data, onUpdate) => {
      const v = data.variant || 'grid';

      if (v === 'alternating') {
        return (
          <section className="py-20 px-8 bg-white">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-20">
                <IE as="h2" value={data.title} fieldKey="title" onUpdate={onUpdate}
                  className="text-4xl font-bold text-gray-900 mb-4 block" />
                <IE as="p" value={data.subtitle} fieldKey="subtitle" onUpdate={onUpdate}
                  className="text-xl text-gray-500 max-w-2xl mx-auto block" />
              </div>
              <div className="space-y-20">
                {data.features?.map((f: any, i: number) => (
                  <div key={i} className={`flex items-center gap-12 flex-wrap ${i % 2 === 1 ? 'flex-row-reverse' : ''}`}>
                    <div className="flex-1 min-w-[260px]">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl mb-5">{f.icon}</div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">{f.title}</h3>
                      <p className="text-gray-500 leading-relaxed">{f.description}</p>
                    </div>
                    <div className="flex-1 min-w-[260px] rounded-3xl bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 aspect-video flex items-center justify-center shadow-inner">
                      <span className="text-8xl opacity-20">{f.icon}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      }

      return (
        <section className="py-20 px-8 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <IE as="h2" value={data.title} fieldKey="title" onUpdate={onUpdate}
                className="text-4xl font-bold text-gray-900 mb-4 block" />
              <IE as="p" value={data.subtitle} fieldKey="subtitle" onUpdate={onUpdate}
                className="text-xl text-gray-500 max-w-2xl mx-auto block" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {data.features?.map((f: any, i: number) => (
                <div key={i} className="p-6 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all group">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform inline-block">{f.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    },
    exportHtml: (data) => {
      const v = data.variant || 'grid';
      if (v === 'alternating') return `
<section style="padding:80px 32px;background:#fff;">
  <div style="max-width:960px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:80px;">
      <h2 style="font-size:2.5rem;font-weight:700;color:#111827;margin-bottom:16px;">${data.title}</h2>
      <p style="font-size:1.25rem;color:#6b7280;max-width:512px;margin:0 auto;">${data.subtitle}</p>
    </div>
    ${(data.features || []).map((f: any, i: number) => `
    <div style="display:flex;align-items:center;gap:48px;margin-bottom:80px;flex-wrap:wrap;${i % 2 === 1 ? 'flex-direction:row-reverse;' : ''}">
      <div style="flex:1;min-width:260px;">
        <div style="width:56px;height:56px;border-radius:16px;background:#eef2ff;display:flex;align-items:center;justify-content:center;font-size:1.75rem;margin-bottom:20px;">${f.icon}</div>
        <h3 style="font-size:1.5rem;font-weight:700;color:#111827;margin-bottom:12px;">${f.title}</h3>
        <p style="color:#6b7280;line-height:1.7;">${f.description}</p>
      </div>
      <div style="flex:1;min-width:260px;border-radius:24px;background:linear-gradient(135deg,#eef2ff,#ede9fe);aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:5rem;opacity:0.2;">${f.icon}</span>
      </div>
    </div>`).join('')}
  </div>
</section>`;
      return `
<section style="padding:80px 32px;background:#fff;">
  <div style="max-width:960px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:64px;">
      <h2 style="font-size:2.5rem;font-weight:700;color:#111827;margin-bottom:16px;">${data.title}</h2>
      <p style="font-size:1.25rem;color:#6b7280;max-width:512px;margin:0 auto;">${data.subtitle}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:32px;">
      ${(data.features || []).map((f: any) => `
      <div style="padding:24px;border-radius:16px;border:1px solid #f3f4f6;">
        <div style="font-size:2.5rem;margin-bottom:16px;">${f.icon}</div>
        <h3 style="font-size:1.125rem;font-weight:600;color:#111827;margin-bottom:8px;">${f.title}</h3>
        <p style="color:#6b7280;font-size:0.875rem;line-height:1.6;">${f.description}</p>
      </div>`).join('')}
    </div>
  </div>
</section>`;
    },
  },

  {
    type: 'pricing',
    label: 'Pricing',
    emoji: '💰',
    category: 'Content',
    fields: [
      { key: 'title', label: 'Section Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      {
        key: 'plans',
        label: 'Pricing Plans',
        type: 'array',
        arrayItemFields: [
          { key: 'name', label: 'Plan Name', type: 'text' },
          { key: 'price', label: 'Price', type: 'text' },
          { key: 'period', label: 'Period (e.g. /month)', type: 'text' },
          { key: 'description', label: 'Description', type: 'text' },
          { key: 'cta', label: 'Button Text', type: 'text' },
          { key: 'highlighted', label: 'Highlighted (true/false)', type: 'text' },
          { key: 'features', label: 'Features (comma-separated)', type: 'textarea' },
        ],
      },
    ],
    defaultData: {
      title: 'Simple, Transparent Pricing',
      subtitle: 'No hidden fees. Cancel anytime.',
      plans: [
        { name: 'Starter', price: '$0', period: '/month', description: 'Perfect for side projects', cta: 'Get Started', highlighted: 'false', features: '5 pages,AI generations,HTML export,Community support' },
        { name: 'Pro', price: '$29', period: '/month', description: 'For growing businesses', cta: 'Start Free Trial', highlighted: 'true', features: 'Unlimited pages,Unlimited AI,Custom domain,Priority support,Analytics,Team collaboration' },
        { name: 'Enterprise', price: '$99', period: '/month', description: 'For large teams', cta: 'Contact Sales', highlighted: 'false', features: 'Everything in Pro,SSO login,Custom AI training,SLA guarantee,Dedicated support' },
      ],
    },
    renderCanvas: (data, onUpdate) => (
      <section className="py-20 px-8 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <IE as="h2" value={data.title} fieldKey="title" onUpdate={onUpdate}
              className="text-4xl font-bold text-gray-900 mb-3 block" />
            <IE as="p" value={data.subtitle} fieldKey="subtitle" onUpdate={onUpdate}
              className="text-lg text-gray-500 block" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {data.plans?.map((plan: any, i: number) => {
              const isHighlighted = plan.highlighted === 'true';
              const features = typeof plan.features === 'string' ? plan.features.split(',') : plan.features || [];
              return (
                <div key={i} className={`rounded-2xl p-8 ${isHighlighted ? 'bg-indigo-600 text-white shadow-2xl scale-105' : 'bg-white border border-gray-200'}`}>
                  <div className="mb-6">
                    <p className={`text-sm font-semibold uppercase tracking-wider mb-2 ${isHighlighted ? 'text-indigo-200' : 'text-indigo-600'}`}>{plan.name}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className={`text-sm ${isHighlighted ? 'text-indigo-200' : 'text-gray-500'}`}>{plan.period}</span>
                    </div>
                    <p className={`text-sm mt-2 ${isHighlighted ? 'text-indigo-200' : 'text-gray-500'}`}>{plan.description}</p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {features.map((f: string, j: number) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <span>✓</span>
                        <span className={isHighlighted ? 'text-indigo-100' : 'text-gray-600'}>{f.trim()}</span>
                      </li>
                    ))}
                  </ul>
                  <a href="#" className={`block text-center py-3 rounded-xl font-semibold transition-all ${isHighlighted ? 'bg-white text-indigo-600 hover:bg-indigo-50' : 'border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50'}`}>
                    {plan.cta}
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    ),
    exportHtml: (data) => `
<section style="padding:80px 32px;background:#f8fafc;">
  <div style="max-width:960px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:64px;">
      <h2 style="font-size:2.5rem;font-weight:700;color:#111827;margin-bottom:12px;">${data.title}</h2>
      <p style="font-size:1.125rem;color:#6b7280;">${data.subtitle}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:32px;align-items:start;">
      ${(data.plans || []).map((plan: any) => {
        const isHL = plan.highlighted === 'true';
        const features = typeof plan.features === 'string' ? plan.features.split(',') : plan.features || [];
        return `<div style="border-radius:16px;padding:32px;${isHL ? 'background:#4f46e5;color:#fff;transform:scale(1.05);box-shadow:0 25px 50px rgba(79,70,229,0.3);' : 'background:#fff;border:1px solid #e5e7eb;'}">
          <p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;color:${isHL ? 'rgba(199,210,254,1)' : '#4f46e5'};">${plan.name}</p>
          <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:8px;"><span style="font-size:2.5rem;font-weight:700;">${plan.price}</span><span style="color:${isHL ? 'rgba(199,210,254,1)' : '#9ca3af'};">${plan.period}</span></div>
          <p style="font-size:14px;color:${isHL ? 'rgba(199,210,254,1)' : '#6b7280'};margin-bottom:24px;">${plan.description}</p>
          <ul style="list-style:none;margin:0 0 32px;padding:0;">
            ${features.map((f: string) => `<li style="display:flex;align-items:center;gap:8px;font-size:14px;margin-bottom:12px;color:${isHL ? 'rgba(224,231,255,1)' : '#374151'};"><span>✓</span>${f.trim()}</li>`).join('')}
          </ul>
          <a href="#" style="display:block;text-align:center;padding:12px;border-radius:12px;font-weight:600;${isHL ? 'background:#fff;color:#4f46e5;' : 'border:2px solid #4f46e5;color:#4f46e5;'}">${plan.cta}</a>
        </div>`;
      }).join('')}
    </div>
  </div>
</section>`,
  },

  {
    type: 'testimonials',
    label: 'Testimonials',
    emoji: '⭐',
    category: 'Social',
    fields: [
      { key: 'title', label: 'Section Title', type: 'text' },
      {
        key: 'testimonials',
        label: 'Testimonials',
        type: 'array',
        arrayItemFields: [
          { key: 'quote', label: 'Quote', type: 'textarea' },
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'role', label: 'Role & Company', type: 'text' },
          { key: 'avatar', label: 'Avatar Initials', type: 'text' },
          { key: 'avatarBg', label: 'Avatar Color', type: 'color' },
        ],
      },
    ],
    defaultData: {
      title: 'Loved by Builders Worldwide',
      testimonials: [
        { quote: 'I built our entire product launch page in 20 minutes. The AI suggestions were spot on — it saved us days of copywriting work.', name: 'Sarah Chen', role: 'Founder, LaunchFast', avatar: 'SC', avatarBg: '#4f46e5' },
        { quote: 'Finally a page builder that understands what I actually want. The AI feature is genuinely useful, not just a gimmick.', name: 'Marcus Rivera', role: 'Head of Marketing, Acme Corp', avatar: 'MR', avatarBg: '#0891b2' },
        { quote: 'We replaced our $500/month agency with this tool. The output quality is honestly better and we ship 10x faster.', name: 'Priya Nair', role: 'CEO, GrowthLoop', avatar: 'PN', avatarBg: '#059669' },
      ],
    },
    renderCanvas: (data, onUpdate) => (
      <section className="py-20 px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <IE as="h2" value={data.title} fieldKey="title" onUpdate={onUpdate}
            className="text-4xl font-bold text-center text-gray-900 mb-16 block" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {data.testimonials?.map((t: any, i: number) => (
              <div key={i} className="p-8 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex mb-4">
                  {[1,2,3,4,5].map(s => <span key={s} className="text-yellow-400 text-lg">★</span>)}
                </div>
                <p className="text-gray-700 italic mb-6 leading-relaxed">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: t.avatarBg }}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
    exportHtml: (data) => `
<section style="padding:80px 32px;background:#fff;">
  <div style="max-width:960px;margin:0 auto;">
    <h2 style="font-size:2.5rem;font-weight:700;text-align:center;color:#111827;margin-bottom:64px;">${data.title}</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:32px;">
      ${(data.testimonials || []).map((t: any) => `
      <div style="padding:32px;border-radius:16px;background:#f8fafc;border:1px solid #f1f5f9;">
        <div style="margin-bottom:16px;color:#facc15;font-size:1.125rem;">★★★★★</div>
        <p style="color:#374151;font-style:italic;margin-bottom:24px;line-height:1.7;">"${t.quote}"</p>
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:40px;height:40px;border-radius:50%;background:${t.avatarBg};display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:700;flex-shrink:0;">${t.avatar}</div>
          <div><p style="font-weight:600;color:#111827;font-size:14px;">${t.name}</p><p style="color:#6b7280;font-size:12px;">${t.role}</p></div>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>`,
  },

  {
    type: 'cta',
    label: 'Call to Action',
    emoji: '📣',
    category: 'CTA',
    fields: [
      { key: 'headline', label: 'Headline', type: 'text' },
      { key: 'subtext', label: 'Subtext', type: 'textarea' },
      { key: 'primaryBtn', label: 'Primary Button', type: 'text' },
      { key: 'secondaryBtn', label: 'Secondary Button', type: 'text' },
      { key: 'bgColor', label: 'Background Color', type: 'color' },
    ],
    defaultData: {
      headline: 'Ready to Build Something Amazing?',
      subtext: 'Join thousands of builders who ship faster with AI. Start free, no credit card needed.',
      primaryBtn: 'Start Building — It\'s Free',
      secondaryBtn: 'See live demos',
      bgColor: '#1e1b4b',
    },
    renderCanvas: (data, onUpdate) => (
      <section className="py-24 px-8 text-center" style={{ backgroundColor: data.bgColor }}>
        <div className="max-w-2xl mx-auto">
          <IE as="h2" value={data.headline} fieldKey="headline" onUpdate={onUpdate}
            className="text-4xl font-bold text-white mb-5 block" />
          <IE as="p" value={data.subtext} fieldKey="subtext" onUpdate={onUpdate}
            className="text-indigo-200 text-xl mb-10 block" />
          <div className="flex flex-wrap gap-4 justify-center">
            <a href="#" className="px-8 py-4 bg-white text-indigo-900 rounded-xl font-bold text-lg hover:bg-blue-50 transition-all">
              <IE as="span" value={data.primaryBtn} fieldKey="primaryBtn" onUpdate={onUpdate} />
            </a>
            <a href="#" className="px-8 py-4 text-white underline underline-offset-4 font-medium text-lg hover:opacity-80 transition-all">
              <IE as="span" value={data.secondaryBtn} fieldKey="secondaryBtn" onUpdate={onUpdate} />
            </a>
          </div>
        </div>
      </section>
    ),
    exportHtml: (data) => `
<section style="padding:96px 32px;text-align:center;background:${data.bgColor};">
  <div style="max-width:512px;margin:0 auto;">
    <h2 style="font-size:2.5rem;font-weight:700;color:#fff;margin-bottom:20px;">${data.headline}</h2>
    <p style="color:rgba(199,210,254,1);font-size:1.25rem;margin-bottom:40px;">${data.subtext}</p>
    <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;">
      <a href="#" style="padding:16px 32px;background:#fff;color:#1e1b4b;border-radius:12px;font-weight:700;font-size:1.125rem;">${data.primaryBtn}</a>
      <a href="#" style="padding:16px 32px;color:#fff;text-decoration:underline;font-size:1.125rem;">${data.secondaryBtn}</a>
    </div>
  </div>
</section>`,
  },

  {
    type: 'faq',
    label: 'FAQ',
    emoji: '❓',
    category: 'Content',
    fields: [
      { key: 'title', label: 'Section Title', type: 'text' },
      {
        key: 'items',
        label: 'Questions',
        type: 'array',
        arrayItemFields: [
          { key: 'question', label: 'Question', type: 'text' },
          { key: 'answer', label: 'Answer', type: 'textarea' },
        ],
      },
    ],
    defaultData: {
      title: 'Frequently Asked Questions',
      items: [
        { question: 'Do I need to know how to code?', answer: 'Not at all. AI Page Builder is designed for non-technical users. Just drag blocks, type your content, and click export. The AI handles everything else.' },
        { question: 'Can I use my own domain?', answer: 'Yes! On the Pro plan you can publish directly to any custom domain. On Starter, you get a free subdomain.' },
        { question: 'How does the AI content generation work?', answer: 'We use Claude AI (Haiku 4.5) to generate copy based on your prompts. Just select a section, describe what you want, and the AI fills it in.' },
        { question: 'Can I export the code?', answer: 'Absolutely. Every page exports to clean, dependency-free HTML and CSS that you can host anywhere — Vercel, Netlify, GitHub Pages, or your own server.' },
      ],
    },
    renderCanvas: (data, onUpdate) => (
      <section className="py-20 px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <IE as="h2" value={data.title} fieldKey="title" onUpdate={onUpdate}
            className="text-4xl font-bold text-gray-900 text-center mb-12 block" />
          <div className="space-y-4">
            {data.items?.map((item: any, i: number) => (
              <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-6 py-5 font-semibold text-gray-900 flex justify-between items-center cursor-pointer hover:bg-gray-50">
                  <span>{item.question}</span>
                  <span className="text-gray-400 text-xl">+</span>
                </div>
                <div className="px-6 pb-5 text-gray-600 leading-relaxed text-sm border-t border-gray-100 pt-4">
                  {item.answer}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
    exportHtml: (data) => `
<section style="padding:80px 32px;background:#fff;">
  <div style="max-width:672px;margin:0 auto;">
    <h2 style="font-size:2.5rem;font-weight:700;color:#111827;text-align:center;margin-bottom:48px;">${data.title}</h2>
    ${(data.items || []).map((item: any) => `
    <details style="border:1px solid #e5e7eb;border-radius:12px;margin-bottom:16px;overflow:hidden;">
      <summary style="padding:20px 24px;font-weight:600;color:#111827;cursor:pointer;list-style:none;display:flex;justify-content:space-between;">${item.question} <span>+</span></summary>
      <div style="padding:16px 24px 20px;color:#6b7280;line-height:1.7;border-top:1px solid #f3f4f6;">${item.answer}</div>
    </details>`).join('')}
  </div>
</section>`,
  },

  {
    type: 'text-content',
    label: 'Text & Content',
    emoji: '📝',
    category: 'Content',
    fields: [
      { key: 'variant', label: 'Layout', type: 'select', options: [
        { value: 'text-only', label: 'Text Only' },
        { value: 'split', label: 'Split w/ Image' },
        { value: 'split-reverse', label: 'Split (image left)' },
      ]},
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'body', label: 'Body Text', type: 'textarea' },
      { key: 'imageUrl', label: 'Image URL (for split)', type: 'url', placeholder: 'https://...' },
      { key: 'bgColor', label: 'Background', type: 'color' },
      { key: 'textAlign', label: 'Alignment', type: 'select', options: [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }] },
    ],
    defaultData: {
      variant: 'text-only',
      eyebrow: 'Our Story',
      title: 'We Believe Building Should Be Fun Again',
      body: 'Too many builders get stuck in the weeds of design tools and frameworks. We built AI Page Builder because we believe the best ideas deserve to ship fast — without sacrificing quality. Our mission is simple: make professional web pages accessible to everyone.',
      imageUrl: '',
      bgColor: '#f8fafc',
      textAlign: 'center',
    },
    renderCanvas: (data, onUpdate) => {
      const v = data.variant || 'text-only';
      const isReverse = v === 'split-reverse';

      if (v === 'split' || v === 'split-reverse') {
        return (
          <section className="py-20 px-8" style={{ backgroundColor: data.bgColor }}>
            <div className={`max-w-5xl mx-auto flex items-center gap-12 flex-wrap ${isReverse ? 'flex-row-reverse' : ''}`}>
              <div className="flex-1 min-w-[260px]">
                {data.eyebrow && (
                  <IE as="p" value={data.eyebrow} fieldKey="eyebrow" onUpdate={onUpdate}
                    className="text-sm font-semibold uppercase tracking-widest text-indigo-600 mb-4 block" />
                )}
                <IE as="h2" value={data.title} fieldKey="title" onUpdate={onUpdate}
                  className="text-4xl font-bold text-gray-900 mb-6 block" />
                <IE as="p" value={data.body} fieldKey="body" onUpdate={onUpdate}
                  className="text-lg text-gray-600 leading-relaxed block" />
              </div>
              <div className="flex-1 min-w-[260px]">
                {data.imageUrl ? (
                  <img src={data.imageUrl} alt="" className="rounded-2xl shadow-xl w-full object-cover" style={{ maxHeight: '400px' }} />
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-slate-300 aspect-video flex flex-col items-center justify-center gap-2 bg-white">
                    <span className="text-4xl">🖼️</span>
                    <p className="text-slate-400 text-sm text-center px-4">Paste an image URL<br/>in the Image URL field →</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      }

      return (
        <section className="py-20 px-8" style={{ backgroundColor: data.bgColor }}>
          <div className={`max-w-3xl mx-auto ${data.textAlign === 'center' ? 'text-center' : 'text-left'}`}>
            {data.eyebrow && (
              <IE as="p" value={data.eyebrow} fieldKey="eyebrow" onUpdate={onUpdate}
                className="text-sm font-semibold uppercase tracking-widest text-indigo-600 mb-4 block" />
            )}
            <IE as="h2" value={data.title} fieldKey="title" onUpdate={onUpdate}
              className="text-4xl font-bold text-gray-900 mb-6 block" />
            <IE as="p" value={data.body} fieldKey="body" onUpdate={onUpdate}
              className="text-lg text-gray-600 leading-relaxed block" />
          </div>
        </section>
      );
    },
    exportHtml: (data) => {
      const v = data.variant || 'text-only';
      const isReverse = v === 'split-reverse';
      if (v === 'split' || v === 'split-reverse') return `
<section style="padding:80px 32px;background:${data.bgColor};">
  <div style="max-width:960px;margin:0 auto;display:flex;align-items:center;gap:48px;flex-wrap:wrap;${isReverse ? 'flex-direction:row-reverse;' : ''}">
    <div style="flex:1;min-width:260px;">
      ${data.eyebrow ? `<p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#4f46e5;margin-bottom:16px;">${data.eyebrow}</p>` : ''}
      <h2 style="font-size:2.5rem;font-weight:700;color:#111827;margin-bottom:24px;">${data.title}</h2>
      <p style="font-size:1.125rem;color:#6b7280;line-height:1.8;">${data.body}</p>
    </div>
    <div style="flex:1;min-width:260px;">
      ${data.imageUrl ? `<img src="${data.imageUrl}" alt="" style="border-radius:16px;box-shadow:0 20px 40px rgba(0,0,0,0.1);width:100%;object-fit:cover;max-height:400px;" />` : `<div style="border-radius:16px;background:#f1f5f9;aspect-ratio:16/9;"></div>`}
    </div>
  </div>
</section>`;
      return `
<section style="padding:80px 32px;background:${data.bgColor};">
  <div style="max-width:672px;margin:0 auto;text-align:${data.textAlign};">
    ${data.eyebrow ? `<p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#4f46e5;margin-bottom:16px;">${data.eyebrow}</p>` : ''}
    <h2 style="font-size:2.5rem;font-weight:700;color:#111827;margin-bottom:24px;">${data.title}</h2>
    <p style="font-size:1.125rem;color:#6b7280;line-height:1.8;">${data.body}</p>
  </div>
</section>`;
    },
  },

  {
    type: 'stats',
    label: 'Stats / Numbers',
    emoji: '📊',
    category: 'Content',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      {
        key: 'stats',
        label: 'Stats',
        type: 'array',
        arrayItemFields: [
          { key: 'value', label: 'Value (e.g. 10K+)', type: 'text' },
          { key: 'label', label: 'Label', type: 'text' },
        ],
      },
      { key: 'bgColor', label: 'Background Color', type: 'color' },
    ],
    defaultData: {
      title: 'Trusted by Teams Around the World',
      stats: [
        { value: '50K+', label: 'Pages Built' },
        { value: '12K+', label: 'Happy Users' },
        { value: '99.9%', label: 'Uptime' },
        { value: '4.9/5', label: 'User Rating' },
      ],
      bgColor: '#0f172a',
    },
    renderCanvas: (data, onUpdate) => (
      <section className="py-20 px-8 text-white" style={{ backgroundColor: data.bgColor }}>
        <div className="max-w-5xl mx-auto text-center">
          <IE as="h2" value={data.title} fieldKey="title" onUpdate={onUpdate}
            className="text-3xl font-bold mb-12 block" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {data.stats?.map((s: any, i: number) => (
              <div key={i}>
                <div className="text-5xl font-bold text-white mb-2">{s.value}</div>
                <div className="text-slate-400 text-sm font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
    exportHtml: (data) => `
<section style="padding:80px 32px;background:${data.bgColor};color:#fff;text-align:center;">
  <div style="max-width:960px;margin:0 auto;">
    <h2 style="font-size:2rem;font-weight:700;margin-bottom:48px;">${data.title}</h2>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:32px;">
      ${(data.stats || []).map((s: any) => `
      <div>
        <div data-counter style="font-size:3rem;font-weight:700;color:#fff;margin-bottom:8px;">${s.value}</div>
        <div style="color:#94a3b8;font-size:14px;font-weight:500;">${s.label}</div>
      </div>`).join('')}
    </div>
  </div>
</section>`,
  },

  {
    type: 'footer',
    label: 'Footer',
    emoji: '🦶',
    category: 'Footer',
    fields: [
      { key: 'brand', label: 'Brand Name', type: 'text' },
      { key: 'tagline', label: 'Tagline', type: 'text' },
      { key: 'copyright', label: 'Copyright', type: 'text' },
      { key: 'links', label: 'Links (comma-separated)', type: 'textarea' },
      { key: 'bgColor', label: 'Background Color', type: 'color' },
    ],
    defaultData: {
      brand: 'AI PageBuilder',
      tagline: 'Build beautiful pages with AI.',
      copyright: `© ${new Date().getFullYear()} AI PageBuilder. All rights reserved.`,
      links: 'About,Blog,Pricing,Docs,Privacy,Terms,Contact',
      bgColor: '#0f172a',
    },
    renderCanvas: (data, onUpdate) => {
      const links = typeof data.links === 'string' ? data.links.split(',') : data.links || [];
      return (
        <footer className="py-16 px-8 text-white" style={{ backgroundColor: data.bgColor }}>
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-8">
              <div>
                <IE as="h3" value={data.brand} fieldKey="brand" onUpdate={onUpdate}
                  className="text-xl font-bold mb-2 block" />
                <IE as="p" value={data.tagline} fieldKey="tagline" onUpdate={onUpdate}
                  className="text-slate-400 text-sm block" />
              </div>
              <div className="flex flex-wrap gap-6">
                {links.map((link: string, i: number) => (
                  <a key={i} href="#" className="text-slate-400 hover:text-white text-sm transition-colors">
                    {link.trim()}
                  </a>
                ))}
              </div>
            </div>
            <div className="border-t border-slate-800 pt-8">
              <IE as="p" value={data.copyright} fieldKey="copyright" onUpdate={onUpdate}
                className="text-slate-500 text-sm block" />
            </div>
          </div>
        </footer>
      );
    },
    exportHtml: (data) => {
      const links = typeof data.links === 'string' ? data.links.split(',') : data.links || [];
      return `
<footer style="padding:64px 32px;background:${data.bgColor};color:#fff;">
  <div style="max-width:960px;margin:0 auto;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:48px;flex-wrap:wrap;gap:32px;">
      <div>
        <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:8px;">${data.brand}</h3>
        <p style="color:#94a3b8;font-size:14px;">${data.tagline}</p>
      </div>
      <div style="display:flex;gap:24px;flex-wrap:wrap;">
        ${links.map((l: string) => `<a href="#" style="color:#94a3b8;text-decoration:none;font-size:14px;">${l.trim()}</a>`).join('')}
      </div>
    </div>
    <div style="border-top:1px solid #1e293b;padding-top:32px;">
      <p style="color:#475569;font-size:14px;">${data.copyright}</p>
    </div>
  </div>
</footer>`;
    },
  },

  {
    type: 'video',
    label: 'Video',
    emoji: '🎬',
    category: 'Media',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { key: 'videoUrl', label: 'YouTube Embed URL', type: 'url', placeholder: 'https://www.youtube.com/embed/VIDEO_ID' },
      { key: 'thumbnailColor', label: 'Placeholder Color', type: 'color' },
    ],
    defaultData: {
      title: 'See It In Action',
      subtitle: 'Watch how it works and discover everything you can build in minutes.',
      videoUrl: '',
      thumbnailColor: '#1e293b',
    },
    renderCanvas: (data, onUpdate) => (
      <section className="py-20 px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <IE as="h2" value={data.title} fieldKey="title" onUpdate={onUpdate}
              className="text-4xl font-bold text-gray-900 mb-4 block" />
            <IE as="p" value={data.subtitle} fieldKey="subtitle" onUpdate={onUpdate}
              className="text-xl text-gray-500 max-w-2xl mx-auto block" />
          </div>
          <div className="relative rounded-2xl overflow-hidden shadow-2xl" style={{ paddingTop: '56.25%' }}>
            {data.videoUrl ? (
              <iframe
                src={data.videoUrl}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                allowFullScreen
                title="Video"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                style={{ backgroundColor: data.thumbnailColor }}>
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-white text-4xl ml-1">▶</span>
                </div>
                <p className="text-white/60 text-sm">Paste a YouTube embed URL in the panel →</p>
              </div>
            )}
          </div>
        </div>
      </section>
    ),
    exportHtml: (data) => `
<section style="padding:80px 32px;background:#fff;">
  <div style="max-width:896px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:40px;">
      <h2 style="font-size:2.5rem;font-weight:700;color:#111827;margin-bottom:16px;">${data.title}</h2>
      <p style="font-size:1.25rem;color:#6b7280;max-width:512px;margin:0 auto;">${data.subtitle}</p>
    </div>
    <div style="position:relative;padding-top:56.25%;border-radius:16px;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,0.15);">
      ${data.videoUrl
        ? `<iframe src="${data.videoUrl}" style="position:absolute;inset:0;width:100%;height:100%;border:0;" allowfullscreen></iframe>`
        : `<div style="position:absolute;inset:0;background:${data.thumbnailColor};display:flex;align-items:center;justify-content:center;"><div style="width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-size:2rem;margin-left:6px;">▶</span></div></div>`
      }
    </div>
  </div>
</section>`,
  },

  {
    type: 'logo-cloud',
    label: 'Logo Cloud',
    emoji: '🏢',
    category: 'Social',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      {
        key: 'logos',
        label: 'Logos',
        type: 'array',
        arrayItemFields: [
          { key: 'name', label: 'Company Name', type: 'text' },
          { key: 'initial', label: 'Initials (2 chars)', type: 'text' },
        ],
      },
    ],
    defaultData: {
      title: 'Trusted by Industry Leaders',
      logos: [
        { name: 'Microsoft', initial: 'Ms' },
        { name: 'Google', initial: 'Gg' },
        { name: 'Stripe', initial: 'St' },
        { name: 'Shopify', initial: 'Sh' },
        { name: 'Vercel', initial: 'Vc' },
        { name: 'Figma', initial: 'Fg' },
      ],
    },
    renderCanvas: (data, onUpdate) => (
      <section className="py-16 px-8 bg-slate-50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto">
          <IE as="p" value={data.title} fieldKey="title" onUpdate={onUpdate}
            className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-10 block" />
          <div className="flex flex-wrap justify-center items-center gap-10">
            {data.logos?.map((logo: any, i: number) => (
              <div key={i} className="flex items-center gap-2.5 opacity-50 hover:opacity-100 transition-opacity cursor-default">
                <div className="w-8 h-8 rounded-md bg-slate-400 flex items-center justify-center text-white text-xs font-bold">
                  {logo.initial}
                </div>
                <span className="text-lg font-bold text-slate-400">{logo.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
    exportHtml: (data) => `
<section style="padding:64px 32px;background:#f8fafc;border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;">
  <div style="max-width:960px;margin:0 auto;">
    <p style="text-align:center;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:40px;">${data.title}</p>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:40px;">
      ${(data.logos || []).map((l: any) => `
      <div style="display:flex;align-items:center;gap:10px;opacity:0.5;">
        <div style="width:32px;height:32px;border-radius:6px;background:#94a3b8;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;flex-shrink:0;">${l.initial}</div>
        <span style="font-size:1.125rem;font-weight:700;color:#475569;">${l.name}</span>
      </div>`).join('')}
    </div>
  </div>
</section>`,
  },

  {
    type: 'newsletter',
    label: 'Newsletter',
    emoji: '📧',
    category: 'CTA',
    fields: [
      { key: 'headline', label: 'Headline', type: 'text' },
      { key: 'subtext', label: 'Subtext', type: 'textarea' },
      { key: 'placeholder', label: 'Input Placeholder', type: 'text' },
      { key: 'btnText', label: 'Button Text', type: 'text' },
      { key: 'bgColor', label: 'Background Color', type: 'color' },
    ],
    defaultData: {
      headline: 'Stay in the Loop',
      subtext: 'Get the latest updates, tips, and exclusive content delivered straight to your inbox. No spam, ever.',
      placeholder: 'Enter your email address',
      btnText: 'Subscribe Free',
      bgColor: '#f0f9ff',
    },
    renderCanvas: (data, onUpdate) => <NewsletterBlock data={data} onUpdate={onUpdate} />,
    exportHtml: (data) => `
<section style="padding:80px 32px;background:${data.bgColor};">
  <div style="max-width:512px;margin:0 auto;text-align:center;">
    <h2 style="font-size:2rem;font-weight:700;color:#111827;margin-bottom:16px;">${data.headline}</h2>
    <p style="color:#6b7280;margin-bottom:32px;line-height:1.7;">${data.subtext}</p>
    <form style="display:flex;gap:8px;max-width:400px;margin:0 auto;" onsubmit="return false;">
      <input type="email" placeholder="${data.placeholder}" style="flex:1;padding:12px 16px;border-radius:12px;border:1px solid #e5e7eb;font-size:14px;outline:none;min-width:0;" />
      <button type="submit" style="padding:12px 20px;background:#4f46e5;color:#fff;border-radius:12px;font-weight:600;font-size:14px;border:none;cursor:pointer;white-space:nowrap;">${data.btnText}</button>
    </form>
    <p style="font-size:12px;color:#9ca3af;margin-top:12px;">Unsubscribe anytime. No credit card required.</p>
  </div>
</section>`,
  },
  {
    type: 'richtext',
    label: 'Rich Text',
    emoji: '📄',
    category: 'Content',
    fields: [
      { key: 'content', label: 'Content (Markdown-like)', type: 'textarea' },
      { key: 'bgColor', label: 'Background', type: 'color' },
      { key: 'maxWidth', label: 'Max Width', type: 'select', options: [
        { value: 'sm', label: 'Narrow (640px)' },
        { value: 'md', label: 'Medium (768px)' },
        { value: 'lg', label: 'Wide (960px)' },
      ]},
    ],
    defaultData: {
      content: `# Why We Built This

Every great product starts with a story. Ours began when we realized that **building a landing page shouldn't take weeks**.

## The Problem

Traditional page builders lock you in. They're slow, bloated, and require designers, developers, and copywriters just to launch a single page.

## Our Solution

We built AI PageBuilder to be different. It's fast, intelligent, and puts you in control. No dependencies. No lock-in. Just clean, beautiful pages.

> "The best tools disappear into your workflow." — That's what we built.`,
      bgColor: '#ffffff',
      maxWidth: 'md',
    },
    renderCanvas: (data, onUpdate) => {
      const widths = { sm: 'max-w-xl', md: 'max-w-3xl', lg: 'max-w-5xl' };
      const lines = (data.content || '').split('\n');
      return (
        <section className="py-20 px-8" style={{ backgroundColor: data.bgColor }}>
          <div className={`${widths[data.maxWidth as 'sm'|'md'|'lg'] || 'max-w-3xl'} mx-auto`}>
            {onUpdate ? (
              <textarea
                value={data.content || ''}
                onChange={(e) => onUpdate('content', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                rows={12}
                className="w-full bg-transparent text-gray-800 text-sm leading-relaxed resize-none focus:outline-none border-2 border-dashed border-blue-300 rounded-lg p-4 font-mono"
                placeholder="Write your content here... Use # for headings, ## for subheadings, **bold**, > for quotes"
              />
            ) : (
              <div className="prose prose-lg max-w-none">
                {lines.map((line: string, i: number) => {
                  if (line.startsWith('# ')) return <h1 key={i} className="text-4xl font-bold text-gray-900 mb-6 mt-8 first:mt-0">{line.slice(2)}</h1>;
                  if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold text-gray-900 mb-4 mt-8">{line.slice(3)}</h2>;
                  if (line.startsWith('### ')) return <h3 key={i} className="text-xl font-semibold text-gray-900 mb-3 mt-6">{line.slice(4)}</h3>;
                  if (line.startsWith('> ')) return <blockquote key={i} className="border-l-4 border-indigo-400 pl-4 italic text-gray-600 my-4">{line.slice(2)}</blockquote>;
                  if (line.startsWith('- ')) return <li key={i} className="text-gray-600 leading-relaxed ml-4 list-disc">{line.slice(2)}</li>;
                  if (line === '') return <div key={i} className="h-3" />;
                  const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                  return <p key={i} className="text-gray-600 leading-relaxed mb-3" dangerouslySetInnerHTML={{ __html: bold }} />;
                })}
              </div>
            )}
          </div>
        </section>
      );
    },
    exportHtml: (data) => {
      const widths = { sm: '640px', md: '768px', lg: '960px' };
      const maxWidth = widths[data.maxWidth as 'sm'|'md'|'lg'] || '768px';
      const lines = (data.content || '').split('\n');
      const html = lines.map((line: string) => {
        if (line.startsWith('# ')) return `<h1 style="font-size:2.5rem;font-weight:700;color:#111827;margin:0 0 24px;">${line.slice(2)}</h1>`;
        if (line.startsWith('## ')) return `<h2 style="font-size:1.75rem;font-weight:700;color:#111827;margin:32px 0 16px;">${line.slice(3)}</h2>`;
        if (line.startsWith('### ')) return `<h3 style="font-size:1.25rem;font-weight:600;color:#111827;margin:24px 0 12px;">${line.slice(4)}</h3>`;
        if (line.startsWith('> ')) return `<blockquote style="border-left:4px solid #6366f1;padding-left:16px;font-style:italic;color:#6b7280;margin:16px 0;">${line.slice(2)}</blockquote>`;
        if (line.startsWith('- ')) return `<li style="color:#6b7280;margin-bottom:8px;line-height:1.7;">${line.slice(2)}</li>`;
        if (line === '') return '<div style="height:12px;"></div>';
        const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return `<p style="color:#6b7280;line-height:1.8;margin-bottom:12px;">${bold}</p>`;
      }).join('\n');
      return `
<section style="padding:80px 32px;background:${data.bgColor};">
  <div style="max-width:${maxWidth};margin:0 auto;">
    ${html}
  </div>
</section>`;
    },
  },

  {
    type: 'contact',
    label: 'Contact Form',
    emoji: '📬',
    category: 'CTA',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { key: 'nameLabel', label: 'Name Field Label', type: 'text', placeholder: 'Name' },
      { key: 'emailLabel', label: 'Email Field Label', type: 'text', placeholder: 'Email' },
      { key: 'messageLabel', label: 'Message Field Label', type: 'text', placeholder: 'Message' },
      { key: 'btnText', label: 'Button Text', type: 'text', placeholder: 'Send Message' },
    ],
    defaultData: {
      title: 'Get in Touch',
      subtitle: 'Have a question or want to work together? We\'d love to hear from you.',
      nameLabel: 'Full Name',
      emailLabel: 'Email Address',
      messageLabel: 'Your Message',
      btnText: 'Send Message',
    },
    renderCanvas: (data, onUpdate) => <ContactFormBlock data={data} onUpdate={onUpdate} />,
    exportHtml: (data) => `
<section style="padding:80px 32px;background:#fff;">
  <div style="max-width:512px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:40px;">
      <h2 style="font-size:2.5rem;font-weight:700;color:#111827;margin-bottom:12px;">${data.title}</h2>
      <p style="font-size:1.125rem;color:#6b7280;">${data.subtitle}</p>
    </div>
    <form id="contact-form" style="display:flex;flex-direction:column;gap:16px;" onsubmit="handleContact(event)">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div>
          <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px;">${data.nameLabel || 'Name'}</label>
          <input type="text" name="name" placeholder="Your name" style="width:100%;padding:12px 16px;border-radius:12px;border:1px solid #e5e7eb;font-size:14px;outline:none;" />
        </div>
        <div>
          <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px;">${data.emailLabel || 'Email'}</label>
          <input type="email" name="email" placeholder="your@email.com" required style="width:100%;padding:12px 16px;border-radius:12px;border:1px solid #e5e7eb;font-size:14px;outline:none;" />
        </div>
      </div>
      <div>
        <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px;">${data.messageLabel || 'Message'}</label>
        <textarea name="message" rows="5" placeholder="Tell us about your project..." style="width:100%;padding:12px 16px;border-radius:12px;border:1px solid #e5e7eb;font-size:14px;outline:none;resize:none;"></textarea>
      </div>
      <div id="contact-status" style="display:none;text-align:center;padding:12px;border-radius:12px;"></div>
      <button type="submit" style="padding:14px;background:#4f46e5;color:#fff;border-radius:12px;font-weight:600;border:none;cursor:pointer;font-size:15px;">${data.btnText || 'Send Message'}</button>
    </form>
  </div>
</section>
<script>
function handleContact(e){
  e.preventDefault();
  var form=e.target,data={name:form.name.value,email:form.email.value,message:form.message.value};
  var status=document.getElementById('contact-status');
  status.style.display='block';status.style.background='#f1f5f9';status.textContent='Sending…';
  fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
    .then(function(r){return r.json();})
    .then(function(r){
      if(r.success){status.style.background='#dcfce7';status.style.color='#15803d';status.textContent='✅ Message sent! We\\'ll get back to you shortly.';}
      else{status.style.background='#fee2e2';status.style.color='#dc2626';status.textContent='Error. Please try again.';}
    }).catch(function(){status.style.background='#fee2e2';status.style.color='#dc2626';status.textContent='Error. Please try again.';});
}
</script>`,
  },

  {
    type: 'steps',
    label: 'How It Works',
    emoji: '📋',
    category: 'Content',
    fields: [
      { key: 'title', label: 'Section Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      {
        key: 'steps',
        label: 'Steps',
        type: 'array',
        arrayItemFields: [
          { key: 'icon', label: 'Icon (emoji)', type: 'text' },
          { key: 'title', label: 'Step Title', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
        ],
      },
      { key: 'bgColor', label: 'Background', type: 'color' },
    ],
    defaultData: {
      title: 'How It Works',
      subtitle: 'Get started in three simple steps. No technical knowledge required.',
      steps: [
        { icon: '📝', title: 'Describe Your Page', description: 'Tell us what your page is for — your product, service, or idea. The more detail, the better the result.' },
        { icon: '🤖', title: 'AI Writes the Copy', description: 'Our AI writes compelling headlines, body copy, and calls to action tailored to your specific goal.' },
        { icon: '🚀', title: 'Publish & Go Live', description: 'Export clean HTML or publish directly to Shopify. Your page is live in minutes, not days.' },
      ],
      bgColor: '#f8fafc',
    },
    renderCanvas: (data, onUpdate) => (
      <section className="py-20 px-8" style={{ backgroundColor: data.bgColor }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <IE as="h2" value={data.title} fieldKey="title" onUpdate={onUpdate}
              className="text-4xl font-bold text-gray-900 mb-4 block" />
            <IE as="p" value={data.subtitle} fieldKey="subtitle" onUpdate={onUpdate}
              className="text-xl text-gray-500 max-w-2xl mx-auto block" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {data.steps?.map((step: any, i: number) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center text-4xl shadow-lg shadow-indigo-200">
                    {step.icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center text-xs font-bold text-indigo-600 shadow-sm">
                    {i + 1}
                  </div>
                </div>
                {i < (data.steps?.length - 1) && (
                  <div className="hidden md:block absolute top-10 left-[calc(50%+56px)] w-[calc(100%-112px)] border-t-2 border-dashed border-indigo-200 pointer-events-none" />
                )}
                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
    exportHtml: (data) => `
<section style="padding:80px 32px;background:${data.bgColor};">
  <div style="max-width:960px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:64px;">
      <h2 style="font-size:2.5rem;font-weight:700;color:#111827;margin-bottom:16px;">${data.title}</h2>
      <p style="font-size:1.25rem;color:#6b7280;max-width:512px;margin:0 auto;">${data.subtitle}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:32px;">
      ${(data.steps || []).map((step: any, i: number) => `
      <div style="text-align:center;">
        <div style="position:relative;display:inline-block;margin-bottom:24px;">
          <div style="width:80px;height:80px;border-radius:24px;background:#4f46e5;display:flex;align-items:center;justify-content:center;font-size:2rem;box-shadow:0 8px 24px rgba(79,70,229,0.25);">${step.icon}</div>
          <div style="position:absolute;top:-8px;right:-8px;width:28px;height:28px;border-radius:50%;background:#fff;border:2px solid #4f46e5;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#4f46e5;">${i + 1}</div>
        </div>
        <h3 style="font-size:1.25rem;font-weight:700;color:#111827;margin-bottom:12px;">${step.title}</h3>
        <p style="color:#6b7280;font-size:0.875rem;line-height:1.7;">${step.description}</p>
      </div>`).join('')}
    </div>
  </div>
</section>`,
  },

  {
    type: 'comparison',
    label: 'Comparison Table',
    emoji: '⚖️',
    category: 'Content',
    fields: [
      { key: 'title', label: 'Section Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { key: 'col1', label: 'Column 1 Header', type: 'text' },
      { key: 'col2', label: 'Column 2 Header', type: 'text' },
      { key: 'col2Highlight', label: 'Highlight Col 2 (true/false)', type: 'text' },
      {
        key: 'rows',
        label: 'Rows',
        type: 'array',
        arrayItemFields: [
          { key: 'feature', label: 'Feature', type: 'text' },
          { key: 'col1', label: 'Col 1 Value', type: 'text' },
          { key: 'col2', label: 'Col 2 Value', type: 'text' },
        ],
      },
    ],
    defaultData: {
      title: 'Us vs. The Old Way',
      subtitle: 'See exactly why teams switch to us and never look back.',
      col1: 'Old Way',
      col2: 'AI PageBuilder',
      col2Highlight: 'true',
      rows: [
        { feature: 'Time to first page', col1: '2–4 weeks', col2: '< 10 minutes' },
        { feature: 'Design skills needed', col1: 'Yes — hire a designer', col2: 'None — AI handles it' },
        { feature: 'Copy / content', col1: 'Hire a copywriter', col2: 'AI writes it for you' },
        { feature: 'Price', col1: '$2,000–$10,000', col2: 'From $0/month' },
        { feature: 'Revisions', col1: 'Back and forth for weeks', col2: 'One click, instant' },
        { feature: 'Export quality', col1: 'Locked to platform', col2: 'Clean HTML, yours forever' },
      ],
    },
    renderCanvas: (data, onUpdate) => {
      const isHighlighted = data.col2Highlight !== 'false';
      return (
        <section className="py-20 px-8 bg-white">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <IE as="h2" value={data.title} fieldKey="title" onUpdate={onUpdate}
                className="text-4xl font-bold text-gray-900 mb-4 block" />
              <IE as="p" value={data.subtitle} fieldKey="subtitle" onUpdate={onUpdate}
                className="text-xl text-gray-500 block" />
            </div>
            <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
              <div className="grid grid-cols-3 bg-slate-50">
                <div className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Feature</div>
                <div className="px-6 py-4 text-sm font-semibold text-slate-600 text-center">{data.col1}</div>
                <div className={`px-6 py-4 text-sm font-bold text-center ${isHighlighted ? 'bg-indigo-600 text-white' : 'text-slate-800'}`}>{data.col2}</div>
              </div>
              {data.rows?.map((row: any, i: number) => (
                <div key={i} className={`grid grid-cols-3 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                  <div className="px-6 py-4 text-sm font-medium text-slate-700">{row.feature}</div>
                  <div className="px-6 py-4 text-sm text-slate-500 text-center">{row.col1}</div>
                  <div className={`px-6 py-4 text-sm font-semibold text-center ${isHighlighted ? 'text-indigo-600' : 'text-slate-800'}`}>{row.col2}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    },
    exportHtml: (data) => {
      const isHL = data.col2Highlight !== 'false';
      return `
<section style="padding:80px 32px;background:#fff;">
  <div style="max-width:672px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:48px;">
      <h2 style="font-size:2.5rem;font-weight:700;color:#111827;margin-bottom:16px;">${data.title}</h2>
      <p style="font-size:1.25rem;color:#6b7280;">${data.subtitle}</p>
    </div>
    <div style="border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 1px 8px rgba(0,0,0,0.06);">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;background:#f8fafc;">
        <div style="padding:16px 24px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;">Feature</div>
        <div style="padding:16px 24px;font-size:14px;font-weight:600;color:#475569;text-align:center;">${data.col1}</div>
        <div style="padding:16px 24px;font-size:14px;font-weight:700;text-align:center;${isHL ? 'background:#4f46e5;color:#fff;' : 'color:#111827;'}">${data.col2}</div>
      </div>
      ${(data.rows || []).map((row: any, i: number) => `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;${i % 2 === 0 ? 'background:#fff;' : 'background:#fafafa;'}">
        <div style="padding:16px 24px;font-size:14px;font-weight:500;color:#374151;">${row.feature}</div>
        <div style="padding:16px 24px;font-size:14px;color:#6b7280;text-align:center;">${row.col1}</div>
        <div style="padding:16px 24px;font-size:14px;font-weight:600;text-align:center;${isHL ? 'color:#4f46e5;' : 'color:#111827;'}">${row.col2}</div>
      </div>`).join('')}
    </div>
  </div>
</section>`;
    },
  },

  {
    type: 'team',
    label: 'Team',
    emoji: '👥',
    category: 'Social',
    fields: [
      { key: 'title', label: 'Section Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      {
        key: 'members',
        label: 'Team Members',
        type: 'array',
        arrayItemFields: [
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'role', label: 'Role', type: 'text' },
          { key: 'bio', label: 'Bio', type: 'textarea' },
          { key: 'avatar', label: 'Avatar Initials', type: 'text' },
          { key: 'avatarBg', label: 'Avatar Color', type: 'color' },
          { key: 'imageUrl', label: 'Photo URL (optional)', type: 'url' },
        ],
      },
    ],
    defaultData: {
      title: 'Meet the Team',
      subtitle: 'The people behind the product — passionate builders dedicated to helping you succeed.',
      members: [
        { name: 'Alex Johnson', role: 'CEO & Co-founder', bio: 'Former product lead at Stripe. Obsessed with making complex things simple.', avatar: 'AJ', avatarBg: '#4f46e5', imageUrl: '' },
        { name: 'Maria Chen', role: 'CTO & Co-founder', bio: 'Built AI systems at Google. Now applying that experience to help small teams.', avatar: 'MC', avatarBg: '#0891b2', imageUrl: '' },
        { name: 'Sam Rivera', role: 'Head of Design', bio: 'Design veteran from Figma and Linear. Believes great UX is invisible.', avatar: 'SR', avatarBg: '#059669', imageUrl: '' },
      ],
    },
    renderCanvas: (data, onUpdate) => (
      <section className="py-20 px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <IE as="h2" value={data.title} fieldKey="title" onUpdate={onUpdate}
              className="text-4xl font-bold text-gray-900 mb-4 block" />
            <IE as="p" value={data.subtitle} fieldKey="subtitle" onUpdate={onUpdate}
              className="text-xl text-gray-500 max-w-2xl mx-auto block" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {data.members?.map((member: any, i: number) => (
              <div key={i} className="flex flex-col items-center text-center p-8 rounded-2xl bg-slate-50 hover:shadow-lg transition-all">
                {member.imageUrl ? (
                  <img src={member.imageUrl} alt={member.name}
                    className="w-24 h-24 rounded-full object-cover mb-5 ring-4 ring-white shadow-lg" />
                ) : (
                  <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-5 shadow-lg ring-4 ring-white"
                    style={{ backgroundColor: member.avatarBg }}>
                    {member.avatar}
                  </div>
                )}
                <h3 className="text-lg font-bold text-gray-900 mb-1">{member.name}</h3>
                <p className="text-indigo-600 text-sm font-medium mb-3">{member.role}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
    exportHtml: (data) => `
<section style="padding:80px 32px;background:#fff;">
  <div style="max-width:960px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:64px;">
      <h2 style="font-size:2.5rem;font-weight:700;color:#111827;margin-bottom:16px;">${data.title}</h2>
      <p style="font-size:1.25rem;color:#6b7280;max-width:512px;margin:0 auto;">${data.subtitle}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:32px;">
      ${(data.members || []).map((m: any) => `
      <div style="text-align:center;padding:32px;border-radius:16px;background:#f8fafc;">
        ${m.imageUrl
          ? `<img src="${m.imageUrl}" alt="${m.name}" style="width:96px;height:96px;border-radius:50%;object-fit:cover;margin:0 auto 20px;display:block;box-shadow:0 4px 16px rgba(0,0,0,0.1);" />`
          : `<div style="width:96px;height:96px;border-radius:50%;background:${m.avatarBg};display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.5rem;font-weight:700;margin:0 auto 20px;">${m.avatar}</div>`
        }
        <h3 style="font-size:1.125rem;font-weight:700;color:#111827;margin-bottom:4px;">${m.name}</h3>
        <p style="font-size:14px;color:#4f46e5;font-weight:500;margin-bottom:12px;">${m.role}</p>
        <p style="color:#6b7280;font-size:0.875rem;line-height:1.7;">${m.bio}</p>
      </div>`).join('')}
    </div>
  </div>
</section>`,
  },
];

export default BLOCK_DEFS;
export const getBlockDef = (type: string) => BLOCK_DEFS.find((b) => b.type === type);
