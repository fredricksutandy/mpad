// Verifies the pairing token, origin check, Host check, and log hygiene.
// Run with: npm run test:auth
import { spawn } from 'child_process';
import { WebSocket } from 'ws';
import { setTimeout as sleep } from 'timers/promises';

const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}`;

let failures = 0;

function check(name, passed, detail = '') {
  console.log(`  ${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` -- ${detail}` : ''}`);
  if (!passed) failures++;
}

/** Attempt a WebSocket handshake. Resolves to 'open' or the HTTP status code. */
function handshake(url, headers = {}) {
  return new Promise((resolve) => {
    const ws = new WebSocket(url, { headers });
    const finish = (result) => {
      try { ws.close(); } catch { /* already closed */ }
      resolve(result);
    };
    ws.on('open', () => finish('open'));
    ws.on('unexpected-response', (_req, res) => finish(res.statusCode));
    ws.on('error', (err) => finish(`error:${err.message}`));
    setTimeout(() => finish('timeout'), 4000);
  });
}

const server = spawn(process.execPath, ['dist-server/index.js'], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverLog = '';
server.stdout.on('data', (d) => { serverLog += d.toString(); });
server.stderr.on('data', (d) => { serverLog += d.toString(); });

try {
  let up = false;
  for (let i = 0; i < 40 && !up; i++) {
    await sleep(250);
    try { up = (await fetch(`${BASE}/__host/pairing`)).ok; } catch { /* not yet */ }
  }
  if (!up) throw new Error(`server never started. Log:\n${serverLog}`);

  const { url } = await fetch(`${BASE}/__host/pairing`).then((r) => r.json());
  const token = new URL(url).searchParams.get('t');

  console.log('\nPairing token:');
  check('token is present and long enough', typeof token === 'string' && token.length >= 32, `${token?.length} chars`);

  console.log('\nWebSocket authentication:');
  check('no token is rejected', (await handshake(`ws://127.0.0.1:${PORT}/`)) === 401);
  check('wrong token is rejected', (await handshake(`ws://127.0.0.1:${PORT}/?t=not-the-token`)) === 401);
  check('truncated token is rejected', (await handshake(`ws://127.0.0.1:${PORT}/?t=${token.slice(0, -1)}`)) === 401);
  check('correct token is accepted', (await handshake(`ws://127.0.0.1:${PORT}/?t=${token}`)) === 'open');

  console.log('\nCross-origin and DNS-rebinding defence:');
  check(
    'foreign origin rejected despite valid token',
    (await handshake(`ws://127.0.0.1:${PORT}/?t=${token}`, { Origin: 'http://evil.example' })) === 403
  );
  check(
    'own origin accepted',
    (await handshake(`ws://127.0.0.1:${PORT}/?t=${token}`, { Origin: `http://127.0.0.1:${PORT}` })) === 'open'
  );
  check(
    'foreign Host header rejected',
    (await handshake(`ws://127.0.0.1:${PORT}/?t=${token}`, { Host: 'attacker.example' })) === 403
  );

  console.log('\nToken exposure:');
  const hostRes = await fetch(`${BASE}/host`);
  check('host page served over loopback', hostRes.status === 200);
  check('client app still served without a token', (await fetch(`${BASE}/`)).status === 200);

  console.log('\nLog hygiene:');
  check('token never written to stdout/stderr', !serverLog.includes(token));
} catch (err) {
  console.error('\nHarness error:', err.message);
  failures++;
} finally {
  server.kill();
  await sleep(300);
}

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
