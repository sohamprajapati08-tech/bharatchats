import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function getConversations(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    const query = `
      SELECT 
        c.id,
        c.type,
        c.title,
        c.description,
        c.avatar_url as group_avatar,
        cp.is_muted,
        cp.is_archived,
        cp.role as my_role,
        (
          SELECT json_build_object(
            'id', m.id,
            'content', CASE WHEN m.deleted_for_everyone THEN 'This message was deleted' ELSE m.content END,
            'type', m.type,
            'senderId', m.sender_id,
            'createdAt', m.created_at
          )
          FROM messages m 
          WHERE m.conversation_id = c.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) as last_message,
        (
          SELECT COUNT(*)::int
          FROM messages m
          LEFT JOIN message_statuses ms ON ms.message_id = m.id AND ms.user_id = $1
          WHERE m.conversation_id = c.id 
            AND m.sender_id != $1
            AND (ms.status IS NULL OR ms.status != 'read')
        ) as unread_count,
        CASE 
          WHEN c.type = 'direct' THEN (
            SELECT json_build_object(
              'id', u.id,
              'fullName', u.full_name,
              'phone', u.phone,
              'avatarUrl', CASE WHEN u.privacy_profile_photo = 'nobody' THEN NULL ELSE u.avatar_url END,
              'isOnline', CASE WHEN u.privacy_last_seen = 'nobody' THEN false ELSE u.is_online END,
              'lastSeenAt', CASE WHEN u.privacy_last_seen = 'nobody' THEN NULL ELSE u.last_seen_at END,
              'about', u.about
            )
            FROM conversation_participants cp2
            JOIN users u ON u.id = cp2.user_id
            WHERE cp2.conversation_id = c.id AND cp2.user_id != $1
            LIMIT 1
          )
          ELSE NULL
        END as other_user
      FROM conversations c
      JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
      ORDER BY (
        COALESCE(
          (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1),
          c.created_at
        )
      ) DESC
    `;

    const result = await db.query(query, [userId]);
    res.json(result.rows);
  } catch (err: any) {
    console.error('[Chat] getConversations error:', err);
    res.status(500).json({ error: 'Server error fetching conversations' });
  }
}

export async function getOrCreateDirectChat(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const { targetUserId } = req.body;

    if (!targetUserId || targetUserId === currentUserId) {
      res.status(400).json({ error: 'Valid targetUserId required' });
      return;
    }

    // Check if target user has blocked current user or vice-versa
    const blockCheck = await db.query(
      `SELECT blocker_id FROM user_blocks 
       WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)`,
      [currentUserId, targetUserId]
    );

    if (blockCheck.rowCount > 0) {
      res.status(403).json({ error: 'Unable to start conversation due to user privacy settings' });
      return;
    }

    // Check if direct conversation already exists between these 2 users
    const existing = await db.query(
      `SELECT c.id FROM conversations c
       JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = $1
       JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = $2
       WHERE c.type = 'direct'
       LIMIT 1`,
      [currentUserId, targetUserId]
    );

    if (existing.rowCount > 0) {
      res.json({ conversationId: existing.rows[0].id });
      return;
    }

    // Create new direct conversation
    const conversationId = uuidv4();
    await db.query(
      `INSERT INTO conversations (id, type, created_by) VALUES ($1, 'direct', $2)`,
      [conversationId, currentUserId]
    );

    await db.query(
      `INSERT INTO conversation_participants (conversation_id, user_id, role)
       VALUES ($1, $2, 'member'), ($1, $3, 'member')`,
      [conversationId, currentUserId, targetUserId]
    );

    res.status(201).json({ conversationId });
  } catch (err: any) {
    console.error('[Chat] getOrCreateDirectChat error:', err);
    res.status(500).json({ error: 'Server error creating conversation' });
  }
}

