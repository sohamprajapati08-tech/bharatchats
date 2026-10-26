import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function searchUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const q = req.query.q as string;

    if (!q || q.trim().length === 0) {
      res.json([]);
      return;
    }

    const searchTerm = `%${q.trim()}%`;
    const result = await db.query(
      `SELECT u.id, u.phone, u.full_name, u.avatar_url, u.about, u.is_online, u.last_seen_at,
              u.privacy_last_seen, u.privacy_profile_photo
       FROM users u
       WHERE u.id != $1
         AND (u.phone ILIKE $2 OR u.full_name ILIKE $2)
         AND u.id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = $1)
       LIMIT 20`,
      [currentUserId, searchTerm]
    );

    const formatted = result.rows.map((row) => ({
      id: row.id,
      phone: row.phone,
      fullName: row.full_name,
      avatarUrl: row.privacy_profile_photo === 'nobody' ? null : row.avatar_url,
      about: row.about,
      isOnline: row.privacy_last_seen === 'nobody' ? false : row.is_online,
      lastSeenAt: row.privacy_last_seen === 'nobody' ? null : row.last_seen_at,
    }));

    res.json(formatted);
  } catch (err: any) {
    console.error('[User] Search error:', err);
    res.status(500).json({ error: 'Server error while searching users' });
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { fullName, about, avatarUrl } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (fullName !== undefined) {
      updates.push(`full_name = $${idx++}`);
      values.push(fullName);
    }
    if (about !== undefined) {
      updates.push(`about = $${idx++}`);
      values.push(about);
    }
    if (avatarUrl !== undefined) {
      updates.push(`avatar_url = $${idx++}`);
      values.push(avatarUrl);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, phone, full_name, avatar_url, about`;
    const result = await db.query(query, values);

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: result.rows[0].id,
        phone: result.rows[0].phone,
        fullName: result.rows[0].full_name,
        avatarUrl: result.rows[0].avatar_url,
        about: result.rows[0].about,
      },
    });
  } catch (err: any) {
    console.error('[User] Update profile error:', err);
    res.status(500).json({ error: 'Server error updating profile' });
  }
}

export async function updatePrivacy(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { privacyLastSeen, privacyProfilePhoto, privacyReadReceipts } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (privacyLastSeen !== undefined) {
      updates.push(`privacy_last_seen = $${idx++}`);
      values.push(privacyLastSeen);
    }
    if (privacyProfilePhoto !== undefined) {
      updates.push(`privacy_profile_photo = $${idx++}`);
      values.push(privacyProfilePhoto);
    }
    if (privacyReadReceipts !== undefined) {
      updates.push(`privacy_read_receipts = $${idx++}`);
      values.push(Boolean(privacyReadReceipts));
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No privacy fields to update' });
      return;
    }

    values.push(userId);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING privacy_last_seen, privacy_profile_photo, privacy_read_receipts`;
    const result = await db.query(query, values);

    res.json({
      message: 'Privacy settings updated successfully',
      privacy: {
        privacyLastSeen: result.rows[0].privacy_last_seen,
        privacyProfilePhoto: result.rows[0].privacy_profile_photo,
        privacyReadReceipts: result.rows[0].privacy_read_receipts,
      },
    });
  } catch (err: any) {
    console.error('[User] Update privacy error:', err);
    res.status(500).json({ error: 'Server error updating privacy' });
  }
}

export async function blockUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const blockerId = req.user?.userId;
    const { targetUserId } = req.body;

    if (!targetUserId || targetUserId === blockerId) {
      res.status(400).json({ error: 'Invalid user to block' });
      return;
    }

    await db.query(
      `INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [blockerId, targetUserId]
    );

    res.json({ message: 'User blocked successfully' });
  } catch (err: any) {
    console.error('[User] Block error:', err);
    res.status(500).json({ error: 'Server error while blocking user' });
  }
}

export async function unblockUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const blockerId = req.user?.userId;
    const { targetUserId } = req.body;

    await db.query(`DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2`, [
      blockerId,
      targetUserId,
    ]);

    res.json({ message: 'User unblocked successfully' });
  } catch (err: any) {
    console.error('[User] Unblock error:', err);
    res.status(500).json({ error: 'Server error while unblocking user' });
  }
}

export async function getBlockedUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const result = await db.query(
      `SELECT u.id, u.full_name, u.phone, u.avatar_url, b.created_at as blocked_at
       FROM user_blocks b
       JOIN users u ON u.id = b.blocked_id
       WHERE b.blocker_id = $1`,
      [userId]
    );

    res.json(result.rows);
  } catch (err: any) {
    console.error('[User] Get blocked users error:', err);
    res.status(500).json({ error: 'Server error fetching blocked users' });
  }
}

export async function reportUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const reporterId = req.user?.userId;
    const { targetUserId, reason } = req.body;

    if (!targetUserId || !reason) {
      res.status(400).json({ error: 'targetUserId and reason are required' });
      return;
    }

    await db.query(
      `INSERT INTO user_reports (id, reporter_id, reported_id, reason)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), reporterId, targetUserId, reason]
    );

    res.json({ message: 'Report submitted successfully. Our safety team will review it.' });
  } catch (err: any) {
    console.error('[User] Report error:', err);
    res.status(500).json({ error: 'Server error submitting report' });
  }
}
