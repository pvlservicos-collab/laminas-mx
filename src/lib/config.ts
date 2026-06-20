import { getDb } from "@/lib/db";

export interface SiteConfig {
  locale: string;
  currency: string;
  price: string;
  checkoutUrl: string;
  firstButtonText: string;
  purchaseButtonText: string;
}

export const DEFAULT_CONFIG: SiteConfig = {
  locale: "es-MX",
  currency: "MXN",
  price: "MX$63.99",
  checkoutUrl: "https://folem.mycartpanda.com/checkout",
  firstButtonText: "¡EMPEZAR!",
  purchaseButtonText: "⚽ RECIBIR MI CROMO",
};

let _cache: SiteConfig | null = null;
let _cacheAt = 0;
const CACHE_TTL = 60_000;

export async function getConfig(): Promise<SiteConfig> {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL) return _cache;
  try {
    const sql = getDb();
    const rows = await sql`SELECT data FROM site_config WHERE id = 1`;
    if (rows.length && rows[0].data) {
      _cache = { ...DEFAULT_CONFIG, ...(rows[0].data as Partial<SiteConfig>) };
      _cacheAt = Date.now();
      return _cache;
    }
  } catch {
    // tabela ainda não existe — usa default
  }
  return DEFAULT_CONFIG;
}

export async function saveConfig(data: Partial<SiteConfig>): Promise<void> {
  const sql = getDb();
  const merged = { ...DEFAULT_CONFIG, ...data };
  const jsonStr = JSON.stringify(merged);
  await sql`
    INSERT INTO site_config (id, data, updated_at)
    VALUES (1, ${jsonStr}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE
      SET data = ${jsonStr}::jsonb, updated_at = NOW()
  `;
  _cache = merged;
  _cacheAt = Date.now();
}
