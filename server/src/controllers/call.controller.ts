import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function logCall(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const callerId = req.user?.userId;
    const { receiverId, type, status, durationSeconds } = req.body;

    if (!receiverId || !type) {
      res.status(400).json({ error: 'receiverId and type are required' });
      return;
    }

    const callId = uuidv4();
    await db.query(
      `INSERT INTO call_records (id, caller_id, receiver_id, type, status, duration_seconds, ended_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [callId, callerId, receiverId, type, status || 'completed', durationSeconds || 0]
    );

    res.status(201).json({ message: 'Call record saved', callId });
  } catch (err: any) {
    console.error('[Call] logCall error:', err);
    res.status(500).json({ error: 'Server error saving call record' });
  }
}

export async function getCallHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    const query = `
      SELECT 
        c.id,
        c.caller_id as "callerId",
        c.receiver_id as "receiverId",
        c.type,
        c.status,
        c.started_at as "startedAt",
        c.ended_at as "endedAt",
        c.duration_seconds as "durationSeconds",
        CASE 
          WHEN c.caller_id = $1 THEN 'outgoing'
          ELSE 'incoming'
        END as direction,
        CASE
          WHEN c.caller_id = $1 THEN (SELECT full_name FROM users WHERE id = c.receiver_id)
          ELSE (SELECT full_name FROM users WHERE id = c.caller_id)
        END as "otherUserName",
        CASE
          WHEN c.caller_id = $1 THEN (SELECT avatar_url FROM users WHERE id = c.receiver_id)
          ELSE (SELECT avatar_url FROM users WHERE id = c.caller_id)
        END as "otherUserAvatar"
      FROM call_records c
      WHERE c.caller_id = $1 OR c.receiver_id = $1
      ORDER BY c.started_at DESC
      LIMIT 50
    `;

    const result = await db.query(query, [userId]);
    res.json(result.rows);
  } catch (err: any) {
    console.error('[Call] getCallHistory error:', err);
    res.status(500).json({ error: 'Server error fetching call history' });
  }
}