export async function createGroup(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const creatorId = req.user?.userId;
    const { title, description, memberIds, avatarUrl } = req.body;

    if (!title || title.trim().length === 0) {
      res.status(400).json({ error: 'Group title is required' });
      return;
    }

    const conversationId = uuidv4();
    await db.query(
      `INSERT INTO conversations (id, type, title, description, avatar_url, created_by)
       VALUES ($1, 'group', $2, $3, $4, $5)`,
      [conversationId, title.trim(), description || null, avatarUrl || null, creatorId]
    );

    // Add creator as admin
    await db.query(
      `INSERT INTO conversation_participants (conversation_id, user_id, role)
       VALUES ($1, $2, 'admin')`,
      [conversationId, creatorId]
    );

    // Add other members
    if (Array.isArray(memberIds)) {
      for (const mId of memberIds) {
        if (mId && mId !== creatorId) {
          await db.query(
            `INSERT INTO conversation_participants (conversation_id, user_id, role)
             VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
            [conversationId, mId]
          );
        }
      }
    }

    // Insert system message
    const systemMsgId = uuidv4();
    await db.query(
      `INSERT INTO messages (id, conversation_id, sender_id, type, content)
       VALUES ($1, $2, $3, 'system', $4)`,
      [systemMsgId, conversationId, creatorId, `Group "${title.trim()}" was created`]
    );

    res.status(201).json({
      message: 'Group created successfully',
      conversationId,
    });
  } catch (err: any) {
    console.error('[Chat] createGroup error:', err);
    res.status(500).json({ error: 'Server error creating group' });
  }
}

export async function getMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string; // timestamp or messageId

    // Verify user is participant
    const check = await db.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );

    if (check.rowCount === 0) {
      res.status(403).json({ error: 'Access denied: You are not a member of this chat' });
      return;
    }

    let query = `
      SELECT 
        m.id,
        m.conversation_id as "conversationId",
        m.sender_id as "senderId",
        u.full_name as "senderName",
        m.client_msg_id as "clientMsgId",
        m.type,
        CASE WHEN m.deleted_for_everyone THEN 'This message was deleted' ELSE m.content END as content,
        m.media_url as "mediaUrl",
        m.media_meta as "mediaMeta",
        m.reply_to_id as "replyToId",
        m.forwarded,
        m.is_edited as "isEdited",
        m.deleted_for_everyone as "deletedForEveryone",
        m.created_at as "createdAt",
        (
          SELECT json_agg(json_build_object('emoji', mr.emoji, 'userId', mr.user_id))
          FROM message_reactions mr WHERE mr.message_id = m.id
        ) as reactions,
        (
          SELECT status FROM message_statuses ms WHERE ms.message_id = m.id AND ms.user_id != m.sender_id ORDER BY ms.updated_at DESC LIMIT 1
        ) as delivery_status,
        (
          SELECT json_build_object(
            'id', r.id,
            'content', CASE WHEN r.deleted_for_everyone THEN 'This message was deleted' ELSE r.content END,
            'senderName', ru.full_name,
            'type', r.type
          )
          FROM messages r
          JOIN users ru ON ru.id = r.sender_id
          WHERE r.id = m.reply_to_id
        ) as reply_preview
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = $1
    `;

    const params: any[] = [conversationId];

    if (before) {
      params.push(before);
      query += ` AND m.created_at < $${params.length}`;
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await db.query(query, params);
    res.json(result.rows.reverse());
  } catch (err: any) {
    console.error('[Chat] getMessages error:', err);
    res.status(500).json({ error: 'Server error fetching messages' });
  }
}

export async function sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const senderId = req.user?.userId!;
    const { conversationId } = req.params;
    const { clientMsgId, type = 'text', content, mediaUrl, mediaMeta, replyToId, forwarded } = req.body;

    // Check membership
    const check = await db.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, senderId]
    );

    if (check.rowCount === 0) {
      res.status(403).json({ error: 'Access denied: You are not a member of this chat' });
      return;
    }

    // Deduplication check with clientMsgId
    if (clientMsgId) {
      const existing = await db.query(
        `SELECT id, created_at FROM messages WHERE conversation_id = $1 AND client_msg_id = $2`,
        [conversationId, clientMsgId]
      );
      if (existing.rowCount > 0) {
        res.json({ message: existing.rows[0], duplicate: true });
        return;
      }
    }

    const messageId = uuidv4();
    await db.query(
      `INSERT INTO messages (id, conversation_id, sender_id, client_msg_id, type, content, media_url, media_meta, reply_to_id, forwarded)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        messageId,
        conversationId,
        senderId,
        clientMsgId || null,
        type,
        content || null,
        mediaUrl || null,
        mediaMeta ? JSON.stringify(mediaMeta) : null,
        replyToId || null,
        Boolean(forwarded),
      ]
    );

    // Update conversation timestamp
    await db.query(`UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [conversationId]);

    // Fetch complete message object for response & broadcast
    const sender = await db.query(`SELECT full_name FROM users WHERE id = $1`, [senderId]);
    const senderName = sender.rows[0]?.full_name || 'User';

    const fullMessage = {
      id: messageId,
      conversationId,
      senderId,
      senderName,
      clientMsgId,
      type,
      content,
      mediaUrl,
      mediaMeta,
      replyToId,
      forwarded: Boolean(forwarded),
      isEdited: false,
      deletedForEveryone: false,
      createdAt: new Date().toISOString(),
      reactions: [],
      delivery_status: 'sent',
    };

    res.status(201).json(fullMessage);
  } catch (err: any) {
    console.error('[Chat] sendMessage error:', err);
    res.status(500).json({ error: 'Server error sending message' });
  }
}

export async function editMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: 'Message content cannot be empty' });
      return;
    }

    const msg = await db.query(
      `SELECT sender_id, deleted_for_everyone, created_at FROM messages WHERE id = $1`,
      [messageId]
    );

    if (msg.rowCount === 0) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    if (msg.rows[0].sender_id !== userId) {
      res.status(403).json({ error: 'You can only edit your own messages' });
      return;
    }

    if (msg.rows[0].deleted_for_everyone) {
      res.status(400).json({ error: 'Cannot edit a deleted message' });
      return;
    }

    await db.query(
      `UPDATE messages SET content = $1, is_edited = true, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [content.trim(), messageId]
    );

    res.json({ message: 'Message edited successfully', messageId, content: content.trim() });
  } catch (err: any) {
    console.error('[Chat] editMessage error:', err);
    res.status(500).json({ error: 'Server error editing message' });
  }
}

export async function deleteMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { messageId } = req.params;
    const { forEveryone } = req.body;

    const msg = await db.query(`SELECT sender_id, conversation_id FROM messages WHERE id = $1`, [messageId]);
    if (msg.rowCount === 0) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    if (forEveryone) {
      if (msg.rows[0].sender_id !== userId) {
        res.status(403).json({ error: 'You can only delete your own messages for everyone' });
        return;
      }
      await db.query(
        `UPDATE messages SET deleted_for_everyone = true, content = NULL, media_url = NULL WHERE id = $1`,
        [messageId]
      );
      res.json({ message: 'Message deleted for everyone', messageId, forEveryone: true });
    } else {
      res.json({ message: 'Message deleted for you', messageId, forEveryone: false });
    }
  } catch (err: any) {
    console.error('[Chat] deleteMessage error:', err);
    res.status(500).json({ error: 'Server error deleting message' });
  }
}

