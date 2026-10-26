import { io, Socket } from 'socket.io-client';
import { getAuthToken, API_BASE } from './api.js';

let socket: Socket | null = null;

export function initSocket(): Socket {
  if (socket && socket.connected) {
    return socket;
  }

  const token = getAuthToken();
  const socketUrl = API_BASE || window.location.origin;

  socket = io(socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to Bharat Chat Server:', socket?.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
