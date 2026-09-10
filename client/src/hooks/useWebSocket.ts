import { useState, useEffect, useRef, useCallback } from 'react';
import { InputPacket, ServerStatusPacket } from '../types.js';

const TOKEN_KEY = 'mpad.pairingToken';
const MAX_PAIRING_ATTEMPTS = 3;

/**
 * The pairing token arrives as ?t=... in the QR code's URL. Store it, then
 * strip it from the address bar so it is not left in history or shared by a
 * screenshot. Falls back to whatever was stored by an earlier scan.
 */
function readPairingToken(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('t');

    if (fromUrl) {
      try {
        localStorage.setItem(TOKEN_KEY, fromUrl);
      } catch {
        // Private browsing: keep going with the in-memory copy.
      }
      params.delete('t');
      const rest = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (rest ? `?${rest}` : ''));
      return fromUrl;
    }

    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [ping, setPing] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('Connecting to PC...');

  const wsRef = useRef<WebSocket | null>(null);
  const pingTimestampRef = useRef<number>(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const tokenRef = useRef<string | null>(readPairingToken());
  const everConnectedRef = useRef(false);
  const failedAttemptsRef = useRef(0);

  const getWsUrl = useCallback(() => {
    const loc = window.location;
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = encodeURIComponent(tokenRef.current ?? '');

    // If running on Vite dev server (e.g. 5173), point to backend port 8765
    if (loc.port === '5173') {
      return `${protocol}//${loc.hostname}:8765/?t=${token}`;
    }

    return `${protocol}//${loc.host}/?t=${token}`;
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    // Without a token the server will refuse the socket, so say so plainly
    // instead of reconnecting forever against a closed door.
    if (!tokenRef.current) {
      setIsConnected(false);
      setStatusMessage('Not paired. Scan the QR code shown on your PC.');
      return;
    }

    try {
      const url = getWsUrl();
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        everConnectedRef.current = true;
        failedAttemptsRef.current = 0;
        setIsConnected(true);
        setStatusMessage('Connected');
        
        // Start pinging for latency measurement
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            const now = performance.now();
            pingTimestampRef.current = now;
            ws.send(JSON.stringify({ type: 'ping', id: Math.floor(now) }));
          }
        }, 2000);
      };

      ws.onmessage = (event) => {
        try {
          const data: ServerStatusPacket = JSON.parse(event.data);
          if (data.type === 'pong' && pingTimestampRef.current > 0) {
            const rtt = Math.round(performance.now() - pingTimestampRef.current);
            setPing(rtt);
          } else if (data.type === 'status' && data.message) {
            setStatusMessage(data.message);
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setPing(null);

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // A socket that never opened means the server refused the handshake —
        // almost always a stale token after mPad restarted. Retrying that
        // forever is pointless, so ask for a rescan instead.
        if (!everConnectedRef.current) {
          failedAttemptsRef.current++;
          if (failedAttemptsRef.current >= MAX_PAIRING_ATTEMPTS) {
            setStatusMessage('Pairing rejected. Scan the QR code on your PC again.');
            return;
          }
        }

        setStatusMessage('Disconnected. Reconnecting...');

        // Schedule auto-reconnect
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = window.setTimeout(() => {
          connect();
        }, 1500);
      };

      ws.onerror = () => {
        // Handled by onclose
      };
    } catch (err) {
      setIsConnected(false);
      setStatusMessage('Connection failed');
    }
  }, [getWsUrl]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendPacket = useCallback((packet: InputPacket) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(packet));
    }
  }, []);

  /** Manual retry: re-read the token first, in case the user just rescanned. */
  const reconnect = useCallback(() => {
    tokenRef.current = readPairingToken();
    failedAttemptsRef.current = 0;
    connect();
  }, [connect]);

  return { isConnected, ping, statusMessage, sendPacket, reconnect };
}
