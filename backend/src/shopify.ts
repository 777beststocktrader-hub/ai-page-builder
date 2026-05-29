import '@shopify/shopify-api/adapters/node';
import { shopifyApi, LATEST_API_VERSION, Session } from '@shopify/shopify-api';
import { Request } from 'express';
import crypto from 'crypto';
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
  scopes: ['read_content', 'write_content', 'read_products'],
  hostName: (process.env.APP_URL || 'localhost:3001').replace(/^https?:\/\//, ''),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
  logger: { level: 0 },
});

export const SHOPIFY_GRAPHQL_API_VERSION = process.env.SHOPIFY_API_VERSION || '2026-01';

export async function adminGraphql<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables: Record<string, any> = {}
): Promise<T> {
  const response = await fetch(`https://${shop}/admin/api/${SHOPIFY_GRAPHQL_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  const data = await response.json() as { data?: T; errors?: any[] };
  if (!response.ok || data.errors?.length) {
    throw new Error(`Shopify GraphQL error: ${JSON.stringify(data.errors || data)}`);
  }

  return data.data as T;
}

function decodeBase64Url(value: string): Buffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64');
}

export interface ShopifySessionTokenPayload {
  aud: string;
  dest: string;
  exp: number;
  iss: string;
  nbf?: number;
  sub: string;
}

export function verifyShopifySessionToken(token: string): ShopifySessionTokenPayload | null {
  const secret = process.env.SHOPIFY_API_SECRET;
  const apiKey = process.env.SHOPIFY_API_KEY;
  if (!secret || !apiKey) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest();
  const received = decodeBase64Url(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null;

  try {
    const decoded = JSON.parse(decodeBase64Url(payload).toString('utf8')) as ShopifySessionTokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (decoded.aud !== apiKey) return null;
    if (decoded.exp <= now) return null;
    if (decoded.nbf && decoded.nbf > now) return null;
    if (!decoded.dest?.startsWith('https://')) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function getShopFromSessionToken(req: Request): string | null {
  const header = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return null;

  const payload = verifyShopifySessionToken(match[1]);
  if (!payload) return null;

  return payload.dest.replace(/^https:\/\//, '').replace(/\/$/, '');
}

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
