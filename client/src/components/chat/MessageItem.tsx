import React, { useState } from 'react';
import { Message } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Check,
  CheckCheck,
  Smile,
  Reply,
  Edit2,
  Trash2,
  FileText,
  Download,
  Play,
  Pause
} from 'lucide-react';

interface MessageItemProps {
  message: Message;
  isGroup: boolean;
  onReply: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string, forEveryone: boolean) => void;
  onImageClick?: (url: string) => void;
}

const COMMON_EMOJIS = ['🙏', '👍', '❤️', '😂', '🔥', '👏'];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isGroup,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onImageClick,
}) => {
  const { user } = useAuth();
  const isOutgoing = message.senderId === user?.id;
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Audio player state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const toggleAudio = (url: string) => {
    if (!audioElement) {
      const audio = new Audio(url);
      audio.onended = () => setIsPlayingAudio(false);
      audio.play();
      setAudioElement(audio);
      setIsPlayingAudio(true);
    } else {
      if (isPlayingAudio) {
        audioElement.pause();
        setIsPlayingAudio(false);
      } else {
        audioElement.play();
        setIsPlayingAudio(true);
      }
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (message.type === 'system') {
    return (
      <div style={{ textAlign: 'center', margin: '12px 0', width: '100%' }}>
        <span
          style={{
            backgroundColor: 'rgba(32, 44, 51, 0.85)',
            color: 'var(--text-secondary)',
            fontSize: '0.74rem',
            padding: '4px 12px',
            borderRadius: '6px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`message-row ${isOutgoing ? 'outgoing' : 'incoming'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
      }}
      style={{ position: 'relative' }}
    >
      <div className="message-bubble">
        {/* Group Sender Name */}
        {isGroup && !isOutgoing && (
          <div className="message-sender-name">{message.senderName || 'Member'}</div>
        )}

        {/* Quoted Reply Preview */}
        {message.reply_preview && (
          <div className="reply-preview-box">
            <div className="reply-author">{message.reply_preview.senderName}</div>
            <div className="reply-snippet">{message.reply_preview.content || `[${message.reply_preview.type}]`}</div>
          </div>
        )}

        {/* Forwarded Tag */}
        {message.forwarded && (
          <div style={{ fontSize: '0.7rem', fontStyle: 'italic', color: 'rgba(233,237,239,0.6)', marginBottom: '3px' }}>
            Forwarded
          </div>
        )}

        {/* Content Type: Image */}
        {message.type === 'image' && message.mediaUrl && (
          <div style={{ marginBottom: '6px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => onImageClick?.(message.mediaUrl!)}>
            <img src={message.mediaUrl} alt="Photo" style={{ maxWidth: '100%', maxHeight: '300px', display: 'block', borderRadius: '6px' }} />
          </div>
        )}

        {/* Content Type: Video */}
        {message.type === 'video' && message.mediaUrl && (
          <div style={{ marginBottom: '6px', borderRadius: '8px', overflow: 'hidden' }}>
            <video src={message.mediaUrl} controls style={{ maxWidth: '100%', maxHeight: '280px', borderRadius: '6px' }} />
          </div>
        )}

        {/* Content Type: Audio / Voice Note */}
        {message.type === 'audio' && message.mediaUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', minWidth: '180px' }}>
            <button
              onClick={() => toggleAudio(message.mediaUrl!)}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-emerald)',
                border: 'none',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {isPlayingAudio ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '2px', position: 'relative' }}>
                <div style={{ height: '100%', width: isPlayingAudio ? '65%' : '0%', backgroundColor: 'var(--primary-emerald)', borderRadius: '2px' }} />
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                Voice Message
              </span>
            </div>
          </div>
        )}

        {/* Content Type: Document */}
        {message.type === 'document' && message.mediaUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.15)', padding: '8px 12px', borderRadius: '8px', marginBottom: '6px' }}>
            <FileText size={24} color="var(--primary-emerald)" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {message.mediaMeta?.originalName || 'Document file'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {message.mediaMeta?.size ? `${Math.round(message.mediaMeta.size / 1024)} KB` : 'Attachment'}
              </div>
            </div>
            <a href={message.mediaUrl} download target="_blank" rel="noreferrer" style={{ color: 'var(--text-primary)' }}>
              <Download size={18} />
            </a>
          </div>
        )}

        {/* Text Message Content */}
        {message.content && (
          <div className="message-text" style={{ fontStyle: message.deletedForEveryone ? 'italic' : 'normal', opacity: message.deletedForEveryone ? 0.7 : 1 }}>
            {message.content}
          </div>
        )}

        {/* Timestamp & Delivery status */}
        <div className="message-meta">
          {message.isEdited && !message.deletedForEveryone && (
            <span style={{ fontSize: '0.65rem', fontStyle: 'italic', opacity: 0.7 }}>edited</span>
          )}
          <span className="message-time">{formatTime(message.createdAt)}</span>
          {isOutgoing && !message.deletedForEveryone && (
            <span className={`message-ticks ${message.delivery_status || 'sent'}`}>
              {message.delivery_status === 'read' ? (
                <CheckCheck size={14} color="var(--tick-read)" />
              ) : message.delivery_status === 'delivered' ? (
                <CheckCheck size={14} color="var(--tick-delivered)" />
              ) : (
                <Check size={14} color="var(--tick-delivered)" />
              )}
            </span>
          )}
        </div>

        {/* Reactions Pill Display */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="reactions-wrapper">
            {Object.entries(
              message.reactions.reduce((acc: { [emoji: string]: number }, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {})
            ).map(([emoji, count]) => (
              <span
                key={emoji}
                className="reaction-pill"
                onClick={() => onReact(message.id, emoji)}
              >
                <span>{emoji}</span>
                {count > 1 && <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{count}</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Menu (Reply, React, Edit, Delete) */}
      {showActions && !message.deletedForEveryone && (
        <div
          style={{
            position: 'absolute',
            top: '-14px',
            [isOutgoing ? 'right' : 'left']: '12px',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-full)',
            padding: '2px 6px',
            gap: '4px',
            boxShadow: 'var(--shadow-md)',
            zIndex: 15,
          }}
        >
          {/* Reaction Picker Button */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn-icon"
              style={{ padding: '4px' }}
              title="React"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile size={16} />
            </button>

            {showEmojiPicker && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  backgroundColor: 'var(--bg-panel)',
                  borderRadius: '20px',
                  padding: '4px 8px',
                  display: 'flex',
                  gap: '6px',
                  boxShadow: 'var(--shadow-lg)',
                  border: '1px solid var(--border-light)',
                  zIndex: 25,
                }}
              >
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '2px' }}
                    onClick={() => {
                      onReact(message.id, emoji);
                      setShowEmojiPicker(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reply Button */}
          <button
            className="btn-icon"
            style={{ padding: '4px' }}
            title="Reply"
            onClick={() => onReply(message)}
          >
            <Reply size={16} />
          </button>

          {/* Edit Button (Own messages only) */}
          {isOutgoing && message.type === 'text' && (
            <button
              className="btn-icon"
              style={{ padding: '4px' }}
              title="Edit"
              onClick={() => onEdit(message)}
            >
              <Edit2 size={15} />
            </button>
          )}

          {/* Delete Button */}
          <button
            className="btn-icon"
            style={{ padding: '4px', color: 'var(--danger)' }}
            title="Delete"
            onClick={() => onDelete(message.id, isOutgoing)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </div>
  );
};
