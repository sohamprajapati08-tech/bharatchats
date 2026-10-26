import React, { useState } from 'react';
import { Conversation } from '../../types/index.js';
import {
  Phone,
  Video,
  Search,
  MoreVertical,
  ArrowLeft,
  VolumeX,
  Volume2,
  Archive,
  ShieldAlert,
  Ban,
  Users
} from 'lucide-react';

interface ChatHeaderProps {
  conversation: Conversation;
  isTyping: boolean;
  typingUser: string;
  onBack: () => void;
  onStartCall: (type: 'voice' | 'video') => void;
  onOpenSearch: () => void;
  onToggleMute: () => void;
  onToggleArchive: () => void;
  onBlockUser?: () => void;
  onReportUser?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  isTyping,
  typingUser,
  onBack,
  onStartCall,
  onOpenSearch,
  onToggleMute,
  onToggleArchive,
  onBlockUser,
  onReportUser,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const isDirect = conversation.type === 'direct';
  const name = isDirect ? conversation.other_user?.fullName || 'User' : conversation.title || 'Group';
  const avatar = isDirect ? conversation.other_user?.avatarUrl : conversation.group_avatar;
  const isOnline = isDirect && conversation.other_user?.isOnline;
  const lastSeen = conversation.other_user?.lastSeenAt;

  const renderStatus = () => {
    if (isTyping) {
      return `${typingUser || 'Someone'} is typing...`;
    }
    if (!isDirect) {
      return 'Group conversation';
    }
    if (isOnline) {
      return 'online';
    }
    if (lastSeen) {
      const d = new Date(lastSeen);
      return `last seen ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return 'offline';
  };

  return (
    <div className="chat-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Mobile back arrow */}
        <button className="btn-icon" onClick={onBack} style={{ display: 'flex' }}>
          <ArrowLeft size={20} />
        </button>

        <div className="chat-partner-info">
          <div className="avatar-wrapper" style={{ width: '42px', height: '42px', minWidth: '42px', marginRight: '0' }}>
            {avatar ? (
              <img src={avatar} alt={name} />
            ) : (
              <div className="avatar-placeholder" style={{ fontSize: '1rem' }}>
                {isDirect ? name.charAt(0).toUpperCase() : <Users size={18} />}
              </div>
            )}
            {isOnline && <span className="online-indicator" />}
          </div>

          <div className="partner-details">
            <h2>{name}</h2>
            <div className={`partner-status ${!isOnline && !isTyping ? 'offline' : ''}`}>
              {renderStatus()}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {isDirect && (
          <>
            <button
              className="btn-icon"
              title="Voice Call / ઓડિયો કોલ"
              onClick={() => onStartCall('voice')}
            >
              <Phone size={19} color="#00a884" />
            </button>

            <button
              className="btn-icon"
              title="Video Call / વિડીયો કોલ"
              onClick={() => onStartCall('video')}
            >
              <Video size={19} color="#00a884" />
            </button>
          </>
        )}

        <button className="btn-icon" title="Search Messages / મેસેજ શોધો" onClick={onOpenSearch}>
          <Search size={19} />
        </button>

        <div style={{ position: 'relative' }}>
          <button className="btn-icon" onClick={() => setMenuOpen(!menuOpen)}>
            <MoreVertical size={19} />
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
                width: '210px',
                zIndex: 60,
                overflow: 'hidden',
              }}
            >
              <div
                style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.88rem' }}
                onClick={() => { setMenuOpen(false); onToggleMute(); }}
              >
                {conversation.is_muted ? <Volume2 size={16} /> : <VolumeX size={16} />}
                <span>{conversation.is_muted ? 'Unmute Notifications' : 'Mute Notifications'}</span>
              </div>

              <div
                style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.88rem' }}
                onClick={() => { setMenuOpen(false); onToggleArchive(); }}
              >
                <Archive size={16} />
                <span>{conversation.is_archived ? 'Unarchive Chat' : 'Archive Chat'}</span>
              </div>

              {isDirect && onBlockUser && (
                <div
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    color: 'var(--warning)',
                    borderTop: '1px solid var(--border-light)',
                  }}
                  onClick={() => { setMenuOpen(false); onBlockUser(); }}
                >
                  <Ban size={16} />
                  <span>Block User / બ્લોક કરો</span>
                </div>
              )}

              {isDirect && onReportUser && (
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
                  onClick={() => { setMenuOpen(false); onReportUser(); }}
                >
                  <ShieldAlert size={16} />
                  <span>Report Abuse / રિપોર્ટ કરો</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
