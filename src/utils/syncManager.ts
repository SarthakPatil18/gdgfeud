import type { GameState, SyncMessage } from '../types';
import type { AudioAssetKey } from '../types/audio';

export const STORAGE_KEY = 'gdg_feud_shared_state_v2';

export type SoundEvent = AudioAssetKey | 'score' | 'tick';
type StateListener = (state: GameState, source: 'broadcast' | 'websocket' | 'storage') => void;
type SoundListener = (sound: SoundEvent) => void;
type StopSoundListener = () => void;
type ConnectionListener = (status: { broadcast: boolean; websocket: boolean }) => void;

class SyncManager {
  private clientId: string = Math.random().toString(36).substring(2, 9);
  private broadcastChannel: BroadcastChannel | null = null;
  private ws: WebSocket | null = null;
  private stateListeners: Set<StateListener> = new Set();
  private soundListeners: Set<SoundListener> = new Set();
  private stopSoundListeners: Set<StopSoundListener> = new Set();
  private connectionListeners: Set<ConnectionListener> = new Set();
  private wsConnected: boolean = false;
  private wsReconnecting: boolean = false;

  constructor() {
    this.initBroadcastChannel();
    this.initStorageListener();
    this.initWebSocket();
  }

  public getClientId(): string {
    return this.clientId;
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('gdg_feud_sync_channel');
        this.broadcastChannel.onmessage = (event: MessageEvent<SyncMessage>) => {
          this.handleIncomingMessage(event.data, 'broadcast');
        };
      } catch (e) {
        console.warn('BroadcastChannel initialization failed:', e);
      }
    }
  }

  private initStorageListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event: StorageEvent) => {
        if (event.key === STORAGE_KEY && event.newValue) {
          try {
            const parsed = JSON.parse(event.newValue) as GameState;
            this.notifyStateListeners(parsed, 'storage');
          } catch (e) {
            console.warn('Failed to parse storage event:', e);
          }
        }
      });
    }
  }

  private initWebSocket() {
    if (typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Sync server runs on port 5174 or same origin
    const host = window.location.hostname || '127.0.0.1';
    const wsUrl = `${protocol}//${host}:5174`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.wsConnected = true;
        this.notifyConnectionStatus();
        this.sendWsMessage({ type: 'REQUEST_STATE', senderId: this.clientId });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as SyncMessage;
          this.handleIncomingMessage(msg, 'websocket');
        } catch (e) {
          console.warn('WS message parsing failed:', e);
        }
      };

      this.ws.onclose = () => {
        this.wsConnected = false;
        this.notifyConnectionStatus();
        this.scheduleWsReconnect();
      };

      this.ws.onerror = () => {
        this.wsConnected = false;
        this.notifyConnectionStatus();
      };
    } catch {
      this.wsConnected = false;
      this.scheduleWsReconnect();
    }
  }

  private scheduleWsReconnect() {
    if (this.wsReconnecting) return;
    this.wsReconnecting = true;
    setTimeout(() => {
      this.wsReconnecting = false;
      this.initWebSocket();
    }, 4000);
  }

  private handleIncomingMessage(msg: SyncMessage, source: 'broadcast' | 'websocket') {
    if (!msg || msg.senderId === this.clientId) return;

    if (msg.type === 'STATE_UPDATE') {
      this.notifyStateListeners(msg.payload, source);
    } else if (msg.type === 'TRIGGER_SOUND') {
      this.notifySoundListeners(msg.sound);
    } else if (msg.type === 'STOP_SOUND') {
      this.notifyStopSoundListeners();
    }
  }

  private sendWsMessage(msg: SyncMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(msg));
      } catch (e) {
        console.warn('WS send failed:', e);
      }
    }
  }

  private notifyStateListeners(state: GameState, source: 'broadcast' | 'websocket' | 'storage') {
    this.stateListeners.forEach((listener) => {
      try {
        listener(state, source);
      } catch (e) {
        console.error('State listener error:', e);
      }
    });
  }

  private notifySoundListeners(sound: SoundEvent) {
    this.soundListeners.forEach((listener) => {
      try {
        listener(sound);
      } catch (e) {
        console.error('Sound listener error:', e);
      }
    });
  }

  private notifyStopSoundListeners() {
    this.stopSoundListeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('Stop sound listener error:', e);
      }
    });
  }

  private notifyConnectionStatus() {
    const status = {
      broadcast: !!this.broadcastChannel,
      websocket: this.wsConnected,
    };
    this.connectionListeners.forEach((listener) => listener(status));
  }

  // PUBLIC API
  public onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  public onSoundTriggered(listener: SoundListener): () => void {
    this.soundListeners.add(listener);
    return () => this.soundListeners.delete(listener);
  }

  public onStopSoundTriggered(listener: StopSoundListener): () => void {
    this.stopSoundListeners.add(listener);
    return () => this.stopSoundListeners.delete(listener);
  }

  public onConnectionChange(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    listener({
      broadcast: !!this.broadcastChannel,
      websocket: this.wsConnected,
    });
    return () => this.connectionListeners.delete(listener);
  }

  public broadcastState(state: GameState) {
    const stateWithTimestamp: GameState = {
      ...state,
      lastUpdated: Date.now(),
    };

    // 1. LocalStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithTimestamp));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }

    const message: SyncMessage = {
      type: 'STATE_UPDATE',
      payload: stateWithTimestamp,
      senderId: this.clientId,
      timestamp: Date.now(),
    };

    // 2. BroadcastChannel (0ms local window sync)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch (e) {
        console.warn('BroadcastChannel postMessage failed:', e);
      }
    }

    // 3. WebSocket (cross-device sync)
    this.sendWsMessage(message);
  }

  public broadcastSound(sound: SoundEvent) {
    const message: SyncMessage = {
      type: 'TRIGGER_SOUND',
      sound,
      senderId: this.clientId,
    };

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch (e) {
        console.warn('BroadcastChannel sound message failed:', e);
      }
    }

    this.sendWsMessage(message);
  }

  public broadcastStopSound() {
    const message: SyncMessage = {
      type: 'STOP_SOUND',
      senderId: this.clientId,
    };

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch (e) {
        console.warn('BroadcastChannel stop sound message failed:', e);
      }
    }

    this.sendWsMessage(message);
  }

  public getStoredState(): GameState | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }
}

export const syncManager = new SyncManager();