export async function reactToMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      res.status(400).json({ error: 'Emoji is required' });
      return;
    }

    // Toggle reaction: if already exists, remove it; else add it
    const existing = await db.query(
      `SELECT id FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
      [messageId, userId, emoji]
    );

    if (existing.rowCount > 0) {
      await db.query(`DELETE FROM message_reactions WHERE id = $1`, [existing.rows[0].id]);
      res.json({ action: 'removed', emoji, messageId });
    } else {
      await db.query(
        `INSERT INTO message_reactions (id, message_id, user_id, emoji) VALUES ($1, $2, $3, $4)`,
        [uuidv4(), messageId, userId, emoji]
      );
      res.json({ action: 'added', emoji, messageId });
    }
  } catch (err: any) {
    console.error('[Chat] reactToMessage error:', err);
    res.status(500).json({ error: 'Server error processing reaction' });
  }
}

export async function markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { conversationId } = req.params;

    // Mark unread messages in this conversation as read
    const messages = await db.query(
      `SELECT id FROM messages WHERE conversation_id = $1 AND sender_id != $2`,
      [conversationId, userId]
    );

    for (const row of messages.rows) {
      await db.query(
        `INSERT INTO message_statuses (message_id, user_id, status, updated_at)
         VALUES ($1, $2, 'read', CURRENT_TIMESTAMP)
         ON CONFLICT (message_id, user_id) DO UPDATE SET status = 'read', updated_at = CURRENT_TIMESTAMP`,
        [row.id, userId]
      );
    }

    res.json({ message: 'Messages marked as read', conversationId });
  } catch (err: any) {
    console.error('[Chat] markAsRead error:', err);
    res.status(500).json({ error: 'Server error marking messages as read' });
  }
}

export async function toggleMute(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { conversationId } = req.params;

    const current = await db.query(
      `SELECT is_muted FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );

    if (current.rowCount === 0) {
      res.status(404).json({ error: 'Conversation participant not found' });
      return;
    }

    const newMuted = !current.rows[0].is_muted;
    await db.query(
      `UPDATE conversation_participants SET is_muted = $1 WHERE conversation_id = $2 AND user_id = $3`,
      [newMuted, conversationId, userId]
    );

    res.json({ conversationId, isMuted: newMuted });
  } catch (err: any) {
    console.error('[Chat] toggleMute error:', err);
    res.status(500).json({ error: 'Server error toggling mute' });
  }
}

