// Dexscreener public API client (no key needed, CORS-enabled)
// Docs: https://docs.dexscreener.com/api/reference

export interface DsPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceUsd?: string;
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  volume?: { h24?: number; h6?: number; h1?: number; m5?: number };
  liquidity?: { usd?: number; base?: number; quote?: number };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: { imageUrl?: string; websites?: { url: string }[]; socials?: { type: string; url: string }[] };
  txns?: { h24?: { buys: number; sells: number } };
  boosts?: { active?: number };
}

export interface DsProfile {
  url: string;
  chainId: string;
  tokenAddress: string;
  icon?: string;
  header?: string;
  description?: string;
  links?: { type?: string; label?: string; url: string }[];
}

export interface DsBoost extends DsProfile {
  amount?: number;
  totalAmount?: number;
}

const BASE = "https://api.dexscreener.com";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Dexscreener ${res.status}: ${url}`);
  return res.json();
}

export async function getTopBoosts(): Promise<DsBoost[]> {
  return getJson<DsBoost[]>(`${BASE}/token-boosts/top/v1`);
}

export async function getLatestBoosts(): Promise<DsBoost[]> {
  return getJson<DsBoost[]>(`${BASE}/token-boosts/latest/v1`);
}

export async function getLatestProfiles(): Promise<DsProfile[]> {
  return getJson<DsProfile[]>(`${BASE}/token-profiles/latest/v1`);
}

// Get all pairs for a token address. Returns best (highest liquidity) pair.
export async function getTokenPairs(chainId: string, tokenAddress: string): Promise<DsPair[]> {
  const data = await getJson<{ pairs?: DsPair[] }>(
    `${BASE}/tokens/v1/${chainId}/${tokenAddress}`,
  );
  return (data as unknown as DsPair[] | { pairs?: DsPair[] } | null) === null
    ? []
    : Array.isArray(data)
      ? (data as unknown as DsPair[])
      : (data.pairs ?? []);
}

export async function getSearchPairs(query: string): Promise<DsPair[]> {
  const data = await getJson<{ pairs?: DsPair[] }>(`${BASE}/latest/dex/search?q=${encodeURIComponent(query)}`);
  return data.pairs ?? [];
}

// Hydrate token addresses -> best pair (one batched call per up to 30 tokens)
export async function hydratePairs(chainId: string, tokenAddresses: string[]): Promise<Map<string, DsPair>> {
  const result = new Map<string, DsPair>();
  const chunks: string[][] = [];
  for (let i = 0; i < tokenAddresses.length; i += 30) chunks.push(tokenAddresses.slice(i, i + 30));
  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const arr = await getJson<DsPair[]>(`${BASE}/tokens/v1/${chainId}/${chunk.join(",")}`);
        const list = Array.isArray(arr) ? arr : [];
        // pick best pair per baseToken.address
        for (const p of list) {
          const addr = p.baseToken?.address;
          if (!addr) continue;
          const cur = result.get(addr);
          const liq = p.liquidity?.usd ?? 0;
          const curLiq = cur?.liquidity?.usd ?? -1;
          if (!cur || liq > curLiq) result.set(addr, p);
        }
      } catch (e) {
        console.warn("hydratePairs chunk failed", e);
      }
    }),
  );
  return result;
}
