import os from 'os';
import qrcode from 'qrcode-terminal';

export interface LocalAddress {
  /** IPv4 address, e.g. "192.168.1.20" */
  address: string;
  /** OS name of the network adapter this address belongs to */
  iface: string;
  /** Higher score = more likely to be the Wi-Fi/LAN address a phone can reach */
  score: number;
}

// Adapters created by VMs, containers, and VPNs. Their addresses look private
// but a phone on the Wi-Fi network cannot reach them.
const VIRTUAL_IFACE = /(vethernet|virtualbox|vmware|hyper-?v|wsl|docker|tailscale|zerotier|vpn|tap-|npcap|loopback|bluetooth)/i;
const WIRELESS_IFACE = /(wi-?fi|wlan|wireless)/i;
const WIRED_IFACE = /^(ethernet|eth\d)/i;

function scoreAddress(iface: string, address: string): number {
  let score = 0;

  if (/^192\.168\./.test(address)) score += 30;
  else if (/^10\./.test(address)) score += 20;
  else if (/^172\.(1[6-9]|2\d|3[01])\./.test(address)) score += 10;
  else score -= 20;

  // Link-local means "no DHCP answered" — never routable to a phone.
  if (/^169\.254\./.test(address)) score -= 50;

  if (VIRTUAL_IFACE.test(iface)) score -= 40;
  if (WIRELESS_IFACE.test(iface)) score += 5;
  else if (WIRED_IFACE.test(iface)) score += 4;

  return score;
}

/**
 * Every non-internal IPv4 address on this machine, best candidate first.
 * The host page shows all of them so the user can switch if the top pick
 * belongs to the wrong adapter.
 */
export function getLocalIPs(): LocalAddress[] {
  const interfaces = os.networkInterfaces();
  const found: LocalAddress[] = [];

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] ?? []) {
      if (net.family !== 'IPv4' || net.internal) continue;
      found.push({ address: net.address, iface: name, score: scoreAddress(name, net.address) });
    }
  }

  return found.sort((a, b) => b.score - a.score);
}

export function getLocalIP(): string {
  return getLocalIPs()[0]?.address ?? '127.0.0.1';
}

export function displayBanner(port: number, localIP: string, pairingUrl: string) {
  console.log('\n======================================================');
  console.log('   mPad - Mobile-to-PC Trackpad Server');
  console.log('======================================================\n');
  console.log(`Server listening on http://${localIP}:${port}`);
  console.log(`Open the QR page on this PC:  http://localhost:${port}/host\n`);

  // Only draw the QR on a real terminal. When the launcher runs mPad hidden,
  // stdout is redirected to mpad.log - and the QR encodes the pairing token,
  // which has no business sitting in a file on disk.
  if (!process.stdout.isTTY) {
    console.log('Running without a terminal: scan the QR code on the host page above.');
    return;
  }

  console.log('Scan this QR code with your phone camera to connect:\n');
  qrcode.generate(pairingUrl, { small: true }, (qr) => {
    console.log(qr);
  });

  console.log('Tip: your phone must be on the same Wi-Fi network.');
  console.log('Tip: the pairing code changes every time mPad restarts.\n');
}
