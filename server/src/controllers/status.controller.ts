import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function createStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { type = 'text', content, mediaUrl, backgroundColor, fontFamily, privacy } = req.body;

    const statusId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.query(
      `INSERT INTO status_updates (id, user_id, type, content, media_url, background_color, font_family, privacy, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        statusId,
        userId,
        type,
        content || null,
        mediaUrl || null,
        backgroundColor || '#0f5132',
        fontFamily || 'sans-serif',
        privacy || 'all',
        expiresAt,
      ]
    );

    res.status(201).json({
      message: 'Status published successfully',
      status: {
        id: statusId,
        userId,
        type,
        content,
        mediaUrl,
        backgroundColor,
        fontFamily,
        expiresAt,
        viewsCount: 0,
      },
    });
  } catch (err: any) {
    console.error('[Status] createStatus error:', err);
    res.status(500).json({ error: 'Server error creating status' });
  }
}

export async function getStatusFeed(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    const query = `
      SELECT 
        s.id,
        s.user_id as "userId",
        u.full_name as "userName",
        u.phone as "userPhone",
        u.avatar_url as "userAvatar",
        s.type,
        s.content,
        s.media_url as "mediaUrl",
        s.background_color as "backgroundColor",
        s.font_family as "fontFamily",
        s.created_at as "createdAt",
        s.expires_at as "expiresAt",
        (SELECT COUNT(*)::int FROM status_views sv WHERE sv.status_id = s.id) as "viewsCount",
        EXISTS(SELECT 1 FROM status_views sv WHERE sv.status_id = s.id AND sv.viewer_id = $1) as "viewedByMe"
      FROM status_updates s
      JOIN users u ON u.id = s.user_id
      WHERE s.expires_at > CURRENT_TIMESTAMP
        AND s.user_id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = $1)
      ORDER BY s.created_at DESC
    `;

    const result = await db.query(query, [userId]);

    // Group by user
    const grouped: { [userId: string]: any } = {};
    for (const item of result.rows) {
      if (!grouped[item.userId]) {
        grouped[item.userId] = {
          userId: item.userId,
          userName: item.userName,
          userPhone: item.userPhone,
          userAvatar: item.userAvatar,
          isMe: item.userId === userId,
          statuses: [],
        };
      }
      grouped[item.userId].statuses.push(item);
    }

    res.json(Object.values(grouped));
  } catch (err: any) {
    console.error('[Status] getStatusFeed error:', err);
    res.status(500).json({ error: 'Server error fetching status feed' });
  }
}

export async function viewStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const viewerId = req.user?.userId;
    const { statusId } = req.params;

    await db.query(
      `INSERT INTO status_views (status_id, viewer_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [statusId, viewerId]
    );

    res.json({ message: 'Status marked as viewed' });
  } catch (err: any) {
    console.error('[Status] viewStatus error:', err);
    res.status(500).json({ error: 'Server error marking status viewed' });
  }
}

export async function getStatusViewers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { statusId } = req.params;

    // Verify ownership
    const owner = await db.query(`SELECT user_id FROM status_updates WHERE id = $1`, [statusId]);
    if (owner.rowCount === 0 || owner.rows[0].user_id !== userId) {
      res.status(403).json({ error: 'Unauthorized to view status analytics' });
      return;
    }

    const viewers = await db.query(
      `SELECT sv.viewed_at as "viewedAt", u.id, u.full_name as "fullName", u.avatar_url as "avatarUrl"
       FROM status_views sv
       JOIN users u ON u.id = sv.viewer_id
       WHERE sv.status_id = $1
       ORDER BY sv.viewed_at DESC`,
      [statusId]
    );

    res.json(viewers.rows);
  } catch (err: any) {
    console.error('[Status] getStatusViewers error:', err);
    res.status(500).json({ error: 'Server error fetching viewers' });
  }
}

export async function deleteStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { statusId } = req.params;

    const result = await db.query(
      `DELETE FROM status_updates WHERE id = $1 AND user_id = $2 RETURNING id`,
      [statusId, userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Status not found or unauthorized' });
      return;
    }

    res.json({ message: 'Status deleted successfully' });
  } catch (err: any) {
    console.error('[Status] deleteStatus error:', err);
    res.status(500).json({ error: 'Server error deleting status' });
  }
}
