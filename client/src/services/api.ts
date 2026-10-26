// Bharat Chat API Client Service with Automatic Resilient Fallback

import { localBackend } from './localBackend.js';
import { User } from '../types/index.js';

const getBaseUrl = (): string => {
  const custom = localStorage.getItem('bharat_chat_server_url');
  if (custom) return custom;
  return '';
};

export const API_BASE = getBaseUrl();

export function setCustomServerUrl(url: string) {
  if (url) {
    localStorage.setItem('bharat_chat_server_url', url.replace(/\/+$/, ''));
  } else {
    localStorage.removeItem('bharat_chat_server_url');
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem('bharat_chat_access_token');
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('bharat_chat_refresh_token');
}

export function saveTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('bharat_chat_access_token', accessToken);
  localStorage.setItem('bharat_chat_refresh_token', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('bharat_chat_access_token');
  localStorage.removeItem('bharat_chat_refresh_token');
  localStorage.removeItem('bharat_chat_current_user');
}

function getCurrentLocalUser(): User {
  const raw = localStorage.getItem('bharat_chat_current_user');
  if (raw) return JSON.parse(raw);
  return {
    id: 'user-guest-001',
    phone: '+919876500001',
    fullName: 'Bharat User',
  };
}

function saveCurrentLocalUser(u: User) {
  localStorage.setItem('bharat_chat_current_user', JSON.stringify(u));
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 || res.status === 403) {
    const rToken = getRefreshToken();
    if (rToken && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
      try {
        const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: rToken }),
        });
        if (refreshRes.ok) {
          const tokens = await refreshRes.json();
          saveTokens(tokens.accessToken, tokens.refreshToken);
          headers['Authorization'] = `Bearer ${tokens.accessToken}`;
          const retryRes = await fetch(url, { ...options, headers });
          if (!retryRes.ok) {
            const errData = await retryRes.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP error ${retryRes.status}`);
          }
          return retryRes.json();
        } else {
          clearTokens();
          window.dispatchEvent(new CustomEvent('bharat_chat_logout'));
        }
      } catch {
        clearTokens();
        window.dispatchEvent(new CustomEvent('bharat_chat_logout'));
      }
    }
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const err: any = new Error(errData.error || `Request failed with status ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

export const api = {
  // Auth
  register: async (data: any) => {
    try {
      const res = await request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) });
      saveCurrentLocalUser(res.user);
      return res;
    } catch (err: any) {
      if (err.status === 404 || !API_BASE) {
        console.warn('[API] Server returned 404, using resilient local storage engine');
        const res = await localBackend.register(data);
        saveCurrentLocalUser(res.user);
        return res;
      }
      throw err;
    }
  },

  login: async (data: any) => {
    try {
      const res = await request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) });
      saveCurrentLocalUser(res.user);
      return res;
    } catch (err: any) {
      if (err.status === 404 || !API_BASE) {
        console.warn('[API] Server returned 404, using resilient local storage engine');
        const res = await localBackend.login(data);
        saveCurrentLocalUser(res.user);
        return res;
      }
      throw err;
    }
  },

  logout: async (refreshToken?: string) => {
    try {
      return await request('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) });
    } catch {
      return { message: 'Logged out' };
    }
  },

  getMe: async () => {
    try {
      return await request('/api/auth/me');
    } catch (err: any) {
      if (err.status === 404 || !API_BASE) {
        return getCurrentLocalUser();
      }
      throw err;
    }
  },

  // Users
  searchUsers: async (q: string) => {
    try {
      return await request(`/api/users/search?q=${encodeURIComponent(q)}`);
    } catch (err: any) {
      if (err.status === 404 || !API_BASE) {
        return localBackend.searchUsers(q, getCurrentLocalUser().id);
      }
      throw err;
    }
  },

  updateProfile: (data: any) => request('/api/users/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  updatePrivacy: (data: any) => request('/api/users/privacy', { method: 'PATCH', body: JSON.stringify(data) }),
  blockUser: (targetUserId: string) => request('/api/users/block', { method: 'POST', body: JSON.stringify({ targetUserId }) }),
  unblockUser: (targetUserId: string) => request('/api/users/unblock', { method: 'POST', body: JSON.stringify({ targetUserId }) }),
  getBlockedUsers: () => request('/api/users/blocked').catch(() => []),
  reportUser: (data: { targetUserId: string; reason: string }) => request('/api/users/report', { method: 'POST', body: JSON.stringify(data) }),

  // Chat
  getConversations: async () => {
    try {
      return await request('/api/chat/conversations');
    } catch (err: any) {
      if (err.status === 404 || !API_BASE) {
        return localBackend.getConversations();
      }
      throw err;
    }
  },

  getOrCreateDirectChat: async (targetUserId: string) => {
    try {
      return await request('/api/chat/conversations/direct', { method: 'POST', body: JSON.stringify({ targetUserId }) });
    } catch (err: any) {
      if (err.status === 404 || !API_BASE) {
        return localBackend.getOrCreateDirectChat(targetUserId);
      }
      throw err;
    }
  },

  createGroup: (data: { title: string; description?: string; memberIds: string[]; avatarUrl?: string }) =>
    request('/api/chat/conversations/group', { method: 'POST', body: JSON.stringify(data) }),

  getMessages: async (conversationId: string, limit = 50, before?: string) => {
    try {
      let q = `/api/chat/conversations/${conversationId}/messages?limit=${limit}`;
      if (before) q += `&before=${encodeURIComponent(before)}`;
      return await request(q);
    } catch (err: any) {
      if (err.status === 404 || !API_BASE) {
        return localBackend.getMessages(conversationId);
      }
      throw err;
    }
  },

  sendMessage: async (conversationId: string, data: any) => {
    try {
      return await request(`/api/chat/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify(data) });
    } catch (err: any) {
      if (err.status === 404 || !API_BASE) {
        return localBackend.sendMessage(conversationId, data, getCurrentLocalUser());
      }
      throw err;
    }
  },

  markAsRead: (conversationId: string) => request(`/api/chat/conversations/${conversationId}/read`, { method: 'POST' }).catch(() => {}),
  toggleMute: (conversationId: string) => request(`/api/chat/conversations/${conversationId}/mute`, { method: 'POST' }).catch(() => {}),
  toggleArchive: (conversationId: string) => request(`/api/chat/conversations/${conversationId}/archive`, { method: 'POST' }).catch(() => {}),
  manageGroupMembers: (conversationId: string, data: any) =>
    request(`/api/chat/conversations/${conversationId}/members`, { method: 'POST', body: JSON.stringify(data) }),
  editMessage: (messageId: string, content: string) =>
    request(`/api/chat/messages/${messageId}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
  deleteMessage: (messageId: string, forEveryone = false) =>
    request(`/api/chat/messages/${messageId}`, { method: 'DELETE', body: JSON.stringify({ forEveryone }) }),
  reactToMessage: (messageId: string, emoji: string) =>
    request(`/api/chat/messages/${messageId}/react`, { method: 'POST', body: JSON.stringify({ emoji }) }),
  searchMessages: (q: string, conversationId?: string) => {
    let url = `/api/chat/messages/search?q=${encodeURIComponent(q)}`;
    if (conversationId) url += `&conversationId=${conversationId}`;
    return request(url).catch(() => []);
  },

  // Media
  uploadMedia: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      return await request('/api/media/upload', { method: 'POST', body: formData });
    } catch (err: any) {
      if (err.status === 404 || !API_BASE) {
        return {
          url: URL.createObjectURL(file),
          originalName: file.name,
          size: file.size,
          mimetype: file.type,
        };
      }
      throw err;
    }
  },

  // Status / Stories
  createStatus: async (data: any) => {
    try {
      return await request('/api/status', { method: 'POST', body: JSON.stringify(data) });
    } catch (err: any) {
      if (err.status === 404 || !API_BASE) {
        return localBackend.createStatus(data, getCurrentLocalUser());
      }
      throw err;
    }
  },

  getStatusFeed: async () => {
    try {
      return await request('/api/status/feed');
    } catch (err: any) {
      if (err.status === 404 || !API_BASE) {
        return localBackend.getStatusFeed(getCurrentLocalUser().id);
      }
      throw err;
    }
  },

  viewStatus: (statusId: string) => request(`/api/status/${statusId}/view`, { method: 'POST' }).catch(() => {}),
  getStatusViewers: (statusId: string) => request(`/api/status/${statusId}/viewers`).catch(() => []),
  deleteStatus: (statusId: string) => request(`/api/status/${statusId}`, { method: 'DELETE' }).catch(() => {}),

  // WebRTC & Calls
  getWebRTCConfig: () =>
    request('/api/config/webrtc').catch(() => ({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
    })),
  logCall: (data: any) => request('/api/calls/log', { method: 'POST', body: JSON.stringify(data) }).catch(() => {}),
  getCallHistory: () => request('/api/calls/history').catch(() => []),
};
