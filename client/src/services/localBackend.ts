// Bharat Chat Resilient Client-Side Engine
// Handles authentication, messaging, and stories locally if the backend server is unreachable (e.g. on static Vercel host)

import { User, Conversation, Message, StatusFeedUser } from '../types/index.js';

const STORAGE_USERS = 'bharat_chat_users_db';
const STORAGE_CONVS = 'bharat_chat_convs_db';
const STORAGE_MSGS = 'bharat_chat_msgs_db';
const STORAGE_STATUS = 'bharat_chat_status_db';

// Initial preloaded sovereign contacts
const DEFAULT_USERS: User[] = [
  {
    id: 'user-priya-patel-001',
    phone: '+919876543211',
    fullName: 'Priya Patel (અમદાવાદ)',
    avatarUrl: null,
    about: 'Digital India Sovereign Chat 🇮🇳',
    isOnline: true,
    lastSeenAt: new Date().toISOString(),
  },
  {
    id: 'user-aarav-sharma-002',
    phone: '+919876543212',
    fullName: 'Aarav Sharma (સુરત)',
    avatarUrl: null,
    about: 'Building sovereign web applications.',
    isOnline: false,
    lastSeenAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

function getUsers(): User[] {
  const data = localStorage.getItem(STORAGE_USERS);
  if (!data) {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
  return JSON.parse(data);
}

function saveUsers(users: User[]) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
}

function getStoredConvs(): Conversation[] {
  const data = localStorage.getItem(STORAGE_CONVS);
  if (!data) return [];
  return JSON.parse(data);
}

function saveConvs(convs: Conversation[]) {
  localStorage.setItem(STORAGE_CONVS, JSON.stringify(convs));
}

function getStoredMsgs(): Message[] {
  const data = localStorage.getItem(STORAGE_MSGS);
  if (!data) return [];
  return JSON.parse(data);
}

function saveMsgs(msgs: Message[]) {
  localStorage.setItem(STORAGE_MSGS, JSON.stringify(msgs));
}

export const localBackend = {
  async register(data: { fullName: string; phone: string; password?: string }) {
    const users = getUsers();
    const cleanPhone = data.phone.replace(/[\s\-\(\)]/g, '');
    const phone = cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone.replace(/^91/, '')}`;

    const existing = users.find((u) => u.phone === phone);
    if (existing) {
      throw new Error('An account with this mobile number already exists.');
    }

    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      phone,
      fullName: data.fullName,
      avatarUrl: null,
      about: 'Available on Bharat Chat 🇮🇳',
      isOnline: true,
      lastSeenAt: new Date().toISOString(),
      privacyLastSeen: 'everyone',
      privacyProfilePhoto: 'everyone',
      privacyReadReceipts: true,
    };

    users.push(newUser);
    saveUsers(users);

    // Create a welcoming first conversation
    const convId = `conv-welcome-${Date.now()}`;
    const welcomeConv: Conversation = {
      id: convId,
      type: 'direct',
      other_user: DEFAULT_USERS[0],
      unread_count: 1,
      last_message: {
        id: `msg-welcome-${Date.now()}`,
        content: 'નમસ્તે! ભારત ચેટમાં તમારું સ્વાગત છે 🇮🇳 (Welcome to Bharat Chat)',
        type: 'text',
        senderId: DEFAULT_USERS[0].id,
        createdAt: new Date().toISOString(),
      },
    };

    const convs = getStoredConvs();
    convs.unshift(welcomeConv);
    saveConvs(convs);

    const msgs = getStoredMsgs();
    msgs.push({
      id: `msg-welcome-${Date.now()}`,
      conversationId: convId,
      senderId: DEFAULT_USERS[0].id,
      senderName: DEFAULT_USERS[0].fullName,
      content: 'નમસ્તે! ભારત ચેટમાં તમારું સ્વાગત છે 🇮🇳 (Welcome to Bharat Chat! Your secure, sovereign messenger is now live.)',
      type: 'text',
      createdAt: new Date().toISOString(),
      delivery_status: 'read',
    });
    saveMsgs(msgs);

    const token = `local-token-${newUser.id}`;
    return {
      message: 'Account created successfully',
      user: newUser,
      accessToken: token,
      refreshToken: `local-refresh-${newUser.id}`,
    };
  },

  async login(data: { phone: string; password?: string }) {
    const users = getUsers();
    const cleanPhone = data.phone.replace(/[\s\-\(\)]/g, '');
    const phone = cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone.replace(/^91/, '')}`;

    let user = users.find((u) => u.phone === phone || u.phone.includes(cleanPhone));
    if (!user) {
      // Auto-create for seamless test access if not existing
      return this.register({
        fullName: 'Bharat User',
        phone: data.phone,
      });
    }

    user.isOnline = true;
    user.lastSeenAt = new Date().toISOString();
    saveUsers(users);

    const token = `local-token-${user.id}`;
    return {
      message: 'Login successful',
      user,
      accessToken: token,
      refreshToken: `local-refresh-${user.id}`,
    };
  },

  async getMe(currentUserId: string): Promise<User> {
    const users = getUsers();
    const user = users.find((u) => u.id === currentUserId);
    if (!user) {
      return {
        id: currentUserId,
        phone: '+919876500001',
        fullName: 'Bharat Chat User',
        about: 'Available on Bharat Chat',
        isOnline: true,
      };
    }
    return user;
  },

  async searchUsers(query: string, currentUserId: string): Promise<User[]> {
    const users = getUsers();
    const q = query.toLowerCase().trim();
    return users.filter(
      (u) => u.id !== currentUserId && (u.fullName.toLowerCase().includes(q) || u.phone.includes(q))
    );
  },

  async getConversations(): Promise<Conversation[]> {
    return getStoredConvs();
  },

  async getOrCreateDirectChat(targetUserId: string): Promise<{ conversationId: string }> {
    const convs = getStoredConvs();
    const existing = convs.find(
      (c) => c.type === 'direct' && c.other_user?.id === targetUserId
    );
    if (existing) {
      return { conversationId: existing.id };
    }

    const users = getUsers();
    const target = users.find((u) => u.id === targetUserId);
    const convId = `conv-${Date.now()}`;
    const newConv: Conversation = {
      id: convId,
      type: 'direct',
      other_user: target || null,
      unread_count: 0,
    };
    convs.unshift(newConv);
    saveConvs(convs);
    return { conversationId: convId };
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const msgs = getStoredMsgs();
    return msgs.filter((m) => m.conversationId === conversationId);
  },

  async sendMessage(conversationId: string, data: any, currentUser: User): Promise<Message> {
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newMsg: Message = {
      id: msgId,
      conversationId,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      clientMsgId: data.clientMsgId,
      type: data.type || 'text',
      content: data.content,
      mediaUrl: data.mediaUrl,
      mediaMeta: data.mediaMeta,
      replyToId: data.replyToId,
      createdAt: new Date().toISOString(),
      delivery_status: 'delivered',
    };

    const msgs = getStoredMsgs();
    msgs.push(newMsg);
    saveMsgs(msgs);

    // Update conversation last_message
    const convs = getStoredConvs();
    const conv = convs.find((c) => c.id === conversationId);
    if (conv) {
      conv.last_message = {
        id: msgId,
        content: newMsg.content || `[${newMsg.type}]`,
        type: newMsg.type,
        senderId: currentUser.id,
        createdAt: newMsg.createdAt,
      };
      saveConvs(convs);
    }

    return newMsg;
  },

  async createStatus(data: any, currentUser: User) {
    const statusId = `status-${Date.now()}`;
    const raw = localStorage.getItem(STORAGE_STATUS);
    const feed: StatusFeedUser[] = raw ? JSON.parse(raw) : [];

    let myFeed = feed.find((f) => f.userId === currentUser.id);
    if (!myFeed) {
      myFeed = {
        userId: currentUser.id,
        userName: currentUser.fullName,
        userPhone: currentUser.phone,
        userAvatar: currentUser.avatarUrl,
        isMe: true,
        statuses: [],
      };
      feed.unshift(myFeed);
    }

    myFeed.statuses.push({
      id: statusId,
      userId: currentUser.id,
      type: data.type || 'text',
      content: data.content,
      mediaUrl: data.mediaUrl,
      backgroundColor: data.backgroundColor || '#065f46',
      fontFamily: data.fontFamily || 'sans-serif',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      viewsCount: 0,
      viewedByMe: false,
    });

    localStorage.setItem(STORAGE_STATUS, JSON.stringify(feed));
    return { message: 'Status published' };
  },

  async getStatusFeed(currentUserId: string): Promise<StatusFeedUser[]> {
    const raw = localStorage.getItem(STORAGE_STATUS);
    if (!raw) return [];
    const feed: StatusFeedUser[] = JSON.parse(raw);
    return feed.map((item) => ({
      ...item,
      isMe: item.userId === currentUserId,
    }));
  },
};
