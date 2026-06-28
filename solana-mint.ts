// Solana mint authority / freeze authority check via public RPC
// Safe-token heuristic: both mintAuthority and freezeAuthority should be null (revoked)

const RPC = "https://api.mainnet-beta.solana.com";

export interface MintInfo {
  mintAuthority: string | null;
  freezeAuthority: string | null;
  supply: string;
  decimals: number;
}

export async function getMintInfos(addresses: string[]): Promise<Map<string, MintInfo | null>> {
  const out = new Map<string, MintInfo | null>();
  if (!addresses.length) return out;
  // batches of 100 (RPC limit)
  const chunks: string[][] = [];
  for (let i = 0; i < addresses.length; i += 100) chunks.push(addresses.slice(i, i + 100));
  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const res = await fetch(RPC, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getMultipleAccounts",
            params: [chunk, { encoding: "jsonParsed", commitment: "confirmed" }],
          }),
        });
        const json = await res.json();
        const values: Array<null | {
          data?: { parsed?: { info?: MintInfo; type?: string } };
        }> = json?.result?.value ?? [];
        chunk.forEach((addr, i) => {
          const v = values[i];
          const info = v?.data?.parsed?.info;
          if (info && v?.data?.parsed?.type === "mint") {
            out.set(addr, {
              mintAuthority: info.mintAuthority ?? null,
              freezeAuthority: info.freezeAuthority ?? null,
              supply: String(info.supply ?? ""),
              decimals: Number(info.decimals ?? 0),
            });
          } else {
            out.set(addr, null);
          }
        });
      } catch (e) {
        console.warn("getMintInfos failed", e);
        for (const a of chunk) out.set(a, null);
      }
    }),
  );
  return out;
}
