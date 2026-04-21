/**
 * VoidDrop — WebSocket Signaling Client
 * Connects to the FastAPI signaling server and manages messaging.
 */

export class SignalingClient {
  constructor(sessionId, onMessage, onOpen, onClose) {
    this.sessionId = sessionId.toUpperCase();
    this.onMessage = onMessage;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnects = 3;
    this.closed = false;
  }

  getServerUrl() {
    const serverUrl = process.env.NEXT_PUBLIC_SIGNALING_URL || 'ws://localhost:8000';
    return `${serverUrl}/ws/${this.sessionId}`;
  }

  connect() {
    if (this.closed) return;
    try {
      this.ws = new WebSocket(this.getServerUrl());

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.onOpen?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.onMessage?.(data);
        } catch (e) {
          console.error('[Signaling] Failed to parse message:', e);
        }
      };

      this.ws.onclose = (event) => {
        if (!this.closed && this.reconnectAttempts < this.maxReconnects) {
          this.reconnectAttempts++;
          setTimeout(() => this.connect(), 1500 * this.reconnectAttempts);
        } else {
          this.onClose?.(event);
        }
      };

      this.ws.onerror = (err) => {
        console.error('[Signaling] WebSocket error:', err);
      };
    } catch (err) {
      console.error('[Signaling] Connection failed:', err);
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  close() {
    this.closed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
