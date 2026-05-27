import '@shopify/shopify-api/adapters/node';
import { shopifyApi, LATEST_API_VERSION, Session } from '@shopify/shopify-api';
import fs from 'fs';
import path from 'path';

// ── File-based session persistence ────────────────────────────────────────
// Survives Render restarts (in-memory was wiped on every cold start).
const SESSIONS_FILE = path.join(__dirname, '../../data/sessions.json');

function ensureDir() {
  const dir = path.dirname(SESSIONS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadSessionsFromDisk(): Map<string, Session> {
  try {
    ensureDir();
    if (!fs.existsSync(SESSIONS_FILE)) return new Map();
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf8');
    const entries: [string, any][] = JSON.parse(raw);
    return new Map(entries.map(([id, s]) => [id, new Session(s)]));
  } catch {
    return new Map();
  }
}

function saveSessions(map: Map<string, Session>) {
  try {
    ensureDir();
    const entries = Array.from(map.entries());
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(entries, null, 2));
  } catch (e) {
    console.error('Failed to persist sessions:', e);
  }
}

// Load persisted sessions on startup
const sessionMap = loadSessionsFromDisk();
console.log(`Loaded ${sessionMap.size} persisted session(s) from disk`);

export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY || '',
  apiSecretKey: process.env.SHOPIFY_API_SECRET || '',
  scopes: ['read_content', 'write_content', 'read_themes', 'read_products'],
  hostName: (process.env.APP_URL || 'localhost:3001').replace(/^https?:\/\//, ''),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
  logger: { level: 0 },
});

export const sessionStorage = {
  storeSession: async (session: Session): Promise<boolean> => {
    sessionMap.set(session.id, session);
    saveSessions(sessionMap);
    console.log(`Session saved for shop: ${session.shop}`);
    return true;
  },
  loadSession: async (id: string): Promise<Session | undefined> => {
    return sessionMap.get(id);
  },
  deleteSession: async (id: string): Promise<boolean> => {
    sessionMap.delete(id);
    saveSessions(sessionMap);
    return true;
  },
  deleteSessions: async (ids: string[]): Promise<boolean> => {
    ids.forEach((id) => sessionMap.delete(id));
    saveSessions(sessionMap);
    return true;
  },
  findSessionsByShop: async (shop: string): Promise<Session[]> => {
    return Array.from(sessionMap.values()).filter((s) => s.shop === shop);
  },
};

export async function getSessionForShop(shop: string): Promise<Session | null> {
  const sessions = await sessionStorage.findSessionsByShop(shop);
  return sessions.find((s) => !s.isOnline) || sessions[0] || null;
}