export async function toggleArchive(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { conversationId } = req.params;

    const current = await db.query(
      `SELECT is_archived FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );

    if (current.rowCount === 0) {
      res.status(404).json({ error: 'Conversation participant not found' });
      return;
    }

    const newArchived = !current.rows[0].is_archived;
    await db.query(
      `UPDATE conversation_participants SET is_archived = $1 WHERE conversation_id = $2 AND user_id = $3`,
      [newArchived, conversationId, userId]
    );

    res.json({ conversationId, isArchived: newArchived });
  } catch (err: any) {
    console.error('[Chat] toggleArchive error:', err);
    res.status(500).json({ error: 'Server error toggling archive' });
  }
}

export async function searchMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const q = req.query.q as string;
    const conversationId = req.query.conversationId as string;

    if (!q || q.trim().length === 0) {
      res.json([]);
      return;
    }

    let query = `
      SELECT m.id, m.conversation_id as "conversationId", m.sender_id as "senderId",
             u.full_name as "senderName", m.type, m.content, m.created_at as "createdAt"
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = $1
      WHERE m.deleted_for_everyone = false AND m.content ILIKE $2
    `;

    const params: any[] = [userId, `%${q.trim()}%`];

    if (conversationId) {
      params.push(conversationId);
      query += ` AND m.conversation_id = $${params.length}`;
    }

    query += ` ORDER BY m.created_at DESC LIMIT 30`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error('[Chat] searchMessages error:', err);
    res.status(500).json({ error: 'Server error searching messages' });
  }
}

export async function manageGroupMembers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const requesterId = req.user?.userId;
    const { conversationId } = req.params;
    const { action, targetUserId, newRole } = req.body; // action: 'add' | 'remove' | 'setRole' | 'leave'

    // Check requester role
    const requester = await db.query(
      `SELECT role FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, requesterId]
    );

    if (requester.rowCount === 0) {
      res.status(403).json({ error: 'You are not a member of this group' });
      return;
    }

    const isAdmin = requester.rows[0].role === 'admin';

    if (action === 'leave') {
      await db.query(
        `DELETE FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, requesterId]
      );
      res.json({ message: 'Left group successfully' });
      return;
    }

    if (!isAdmin) {
      res.status(403).json({ error: 'Admin permissions required' });
      return;
    }

    if (action === 'add') {
      await db.query(
        `INSERT INTO conversation_participants (conversation_id, user_id, role)
         VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
        [conversationId, targetUserId]
      );
      res.json({ message: 'Member added' });
    } else if (action === 'remove') {
      await db.query(
        `DELETE FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, targetUserId]
      );
      res.json({ message: 'Member removed' });
    } else if (action === 'setRole') {
      await db.query(
        `UPDATE conversation_participants SET role = $1 WHERE conversation_id = $2 AND user_id = $3`,
        [newRole === 'admin' ? 'admin' : 'member', conversationId, targetUserId]
      );
      res.json({ message: 'Role updated' });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } catch (err: any) {
    console.error('[Chat] manageGroupMembers error:', err);
    res.status(500).json({ error: 'Server error managing group members' });
  }
}
