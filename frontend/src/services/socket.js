import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? window.location.origin : '');

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: { token: '' },
});

/** Call before socket.connect() to inject the latest JWT. */
export function initSocket(token) {
  socket.auth.token = token || '';
}
