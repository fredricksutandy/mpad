import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8765');

ws.on('open', () => {
  console.log('✅ Connected to mPad Server over WebSocket');

  // Test Ping
  const startTime = performance.now();
  ws.send(JSON.stringify({ type: 'ping', id: 12345 }));

  // Test Move
  ws.send(JSON.stringify({ type: 'move', dx: 10, dy: 10 }));

  // Test Click
  ws.send(JSON.stringify({ type: 'click', button: 1 }));

  // Test Text
  ws.send(JSON.stringify({ type: 'text', text: '' }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('📥 Received message from server:', msg);
  if (msg.type === 'pong') {
    console.log('⚡ Ping/Pong round-trip verified successfully!');
    setTimeout(() => {
      ws.close();
      process.exit(0);
    }, 500);
  }
});

ws.on('error', (err) => {
  console.error('❌ WebSocket error:', err);
  process.exit(1);
});
