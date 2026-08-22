import { useState, useEffect, useRef, useCallback } from 'react';
import { InputPacket, ServerStatusPacket } from '../types.js';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [ping, setPing] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('Connecting to PC...');
  
  const wsRef = useRef<WebSocket | null>(null);
  const pingTimestampRef = useRef<number>(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);

  const getWsUrl = useCallback(() => {
    const loc = window.location;
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // If running on Vite dev server (e.g. 5173), point to backend port 8765
    if (loc.port === '5173') {
      return `${protocol}//${loc.hostname}:8765`;
    }
    
    return `${protocol}//${loc.host}`;
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const url = getWsUrl();
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
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
        setStatusMessage('Disconnected. Reconnecting...');
        
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

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

  return { isConnected, ping, statusMessage, sendPacket, reconnect: connect };
}
