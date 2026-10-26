// Bharat Chat API Client Service

const getBaseUrl = (): string => {
  // Check if custom server URL is set in localStorage (vital for Capacitor Android testing on LAN)
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
    // Attempt token refresh
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
    throw new Error(errData.error || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  register: (data: any) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: (refreshToken?: string) => request('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  getMe: () => request('/api/auth/me'),

  // Users
  searchUsers: (q: string) => request(`/api/users/search?q=${encodeURIComponent(q)}`),
  updateProfile: (data: any) => request('/api/users/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  updatePrivacy: (data: any) => request('/api/users/privacy', { method: 'PATCH', body: JSON.stringify(data) }),
  blockUser: (targetUserId: string) => request('/api/users/block', { method: 'POST', body: JSON.stringify({ targetUserId }) }),
  unblockUser: (targetUserId: string) => request('/api/users/unblock', { method: 'POST', body: JSON.stringify({ targetUserId }) }),
  getBlockedUsers: () => request('/api/users/blocked'),
  reportUser: (data: { targetUserId: string; reason: string }) => request('/api/users/report', { method: 'POST', body: JSON.stringify(data) }),

  // Chat
  getConversations: () => request('/api/chat/conversations'),
  getOrCreateDirectChat: (targetUserId: string) => request('/api/chat/conversations/direct', { method: 'POST', body: JSON.stringify({ targetUserId }) }),
  createGroup: (data: { title: string; description?: string; memberIds: string[]; avatarUrl?: string }) =>
    request('/api/chat/conversations/group', { method: 'POST', body: JSON.stringify(data) }),
  getMessages: (conversationId: string, limit = 50, before?: string) => {
    let q = `/api/chat/conversations/${conversationId}/messages?limit=${limit}`;
    if (before) q += `&before=${encodeURIComponent(before)}`;
    return request(q);
  },
  sendMessage: (conversationId: string, data: any) =>
    request(`/api/chat/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify(data) }),
  markAsRead: (conversationId: string) => request(`/api/chat/conversations/${conversationId}/read`, { method: 'POST' }),
  toggleMute: (conversationId: string) => request(`/api/chat/conversations/${conversationId}/mute`, { method: 'POST' }),
  toggleArchive: (conversationId: string) => request(`/api/chat/conversations/${conversationId}/archive`, { method: 'POST' }),
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
    return request(url);
  },

  // Media
  uploadMedia: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/api/media/upload', { method: 'POST', body: formData });
  },

  // Status / Stories
  createStatus: (data: any) => request('/api/status', { method: 'POST', body: JSON.stringify(data) }),
  getStatusFeed: () => request('/api/status/feed'),
  viewStatus: (statusId: string) => request(`/api/status/${statusId}/view`, { method: 'POST' }),
  getStatusViewers: (statusId: string) => request(`/api/status/${statusId}/viewers`),
  deleteStatus: (statusId: string) => request(`/api/status/${statusId}`, { method: 'DELETE' }),

  // WebRTC & Calls
  getWebRTCConfig: () => request('/api/config/webrtc'),
  logCall: (data: any) => request('/api/calls/log', { method: 'POST', body: JSON.stringify(data) }),
  getCallHistory: () => request('/api/calls/history'),
};
