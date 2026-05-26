import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import authRouter from './routes/auth';
import webhooksRouter from './routes/webhooks';
import publishRouter from './routes/publish';

const SUBSCRIBERS_FILE = path.join(__dirname, '../../data/subscribers.json');
function loadSubscribers(): string[] {
  try {
    const dir = path.dirname(SUBSCRIBERS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(SUBSCRIBERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf8'));
  } catch { return []; }
}
function saveSubscriber(email: string) {
  const list = loadSubscribers();
  if (!list.includes(email)) {
    list.push(email);
    fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(list, null, 2));
  }
}

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Image upload config
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    cb(null, /image\/(jpeg|jpg|png|webp|gif|svg\+xml)/.test(file.mimetype));
  },
});

// Shopify requires the raw body for HMAC verification on webhooks
app.use('/api/webhooks', express.raw({ type: 'application/json' }), (req, _res, next) => {
  if (Buffer.isBuffer(req.body)) {
    (req as any).rawBody = req.body;
    req.body = JSON.parse(req.body.toString());
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Content-Security-Policy for Shopify embedded app
app.use((req, res, next) => {
  const shop = req.query.shop as string;
  if (shop) {
    res.setHeader(
      'Content-Security-Policy',
      `frame-ancestors https://${shop} https://admin.shopify.com;`
    );
  } else {
    res.setHeader('Content-Security-Policy', `frame-ancestors 'none';`);
  }
  next();
});

app.use(
  cors({
    origin: [FRONTEND_URL, 'https://admin.shopify.com', /\.myshopify\.com$/],
    credentials: true,
  })
);

// ── Shopify OAuth ──────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);

// ── GDPR Webhooks (required for App Store) ────────────────────────────────
app.use('/api/webhooks', webhooksRouter);

// ── Publish pages to Shopify ──────────────────────────────────────────────
app.use('/api/shopify/publish', publishRouter);

// ── Direct publish with Custom App token (no OAuth required) ─────────────
app.post('/api/shopify/direct-publish', async (req, res) => {
  const { shop, token, pageTitle, html, pageId } = req.body;
  if (!shop || !token || !pageTitle || !html) {
    return res.status(400).json({ success: false, error: 'Missing shop, token, pageTitle, or html' });
  }
  const cleanShop = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const headers = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token };

  try {
    let response: Response;
    if (pageId) {
      // Update existing page
      response = await fetch(`https://${cleanShop}/admin/api/2024-01/pages/${pageId}.json`, {
        method: 'PUT', headers,
        body: JSON.stringify({ page: { id: pageId, title: pageTitle, body_html: html, published: true } }),
      });
    } else {
      // Create new page
      response = await fetch(`https://${cleanShop}/admin/api/2024-01/pages.json`, {
        method: 'POST', headers,
        body: JSON.stringify({ page: { title: pageTitle, body_html: html, published: true } }),
      });
    }

    if (!response.ok) {
      const err = await response.text();
      if (response.status === 401) return res.status(401).json({ success: false, error: 'Invalid access token. Check your Custom App token.' });
      throw new Error(`Shopify error: ${err}`);
    }

    const data = await response.json() as { page: { id: number; handle: string; title: string } };
    const pageUrl = `https://${cleanShop}/pages/${data.page.handle}`;
    const adminUrl = `https://${cleanShop}/admin/pages/${data.page.id}`;
    console.log(`✅ Direct-published: ${pageUrl}`);
    res.json({ success: true, page: data.page, url: pageUrl, adminUrl });
  } catch (err: any) {
    console.error('Direct publish error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Image Upload ──────────────────────────────────────────────────────────
app.use('/uploads', express.static(UPLOADS_DIR));
app.post('/api/upload', upload.single('image'), (req: any, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No image provided or invalid type' });
  const ext = req.file.mimetype.split('/')[1].replace('svg+xml', 'svg');
  const newName = `${req.file.filename}.${ext}`;
  fs.renameSync(req.file.path, path.join(UPLOADS_DIR, newName));
  const url = `/uploads/${newName}`;
  console.log(`🖼️  Image uploaded: ${newName}`);
  res.json({ success: true, url });
});

// ── Health check ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', model: 'claude-haiku-4-5-20251001' });
});

// ── AI Content Generation ─────────────────────────────────────────────────
app.post('/api/ai/generate', async (req, res) => {
  const { prompt, blockType, tone = 'professional', currentData, context } = req.body;

  const toneGuide: Record<string, string> = {
    professional: 'formal, trustworthy, business-appropriate',
    casual: 'friendly, conversational, approachable',
    marketing: 'persuasive, exciting, action-oriented, benefit-focused',
    playful: 'fun, energetic, creative, witty',
  };

  const contextLine = context ? `\nPage context: ${context}` : '';
  const langLine = req.body.language && req.body.language !== 'English' ? `\nWrite all copy in: ${req.body.language}` : '';

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: 'You are an expert copywriter. Generate web page content. Respond with valid JSON only. No markdown, no explanations.',
      messages: [{
        role: 'user',
        content: `Generate fresh content for a "${blockType}" web section.${contextLine}${langLine}
User request: "${prompt}"
Tone: ${toneGuide[tone] || toneGuide.professional}
Current JSON (keep EXACT same keys, replace values):
${JSON.stringify(currentData, null, 2)}
Rules: Keep all keys. Headlines under 10 words. Keep URLs as "#". Keep color hex values unchanged. For arrays, keep same item count. Respond with JSON only:`,
      }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    const data = match ? JSON.parse(match[0]) : currentData;
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('AI error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── AI Full Page Generation (with real content) ───────────────────────────
app.post('/api/ai/generate-page', async (req, res) => {
  const { pageGoal } = req.body;
  if (!pageGoal?.trim()) {
    return res.status(400).json({ success: false, error: 'pageGoal is required' });
  }
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: 'You are an expert landing page copywriter and conversion specialist. Write compelling, specific copy. Respond with valid JSON only. No markdown.',
      messages: [{
        role: 'user',
        content: `Create a complete, high-converting landing page for: "${pageGoal}"

Return ONLY this JSON (no markdown, no extra text):
{"tagline":"short tagline","blocks":[{"type":"block_type","data":{...}}]}

Block types with exact data shapes:
hero: {"variant":"centered","eyebrow":"str","headline":"str","subheadline":"str","primaryBtn":"str","secondaryBtn":"str","bgFrom":"#hex","bgTo":"#hex"}
features: {"variant":"grid","title":"str","subtitle":"str","features":[{"icon":"emoji","title":"str","description":"str"}]}
steps: {"title":"str","subtitle":"str","steps":[{"icon":"emoji","title":"str","description":"str"}],"bgColor":"#hex"}
pricing: {"title":"str","subtitle":"str","plans":[{"name":"str","price":"str","period":"str","description":"str","cta":"str","highlighted":"true|false","features":"comma,separated"}]}
testimonials: {"title":"str","testimonials":[{"quote":"str","name":"str","role":"str","avatar":"XY","avatarBg":"#hex"}]}
cta: {"headline":"str","subtext":"str","primaryBtn":"str","secondaryBtn":"str","bgColor":"#hex"}
faq: {"title":"str","items":[{"question":"str","answer":"str"}]}
stats: {"title":"str","stats":[{"value":"str","label":"str"}],"bgColor":"#hex"}
footer: {"brand":"str","tagline":"str","copyright":"str","links":"About,Pricing,Blog,Contact","bgColor":"#hex"}
logo-cloud: {"title":"str","logos":[{"name":"str","initial":"XY"}]}
newsletter: {"headline":"str","subtext":"str","placeholder":"str","btnText":"str","bgColor":"#hex"}

Rules:
- Choose 7-8 blocks: always start hero, always end footer
- Write SPECIFIC copy for this exact goal (no generic placeholders)
- Always include a "steps" block to show how it works — 3 steps with relevant emojis
- features: exactly 6 items with relevant emojis
- testimonials: exactly 3 with realistic names/roles
- faq: 4 specific questions about the product/service
- stats: 4 impressive but credible numbers
- pricing: 3 tiers, middle highlighted:"true"
- avatarBg: vary colors "#4f46e5","#0891b2","#059669","#dc2626"
- bgFrom/bgTo: dark gradient like "#0f172a" to "#1e1b4b"
- dark bgColor: "#0f172a" or "#111827"
- light bgColor: "#f0f9ff" or "#f8fafc"
- steps bgColor: "#f8fafc"`,
      }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ success: false, error: 'Invalid AI response' });

    let data: any;
    try {
      data = JSON.parse(match[0]);
    } catch {
      // Try to extract just the outermost valid JSON object
      const cleaned = match[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      try {
        data = JSON.parse(cleaned);
      } catch {
        return res.status(500).json({ success: false, error: 'JSON parse error — please try again' });
      }
    }

    // Validate blocks array exists
    if (!Array.isArray(data.blocks) || data.blocks.length === 0) {
      return res.status(500).json({ success: false, error: 'No blocks generated — please try again' });
    }

    // Filter out any blocks with unknown types
    const VALID_TYPES = new Set(['banner','navbar','hero','features','pricing','testimonials','cta','faq','text-content','stats','footer','video','logo-cloud','newsletter','richtext','contact','steps','comparison','team','countdown','gallery','timeline','embed','divider','testimonial-single','cta-banner','cookie-consent']);
    data.blocks = data.blocks.filter((b: any) => VALID_TYPES.has(b.type));

    res.json({ success: true, ...data });
  } catch (err: any) {
    console.error('Generate page error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Email Subscribe ───────────────────────────────────────────────────────
app.post('/api/subscribe', (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'Valid email required' });
  }
  try {
    saveSubscriber(email.toLowerCase().trim());
    console.log(`✉️  New subscriber: ${email}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Could not save subscriber' });
  }
});

// ── Contact Form Submissions ──────────────────────────────────────────────
const CONTACTS_FILE = path.join(__dirname, '../../data/contacts.json');
function saveContact(data: Record<string, any>) {
  let contacts: any[] = [];
  try {
    const dir = path.dirname(CONTACTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(CONTACTS_FILE)) contacts = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8'));
  } catch { contacts = []; }
  contacts.push({ ...data, receivedAt: new Date().toISOString() });
  fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
}

app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'Valid email required' });
  }
  try {
    saveContact({ name: name || '', email: email.trim(), message: message || '' });
    console.log(`📬  Contact form: ${name || 'Unknown'} <${email}>`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Could not save submission' });
  }
});

// ── AI Conversion Rate Analysis ───────────────────────────────────────────
app.post('/api/ai/analyze', async (req, res) => {
  const { pageGoal, blockTypes } = req.body;
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: 'You are a conversion rate optimization (CRO) expert. Respond with valid JSON only. No markdown.',
      messages: [{
        role: 'user',
        content: `Analyze this landing page and give 4 specific actionable tips to improve conversion rate.
Page goal: "${pageGoal || 'Unknown'}"
Current sections: ${(blockTypes || []).join(', ')}

Respond with JSON:
{"score":75,"tips":[{"issue":"Short title","fix":"Make it benefit-focused","priority":"high"},...],"missing":["social proof","FAQ"]}

Priority is "high", "medium", or "low". Tips must be specific to THIS page, not generic advice.`,
      }],
    });
    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    const data = match ? JSON.parse(match[0]) : { score: 70, tips: [], missing: [] };
    res.json({ success: true, ...data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── AI Page Title Generator ───────────────────────────────────────────────
app.post('/api/ai/title', async (req, res) => {
  const { goal } = req.body;
  if (!goal?.trim()) return res.status(400).json({ success: false, error: 'goal required' });
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 60,
      system: 'You are a copywriter. Output ONLY a short catchy page title (3-8 words). No quotes, no punctuation at end, no explanation.',
      messages: [{
        role: 'user',
        content: `Create a compelling landing page title for: "${goal}"`,
      }],
    });
    const title = message.content[0].type === 'text' ? message.content[0].text.trim().replace(/^["']|["']$/g, '') : goal;
    res.json({ success: true, title });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── AI SEO Description Generator ─────────────────────────────────────────
app.post('/api/ai/seo', async (req, res) => {
  const { title, goal, blocks } = req.body;
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: 'You are an SEO expert. Write a meta description. Output ONLY the description text — no quotes, no JSON, no explanation.',
      messages: [{
        role: 'user',
        content: `Write a compelling meta description (max 155 chars) for this page:
Title: "${title || 'Landing Page'}"
${goal ? `Goal: "${goal}"` : ''}
${blocks?.length ? `Key sections: ${blocks.join(', ')}` : ''}
Meta description (plain text only):`,
      }],
    });
    const text = message.content[0].type === 'text' ? message.content[0].text.trim().replace(/^["']|["']$/g, '').slice(0, 160) : '';
    res.json({ success: true, description: text });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── AI Page Suggest (legacy — kept for compatibility) ─────────────────────
app.post('/api/ai/suggest', async (req, res) => {
  const { pageGoal } = req.body;
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: 'You are an expert at planning landing pages. Respond with JSON only. No markdown.',
      messages: [{
        role: 'user',
        content: `Plan a landing page for: "${pageGoal}"
Suggest 4-6 sections from: hero, features, pricing, testimonials, cta, faq, text-content, stats, footer
Respond:
{"sections":["hero","features","cta","footer"],"tagline":"Short tagline"}`,
      }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    const data = match ? JSON.parse(match[0]) : {};
    res.json({ success: true, ...data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Page Share (preview link) ─────────────────────────────────────────────
const shareStore = new Map<string, { html: string; title: string; createdAt: number }>();
const SHARE_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

app.post('/api/share', (req, res) => {
  const { html, title } = req.body;
  if (!html || typeof html !== 'string') {
    return res.status(400).json({ success: false, error: 'html required' });
  }
  // Clean up expired entries
  for (const [k, v] of shareStore) {
    if (Date.now() - v.createdAt > SHARE_TTL_MS) shareStore.delete(k);
  }
  const id = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 5);
  shareStore.set(id, { html, title: title || 'Preview', createdAt: Date.now() });
  const origin = `${req.protocol}://${req.get('host')}`;
  res.json({ success: true, shareId: id, url: `${origin}/share/${id}` });
});

app.get('/share/:id', (req, res) => {
  const entry = shareStore.get(req.params.id);
  if (!entry) {
    return res.status(404).send('<html><body style="font-family:sans-serif;padding:40px;text-align:center"><h2>Preview expired or not found</h2><p>Share links are valid for 48 hours.</p></body></html>');
  }
  res.setHeader('Content-Type', 'text/html');
  res.send(entry.html);
});

// ── Publish to Web (permanent hosted pages) ──────────────────────────────
const SITES_DIR = path.join(__dirname, '../../data/sites');
const SITES_INDEX = path.join(SITES_DIR, '_index.json');
if (!fs.existsSync(SITES_DIR)) fs.mkdirSync(SITES_DIR, { recursive: true });

interface SiteMeta { slug: string; title: string; publishedAt: string; updatedAt: string; views: number; }

function loadSitesIndex(): Record<string, SiteMeta> {
  try { return fs.existsSync(SITES_INDEX) ? JSON.parse(fs.readFileSync(SITES_INDEX, 'utf8')) : {}; }
  catch { return {}; }
}
function saveSitesIndex(index: Record<string, SiteMeta>) {
  fs.writeFileSync(SITES_INDEX, JSON.stringify(index, null, 2));
}
function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'page';
}

app.post('/api/publish-web', (req, res) => {
  const { html, title } = req.body;
  if (!html || typeof html !== 'string') return res.status(400).json({ success: false, error: 'html required' });
  const index = loadSitesIndex();
  // Find if this title already has a slug (update vs create)
  const existing = Object.values(index).find(s => s.title === title);
  const slug = existing?.slug || (() => {
    let base = slugify(title || 'page');
    let candidate = base;
    let n = 2;
    while (fs.existsSync(path.join(SITES_DIR, `${candidate}.html`))) { candidate = `${base}-${n++}`; }
    return candidate;
  })();
  const now = new Date().toISOString();
  fs.writeFileSync(path.join(SITES_DIR, `${slug}.html`), html);
  index[slug] = { slug, title: title || 'My Page', publishedAt: existing?.publishedAt || now, updatedAt: now, views: existing?.views ?? 0 };
  saveSitesIndex(index);
  const origin = `${req.protocol}://${req.get('host')}`;
  console.log(`🌐  Published: ${origin}/sites/${slug}`);
  res.json({ success: true, slug, url: `${origin}/sites/${slug}` });
});

app.get('/api/my-sites', (_req, res) => {
  const index = loadSitesIndex();
  res.json({ success: true, sites: Object.values(index).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) });
});

app.delete('/api/my-sites/:slug', (req, res) => {
  const index = loadSitesIndex();
  const slug = req.params.slug;
  if (!index[slug]) return res.status(404).json({ success: false, error: 'Not found' });
  try { fs.unlinkSync(path.join(SITES_DIR, `${slug}.html`)); } catch {}
  delete index[slug];
  saveSitesIndex(index);
  res.json({ success: true });
});

app.get('/sites/:slug', (req, res) => {
  const file = path.join(SITES_DIR, `${req.params.slug}.html`);
  if (!fs.existsSync(file)) {
    return res.status(404).send('<html><body style="font-family:sans-serif;padding:60px;text-align:center;max-width:500px;margin:0 auto"><h2 style="color:#1e293b">Page Not Found</h2><p style="color:#64748b">This page was deleted or does not exist.</p></body></html>');
  }
  // Track view
  const index = loadSitesIndex();
  if (index[req.params.slug]) {
    index[req.params.slug].views = (index[req.params.slug].views || 0) + 1;
    saveSitesIndex(index);
  }
  res.setHeader('Content-Type', 'text/html');
  res.sendFile(file);
});

// ── AI A/B Headline Testing ───────────────────────────────────────────────
app.post('/api/ai/ab-test', async (req, res) => {
  const { headline, subheadline, primaryBtn, pageGoal } = req.body;
  if (!headline) return res.status(400).json({ success: false, error: 'headline required' });
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: 'You are a world-class copywriter and CRO expert. Respond with valid JSON only. No markdown.',
      messages: [{
        role: 'user',
        content: `Generate 3 A/B test variants for this hero section headline.
Current headline: "${headline}"
${subheadline ? `Current subheadline: "${subheadline}"` : ''}
${primaryBtn ? `CTA button: "${primaryBtn}"` : ''}
${pageGoal ? `Page goal: "${pageGoal}"` : ''}

Each variant should use a different copywriting angle:
- Variant A: Outcome-focused (what the user achieves)
- Variant B: Pain-point focused (problem it solves)
- Variant C: Social proof angle (used by X type of people)

Respond with JSON:
{"variants":[
  {"label":"A","angle":"Outcome-focused","headline":"str","subheadline":"str","primaryBtn":"str","improvement":"Why this might convert better"},
  {"label":"B","angle":"Pain-point focused","headline":"str","subheadline":"str","primaryBtn":"str","improvement":"Why this might convert better"},
  {"label":"C","angle":"Social proof angle","headline":"str","subheadline":"str","primaryBtn":"str","improvement":"Why this might convert better"}
]}

Rules: Headlines under 12 words. Be specific, not generic. Each variant must be meaningfully different.`,
      }],
    });
    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    const data = match ? JSON.parse(match[0]) : { variants: [] };
    res.json({ success: true, variants: data.variants || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Privacy Policy ─────────────────────────────────────────────────────────
app.get('/privacy', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Privacy Policy - AI PageBuilder</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:800px;margin:0 auto;padding:40px 24px;color:#1e293b;line-height:1.7}h1{color:#0f172a;font-size:2rem;margin-bottom:8px}h2{color:#1e293b;font-size:1.2rem;margin-top:32px}p,li{color:#475569}a{color:#4f46e5}hr{border:none;border-top:1px solid #e2e8f0;margin:32px 0}.badge{display:inline-block;background:#f1f5f9;color:#64748b;font-size:0.8rem;padding:4px 10px;border-radius:20px;margin-bottom:24px}</style>
</head>
<body>
<h1>Privacy Policy</h1>
<span class="badge">Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
<p>AI PageBuilder ("the App", "we", "us") is a Shopify app that helps merchants create landing pages using AI. This Privacy Policy explains how we collect, use, and protect your information.</p>
<h2>Information We Collect</h2>
<ul>
<li><strong>Shopify store data:</strong> When you install the App, we receive your store's domain and an access token to publish pages on your behalf.</li>
<li><strong>Page content:</strong> The text and layout data of pages you create are stored locally in your browser and on our servers only when you choose to publish.</li>
<li><strong>Contact form submissions:</strong> If your published page includes a contact form, submissions are stored on our server and accessible only to you.</li>
<li><strong>Email subscribers:</strong> If your page includes a newsletter block, subscriber emails are stored on our server.</li>
</ul>
<h2>How We Use Your Information</h2>
<ul>
<li>To publish pages to your Shopify store as requested</li>
<li>To generate AI content using the Anthropic API (content is not stored by Anthropic beyond the API call)</li>
<li>To display page analytics (view counts) in your dashboard</li>
</ul>
<h2>Data Sharing</h2>
<p>We do not sell your data. We share data only with:</p>
<ul>
<li><strong>Anthropic:</strong> Page content is sent to the Anthropic API for AI generation. See <a href="https://www.anthropic.com/privacy">Anthropic's privacy policy</a>.</li>
<li><strong>Shopify:</strong> Page HTML is published to your store via the Shopify Admin API.</li>
</ul>
<h2>Data Retention</h2>
<p>Published pages are stored until you delete them. Contact form submissions and subscriber lists are retained until you delete them or uninstall the App.</p>
<h2>Your Rights</h2>
<p>You may request deletion of all your data by uninstalling the App or contacting us at the email below. We will comply within 30 days.</p>
<h2>GDPR Compliance</h2>
<p>We support Shopify's mandatory GDPR webhooks: customer data requests, customer data deletion, and shop data deletion are all handled automatically upon uninstall.</p>
<h2>Contact</h2>
<p>Questions? Email us at <a href="mailto:777beststocktrader@gmail.com">777beststocktrader@gmail.com</a></p>
<hr>
<p style="font-size:0.85rem;color:#94a3b8">AI PageBuilder is not affiliated with Shopify Inc.</p>
</body></html>`);
});

// ── Terms of Service ───────────────────────────────────────────────────────
app.get('/terms', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Terms of Service - AI PageBuilder</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:800px;margin:0 auto;padding:40px 24px;color:#1e293b;line-height:1.7}h1{color:#0f172a;font-size:2rem;margin-bottom:8px}h2{color:#1e293b;font-size:1.2rem;margin-top:32px}p,li{color:#475569}a{color:#4f46e5}hr{border:none;border-top:1px solid #e2e8f0;margin:32px 0}.badge{display:inline-block;background:#f1f5f9;color:#64748b;font-size:0.8rem;padding:4px 10px;border-radius:20px;margin-bottom:24px}</style>
</head>
<body>
<h1>Terms of Service</h1>
<span class="badge">Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
<p>By installing or using AI PageBuilder, you agree to these Terms of Service.</p>
<h2>The Service</h2>
<p>AI PageBuilder is a Shopify embedded app that allows merchants to create, customize, and publish landing pages using AI-generated content.</p>
<h2>Acceptable Use</h2>
<p>You may not use the App to create pages that:</p>
<ul>
<li>Violate Shopify's Acceptable Use Policy</li>
<li>Contain illegal content, spam, or deceptive material</li>
<li>Infringe on third-party intellectual property rights</li>
</ul>
<h2>AI-Generated Content</h2>
<p>Content generated by the AI is provided "as is." You are responsible for reviewing and editing AI output before publishing. We do not guarantee the accuracy, originality, or fitness of AI-generated content for any purpose.</p>
<h2>Limitation of Liability</h2>
<p>The App is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the App, including but not limited to lost profits or data loss.</p>
<h2>Termination</h2>
<p>You may stop using the App at any time by uninstalling it from your Shopify store.</p>
<h2>Changes to Terms</h2>
<p>We may update these Terms at any time. Continued use of the App constitutes acceptance of the updated Terms.</p>
<h2>Contact</h2>
<p>Questions? Email us at <a href="mailto:777beststocktrader@gmail.com">777beststocktrader@gmail.com</a></p>
<hr>
<p style="font-size:0.85rem;color:#94a3b8">AI PageBuilder is not affiliated with Shopify Inc.</p>
</body></html>`);
});

// ── Serve React frontend in production ────────────────────────────────────
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 AI Page Builder running on http://localhost:${PORT}`);
  console.log(`🛍️  Install URL: http://localhost:${PORT}/api/auth?shop=YOUR-STORE.myshopify.com`);
  console.log(`🤖  Model: claude-haiku-4-5-20251001\n`);
});
