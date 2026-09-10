import crypto from 'crypto';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { getLocalIPs } from './network.js';

/**
 * Pairing token, regenerated every time the server starts.
 *
 * It reaches the phone only through the QR code on the desktop host page, so
 * possession of it means "this device looked at the PC's screen". Restarting
 * mPad invalidates every previously paired phone by design.
 */
export const SESSION_TOKEN = crypto.randomBytes(24).toString('base64url');

/** Constant-time compare so a wrong token cannot be guessed byte by byte. */
export function tokenMatches(candidate: string | null | undefined): boolean {
  if (!candidate) return false;
  const given = Buffer.from(candidate);
  const expected = Buffer.from(SESSION_TOKEN);
  if (given.length !== expected.length) return false;
  return crypto.timingSafeEqual(given, expected);
}

/** Addresses this server legitimately answers on. */
function allowedHostnames(): Set<string> {
  const names = new Set<string>(['localhost', '127.0.0.1', '[::1]', '::1']);
  for (const addr of getLocalIPs()) names.add(addr.address);
  return names;
}

function hostnameOf(value: string): string {
  // Strip an optional port; keep IPv6 brackets intact.
  const match = value.match(/^(\[[^\]]+\]|[^:]+)(?::(\d+))?$/);
  return match ? match[1].toLowerCase() : value.toLowerCase();
}

/**
 * Rejects requests whose Host header names something other than this machine.
 * Without it, an attacker's domain can be pointed at a LAN address and the
 * browser will happily treat the response as that domain's own (DNS rebinding).
 */
export function isAllowedHost(hostHeader: string | undefined): boolean {
  if (!hostHeader) return false;
  return allowedHostnames().has(hostnameOf(hostHeader));
}

/**
 * WebSockets are exempt from the same-origin policy, so any web page in any
 * browser can open a socket to this server unless the Origin is checked.
 * A missing Origin means a non-browser client (the token still gates it).
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  try {
    return allowedHostnames().has(hostnameOf(new URL(origin).host));
  } catch {
    return false;
  }
}

/** True for requests arriving over loopback rather than the network. */
export function isLoopback(socket: Socket | undefined): boolean {
  const address = socket?.remoteAddress ?? '';
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

export function tokenFromRequest(req: IncomingMessage): string | null {
  try {
    return new URL(req.url ?? '/', 'http://placeholder').searchParams.get('t');
  } catch {
    return null;
  }
}

/** The URL a phone should open, including the pairing token. */
export function pairingUrl(address: string, port: number): string {
  return `http://${address}:${port}/?t=${SESSION_TOKEN}`;
}
