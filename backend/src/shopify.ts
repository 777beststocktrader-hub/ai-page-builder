import '@shopify/shopify-api/adapters/node';
import { shopifyApi, LATEST_API_VERSION, Session } from '@shopify/shopify-api';

// In-memory session store (replace with Redis/Postgres for production)
const sessionMap = new Map<string, Session>();

export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY || '',
  apiSecretKey: process.env.SHOPIFY_API_SECRET || '',
  scopes: ['read_content', 'write_content', 'read_themes'],
  hostName: (process.env.APP_URL || 'localhost:3001').replace(/^https?:\/\//, ''),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
  logger: { level: 0 },
});

export const sessionStorage = {
  storeSession: async (session: Session): Promise<boolean> => {
    sessionMap.set(session.id, session);
    return true;
  },
  loadSession: async (id: string): Promise<Session | undefined> => {
    return sessionMap.get(id);
  },
  deleteSession: async (id: string): Promise<boolean> => {
    sessionMap.delete(id);
    return true;
  },
  deleteSessions: async (ids: string[]): Promise<boolean> => {
    ids.forEach((id) => sessionMap.delete(id));
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
