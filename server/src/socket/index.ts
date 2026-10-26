import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';
import { db } from '../db/index.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  phone?: string;
}

// Map userId -> Set of socket IDs (multi-tab / multi-device support)
const userSockets = new Map<string, Set<string>>();

export function setupSocketIO(io: Server): void {
  // Authentication middleware for Socket.IO
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication token missing'));
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return next(new Error('Invalid or expired authentication token'));
    }

    socket.userId = payload.userId;
    socket.phone = payload.phone;
    next();
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.userId;
    if (!userId) return;

    // Register socket
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Join user's personal room for direct notifications
    socket.join(`user:${userId}`);

    // Update user status in DB
    try {
      await db.query('UPDATE users SET is_online = true, last_seen_at = CURRENT_TIMESTAMP WHERE id = $1', [userId]);
      io.emit('user_presence', { userId, isOnline: true, lastSeenAt: new Date().toISOString() });
    } catch (e) {
      console.error('[Socket] Error updating user presence:', e);
    }

    // Join all conversation rooms for this user
    try {
      const convs = await db.query(
        'SELECT conversation_id FROM conversation_participants WHERE user_id = $1',
        [userId]
      );
      for (const row of convs.rows) {
        socket.join(`conversation:${row.conversation_id}`);
      }
    } catch (e) {
      console.error('[Socket] Error joining conversation rooms:', e);
    }

    // --- Chat Events ---

    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('send_message', async (data: any) => {
      // Broadcast to room
      if (data?.conversationId) {
        socket.to(`conversation:${data.conversationId}`).emit('new_message', data);
      }
    });

    socket.on('typing_start', (data: { conversationId: string; userName: string }) => {
      if (data?.conversationId) {
        socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
          conversationId: data.conversationId,
          userId,
          userName: data.userName,
          isTyping: true,
        });
      }
    });

    socket.on('typing_stop', (data: { conversationId: string }) => {
      if (data?.conversationId) {
        socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
          conversationId: data.conversationId,
          userId,
          isTyping: false,
        });
      }
    });

    socket.on('message_read', (data: { conversationId: string; messageIds: string[] }) => {
      if (data?.conversationId) {
        socket.to(`conversation:${data.conversationId}`).emit('messages_read_receipt', {
          conversationId: data.conversationId,
          readerId: userId,
          readAt: new Date().toISOString(),
        });
      }
    });

    socket.on('reaction_update', (data: { conversationId: string; messageId: string; emoji: string; action: string }) => {
      if (data?.conversationId) {
        socket.to(`conversation:${data.conversationId}`).emit('reaction_updated', {
          ...data,
          userId,
        });
      }
    });

    // --- WebRTC Voice and Video Call Signaling ---

    socket.on('call_initiate', async (data: { toUserId: string; type: 'voice' | 'video'; offer: any }) => {
      try {
        const caller = await db.query('SELECT full_name, avatar_url FROM users WHERE id = $1', [userId]);
        const callerName = caller.rows[0]?.full_name || 'Bharat Chat User';
        const callerAvatar = caller.rows[0]?.avatar_url || null;

        io.to(`user:${data.toUserId}`).emit('incoming_call', {
          callerId: userId,
          callerName,
          callerAvatar,
          type: data.type,
          offer: data.offer,
        });
      } catch (err) {
        console.error('[Socket] Call initiate error:', err);
      }
    });

    socket.on('call_accept', (data: { toUserId: string; answer: any }) => {
      io.to(`user:${data.toUserId}`).emit('call_accepted', {
        receiverId: userId,
        answer: data.answer,
      });
    });

    socket.on('call_reject', (data: { toUserId: string; reason?: string }) => {
      io.to(`user:${data.toUserId}`).emit('call_rejected', {
        receiverId: userId,
        reason: data.reason || 'declined',
      });
    });

    socket.on('ice_candidate', (data: { toUserId: string; candidate: any }) => {
      io.to(`user:${data.toUserId}`).emit('ice_candidate', {
        fromUserId: userId,
        candidate: data.candidate,
      });
    });

    socket.on('call_end', (data: { toUserId: string }) => {
      io.to(`user:${data.toUserId}`).emit('call_ended', {
        fromUserId: userId,
      });
    });

    // Disconnect event
    socket.on('disconnect', async () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          const now = new Date().toISOString();
          try {
            await db.query('UPDATE users SET is_online = false, last_seen_at = CURRENT_TIMESTAMP WHERE id = $1', [userId]);
            io.emit('user_presence', { userId, isOnline: false, lastSeenAt: now });
          } catch (e) {
            console.error('[Socket] Error updating user offline status:', e);
          }
        }
      }
    });
  });
}
