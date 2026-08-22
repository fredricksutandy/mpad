export type InputEventType =
  | 'move'
  | 'click'
  | 'dblclick'
  | 'mousedown'
  | 'mouseup'
  | 'scroll'
  | 'text'
  | 'key'
  | 'shortcut'
  | 'media'
  | 'ping';

export interface MoveEvent {
  type: 'move';
  dx: number;
  dy: number;
}

export interface ClickEvent {
  type: 'click';
  button?: number; // 1: left, 2: right, 3: middle
}

export interface DblClickEvent {
  type: 'dblclick';
  button?: number;
}

export interface MouseButtonEvent {
  type: 'mousedown' | 'mouseup';
  button?: number;
}

export interface ScrollEvent {
  type: 'scroll';
  dy: number;
  dx?: number;
}

export interface TextEvent {
  type: 'text';
  text: string;
}

export interface KeyEvent {
  type: 'key';
  key: string;
}

export interface ShortcutEvent {
  type: 'shortcut';
  keys: string; // e.g. "ctrl+c", "win+d", "alt+tab"
}

export interface MediaEvent {
  type: 'media';
  action: 'volume_up' | 'volume_down' | 'mute' | 'play_pause' | 'next' | 'prev';
}

export interface PingEvent {
  type: 'ping';
  id: number;
}

export type InputEvent =
  | MoveEvent
  | ClickEvent
  | DblClickEvent
  | MouseButtonEvent
  | ScrollEvent
  | TextEvent
  | KeyEvent
  | ShortcutEvent
  | MediaEvent
  | PingEvent;

export interface ServerMessage {
  type: 'pong' | 'status' | 'error';
  id?: number;
  message?: string;
  connectedClients?: number;
}
