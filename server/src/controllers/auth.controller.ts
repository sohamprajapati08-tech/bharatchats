import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '../db/index.js';
import { hashPassword, verifyPassword, normalizePhone } from '../utils/security.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().min(10, 'Valid mobile number required').max(20),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const loginSchema = z.object({
  phone: z.string().min(10, 'Valid mobile number required'),
  password: z.string().min(1, 'Password is required'),
});

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { fullName, phone: rawPhone, password } = parseResult.data;
    const phone = normalizePhone(rawPhone);

    // Check if phone number already registered
    const existing = await db.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (existing.rowCount > 0) {
      res.status(409).json({ error: 'An account with this mobile number already exists.' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const userId = uuidv4();

    await db.query(
      `INSERT INTO users (id, phone, full_name, password_hash, about, is_online)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, phone, fullName, passwordHash, 'Namaste! I am using Bharat Chat.', true]
    );

    const tokenPayload = { userId, phone };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await db.query(
      `INSERT INTO refresh_tokens (id, user_id, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), userId, refreshToken, expiresAt]
    );

    res.status(201).json({
      message: 'Account created successfully',
      notice: 'Mobile number ownership is not verified via SMS OTP in this deployment.',
      user: {
        id: userId,
        phone,
        fullName,
        avatarUrl: null,
        about: 'Namaste! I am using Bharat Chat.',
        privacyLastSeen: 'everyone',
        privacyProfilePhoto: 'everyone',
        privacyReadReceipts: true,
      },
      accessToken,
      refreshToken,
    });
  } catch (err: any) {
    console.error('[Auth] Registration error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { phone: rawPhone, password } = parseResult.data;
    const phone = normalizePhone(rawPhone);

    const result = await db.query(
      `SELECT id, phone, full_name, password_hash, avatar_url, about,
              privacy_last_seen, privacy_profile_photo, privacy_read_receipts
       FROM users WHERE phone = $1`,
      [phone]
    );

    if (result.rowCount === 0) {
      res.status(401).json({ error: 'Invalid mobile number or password' });
      return;
    }

    const user = result.rows[0];
    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid mobile number or password' });
      return;
    }

    // Update last seen & status
    await db.query(
      'UPDATE users SET last_seen_at = CURRENT_TIMESTAMP, is_online = true WHERE id = $1',
      [user.id]
    );

    const tokenPayload = { userId: user.id, phone: user.phone };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await db.query(
      `INSERT INTO refresh_tokens (id, user_id, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), user.id, refreshToken, expiresAt]
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        phone: user.phone,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        about: user.about,
        privacyLastSeen: user.privacy_last_seen,
        privacyProfilePhoto: user.privacy_profile_photo,
        privacyReadReceipts: user.privacy_read_receipts,
      },
      accessToken,
      refreshToken,
    });
  } catch (err: any) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const payload = verifyRefreshToken(token);
    if (!payload) {
      res.status(403).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    // Check DB for token
    const tokenRecord = await db.query(
      'SELECT id FROM refresh_tokens WHERE user_id = $1 AND token = $2 AND expires_at > CURRENT_TIMESTAMP',
      [payload.userId, token]
    );

    if (tokenRecord.rowCount === 0) {
      res.status(403).json({ error: 'Refresh token revoked or expired' });
      return;
    }

    // Rotate refresh token
    const newAccessToken = signAccessToken({ userId: payload.userId, phone: payload.phone });
    const newRefreshToken = signRefreshToken({ userId: payload.userId, phone: payload.phone });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Delete old and insert new
    await db.query('DELETE FROM refresh_tokens WHERE id = $1', [tokenRecord.rows[0].id]);
    await db.query(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)',
      [uuidv4(), payload.userId, newRefreshToken, expiresAt]
    );

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err: any) {
    console.error('[Auth] Refresh token error:', err);
    res.status(500).json({ error: 'Server error during token refresh' });
  }
}

export async function logout(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { refreshToken: token } = req.body;

    if (userId) {
      await db.query('UPDATE users SET is_online = false, last_seen_at = CURRENT_TIMESTAMP WHERE id = $1', [userId]);
      if (token) {
        await db.query('DELETE FROM refresh_tokens WHERE user_id = $1 AND token = $2', [userId, token]);
      } else {
        await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
      }
    }

    res.json({ message: 'Logged out successfully' });
  } catch (err: any) {
    console.error('[Auth] Logout error:', err);
    res.status(500).json({ error: 'Server error during logout' });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const result = await db.query(
      `SELECT id, phone, full_name, avatar_url, about, last_seen_at, is_online,
              privacy_last_seen, privacy_profile_photo, privacy_read_receipts, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      phone: row.phone,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
      about: row.about,
      lastSeenAt: row.last_seen_at,
      isOnline: row.is_online,
      privacyLastSeen: row.privacy_last_seen,
      privacyProfilePhoto: row.privacy_profile_photo,
      privacyReadReceipts: row.privacy_read_receipts,
      createdAt: row.created_at,
    });
  } catch (err: any) {
    console.error('[Auth] getMe error:', err);
    res.status(500).json({ error: 'Server error fetching user profile' });
  }
}
