// Lightweight Cloudflare Access JWT verify (RS256 via Access JWKS)
// Expects env.ACCESS_JWKS_URL + env.JWT_AUD
// Cache JWKS per worker instance.

import type { Env } from '../worker';

let jwksCache: Record<string, CryptoKey> | null = null;

interface JwksResponse {
  keys: {
    kty: string;
    n: string;
    e: string;
    kid: string;
  }[];
}

async function getJwks(env: Env): Promise<Record<string, CryptoKey>> {
  if (jwksCache) return jwksCache;
  const res = await fetch(env.ACCESS_JWKS_URL);
  if (!res.ok) throw new Error("JWKS fetch failed");
  const { keys } = (await res.json()) as JwksResponse;
  const map: Record<string, CryptoKey> = {};
  for (const k of keys) {
    if (k.kty !== "RSA" || !k.n || !k.e || !k.kid) continue;
    const jwk = { kty: "RSA", n: k.n, e: k.e, alg: "RS256", ext: true };
    map[k.kid] = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
  }
  jwksCache = map;
  return map;
}

function b64urlToUint8(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  const str = atob(s + "=".repeat(pad));
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i);
  return arr;
}

export async function verifyAccessJWT(authHeader: string | null, env: Env): Promise<{ sub: string } | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) return null;

  const header = JSON.parse(new TextDecoder().decode(b64urlToUint8(h)));
  const payload = JSON.parse(new TextDecoder().decode(b64urlToUint8(p)));
  const sig = b64urlToUint8(s);

  if (!payload || payload.aud !== env.JWT_AUD) return null;
  if (payload.exp && Date.now() / 1000 > payload.exp) return null;

  const jwks = await getJwks(env);
  const key: CryptoKey | undefined = jwks[header.kid];
  if (!key) return null;

  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, sig, new TextEncoder().encode(`${h}.${p}`));
  if (!ok) return null;

  return { sub: payload.sub };
}