import type { Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { verifyAuthToken } from './authService.js';
import type { NotificationEvent } from './notificationService.js';

// Track connected clients by userId
const clientsByUserId = new Map<number, Set<WebSocket>>();

type AuthMessage = { type: 'authenticate'; token: string };

export const attachWebSocketServer = (server: Server): void => {
  const webSocketServer = new WebSocketServer({
    server,
    path: '/ws',
    maxPayload: 8 * 1024, 
  });

  webSocketServer.on('connection', (socket) => {
    let authenticatedUserId: number | undefined;
    (socket as any).isAlive = true;

    // Require authentication within 10 seconds
    const authenticationTimeout = setTimeout(() => {
      if (authenticatedUserId === undefined) {
        socket.close(1008, 'Authentication required');
      }
    }, 10_000);

    // Heartbeat: mark alive when pong received
    socket.on('pong', () => {
      (socket as any).isAlive = true;
    });

    // Handle incoming messages
    socket.on('message', (rawMessage) => {
      if (authenticatedUserId !== undefined) return;

      try {
        const message = JSON.parse(rawMessage.toString()) as AuthMessage;
        if (message.type !== 'authenticate' || typeof message.token !== 'string') {
          socket.close(1008, 'Send an authenticate message with a token');
          return;
        }

        const user = verifyAuthToken(message.token);
        authenticatedUserId = user.id;
        clearTimeout(authenticationTimeout);

        let userClients = clientsByUserId.get(user.id);
        if (!userClients) {
          userClients = new Set<WebSocket>();
          clientsByUserId.set(user.id, userClients);
        }
        userClients.add(socket);

        socket.send(JSON.stringify({ type: 'authenticated' }));
      } catch (err) {
        console.error('Auth failed:', err);
        socket.close(1008, 'Invalid or expired token');
      }
    });

    // Handle disconnect
    socket.on('close', () => {
      clearTimeout(authenticationTimeout);
      if (authenticatedUserId === undefined) return;

      const userClients = clientsByUserId.get(authenticatedUserId);
      userClients?.delete(socket);
      if (userClients?.size === 0) {
        clientsByUserId.delete(authenticatedUserId);
      }
    });

    socket.on('error', (error) => {
      console.error('WebSocket connection error:', error);
    });
  });

  // Heartbeat interval to terminate dead sockets
  setInterval(() => {
    for (const [userId, sockets] of clientsByUserId) {
      for (const socket of sockets) {
        if (!(socket as any).isAlive) {
          socket.terminate();
          sockets.delete(socket);
        } else {
          (socket as any).isAlive = false;
          socket.ping();
        }
      }
      if (sockets.size === 0) clientsByUserId.delete(userId);
    }
  }, 30_000);
};

// Publish notifications to all sockets for a user
export const publishNotification = (notification: NotificationEvent): void => {
  const userClients = clientsByUserId.get(notification.user_id);
  if (!userClients) return;

  const message = JSON.stringify({ type: 'notification', notification });
  for (const socket of userClients) {
    if (socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(message);
      } catch (error) {
        console.error('Failed to send WebSocket notification:', error);
      }
    }
  }
};
