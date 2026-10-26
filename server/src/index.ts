import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { db } from './db/index.js';
import { setupSocketIO } from './socket/index.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import chatRoutes from './routes/chat.routes.js';
import mediaRoutes from './routes/media.routes.js';
import statusRoutes from './routes/status.routes.js';
import callRoutes from './routes/call.routes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

// Security Headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Capacitor)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(null, true); // Dev convenience
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Health Check
app.get('/api/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({
      status: 'healthy',
      app: 'Bharat Chat API',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'unhealthy',
      app: 'Bharat Chat API',
      error: err.message,
    });
  }
});

// STUN/TURN configuration endpoint for WebRTC
app.get('/api/config/webrtc', (_req, res) => {
  const stunList = process.env.STUN_SERVERS
    ? process.env.STUN_SERVERS.split(',').map((s) => ({ urls: s.trim() }))
    : [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ];

  res.json({ iceServers: stunList });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/calls', callRoutes);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupSocketIO(io);

// Background cleanup for expired status updates (Runs every 1 hour)
setInterval(async () => {
  try {
    const expired = await db.query(
      `DELETE FROM status_updates WHERE expires_at < CURRENT_TIMESTAMP RETURNING id`
    );
    if (expired.rowCount > 0) {
      console.log(`[Cleaner] Purged ${expired.rowCount} expired status updates.`);
    }
  } catch (e) {
    console.error('[Cleaner] Error in cleanup task:', e);
  }
}, 60 * 60 * 1000);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start Server function
export async function startServer() {
  await db.init();
  return new Promise<void>((resolve) => {
    server.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`🚀 Bharat Chat Server running on port ${PORT}`);
      console.log(`📡 WebSocket ready for real-time messaging & WebRTC`);
      console.log(`===============================================`);
      resolve();
    });
  });
}

// Auto-start when run directly
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Failed to start Bharat Chat Server:', err);
    process.exit(1);
  });
}

export { app, server, io };
