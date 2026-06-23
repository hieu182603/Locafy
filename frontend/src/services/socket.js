import { io } from 'socket.io-client';

// Connect to the proxy url (or empty string in development to use Vite proxy, or window.location.origin in production)
const socketUrl = import.meta.env.PROD ? window.location.origin : '';
export const socket = io(socketUrl, {
  autoConnect: false
});
