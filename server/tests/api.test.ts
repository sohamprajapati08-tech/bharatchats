import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, server } from '../src/index.js';
import { db } from '../src/db/index.js';

describe('Bharat Chat API & Security Tests', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await db.init();
  });

  afterAll(async () => {
    await db.close();
    server.close();
  });

  it('GET /api/health should return healthy status and DB connectivity', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.database).toBe('connected');
  });

  it('GET /api/config/webrtc should return STUN/TURN servers', async () => {
    const res = await request(app).get('/api/config/webrtc');
    expect(res.status).toBe(200);
    expect(res.body.iceServers).toBeDefined();
    expect(Array.isArray(res.body.iceServers)).toBe(true);
  });

  const testUserA = {
    fullName: 'Aarav Sharma',
    phone: '9876543210',
    password: 'Password@123',
    confirmPassword: 'Password@123',
  };

  const testUserB = {
    fullName: 'Priya Patel',
    phone: '9123456789',
    password: 'SecurePass@456',
    confirmPassword: 'SecurePass@456',
  };

  let tokenA = '';
  let userAId = '';
  let tokenB = '';
  let userBId = '';

  it('POST /api/auth/register should create user A and return tokens', async () => {
    const res = await request(app).post('/api/auth/register').send(testUserA);
    expect([201, 409]).toContain(res.status);

    if (res.status === 201) {
      expect(res.body.user).toBeDefined();
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.notice).toContain('not verified via SMS OTP');
      tokenA = res.body.accessToken;
      userAId = res.body.user.id;
    } else {
      // If already registered in persistent DB, login
      const loginRes = await request(app).post('/api/auth/login').send({
        phone: testUserA.phone,
        password: testUserA.password,
      });
      tokenA = loginRes.body.accessToken;
      userAId = loginRes.body.user.id;
    }
    expect(tokenA).toBeTruthy();
  });

  it('POST /api/auth/register should reject duplicate phone number', async () => {
    const res = await request(app).post('/api/auth/register').send(testUserA);
    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already exists');
  });

  it('POST /api/auth/register should register user B', async () => {
    const res = await request(app).post('/api/auth/register').send(testUserB);
    if (res.status === 201) {
      tokenB = res.body.accessToken;
      userBId = res.body.user.id;
    } else {
      const loginRes = await request(app).post('/api/auth/login').send({
        phone: testUserB.phone,
        password: testUserB.password,
      });
      tokenB = loginRes.body.accessToken;
      userBId = loginRes.body.user.id;
    }
    expect(tokenB).toBeTruthy();
  });

  it('POST /api/auth/login should fail with incorrect password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      phone: testUserA.phone,
      password: 'WrongPassword!',
    });
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me should return authenticated user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(userAId);
  });

  it('GET /api/auth/me should reject unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/users/search should find user B by name or phone', async () => {
    const res = await request(app)
      .get('/api/users/search?q=Priya')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((u: any) => u.id === userBId);
    expect(found).toBeDefined();
  });

  let directConvId = '';

  it('POST /api/chat/conversations/direct should create 1-to-1 conversation', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/direct')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ targetUserId: userBId });

    expect([200, 201]).toContain(res.status);
    expect(res.body.conversationId).toBeDefined();
    directConvId = res.body.conversationId;
  });

  let messageId = '';

  it('POST /api/chat/conversations/:id/messages should send a message', async () => {
    const res = await request(app)
      .post(`/api/chat/conversations/${directConvId}/messages`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        content: 'Namaste Priya! Welcome to Bharat Chat.',
        type: 'text',
        clientMsgId: `client-test-uuid-${Date.now()}-${Math.random()}`,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.content).toBe('Namaste Priya! Welcome to Bharat Chat.');
    messageId = res.body.id;
  });

  it('POST /api/chat/messages/:id/react should add an emoji reaction', async () => {
    const res = await request(app)
      .post(`/api/chat/messages/${messageId}/react`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ emoji: '🙏' });

    expect(res.status).toBe(200);
    expect(res.body.action).toBe('added');
    expect(res.body.emoji).toBe('🙏');
  });

  it('POST /api/chat/conversations/:id/read should mark messages as read', async () => {
    const res = await request(app)
      .post(`/api/chat/conversations/${directConvId}/read`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
  });

  it('POST /api/chat/conversations/group should create a group chat', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/group')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: 'Bharat Innovators Group',
        description: 'Tech and development discussions',
        memberIds: [userBId],
      });

    expect(res.status).toBe(201);
    expect(res.body.conversationId).toBeDefined();
  });

  it('POST /api/status should create a 24h status update', async () => {
    const res = await request(app)
      .post('/api/status')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        type: 'text',
        content: 'Proudly building digital sovereign applications for India! 🇮🇳',
        backgroundColor: '#1b4332',
      });

    expect(res.status).toBe(201);
    expect(res.body.status.id).toBeDefined();
  });

  it('GET /api/status/feed should fetch active status updates', async () => {
    const res = await request(app)
      .get('/api/status/feed')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
