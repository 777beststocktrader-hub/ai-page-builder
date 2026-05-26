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
      const navBg = isTransparent ? 'transparent' : isBlur ? 'rgba(15,23,42,0.85)' : data.bgColor;
      const navBgMobile = isTransparent ? (data.bgColor || '#0f172a') : navBg;
      return `
<nav id="navbar" style="padding:16px 32px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;${isBlur ? 'backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,0.08);' : ''}background:${navBg};">
  <span style="color:#fff;font-weight:700;font-size:1.125rem;">${data.brand}</span>
  <div id="nav-links" style="display:flex;align-items:center;gap:24px;">
    ${links.map((l: string) => `<a href="#" style="color:rgba(203,213,225,1);font-size:14px;text-decoration:none;">${l.trim()}</a>`).join('')}
    <a href="#" style="padding:8px 16px;background:#4f46e5;color:#fff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">${data.ctaText}</a>
  </div>
  <button id="nav-toggle" onclick="(function(){var m=document.getElementById('nav-mobile');m.style.display=m.style.display==='flex'?'none':'flex';})()" style="display:none;flex-direction:column;gap:5px;cursor:pointer;background:none;border:none;padding:4px;">
    <span style="display:block;width:22px;height:2px;background:#fff;border-radius:1px;"></span>
    <span style="display:block;width:22px;height:2px;background:#fff;border-radius:1px;"></span>
    <span style="display:block;width:22px;height:2px;background:#fff;border-radius:1px;"></span>
  </button>
</nav>
<div id="nav-mobile" style="display:none;flex-direction:column;gap:0;background:${navBgMobile};padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.1);position:sticky;top:57px;z-index:99;">
  ${links.map((l: string) => `<a href="#" style="display:block;padding:12px 32px;color:rgba(203,213,225,1);font-size:14px;text-decoration:none;">${l.trim()}</a>`).join('')}
  <div style="padding:12px 32px;"><a href="#" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">${data.ctaText}</a></div>
</div>
<style>@media(max-width:768px){#nav-links{display:none!important;}#nav-toggle{display:flex!important;}}</style>`;
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
      { key: 'showToggle', label: 'Show Monthly/Annual Toggle', type: 'select', options: [{ value: 'false', label: 'Monthly only' }, { value: 'true', label: 'Show toggle' }] },
      { key: 'annualDiscount', label: 'Annual Discount Label', type: 'text', placeholder: 'Save 20%' },
      {
        key: 'plans',
        label: 'Pricing Plans',
        type: 'array',
        arrayItemFields: [
          { key: 'name', label: 'Plan Name', type: 'text' },
          { key: 'price', label: 'Monthly Price', type: 'text' },
          { key: 'priceAnnual', label: 'Annual Price (per month)', type: 'text' },
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
      showToggle: 'true',
      annualDiscount: 'Save 20%',
      plans: [
        { name: 'Starter', price: '$0', priceAnnual: '$0', period: '/month', description: 'Perfect for side projects', cta: 'Get Started', highlighted: 'false', features: '5 pages,AI generations,HTML export,Community support' },
        { name: 'Pro', price: '$29', priceAnnual: '$23', period: '/month', description: 'For growing businesses', cta: 'Start Free Trial', highlighted: 'true', features: 'Unlimited pages,Unlimited AI,Custom domain,Priority support,Analytics,Team collaboration' },
        { name: 'Enterprise', price: '$99', priceAnnual: '$79', period: '/month', description: 'For large teams', cta: 'Contact Sales', highlighted: 'false', features: 'Everything in Pro,SSO login,Custom AI training,SLA guarantee,Dedicated support' },
      ],
    },
    renderCanvas: (data, onUpdate) => {
      const showToggle = data.showToggle === 'true';
      return (
        <section className="py-20 px-8 bg-slate-50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <IE as="h2" value={data.title} fieldKey="title" onUpdate={onUpdate}
                className="text-4xl font-bold text-gray-900 mb-3 block" />
              <IE as="p" value={data.subtitle} fieldKey="subtitle" onUpdate={onUpdate}
                className="text-lg text-gray-500 block" />
              {showToggle && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  <span className="text-sm text-gray-600 font-medium">Monthly</span>
                  <div className="w-12 h-6 bg-indigo-600 rounded-full relative cursor-pointer">
                    <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">Annual</span>
                  {data.annualDiscount && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">{data.annualDiscount}</span>
                  )}
                </div>
              )}
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
                        <span className="text-4xl font-bold">{plan.priceAnnual || plan.price}</span>
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
      );
    },
    exportHtml: (data) => {
      const showToggle = data.showToggle === 'true';
      const plans = data.plans || [];
      const plansHtml = (isAnnual: boolean) => plans.map((plan: any) => {
        const isHL = plan.highlighted === 'true';
        const features = typeof plan.features === 'string' ? plan.features.split(',') : plan.features || [];
        const price = isAnnual && plan.priceAnnual ? plan.priceAnnual : plan.price;
        return `<div style="border-radius:16px;padding:32px;${isHL ? 'background:#4f46e5;color:#fff;transform:scale(1.05);box-shadow:0 25px 50px rgba(79,70,229,0.3);' : 'background:#fff;border:1px solid #e5e7eb;'}">
          <p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;color:${isHL ? 'rgba(199,210,254,1)' : '#4f46e5'};">${plan.name}</p>
          <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:8px;"><span style="font-size:2.5rem;font-weight:700;">${price}</span><span style="color:${isHL ? 'rgba(199,210,254,1)' : '#9ca3af'};">${plan.period}</span></div>
          <p style="font-size:14px;color:${isHL ? 'rgba(199,210,254,1)' : '#6b7280'};margin-bottom:24px;">${plan.description}</p>
          <ul style="list-style:none;margin:0 0 32px;padding:0;">
            ${features.map((f: string) => `<li style="display:flex;align-items:center;gap:8px;font-size:14px;margin-bottom:12px;color:${isHL ? 'rgba(224,231,255,1)' : '#374151'};"><span>✓</span>${f.trim()}</li>`).join('')}
          </ul>
          <a href="#" style="display:block;text-align:center;padding:12px;border-radius:12px;font-weight:600;${isHL ? 'background:#fff;color:#4f46e5;' : 'border:2px solid #4f46e5;color:#4f46e5;'}">${plan.cta}</a>
        </div>`;
      }).join('');

      const toggleHtml = showToggle ? `
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:24px;">
      <span id="price-label-m" style="font-size:14px;color:#111827;font-weight:600;">Monthly</span>
      <button id="price-toggle" onclick="(function(){var a=document.getElementById('price-annual')===null?false:true;var mon=document.getElementById('price-monthly');var ann=document.getElementById('price-annual');var tog=document.getElementById('price-toggle');var dot=tog.querySelector('span');if(mon.style.display!=='none'){mon.style.display='none';ann.style.display='grid';dot.style.transform='translateX(20px)';document.getElementById('price-label-a').style.fontWeight='700';document.getElementById('price-label-m').style.fontWeight='400';}else{ann.style.display='none';mon.style.display='grid';dot.style.transform='translateX(0)';document.getElementById('price-label-m').style.fontWeight='700';document.getElementById('price-label-a').style.fontWeight='400';}})()" style="width:48px;height:26px;background:#4f46e5;border-radius:13px;position:relative;cursor:pointer;border:none;flex-shrink:0;">
        <span style="position:absolute;width:20px;height:20px;background:#fff;border-radius:50%;top:3px;left:3px;transition:transform 0.2s;display:block;"></span>
      </button>
      <span id="price-label-a" style="font-size:14px;color:#111827;font-weight:400;">Annual</span>
      ${data.annualDiscount ? `<span style="font-size:12px;background:#dcfce7;color:#166534;padding:2px 8px;border-radius:999px;font-weight:600;">${data.annualDiscount}</span>` : ''}
    </div>` : '';

      return `
<section style="padding:80px 32px;background:#f8fafc;">
  <div style="max-width:960px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:${showToggle ? '24px' : '64px'};">
      <h2 style="font-size:2.5rem;font-weight:700;color:#111827;margin-bottom:12px;">${data.title}</h2>
      <p style="font-size:1.125rem;color:#6b7280;">${data.subtitle}</p>
      ${toggleHtml}
    </div>
    ${showToggle ? `<div id="price-monthly" style="margin-top:40px;display:grid;grid-template-columns:repeat(3,1fr);gap:32px;align-items:start;">${plansHtml(false)}</div><div id="price-annual" style="margin-top:40px;display:none;grid-template-columns:repeat(3,1fr);gap:32px;align-items:start;">${plansHtml(true)}</div>` : `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:32px;align-items:start;">${plansHtml(false)}</div>`}
  </div>
</section>`;
    },
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
  // ── Countdown Timer ──────────────────────────────────────────────────────
  {
    type: 'countdown',
    label: 'Countdown Timer',
    emoji: '⏱️',
    category: 'CTA',
    fields: [
      { key: 'headline', label: 'Headline', type: 'text', placeholder: 'Offer ends soon!' },
      { key: 'subtext', label: 'Subtext', type: 'text', placeholder: 'Don\'t miss out on this limited time deal' },
      { key: 'targetDate', label: 'Target Date (YYYY-MM-DD)', type: 'text', placeholder: '2025-12-31' },
      { key: 'btnText', label: 'Button Text', type: 'text', placeholder: 'Claim Your Discount' },
      { key: 'bgColor', label: 'Background Color', type: 'color' },
      { key: 'expiredText', label: 'Expired Message', type: 'text', placeholder: 'Offer has ended' },
    ],
    defaultData: {
      headline: 'Limited Time Offer — Ends Soon!',
      subtext: 'Lock in the lowest price before this deal expires.',
      targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      btnText: 'Claim Your Discount Now',
      bgColor: '#0f172a',
      expiredText: 'This offer has ended.',
    },
    renderCanvas: (data, onUpdate) => {
      const target = new Date(data.targetDate + 'T23:59:59');
      const diff = Math.max(0, target.getTime() - Date.now());
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      const expired = diff <= 0;
      return (
        <section style={{ background: data.bgColor || '#0f172a', padding: '80px 32px', textAlign: 'center' }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <IE as="h2" value={data.headline} fieldKey="headline" onUpdate={onUpdate}
              className="block text-4xl font-bold text-white mb-4" />
            <IE as="p" value={data.subtext} fieldKey="subtext" onUpdate={onUpdate}
              className="block text-lg text-white/70 mb-10" />
            {expired ? (
              <p style={{ color: '#f87171', fontSize: '1.25rem', fontWeight: 600 }}>{data.expiredText}</p>
            ) : (
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 40 }}>
                {[{ v: days, l: 'Days' }, { v: hours, l: 'Hours' }, { v: mins, l: 'Minutes' }, { v: secs, l: 'Seconds' }].map(({ v, l }) => (
                  <div key={l} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px', minWidth: 80 }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{String(v).padStart(2, '0')}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{l}</div>
                  </div>
                ))}
              </div>
            )}
            <a href="#" style={{ display: 'inline-block', background: '#4f46e5', color: '#fff', padding: '16px 40px', borderRadius: 12, fontWeight: 700, fontSize: '1.0625rem' }}>
              {data.btnText}
            </a>
          </div>
        </section>
      );
    },
    exportHtml: (data) => {
      const targetIso = data.targetDate + 'T23:59:59';
      return `
<section style="background:${data.bgColor || '#0f172a'};padding:80px 32px;text-align:center;">
  <div style="max-width:640px;margin:0 auto;">
    <h2 style="font-size:2.5rem;font-weight:800;color:#fff;margin-bottom:16px;">${data.headline}</h2>
    <p style="font-size:1.125rem;color:rgba(255,255,255,0.7);margin-bottom:48px;">${data.subtext}</p>
    <div id="countdown-timer" style="display:flex;gap:16px;justify-content:center;margin-bottom:48px;">
      <div style="background:rgba(255,255,255,0.08);border-radius:16px;padding:20px 24px;min-width:80px;">
        <div id="cd-days" style="font-size:2.5rem;font-weight:800;color:#fff;line-height:1;" data-counter>00</div>
        <div style="font-size:.75rem;color:rgba(255,255,255,0.5);margin-top:6px;text-transform:uppercase;letter-spacing:.1em;">Days</div>
      </div>
      <div style="background:rgba(255,255,255,0.08);border-radius:16px;padding:20px 24px;min-width:80px;">
        <div id="cd-hours" style="font-size:2.5rem;font-weight:800;color:#fff;line-height:1;">00</div>
        <div style="font-size:.75rem;color:rgba(255,255,255,0.5);margin-top:6px;text-transform:uppercase;letter-spacing:.1em;">Hours</div>
      </div>
      <div style="background:rgba(255,255,255,0.08);border-radius:16px;padding:20px 24px;min-width:80px;">
        <div id="cd-mins" style="font-size:2.5rem;font-weight:800;color:#fff;line-height:1;">00</div>
        <div style="font-size:.75rem;color:rgba(255,255,255,0.5);margin-top:6px;text-transform:uppercase;letter-spacing:.1em;">Minutes</div>
      </div>
      <div style="background:rgba(255,255,255,0.08);border-radius:16px;padding:20px 24px;min-width:80px;">
        <div id="cd-secs" style="font-size:2.5rem;font-weight:800;color:#fff;line-height:1;">00</div>
        <div style="font-size:.75rem;color:rgba(255,255,255,0.5);margin-top:6px;text-transform:uppercase;letter-spacing:.1em;">Seconds</div>
      </div>
    </div>
    <p id="cd-expired" style="display:none;color:#f87171;font-size:1.25rem;font-weight:600;margin-bottom:48px;">${data.expiredText || 'This offer has ended.'}</p>
    <a href="#" style="display:inline-block;background:#4f46e5;color:#fff;padding:16px 40px;border-radius:12px;font-weight:700;font-size:1.0625rem;text-decoration:none;">${data.btnText}</a>
  </div>
  <script>
  (function(){
    var t=new Date("${targetIso}").getTime();
    function tick(){
      var n=Date.now(),d=t-n;
      if(d<=0){document.getElementById('countdown-timer').style.display='none';document.getElementById('cd-expired').style.display='block';return;}
      document.getElementById('cd-days').textContent=String(Math.floor(d/86400000)).padStart(2,'0');
      document.getElementById('cd-hours').textContent=String(Math.floor(d%86400000/3600000)).padStart(2,'0');
      document.getElementById('cd-mins').textContent=String(Math.floor(d%3600000/60000)).padStart(2,'0');
      document.getElementById('cd-secs').textContent=String(Math.floor(d%60000/1000)).padStart(2,'0');
    }
    tick();setInterval(tick,1000);
  })();
  </script>
</section>`;
    },
  },
  // ── Image Gallery ────────────────────────────────────────────────────────
  {
    type: 'gallery',
    label: 'Image Gallery',
    emoji: '🖼️',
    category: 'Media',
    fields: [
      { key: 'title', label: 'Section Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { key: 'layout', label: 'Layout', type: 'select', options: [
        { value: 'grid3', label: '3-Column Grid' },
        { value: 'grid2', label: '2-Column Grid' },
        { value: 'masonry', label: 'Masonry / Pinterest' },
        { value: 'featured', label: 'Featured (1 large + grid)' },
      ]},
      {
        key: 'images',
        label: 'Images',
        type: 'array',
        arrayItemFields: [
          { key: 'url', label: 'Image URL', type: 'url' },
          { key: 'caption', label: 'Caption (optional)', type: 'text' },
        ],
      },
      { key: 'bgColor', label: 'Background', type: 'color' },
    ],
    defaultData: {
      title: 'Our Work',
      subtitle: 'A selection of projects that showcase our craft and attention to detail.',
      layout: 'grid3',
      images: [
        { url: 'https://source.unsplash.com/800x600/?office,workspace', caption: 'Modern workspace' },
        { url: 'https://source.unsplash.com/800x600/?technology,laptop', caption: 'Tech innovation' },
        { url: 'https://source.unsplash.com/800x600/?team,people', caption: 'Our team' },
        { url: 'https://source.unsplash.com/800x600/?product,design', caption: 'Product showcase' },
        { url: 'https://source.unsplash.com/800x600/?abstract,art', caption: 'Creative direction' },
        { url: 'https://source.unsplash.com/800x600/?city,architecture', caption: 'Architecture' },
      ],
      bgColor: '#ffffff',
    },
    renderCanvas: (data, onUpdate) => {
      const layout = data.layout || 'grid3';
      const images: any[] = data.images || [];
      return (
        <section className="py-20 px-8" style={{ backgroundColor: data.bgColor }}>
          <div className="max-w-5xl mx-auto">
            {(data.title || data.subtitle) && (
              <div className="text-center mb-12">
                {data.title && (
                  <IE as="h2" value={data.title} fieldKey="title" onUpdate={onUpdate}
                    className="text-4xl font-bold text-gray-900 mb-4 block" />
                )}
                {data.subtitle && (
                  <IE as="p" value={data.subtitle} fieldKey="subtitle" onUpdate={onUpdate}
                    className="text-xl text-gray-500 max-w-2xl mx-auto block" />
                )}
              </div>
            )}
            {layout === 'featured' && images.length > 0 ? (
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden aspect-video">
                  <img src={images[0].url} alt={images[0].caption || ''} className="w-full h-full object-cover" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {images.slice(1, 4).map((img: any, i: number) => (
                    <div key={i} className="rounded-xl overflow-hidden aspect-square">
                      <img src={img.url} alt={img.caption || ''} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            ) : layout === 'masonry' ? (
              <div style={{ columns: 3, gap: '16px' }}>
                {images.map((img: any, i: number) => (
                  <div key={i} style={{ breakInside: 'avoid', marginBottom: 16 }} className="rounded-xl overflow-hidden">
                    <img src={img.url} alt={img.caption || ''} className="w-full block" />
                    {img.caption && <p className="text-xs text-gray-500 px-2 py-1.5">{img.caption}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className={`grid gap-4 ${layout === 'grid2' ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {images.map((img: any, i: number) => (
                  <div key={i} className="rounded-xl overflow-hidden group">
                    <div className="relative aspect-square overflow-hidden">
                      <img src={img.url} alt={img.caption || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      {img.caption && (
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                          <p className="text-white text-xs font-medium">{img.caption}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      );
    },
    exportHtml: (data) => {
      const layout = data.layout || 'grid3';
      const images: any[] = data.images || [];
      const cols = layout === 'grid2' ? 2 : 3;

      const titleHtml = data.title || data.subtitle ? `
    <div style="text-align:center;margin-bottom:48px;">
      ${data.title ? `<h2 style="font-size:2.5rem;font-weight:700;color:#111827;margin-bottom:16px;">${data.title}</h2>` : ''}
      ${data.subtitle ? `<p style="font-size:1.25rem;color:#6b7280;max-width:512px;margin:0 auto;">${data.subtitle}</p>` : ''}
    </div>` : '';

      if (layout === 'featured' && images.length > 0) {
        return `
<section style="padding:80px 32px;background:${data.bgColor || '#fff'};">
  <div style="max-width:960px;margin:0 auto;">
    ${titleHtml}
    <div style="border-radius:16px;overflow:hidden;aspect-ratio:16/9;margin-bottom:16px;">
      <img src="${images[0].url}" alt="${images[0].caption || ''}" style="width:100%;height:100%;object-fit:cover;display:block;" />
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
      ${images.slice(1, 4).map((img: any) => `
      <div style="border-radius:12px;overflow:hidden;aspect-ratio:1/1;">
        <img src="${img.url}" alt="${img.caption || ''}" style="width:100%;height:100%;object-fit:cover;display:block;" />
      </div>`).join('')}
    </div>
  </div>
</section>`;
      }

      if (layout === 'masonry') {
        return `
<section style="padding:80px 32px;background:${data.bgColor || '#fff'};">
  <div style="max-width:960px;margin:0 auto;">
    ${titleHtml}
    <div style="columns:3;gap:16px;">
      ${images.map((img: any) => `
      <div style="break-inside:avoid;margin-bottom:16px;border-radius:12px;overflow:hidden;">
        <img src="${img.url}" alt="${img.caption || ''}" style="width:100%;display:block;" />
        ${img.caption ? `<p style="font-size:12px;color:#6b7280;padding:8px 12px;">${img.caption}</p>` : ''}
      </div>`).join('')}
    </div>
  </div>
</section>`;
      }

      return `
<section style="padding:80px 32px;background:${data.bgColor || '#fff'};">
  <div style="max-width:960px;margin:0 auto;">
    ${titleHtml}
    <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:16px;">
      ${images.map((img: any) => `
      <div style="border-radius:12px;overflow:hidden;position:relative;aspect-ratio:1/1;">
        <img src="${img.url}" alt="${img.caption || ''}" style="width:100%;height:100%;object-fit:cover;display:block;" />
        ${img.caption ? `<div style="position:absolute;bottom:0;left:0;right:0;padding:12px;background:linear-gradient(to top,rgba(0,0,0,0.6),transparent);"><p style="color:#fff;font-size:12px;font-weight:500;margin:0;">${img.caption}</p></div>` : ''}
      </div>`).join('')}
    </div>
  </div>
</section>`;
    },
  },

  // ── Timeline ─────────────────────────────────────────────────────────────
  {
    type: 'timeline',
    label: 'Timeline',
    emoji: '📅',
    category: 'Content',
    fields: [
      { key: 'title', label: 'Section Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      {
        key: 'items',
        label: 'Timeline Items',
        type: 'array',
        arrayItemFields: [
          { key: 'date', label: 'Date / Year', type: 'text' },
          { key: 'title', label: 'Event Title', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'icon', label: 'Icon (emoji)', type: 'text' },
          { key: 'color', label: 'Dot Color', type: 'color' },
        ],
      },
      { key: 'variant', label: 'Style', type: 'select', options: [
        { value: 'center', label: 'Center Line (alternating)' },
        { value: 'left', label: 'Left Line (all right)' },
      ]},
      { key: 'bgColor', label: 'Background', type: 'color' },
    ],
    defaultData: {
      title: 'Our Journey',
      subtitle: 'From a small idea to a product trusted by thousands.',
      variant: 'center',
      bgColor: '#ffffff',
      items: [
        { date: '2021', title: 'The Idea', description: 'Two founders frustrated by slow, bloated page builders decided to build something better.', icon: '💡', color: '#4f46e5' },
        { date: '2022', title: 'First Launch', description: 'We shipped the MVP in 3 months. 500 users signed up in the first week.', icon: '🚀', color: '#0891b2' },
        { date: '2023', title: 'AI Integration', description: 'Added Claude AI for content generation. Time-to-publish dropped from hours to minutes.', icon: '🤖', color: '#059669' },
        { date: '2024', title: '10K Users', description: 'Reached 10,000 active users. Launched Shopify integration and ZIP export.', icon: '🎉', color: '#dc2626' },
        { date: '2025', title: 'What\'s Next', description: 'We\'re just getting started. More AI, more integrations, and more ways to ship faster.', icon: '⭐', color: '#7c3aed' },
      ],
    },
    renderCanvas: (data, onUpdate) => {
      const variant = data.variant || 'center';
      const items: any[] = data.items || [];

      if (variant === 'left') {
        return (
          <section className="py-20 px-8" style={{ backgroundColor: data.bgColor }}>
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-16">
                <IE as="h2" value={data.title} fieldKey="title" onUpdate={onUpdate}
                  className="text-4xl font-bold text-gray-900 mb-4 block" />
                <IE as="p" value={data.subtitle} fieldKey="subtitle" onUpdate={onUpdate}
                  className="text-xl text-gray-500 block" />
              </div>
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />
                <div className="space-y-10">
                  {items.map((item: any, i: number) => (
                    <div key={i} className="flex gap-6">
                      <div className="flex-shrink-0 w-12 flex justify-center">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl z-10 relative shadow-md"
                          style={{ backgroundColor: item.color || '#4f46e5', color: '#fff' }}>
                          {item.icon || '•'}
                        </div>
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{item.date}</span>
                          <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                        </div>
                        <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      }

      // center / alternating
      return (
        <section className="py-20 px-8" style={{ backgroundColor: data.bgColor }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <IE as="h2" value={data.title} fieldKey="title" onUpdate={onUpdate}
                className="text-4xl font-bold text-gray-900 mb-4 block" />
              <IE as="p" value={data.subtitle} fieldKey="subtitle" onUpdate={onUpdate}
                className="text-xl text-gray-500 block" />
            </div>
            <div className="relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-200 -translate-x-0.5" />
              <div className="space-y-12">
                {items.map((item: any, i: number) => {
                  const isLeft = i % 2 === 0;
                  return (
                    <div key={i} className={`flex items-center gap-8 ${isLeft ? '' : 'flex-row-reverse'}`}>
                      <div className={`flex-1 ${isLeft ? 'text-right' : 'text-left'}`}>
                        <div className={`inline-block p-6 rounded-2xl bg-white shadow-sm border border-slate-100 max-w-xs ${isLeft ? 'ml-auto' : 'mr-auto'}`}>
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{item.date}</span>
                          <h3 className="text-lg font-bold text-gray-900 mt-2 mb-1">{item.title}</h3>
                          <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 z-10">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg"
                          style={{ backgroundColor: item.color || '#4f46e5' }}>
                          {item.icon || '•'}
                        </div>
                      </div>
                      <div className="flex-1" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      );
    },
    exportHtml: (data) => {
      const variant = data.variant || 'center';
      const items: any[] = data.items || [];
      const titleHtml = `
    <div style="text-align:center;margin-bottom:64px;">
      <h2 style="font-size:2.5rem;font-weight:700;color:#111827;margin-bottom:16px;">${data.title}</h2>
      <p style="font-size:1.25rem;color:#6b7280;max-width:512px;margin:0 auto;">${data.subtitle}</p>
    </div>`;

      if (variant === 'left') {
        return `
<section style="padding:80px 32px;background:${data.bgColor || '#fff'};">
  <div style="max-width:672px;margin:0 auto;">
    ${titleHtml}
    <div style="position:relative;">
      <div style="position:absolute;left:24px;top:0;bottom:0;width:2px;background:#e2e8f0;"></div>
      ${items.map((item: any) => `
      <div style="display:flex;gap:24px;margin-bottom:40px;position:relative;">
        <div style="flex-shrink:0;width:48px;height:48px;border-radius:50%;background:${item.color || '#4f46e5'};display:flex;align-items:center;justify-content:center;font-size:1.25rem;z-index:1;box-shadow:0 4px 12px rgba(0,0,0,0.15);">${item.icon || '•'}</div>
        <div style="flex:1;padding-top:6px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-size:11px;font-weight:700;color:#4f46e5;background:#eef2ff;padding:2px 8px;border-radius:999px;">${item.date}</span>
            <h3 style="font-size:1.125rem;font-weight:700;color:#111827;margin:0;">${item.title}</h3>
          </div>
          <p style="color:#6b7280;font-size:0.875rem;line-height:1.7;margin:0;">${item.description}</p>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>`;
      }

      // center alternating
      return `
<section style="padding:80px 32px;background:${data.bgColor || '#fff'};">
  <div style="max-width:960px;margin:0 auto;">
    ${titleHtml}
    <div style="position:relative;">
      <div style="position:absolute;left:50%;top:0;bottom:0;width:2px;background:#e2e8f0;transform:translateX(-50%);"></div>
      ${items.map((item: any, i: number) => {
        const isLeft = i % 2 === 0;
        return `
      <div style="display:flex;align-items:center;gap:32px;margin-bottom:48px;${isLeft ? '' : 'flex-direction:row-reverse;'}">
        <div style="flex:1;text-align:${isLeft ? 'right' : 'left'};">
          <div style="display:inline-block;padding:24px;border-radius:16px;background:#fff;box-shadow:0 2px 16px rgba(0,0,0,0.06);border:1px solid #f1f5f9;max-width:320px;${isLeft ? 'margin-left:auto;' : 'margin-right:auto;'}">
            <span style="font-size:11px;font-weight:700;color:#4f46e5;background:#eef2ff;padding:2px 8px;border-radius:999px;display:inline-block;">${item.date}</span>
            <h3 style="font-size:1.125rem;font-weight:700;color:#111827;margin:8px 0 4px;">${item.title}</h3>
            <p style="color:#6b7280;font-size:0.875rem;line-height:1.7;margin:0;">${item.description}</p>
          </div>
        </div>
        <div style="flex-shrink:0;z-index:1;">
          <div style="width:56px;height:56px;border-radius:50%;background:${item.color || '#4f46e5'};display:flex;align-items:center;justify-content:center;font-size:1.5rem;box-shadow:0 4px 16px rgba(0,0,0,0.15);">${item.icon || '•'}</div>
        </div>
        <div style="flex:1;"></div>
      </div>`;
      }).join('')}
    </div>
  </div>
</section>`;
    },
  },

  // ── Embed / Custom Code ───────────────────────────────────────────────────
  {
    type: 'embed',
    label: 'Embed / Code',
    emoji: '🔗',
    category: 'Media',
    fields: [
      { key: 'title', label: 'Title (optional)', type: 'text' },
      { key: 'subtitle', label: 'Subtitle (optional)', type: 'textarea' },
      { key: 'embedType', label: 'Embed Type', type: 'select', options: [
        { value: 'iframe', label: 'iFrame URL (Calendly, Google Maps, etc.)' },
        { value: 'html', label: 'Custom HTML / Script' },
      ]},
      { key: 'iframeUrl', label: 'iFrame URL', type: 'url', placeholder: 'https://calendly.com/...' },
      { key: 'iframeHeight', label: 'Height (px)', type: 'text', placeholder: '600' },
      { key: 'htmlCode', label: 'Custom HTML Code', type: 'textarea' },
      { key: 'bgColor', label: 'Background', type: 'color' },
    ],
    defaultData: {
      title: 'Book a Demo',
      subtitle: 'Schedule a time that works for you — we\'d love to show you around.',
      embedType: 'iframe',
      iframeUrl: '',
      iframeHeight: '600',
      htmlCode: '<!-- Paste your embed code here -->',
      bgColor: '#ffffff',
    },
    renderCanvas: (data, onUpdate) => (
      <section className="py-20 px-8" style={{ backgroundColor: data.bgColor }}>
        <div className="max-w-4xl mx-auto">
          {(data.title || data.subtitle) && (
            <div className="text-center mb-10">
              {data.title && (
                <IE as="h2" value={data.title} fieldKey="title" onUpdate={onUpdate}
                  className="text-4xl font-bold text-gray-900 mb-4 block" />
              )}
              {data.subtitle && (
                <IE as="p" value={data.subtitle} fieldKey="subtitle" onUpdate={onUpdate}
                  className="text-xl text-gray-500 block" />
              )}
            </div>
          )}
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
            {data.embedType === 'iframe' && data.iframeUrl ? (
              <iframe
                src={data.iframeUrl}
                style={{ width: '100%', height: `${data.iframeHeight || 600}px`, border: 'none', display: 'block' }}
                title={data.title || 'Embedded content'}
              />
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center">
                <span className="text-5xl mb-4 block">🔗</span>
                <p className="text-slate-500 font-medium mb-1">
                  {data.embedType === 'html' ? 'Custom HTML — visible in exported page' : 'Paste an iFrame URL in the panel →'}
                </p>
                <p className="text-xs text-slate-400 font-mono mt-2 max-w-sm mx-auto truncate">
                  {data.embedType === 'html' ? (data.htmlCode || '').slice(0, 60) + '…' : (data.iframeUrl || 'e.g. https://calendly.com/...')}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    ),
    exportHtml: (data) => {
      const height = parseInt(data.iframeHeight) || 600;
      const titleHtml = (data.title || data.subtitle) ? `
    <div style="text-align:center;margin-bottom:40px;">
      ${data.title ? `<h2 style="font-size:2.5rem;font-weight:700;color:#111827;margin-bottom:16px;">${data.title}</h2>` : ''}
      ${data.subtitle ? `<p style="font-size:1.25rem;color:#6b7280;">${data.subtitle}</p>` : ''}
    </div>` : '';

      return `
<section style="padding:80px 32px;background:${data.bgColor || '#fff'};">
  <div style="max-width:896px;margin:0 auto;">
    ${titleHtml}
    ${data.embedType === 'iframe' && data.iframeUrl
      ? `<div style="border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 2px 16px rgba(0,0,0,0.06);">
      <iframe src="${data.iframeUrl}" style="width:100%;height:${height}px;border:0;display:block;" title="${data.title || 'Embedded content'}" loading="lazy"></iframe>
    </div>`
      : `<div style="border-radius:16px;overflow:hidden;">${data.htmlCode || '<!-- No embed code -->'}</div>`
    }
  </div>
</section>`;
    },
  },

  // ── Divider / Spacer ──────────────────────────────────────────────────────
  {
    type: 'divider',
    label: 'Divider / Spacer',
    emoji: '➖',
    category: 'Layout',
    fields: [
      { key: 'style', label: 'Style', type: 'select', options: [
        { value: 'line', label: 'Thin line' },
        { value: 'thick', label: 'Thick line' },
        { value: 'dots', label: 'Dotted' },
        { value: 'wave', label: 'Wavy' },
        { value: 'spacer', label: 'Spacer (invisible)' },
      ]},
      { key: 'color', label: 'Color', type: 'color' },
      { key: 'spacing', label: 'Vertical Spacing', type: 'select', options: [
        { value: 'sm', label: 'Small (24px)' },
        { value: 'md', label: 'Medium (48px)' },
        { value: 'lg', label: 'Large (80px)' },
        { value: 'xl', label: 'Extra Large (120px)' },
      ]},
      { key: 'text', label: 'Label (optional)', type: 'text', placeholder: 'or' },
    ],
    defaultData: { style: 'line', color: '#e2e8f0', spacing: 'md', text: '' },
    renderCanvas: (data, onUpdate) => {
      const py = { sm: 'py-6', md: 'py-12', lg: 'py-20', xl: 'py-28' }[data.spacing as string] || 'py-12';
      return (
        <div className={`px-8 ${py} flex items-center justify-center`}>
          {data.style === 'spacer' ? (
            <div className="w-full flex items-center justify-center text-slate-600 text-xs opacity-50">
              ↕ Spacer ({data.spacing})
            </div>
          ) : data.style === 'dots' ? (
            <div className="flex items-center gap-3">
              {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: data.color }} />)}
            </div>
          ) : data.style === 'wave' ? (
            <div className="w-full flex items-center gap-4">
              <div className="flex-1 h-px" style={{ background: `repeating-linear-gradient(90deg, ${data.color} 0, ${data.color} 5px, transparent 5px, transparent 10px)` }} />
              {data.text && <IE as="span" value={data.text} fieldKey="text" onUpdate={onUpdate} className="text-sm font-medium whitespace-nowrap" style={{ color: data.color }} />}
              <div className="flex-1 h-px" style={{ background: `repeating-linear-gradient(90deg, ${data.color} 0, ${data.color} 5px, transparent 5px, transparent 10px)` }} />
            </div>
          ) : (
            <div className="w-full flex items-center gap-4">
              {data.text && <div className="flex-1 h-px" style={{ backgroundColor: data.color, height: data.style === 'thick' ? '3px' : '1px' }} />}
              {data.text ? (
                <IE as="span" value={data.text} fieldKey="text" onUpdate={onUpdate} className="text-sm font-medium text-gray-400 whitespace-nowrap" />
              ) : (
                <div className="w-full" style={{ backgroundColor: data.color, height: data.style === 'thick' ? '3px' : '1px' }} />
              )}
              {data.text && <div className="flex-1 h-px" style={{ backgroundColor: data.color, height: data.style === 'thick' ? '3px' : '1px' }} />}
            </div>
          )}
        </div>
      );
    },
    exportHtml: (data) => {
      const py = { sm: '24px', md: '48px', lg: '80px', xl: '120px' }[data.spacing as string] || '48px';
      if (data.style === 'spacer') return `<div style="height:${py};"></div>`;
      if (data.style === 'dots') return `<div style="padding:${py} 32px;display:flex;justify-content:center;gap:12px;">${[0,1,2].map(() => `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${data.color};"></span>`).join('')}</div>`;
      const lineH = data.style === 'thick' ? '3px' : '1px';
      const border = data.style === 'dots' ? `border-top: 2px dotted ${data.color}` : `border-top: ${lineH} solid ${data.color}`;
      if (data.text) return `<div style="padding:${py} 32px;display:flex;align-items:center;gap:16px;"><div style="flex:1;${border};"></div><span style="color:#9ca3af;font-size:0.875rem;font-weight:500;white-space:nowrap;">${data.text}</span><div style="flex:1;${border};"></div></div>`;
      return `<div style="padding:${py} 32px;"><div style="${border};"></div></div>`;
    },
  },

  // ── Rich Testimonial ──────────────────────────────────────────────────────
  {
    type: 'testimonial-single',
    label: 'Big Testimonial',
    emoji: '💬',
    category: 'Social Proof',
    fields: [
      { key: 'quote', label: 'Quote', type: 'textarea', placeholder: 'This changed everything for us...' },
      { key: 'name', label: 'Author Name', type: 'text' },
      { key: 'role', label: 'Role / Company', type: 'text' },
      { key: 'avatarUrl', label: 'Avatar Image', type: 'url' },
      { key: 'stars', label: 'Stars (0 = hide)', type: 'select', options: [
        { value: '0', label: 'No stars' },
        { value: '4', label: '4 stars' },
        { value: '5', label: '5 stars' },
      ]},
      { key: 'bgColor', label: 'Background', type: 'color' },
      { key: 'accentColor', label: 'Accent Color', type: 'color' },
    ],
    defaultData: {
      quote: '"This tool saved us 40+ hours a month. Our landing pages used to take weeks — now we launch in minutes. The AI generation is genuinely impressive."',
      name: 'Sarah Mitchell',
      role: 'Head of Growth · Acme Corp',
      avatarUrl: '',
      stars: '5',
      bgColor: '#f8fafc',
      accentColor: '#4f46e5',
    },
    renderCanvas: (data, onUpdate) => (
      <section className="py-20 px-8" style={{ backgroundColor: data.bgColor }}>
        <div className="max-w-3xl mx-auto text-center">
          {parseInt(data.stars) > 0 && (
            <div className="flex justify-center gap-1 mb-6">
              {Array.from({ length: parseInt(data.stars) }).map((_, i) => (
                <span key={i} className="text-2xl" style={{ color: data.accentColor }}>★</span>
              ))}
            </div>
          )}
          <blockquote>
            <IE as="p" value={data.quote} fieldKey="quote" onUpdate={onUpdate}
              className="text-2xl md:text-3xl font-medium text-gray-900 leading-relaxed mb-8 block italic" />
          </blockquote>
          <div className="flex items-center justify-center gap-4">
            {data.avatarUrl ? (
              <img src={data.avatarUrl} alt={data.name} className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ backgroundColor: data.accentColor }}>
                {(data.name || 'A').charAt(0)}
              </div>
            )}
            <div className="text-left">
              <IE as="p" value={data.name} fieldKey="name" onUpdate={onUpdate}
                className="font-bold text-gray-900 block" />
              <IE as="p" value={data.role} fieldKey="role" onUpdate={onUpdate}
                className="text-gray-500 text-sm block" />
            </div>
          </div>
        </div>
      </section>
    ),
    exportHtml: (data) => {
      const stars = parseInt(data.stars) > 0 ? `<div style="display:flex;justify-content:center;gap:4px;margin-bottom:24px;">${Array.from({length: parseInt(data.stars)}).map(() => `<span style="font-size:1.5rem;color:${data.accentColor};">★</span>`).join('')}</div>` : '';
      const avatar = data.avatarUrl
        ? `<img src="${data.avatarUrl}" alt="${data.name}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;">`
        : `<div style="width:56px;height:56px;border-radius:50%;background:${data.accentColor};display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.25rem;font-weight:700;flex-shrink:0;">${(data.name||'A').charAt(0)}</div>`;
      return `
<section style="padding:80px 32px;background:${data.bgColor};">
  <div style="max-width:768px;margin:0 auto;text-align:center;">
    ${stars}
    <blockquote style="font-size:clamp(1.25rem,3vw,1.75rem);font-weight:500;color:#111827;line-height:1.6;margin:0 0 32px;font-style:italic;">${data.quote}</blockquote>
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;">
      ${avatar}
      <div style="text-align:left;">
        <p style="font-weight:700;color:#111827;margin:0 0 4px;">${data.name}</p>
        <p style="color:#6b7280;font-size:0.875rem;margin:0;">${data.role}</p>
      </div>
    </div>
  </div>
</section>`;
    },
  },

  // ── Cookie Consent Bar ───────────────────────────────────────────────────
  {
    type: 'cookie-consent',
    label: 'Cookie Consent',
    emoji: '🍪',
    category: 'Navigation',
    fields: [
      { key: 'message', label: 'Message', type: 'textarea' },
      { key: 'acceptText', label: 'Accept Button', type: 'text' },
      { key: 'rejectText', label: 'Reject / Decline', type: 'text', placeholder: 'Decline' },
      { key: 'privacyText', label: 'Privacy Link Text', type: 'text', placeholder: 'Privacy Policy' },
      { key: 'privacyUrl', label: 'Privacy URL', type: 'url', placeholder: '/privacy' },
      { key: 'bgColor', label: 'Background', type: 'color' },
      { key: 'accentColor', label: 'Button Color', type: 'color' },
    ],
    defaultData: {
      message: 'We use cookies to improve your experience and analyze site traffic. By clicking "Accept", you consent to our use of cookies.',
      acceptText: 'Accept All',
      rejectText: 'Decline',
      privacyText: 'Privacy Policy',
      privacyUrl: '/privacy',
      bgColor: '#1e293b',
      accentColor: '#4f46e5',
    },
    renderCanvas: (data, onUpdate) => (
      <div className="px-6 py-4 flex items-center gap-4 flex-wrap justify-between" style={{ backgroundColor: data.bgColor }}>
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-2xl flex-shrink-0">🍪</span>
          <div className="min-w-0">
            <IE as="p" value={data.message} fieldKey="message" onUpdate={onUpdate}
              className="text-sm text-gray-300 leading-relaxed block" />
            {data.privacyText && (
              <a href={data.privacyUrl || '#'} className="text-xs underline mt-1 block" style={{ color: data.accentColor }}>
                {data.privacyText}
              </a>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {data.rejectText && (
            <button className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white border border-gray-600 rounded-lg transition-all">
              <IE as="span" value={data.rejectText} fieldKey="rejectText" onUpdate={onUpdate} />
            </button>
          )}
          <button className="px-5 py-2 text-sm font-semibold text-white rounded-lg" style={{ backgroundColor: data.accentColor }}>
            <IE as="span" value={data.acceptText} fieldKey="acceptText" onUpdate={onUpdate} />
          </button>
        </div>
      </div>
    ),
    exportHtml: (data) => `
<div id="cookie-banner" style="position:fixed;bottom:0;left:0;right:0;z-index:9999;padding:16px 24px;background:${data.bgColor};display:flex;align-items:center;gap:16px;flex-wrap:wrap;justify-content:space-between;box-shadow:0 -4px 24px rgba(0,0,0,0.3);">
  <div style="display:flex;align-items:flex-start;gap:12px;flex:1;min-width:0;">
    <span style="font-size:1.5rem;flex-shrink:0;">🍪</span>
    <div>
      <p style="color:#cbd5e1;font-size:0.875rem;line-height:1.6;margin:0 0 4px;">${data.message}</p>
      ${data.privacyText ? `<a href="${data.privacyUrl||'#'}" style="color:${data.accentColor};font-size:0.75rem;text-decoration:underline;">${data.privacyText}</a>` : ''}
    </div>
  </div>
  <div style="display:flex;gap:8px;flex-shrink:0;">
    ${data.rejectText ? `<button onclick="document.getElementById('cookie-banner').style.display='none'" style="padding:8px 16px;font-size:0.875rem;font-weight:500;color:#9ca3af;border:1px solid #4b5563;border-radius:8px;background:transparent;cursor:pointer;">${data.rejectText}</button>` : ''}
    <button onclick="document.getElementById('cookie-banner').style.display='none';localStorage.setItem('cookieConsent','1')" style="padding:8px 20px;font-size:0.875rem;font-weight:600;color:#fff;background:${data.accentColor};border:none;border-radius:8px;cursor:pointer;">${data.acceptText}</button>
  </div>
</div>
<script>if(localStorage.getItem('cookieConsent'))document.getElementById('cookie-banner').style.display='none';</script>`,
  },

  // ── Pricing Table (simple 2-col) ──────────────────────────────────────────
  {
    type: 'cta-banner',
    label: 'CTA Banner',
    emoji: '🔥',
    category: 'Conversion',
    fields: [
      { key: 'headline', label: 'Headline', type: 'text' },
      { key: 'subtext', label: 'Subtext', type: 'textarea' },
      { key: 'btnText', label: 'Button Text', type: 'text' },
      { key: 'btnLink', label: 'Button Link', type: 'url' },
      { key: 'secondBtnText', label: 'Secondary Button', type: 'text', placeholder: 'Learn more' },
      { key: 'bgColor', label: 'Background', type: 'color' },
      { key: 'textColor', label: 'Text Color', type: 'color' },
      { key: 'btnColor', label: 'Button Color', type: 'color' },
    ],
    defaultData: {
      headline: 'Ready to grow your business?',
      subtext: 'Join 10,000+ companies already using our platform. Get started free — no credit card required.',
      btnText: 'Start Free Trial',
      btnLink: '#',
      secondBtnText: 'View Demo',
      bgColor: '#4f46e5',
      textColor: '#ffffff',
      btnColor: '#ffffff',
    },
    renderCanvas: (data, onUpdate) => (
      <section className="py-20 px-8" style={{ backgroundColor: data.bgColor }}>
        <div className="max-w-3xl mx-auto text-center">
          <IE as="h2" value={data.headline} fieldKey="headline" onUpdate={onUpdate}
            className="text-4xl md:text-5xl font-black mb-4 block" style={{ color: data.textColor }} />
          <IE as="p" value={data.subtext} fieldKey="subtext" onUpdate={onUpdate}
            className="text-lg mb-10 opacity-90 block" style={{ color: data.textColor }} />
          <div className="flex gap-4 justify-center flex-wrap">
            <a href={data.btnLink || '#'} className="inline-block px-8 py-4 rounded-xl font-bold text-base transition-all"
              style={{ backgroundColor: data.btnColor, color: data.bgColor }}>
              <IE as="span" value={data.btnText} fieldKey="btnText" onUpdate={onUpdate} />
            </a>
            {data.secondBtnText && (
              <a href="#" className="inline-block px-8 py-4 rounded-xl font-bold text-base border-2 transition-all"
                style={{ color: data.textColor, borderColor: `${data.textColor}60` }}>
                <IE as="span" value={data.secondBtnText} fieldKey="secondBtnText" onUpdate={onUpdate} />
              </a>
            )}
          </div>
        </div>
      </section>
    ),
    exportHtml: (data) => `
<section style="padding:80px 32px;background:${data.bgColor};">
  <div style="max-width:768px;margin:0 auto;text-align:center;">
    <h2 style="font-size:clamp(2rem,5vw,3rem);font-weight:900;color:${data.textColor};margin:0 0 16px;">${data.headline}</h2>
    <p style="font-size:1.125rem;color:${data.textColor};opacity:0.9;margin:0 0 40px;line-height:1.7;">${data.subtext}</p>
    <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;">
      <a href="${data.btnLink||'#'}" style="display:inline-block;padding:16px 32px;background:${data.btnColor};color:${data.bgColor};border-radius:12px;font-weight:700;font-size:1rem;">${data.btnText}</a>
      ${data.secondBtnText ? `<a href="#" style="display:inline-block;padding:16px 32px;color:${data.textColor};border:2px solid ${data.textColor}60;border-radius:12px;font-weight:700;font-size:1rem;">${data.secondBtnText}</a>` : ''}
    </div>
  </div>
</section>`,
  },
  {
    type: 'custom-html',
    label: 'Custom HTML',
    emoji: '🧩',
    category: 'Layout',
    fields: [
      { key: 'html', label: 'HTML Code', type: 'textarea', placeholder: '<section style="padding:60px;text-align:center;">\n  <h2>Custom Section</h2>\n</section>' },
      { key: 'height', label: 'Preview Height (px)', type: 'text', placeholder: '200' },
    ],
    defaultData: {
      html: '<section style="padding:60px 32px;text-align:center;background:#f8fafc;">\n  <h2 style="font-size:2rem;font-weight:700;color:#0f172a;margin-bottom:16px;">Custom Section</h2>\n  <p style="color:#64748b;max-width:600px;margin:0 auto;">Add any HTML here. Use inline styles for best results.</p>\n</section>',
      height: '200',
    },
    renderCanvas: (data) => (
      <div
        style={{ minHeight: `${parseInt(data.height) || 200}px` }}
        dangerouslySetInnerHTML={{ __html: data.html || '' }}
      />
    ),
    exportHtml: (data) => data.html || '',
  },
];

export default BLOCK_DEFS;
export const getBlockDef = (type: string) => BLOCK_DEFS.find((b) => b.type === type);
