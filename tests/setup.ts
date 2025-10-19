// Vitest global setup for Workers-like APIs in Node 20

import { webcrypto as _crypto } from "node:crypto";

// crypto.subtle
// @ts-expect-error: polyfill for crypto.subtle
if (!globalThis.crypto) globalThis.crypto = _crypto as any;

// atob/btoa
if (typeof globalThis.atob === "undefined") {
  globalThis.atob = (b64: string) => Buffer.from(b64, "base64").toString("binary");
}
if (typeof globalThis.btoa === "undefined") {
  globalThis.btoa = (bin: string) => Buffer.from(bin, "binary").toString("base64");
}

// Headers/Request/Response are in undici (bundled in Node)
// no-op if they exist