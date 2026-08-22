import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';
import fs from 'fs';
import { InputEvent } from '../protocol.js';

export class InputManager {
  private bridgeProcess: ChildProcessWithoutNullStreams | null = null;
  private isReady = false;
  private bridgePath: string;

  constructor() {
    // Look for InputBridge.exe in server/bin
    this.bridgePath = path.resolve(process.cwd(), 'server', 'bin', 'InputBridge.exe');
    this.initBridge();
  }

  private initBridge() {
    if (!fs.existsSync(this.bridgePath)) {
      console.warn(`[InputManager] Warning: InputBridge.exe not found at ${this.bridgePath}. Input simulation disabled.`);
      return;
    }

    try {
      this.bridgeProcess = spawn(this.bridgePath, [], {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.bridgeProcess.stdout.on('data', (data: Buffer) => {
        const str = data.toString().trim();
        if (str.includes('READY')) {
          this.isReady = true;
          console.log('⚡ [InputManager] Windows Native InputBridge connected and ready.');
        }
      });

      this.bridgeProcess.stderr.on('data', (data: Buffer) => {
        console.error(`[InputBridge ERR]: ${data.toString().trim()}`);
      });

      this.bridgeProcess.on('exit', (code) => {
        console.warn(`[InputManager] InputBridge exited with code ${code}. Respawning in 1s...`);
        this.isReady = false;
        this.bridgeProcess = null;
        setTimeout(() => this.initBridge(), 1000);
      });
    } catch (err) {
      console.error('[InputManager] Failed to launch InputBridge.exe:', err);
    }
  }

  public handleEvent(event: InputEvent) {
    if (!this.bridgeProcess || !this.bridgeProcess.stdin.writable) {
      return;
    }

    let command: string | null = null;

    switch (event.type) {
      case 'move':
        command = `MOVE ${event.dx} ${event.dy}`;
        break;
      case 'click':
        command = `CLICK ${event.button ?? 1}`;
        break;
      case 'dblclick':
        command = `DBLCLICK ${event.button ?? 1}`;
        break;
      case 'mousedown':
        command = `MOUSEDOWN ${event.button ?? 1}`;
        break;
      case 'mouseup':
        command = `MOUSEUP ${event.button ?? 1}`;
        break;
      case 'scroll':
        command = `SCROLL ${event.dy} ${event.dx ?? 0}`;
        break;
      case 'text':
        // Replace newlines with spaces or keep as is
        command = `TEXT ${event.text}`;
        break;
      case 'key':
        command = `KEY ${event.key}`;
        break;
      case 'shortcut':
        command = `SHORTCUT ${event.keys}`;
        break;
      case 'media':
        command = `MEDIA ${event.action}`;
        break;
      case 'ping':
        command = `PING ${event.id}`;
        break;
    }

    if (command) {
      this.bridgeProcess.stdin.write(command + '\r\n');
    }
  }

  public destroy() {
    if (this.bridgeProcess) {
      try {
        this.bridgeProcess.stdin.write('EXIT\n');
        this.bridgeProcess.kill();
      } catch {
        // ignore
      }
      this.bridgeProcess = null;
    }
  }
}
