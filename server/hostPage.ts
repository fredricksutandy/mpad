import QRCode from 'qrcode';
import { LocalAddress } from './network.js';
import { pairingUrl } from './auth.js';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * The page opened on the desktop when mPad is launched from the shortcut.
 * Replaces the terminal banner: QR code, reachable URLs, live client count,
 * and a stop button.
 */
export async function renderHostPage(port: number, addresses: LocalAddress[]): Promise<string> {
  const candidates = addresses.length > 0 ? addresses : [{ address: '127.0.0.1', iface: 'loopback', score: 0 }];

  const cards = await Promise.all(
    candidates.map(async (addr, index) => {
      const url = pairingUrl(addr.address, port);
      const displayUrl = `http://${addr.address}:${port}`;
      const svg = await QRCode.toString(url, {
        type: 'svg',
        margin: 1,
        color: { dark: '#090a0f', light: '#ffffff' },
      });

      return `
        <section class="qr-panel${index === 0 ? ' active' : ''}" data-index="${index}">
          <div class="qr">${svg}</div>
          <p class="url">${escapeHtml(displayUrl)}</p>
          <p class="iface">via ${escapeHtml(addr.iface)}</p>
        </section>`;
    })
  );

  const multipleAddresses = candidates.length > 1;

  const tabs = candidates
    .map(
      (addr, index) =>
        `<button class="tab${index === 0 ? ' active' : ''}" data-index="${index}">${escapeHtml(addr.address)}</button>`
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>mPad — Connect your phone</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #090a0f; color: #e2e8f0; padding: 32px 20px;
    font-family: "Segoe UI", system-ui, sans-serif;
  }
  .card {
    background: #14161f; border: 1px solid #232838; border-radius: 20px;
    padding: 28px 32px; max-width: 460px; width: 100%; text-align: center;
    box-shadow: 0 24px 60px rgba(0,0,0,.55);
  }
  h1 { font-size: 20px; margin: 0 0 4px; letter-spacing: .3px; }
  .sub { margin: 0 0 22px; color: #7c8599; font-size: 13px; }
  .qr { background: #fff; border-radius: 14px; padding: 12px; display: inline-block; line-height: 0; }
  .qr svg { width: 220px; height: 220px; display: block; }
  .qr-panel { display: none; }
  .qr-panel.active { display: block; }
  .url { font-size: 16px; font-weight: 600; margin: 16px 0 2px; color: #a5b4fc; word-break: break-all; }
  .iface { font-size: 12px; color: #6b7280; margin: 0; }
  .tabs { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 18px; }
  .tab {
    background: #1c2030; border: 1px solid #2b3145; color: #94a3b8;
    border-radius: 999px; padding: 5px 12px; font-size: 12px; cursor: pointer;
  }
  .tab.active { border-color: #6366f1; color: #c7d2fe; background: #232a45; }
  .status { margin-top: 22px; font-size: 13px; color: #94a3b8; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .dot { width: 9px; height: 9px; border-radius: 50%; background: #475569; }
  .dot.live { background: #34d399; box-shadow: 0 0 0 4px rgba(52,211,153,.15); }
  .hint { margin: 18px 0 0; font-size: 12px; color: #6b7280; line-height: 1.6; }
  .stop {
    margin-top: 22px; width: 100%; padding: 11px; border-radius: 12px; cursor: pointer;
    background: #2a1620; border: 1px solid #612435; color: #fca5a5; font-size: 14px; font-weight: 600;
  }
  .stop:hover { background: #3a1c2a; }
  .stopped .card > *:not(h1):not(.sub) { display: none; }
</style>
</head>
<body>
  <div class="card" id="card">
    <h1>📱 mPad is running</h1>
    <p class="sub">Scan with your phone camera — same Wi-Fi network.</p>
    ${cards.join('')}
    ${multipleAddresses ? `<div class="tabs">${tabs}</div>` : ''}
    <div class="status"><span class="dot" id="dot"></span><span id="statusText">No phone connected</span></div>
    ${multipleAddresses ? '<p class="hint">Not connecting? Pick another address above — some belong to virtual adapters your phone cannot reach.</p>' : ''}
    <button class="stop" id="stop">Stop mPad server</button>
  </div>
<script>
  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var index = tab.dataset.index;
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t === tab); });
      document.querySelectorAll('.qr-panel').forEach(function (p) {
        p.classList.toggle('active', p.dataset.index === index);
      });
    });
  });

  var dot = document.getElementById('dot');
  var statusText = document.getElementById('statusText');
  var polling = true;

  async function poll() {
    if (!polling) return;
    try {
      var res = await fetch('/__host/status', { cache: 'no-store' });
      var data = await res.json();
      dot.classList.toggle('live', data.clients > 0);
      statusText.textContent = data.clients === 0
        ? 'No phone connected'
        : data.clients + (data.clients === 1 ? ' phone connected' : ' phones connected');
    } catch (err) {
      dot.classList.remove('live');
      statusText.textContent = 'Server not responding';
    }
  }
  poll();
  setInterval(poll, 2000);

  document.getElementById('stop').addEventListener('click', async function () {
    polling = false;
    try { await fetch('/__host/stop', { method: 'POST' }); } catch (err) { /* server dies mid-request */ }
    document.querySelector('h1').textContent = '🛑 mPad stopped';
    document.querySelector('.sub').textContent = 'You can close this tab. Use the desktop shortcut to start again.';
    document.body.classList.add('stopped');
  });
</script>
</body>
</html>`;
}
