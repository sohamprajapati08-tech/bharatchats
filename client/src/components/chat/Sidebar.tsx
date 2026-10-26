import React, { useState } from 'react';
import { Conversation } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  MessageSquarePlus,
  Users,
  CircleDot,
  Settings,
  Search,
  LogOut,
  VolumeX,
  MoreVertical,
  CheckCheck
} from 'lucide-react';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onOpenNewChat: () => void;
  onOpenNewGroup: () => void;
  onOpenStatusFeed: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onOpenNewChat,
  onOpenNewGroup,
  onOpenStatusFeed,
  onOpenSettings,
}) => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const name = c.type === 'direct' ? c.other_user?.fullName : c.title;
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <aside className="sidebar">
      {/* Top Sidebar Header */}
      <div className="sidebar-header">
        <div className="brand-badge" onClick={onOpenSettings} style={{ cursor: 'pointer' }}>
          <img src={user?.avatarUrl || '/logo.svg'} alt="Profile" />
          <div className="brand-text">
            <h1>
              Bharat Chat <span className="flag-dot" />
            </h1>
            <div className="brand-subtitle">{user?.fullName || 'Online'}</div>
          </div>
        </div>

        <div className="header-actions">
          {/* Status / Stories */}
          <button className="btn-icon" title="Status Updates / સ્ટેટસ" onClick={onOpenStatusFeed}>
            <CircleDot size={20} color="#00a884" />
          </button>

          {/* New Direct Chat */}
          <button className="btn-icon" title="New Chat / નવી વાતચીત" onClick={onOpenNewChat}>
            <MessageSquarePlus size={20} />
          </button>

          {/* New Group */}
          <button className="btn-icon" title="New Group / નવું ગ્રુપ" onClick={onOpenNewGroup}>
            <Users size={20} />
          </button>

          {/* More Menu */}
          <div style={{ position: 'relative' }}>
            <button className="btn-icon" title="Menu" onClick={() => setMenuOpen(!menuOpen)}>
              <MoreVertical size={20} />
            </button>

            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  border: '1px solid var(--border-light)',
                  width: '180px',
                  zIndex: 50,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.88rem' }}
                  onClick={() => { setMenuOpen(false); onOpenSettings(); }}
                >
                  <Settings size={16} />
                  <span>Settings / સેટિંગ્સ</span>
                </div>
                <div
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    color: 'var(--danger)',
                    borderTop: '1px solid var(--border-light)',
                  }}
                  onClick={() => { setMenuOpen(false); logout(); }}
                >
                  <LogOut size={16} />
                  <span>Logout / બહાર નીકળો</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="search-container">
        <div className="search-box">
          <Search size={18} color="var(--text-secondary)" />
          <input
            type="text"
            placeholder="Search or start new chat / શોધો..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Conversation List */}
      <ul className="conversation-list">
        {filteredConversations.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {searchQuery ? 'No chats found matching your search.' : 'No conversations yet. Click the + icon to start chatting!'}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isDirect = conv.type === 'direct';
            const name = isDirect ? conv.other_user?.fullName || 'User' : conv.title || 'Group';
            const avatar = isDirect ? conv.other_user?.avatarUrl : conv.group_avatar;
            const isOnline = isDirect && conv.other_user?.isOnline;
            const isActive = conv.id === activeConversationId;
            const lastMsg = conv.last_message;

            return (
              <li
                key={conv.id}
                className={`conversation-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectConversation(conv.id)}
              >
                <div className="avatar-wrapper">
                  {avatar ? (
                    <img src={avatar} alt={name} />
                  ) : (
                    <div className="avatar-placeholder">
                      {isDirect ? name.charAt(0).toUpperCase() : <Users size={22} />}
                    </div>
                  )}
                  {isOnline && <span className="online-indicator" />}
                </div>

                <div className="conversation-info">
                  <div className="conversation-header">
                    <span className="conversation-name">{name}</span>
                    <span className="conversation-time">
                      {lastMsg ? formatTime(lastMsg.createdAt) : ''}
                    </span>
                  </div>

                  <div className="conversation-snippet">
                    <span className="snippet-text">
                      {lastMsg ? (
                        <>
                          {lastMsg.senderId === user?.id && (
                            <CheckCheck size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', color: 'var(--tick-delivered)' }} />
                          )}
                          {lastMsg.content || `[${lastMsg.type}]`}
                        </>
                      ) : (
                        'Draft a new message...'
                      )}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {conv.is_muted && <VolumeX size={14} color="var(--text-muted)" />}
                      {conv.unread_count && conv.unread_count > 0 ? (
                        <span className="unread-badge">{conv.unread_count}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </aside>
  );
};
