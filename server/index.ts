import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { InputManager } from './input/inputManager.js';
import { getLocalIP, getLocalIPs, displayBanner } from './network.js';
import { renderHostPage } from './hostPage.js';
import { isAllowedHost, isAllowedOrigin, isLoopback, pairingUrl, tokenFromRequest, tokenMatches } from './auth.js';
import { InputEvent } from './protocol.js';

const PORT = parseInt(process.env.PORT || '8765', 10);
const app = express();
const server = http.createServer(app);

const wss = new WebSocketServer({
  server,
  verifyClient: ({ origin, req }, done) => {
    if (!isAllowedHost(req.headers.host)) {
      console.warn('🚫 [mPad] Rejected socket: unexpected Host header.');
      return done(false, 403, 'Forbidden');
    }
    // Any website in any browser can open a WebSocket to this address —
    // WebSockets ignore the same-origin policy. Only our own page may connect.
    if (!isAllowedOrigin(origin)) {
      console.warn('🚫 [mPad] Rejected socket from a foreign origin.');
      return done(false, 403, 'Forbidden');
    }
    if (!tokenMatches(tokenFromRequest(req))) {
      console.warn('🚫 [mPad] Rejected socket: missing or stale pairing token — phone must rescan the QR code.');
      return done(false, 401, 'Unauthorized');
    }
    return done(true);
  },
});

const inputManager = new InputManager();
const localIP = getLocalIP();

// Track active WebSocket connections
let activeClients = 0;

// --- Desktop host routes -------------------------------------------------
// Registered before the SPA catch-all below, which would otherwise swallow
// them. They render the pairing QR, so they answer only to the PC itself: a
// LAN device able to fetch /host could simply read the token out of it.

app.use(['/host', '/__host'], (req, res, next) => {
  if (!isLoopback(req.socket)) {
    console.warn(`🚫 [mPad] Blocked remote request to ${req.path}`);
    return res.status(403).send('The mPad host page is only available on the computer running mPad.');
  }
  if (!isAllowedHost(req.headers.host)) {
    return res.status(403).send('Forbidden');
  }
  next();
});

app.get('/host', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.type('html').send(await renderHostPage(PORT, getLocalIPs()));
  } catch (err) {
    console.error('[mPad] Failed to render host page:', err);
    res.status(500).send('Failed to render mPad host page.');
  }
});

// Loopback-only: gives the host page a manual pairing link and lets the
// test suite obtain the current token.
app.get('/__host/pairing', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ url: pairingUrl(localIP, PORT) });
});

app.get('/__host/status', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ clients: activeClients, port: PORT, addresses: getLocalIPs() });
});

app.post('/__host/stop', (req, res) => {
  res.json({ stopping: true });
  console.log('🛑 Stop requested from host page.');
  setTimeout(cleanup, 100);
});

// --- Client app ----------------------------------------------------------

// Serve static client assets from /dist if built, or informative message
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // If in dev mode and dist is not yet built, redirect to Vite dev server or serve placeholder
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>mPad Server</title>
          <style>
            body { font-family: system-ui, sans-serif; background: #0f111a; color: #fff; text-align: center; padding: 40px 20px; }
            .card { background: #1c2030; max-width: 400px; margin: 0 auto; padding: 24px; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.4); }
            a { color: #818cf8; text-decoration: none; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>📱 mPad Server Running</h2>
            <p>Client build not detected. If running in development mode, open Vite dev server on:</p>
            <p><a href="http://${localIP}:5173">http://${localIP}:5173</a></p>
          </div>
        </body>
      </html>
    `);
  });
}

wss.on('connection', (ws: WebSocket) => {
  activeClients++;
  console.log(`📱 [mPad] Phone paired and connected! Total active clients: ${activeClients}`);

  // Send initial connection ACK
  ws.send(JSON.stringify({ type: 'status', message: 'Connected to mPad Desktop Host', connectedClients: activeClients }));

  ws.on('message', (message: string) => {
    try {
      const event: InputEvent = JSON.parse(message.toString());
      
      // Handle ping directly for instant measurement
      if (event.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', id: event.id }));
        return;
      }

      // Log the kind of event only, never its payload: `text` and `key` events
      // carry whatever the user typed, and the launcher redirects stdout into
      // mpad.log on disk.
      if (event.type !== 'move' && event.type !== 'scroll') {
        console.log(`⚡ [mPad Input]: ${event.type}`);
      }

      inputManager.handleEvent(event);
    } catch (err) {
      // Ignore malformed packets silently to maintain 120Hz throughput
    }
  });

  ws.on('close', () => {
    activeClients = Math.max(0, activeClients - 1);
    console.log(`📱 [mPad] Phone disconnected. Total active clients: ${activeClients}`);
  });

  ws.on('error', (err) => {
    console.error('[mPad WS Error]:', err);
  });
});

// The WebSocket server re-emits the HTTP server's listen error; without a
// handler here the ws library throws before the handler below can report anything useful.
wss.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code !== 'EADDRINUSE') console.error('[mPad WS Server Error]:', err.message);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    // Another mPad instance already owns the port. The launcher simply opens
    // the host page of the running instance, so exiting quietly is correct.
    console.error(`⚠️  Port ${PORT} is already in use — mPad is probably already running.`);
    process.exit(1);
  }
  console.error('[mPad Server Error]:', err);
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  displayBanner(PORT, localIP, pairingUrl(localIP, PORT));
});

// Graceful cleanup
function cleanup() {
  console.log('\n🛑 Shutting down mPad server...');
  inputManager.destroy();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
