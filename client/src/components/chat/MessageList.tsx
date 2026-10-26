import React, { useEffect, useRef } from 'react';
import { Message } from '../../types/index.js';
import { MessageItem } from './MessageItem.js';

interface MessageListProps {
  messages: Message[];
  isGroup: boolean;
  isTyping: boolean;
  typingUser: string;
  onReply: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string, forEveryone: boolean) => void;
  onImageClick?: (url: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isGroup,
  isTyping,
  typingUser,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onImageClick,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today / આજે';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday / ગઈકાલે';
    }
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="messages-container">
      {messages.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🇮🇳</div>
          <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>Start a secure conversation</p>
          <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Messages and calls are processed securely on Bharat Chat.</p>
        </div>
      ) : (
        messages.map((msg, index) => {
          const prevMsg = messages[index - 1];
          const showDateSeparator = !prevMsg || new Date(prevMsg.createdAt).toDateString() !== new Date(msg.createdAt).toDateString();

          return (
            <React.Fragment key={msg.id || index}>
              {showDateSeparator && (
                <div style={{ textAlign: 'center', margin: '14px 0' }}>
                  <span
                    style={{
                      backgroundColor: 'rgba(32, 44, 51, 0.9)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '4px 12px',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    {getDateLabel(msg.createdAt)}
                  </span>
                </div>
              )}
              <MessageItem
                message={msg}
                isGroup={isGroup}
                onReply={onReply}
                onReact={onReact}
                onEdit={onEdit}
                onDelete={onDelete}
                onImageClick={onImageClick}
              />
            </React.Fragment>
          );
        })
      )}

      {/* Typing Indicator */}
      {isTyping && (
        <div className="message-row incoming">
          <div
            className="message-bubble"
            style={{
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-bubble-incoming)',
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {typingUser || 'Someone'} is typing
            </span>
            <span style={{ display: 'inline-flex', gap: '3px' }}>
              <span className="typing-dot" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary-emerald)' }} />
              <span className="typing-dot" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary-emerald)' }} />
              <span className="typing-dot" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary-emerald)' }} />
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
