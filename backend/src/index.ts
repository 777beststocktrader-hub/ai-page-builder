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
    const VALID_TYPES = new Set(['banner','navbar','hero','features','pricing','testimonials','cta','faq','text-content','stats','footer','video','logo-cloud','newsletter','richtext','contact','steps','comparison','team','countdown']);
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
