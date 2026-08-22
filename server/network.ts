import os from 'os';
import qrcode from 'qrcode-terminal';

export function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name];
    if (!netList) continue;
    for (const net of netList) {
      // IPv4 and not internal (127.0.0.1)
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

export function displayBanner(port: number, localIP: string) {
  const url = `http://${localIP}:${port}`;

  console.log('\n======================================================');
  console.log('   📱  mPad — Mobile-to-PC Trackpad Server  📱');
  console.log('======================================================\n');
  console.log(`🚀 Server listening on:`);
  console.log(`   👉 Local:   http://localhost:${port}`);
  console.log(`   👉 Network: ${url}\n`);
  console.log('📲 Scan this QR code with your phone camera to connect:\n');

  qrcode.generate(url, { small: true }, (qr) => {
    console.log(qr);
  });

  console.log('💡 Tip: Make sure your phone is connected to the same Wi-Fi network.');
  console.log('💡 On iOS/Android: Add to Home Screen for fullscreen trackpad experience!\n');
}
