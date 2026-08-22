export type ControlMode = 'trackpad' | 'keyboard' | 'media' | 'presentation' | 'numpad';

export interface AppSettings {
  sensitivity: number; // 0.5 to 3.0
  acceleration: number; // 1.0 to 2.5
  scrollSpeed: number; // 0.5 to 3.0
  invertScroll: boolean;
  haptics: boolean;
  showPhysicalButtons: boolean;
  leftHanded: boolean;
}

export type InputPacket =
  | { type: 'move'; dx: number; dy: number }
  | { type: 'click'; button?: number }
  | { type: 'dblclick'; button?: number }
  | { type: 'mousedown'; button?: number }
  | { type: 'mouseup'; button?: number }
  | { type: 'scroll'; dy: number; dx?: number }
  | { type: 'text'; text: string }
  | { type: 'key'; key: string }
  | { type: 'shortcut'; keys: string }
  | { type: 'media'; action: 'volume_up' | 'volume_down' | 'mute' | 'play_pause' | 'next' | 'prev' }
  | { type: 'ping'; id: number };

export interface ServerStatusPacket {
  type: 'status' | 'pong' | 'error';
  id?: number;
  message?: string;
  connectedClients?: number;
}
