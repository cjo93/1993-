// Simple in-memory sliding window (to be integrated when feature is on)
type Hit = number; // epoch ms
const bucket = new Map<string, Hit[]>();

export function hit(ip: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (bucket.get(ip) ?? []).filter(t => now - t < windowMs);
  arr.push(now);
  bucket.set(ip, arr);
  return arr.length <= limit; // true = allowed
}