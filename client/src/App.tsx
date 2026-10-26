import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext.js';
import { Conversation, Message, IncomingCallEvent } from './types/index.js';
import { api } from './services/api.js';
import { getSocket } from './services/socket.js';

// Components
import { AuthModal } from './components/auth/AuthModal.js';
import { Sidebar } from './components/chat/Sidebar.js';
import { ChatHeader } from './components/chat/ChatHeader.js';
import { MessageList } from './components/chat/MessageList.js';
import { MessageInput } from './components/chat/MessageInput.js';
import { NewChatModal } from './components/chat/NewChatModal.js';
import { GroupCreateModal } from './components/chat/GroupCreateModal.js';
import { MessageSearchModal } from './components/chat/MessageSearchModal.js';
import { CallModal } from './components/call/CallModal.js';
import { IncomingCallNotification } from './components/call/IncomingCallNotification.js';
import { StatusFeedModal } from './components/status/StatusFeedModal.js';
import { CreateStatusModal } from './components/status/CreateStatusModal.js';
import { SettingsModal } from './components/settings/SettingsModal.js';
import { BharatLogo } from './components/common/BharatLogo.js';
import { ShieldCheck } from 'lucide-react';

export const App: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // Typing state for active chat
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState('');

  // Replying & Editing
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  // Modals state
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showStatusFeed, setShowStatusFeed] = useState(false);
  const [showCreateStatus, setShowCreateStatus] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // WebRTC Call state
  const [activeCall, setActiveCall] = useState<{
    callType: 'voice' | 'video';
    partnerId: string;
    partnerName: string;
    partnerAvatar?: string | null;
    isInitiator: boolean;
    offer?: any;
  } | null>(null);

  const [incomingCall, setIncomingCall] = useState<IncomingCallEvent | null>(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (e) {
      console.error('Error fetching conversations:', e);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadConversations();
    }
  }, [isAuthenticated, loadConversations]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    const fetchMsgs = async () => {
      try {
        const msgs = await api.getMessages(activeConversationId);
        setMessages(msgs);
        // Mark conversation as read
        await api.markAsRead(activeConversationId);
        loadConversations();
      } catch (e) {
        console.error('Error loading messages:', e);
      }
    };

    fetchMsgs();

    // Tell socket room
    getSocket()?.emit('join_conversation', activeConversationId);

    return () => {
      getSocket()?.emit('leave_conversation', activeConversationId);
    };
  }, [activeConversationId, loadConversations]);

  // Socket.IO event listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // New Message Received
    socket.on('new_message', (msg: Message) => {
      if (msg.conversationId === activeConversationId) {
        setMessages((prev) => [...prev, msg]);
        api.markAsRead(activeConversationId).catch(() => {});
      }
      loadConversations();
    });

    // Typing status
    socket.on('user_typing', (data: { conversationId: string; userName: string; isTyping: boolean }) => {
      if (data.conversationId === activeConversationId) {
        setIsTyping(data.isTyping);
        setTypingUser(data.userName);
      }
    });

    // Read receipts
    socket.on('messages_read_receipt', (data: { conversationId: string }) => {
      if (data.conversationId === activeConversationId) {
        setMessages((prev) =>
          prev.map((m) => (m.senderId === user?.id ? { ...m, delivery_status: 'read' } : m))
        );
      }
      loadConversations();
    });

    // Reaction update
    socket.on('reaction_updated', (data: { messageId: string; emoji: string; action: string; userId: string }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== data.messageId) return m;
          const currentReactions = m.reactions || [];
          if (data.action === 'added') {
            return {
              ...m,
              reactions: [...currentReactions, { emoji: data.emoji, userId: data.userId }],
            };
          } else {
            return {
              ...m,
              reactions: currentReactions.filter(
                (r) => !(r.emoji === data.emoji && r.userId === data.userId)
              ),
            };
          }
        })
      );
    });

    // WebRTC Incoming Call
    socket.on('incoming_call', (data: IncomingCallEvent) => {
      setIncomingCall(data);
    });

    return () => {
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('messages_read_receipt');
      socket.off('reaction_updated');
      socket.off('incoming_call');
    };
  }, [activeConversationId, user?.id, loadConversations]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  // Send Message handler
  const handleSendMessage = async (content: string, type = 'text', mediaUrl?: string, mediaMeta?: any) => {
    if (!activeConversationId) return;

    try {
      const clientMsgId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newMsg = await api.sendMessage(activeConversationId, {
        content,
        type,
        mediaUrl,
        mediaMeta,
        replyToId: replyingTo?.id,
        clientMsgId,
      });

      setMessages((prev) => [...prev, newMsg]);
      setReplyingTo(null);

      // Broadcast via socket
      getSocket()?.emit('send_message', newMsg);
      loadConversations();
    } catch (err: any) {
      alert(`Failed to send message: ${err.message}`);
    }
  };

  // Reactions
  const handleReact = async (messageId: string, emoji: string) => {
    try {
      const res = await api.reactToMessage(messageId, emoji);
      getSocket()?.emit('reaction_update', {
        conversationId: activeConversationId,
        messageId,
        emoji,
        action: res.action,
      });

      // Optimistic update
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const current = m.reactions || [];
          if (res.action === 'added') {
            return { ...m, reactions: [...current, { emoji, userId: user?.id! }] };
          } else {
            return {
              ...m,
              reactions: current.filter((r) => !(r.emoji === emoji && r.userId === user?.id)),
            };
          }
        })
      );
    } catch (e) {
      console.error(e);
    }
  };

  // Edit Message
  const handleSaveEdit = async (messageId: string, newContent: string) => {
    try {
      await api.editMessage(messageId, newContent);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content: newContent, isEdited: true } : m))
      );
    } catch (err: any) {
      alert(`Edit failed: ${err.message}`);
    }
  };

  // Delete Message
  const handleDeleteMessage = async (messageId: string, forEveryone: boolean) => {
    try {
      await api.deleteMessage(messageId, forEveryone);
      if (forEveryone) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, deletedForEveryone: true, content: 'This message was deleted' }
              : m
          )
        );
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
      loadConversations();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // WebRTC Start Call
  const handleStartCall = (callType: 'voice' | 'video') => {
    if (!activeConversation || activeConversation.type !== 'direct' || !activeConversation.other_user) {
      return;
    }

    const partner = activeConversation.other_user;
    setActiveCall({
      callType,
      partnerId: partner.id,
      partnerName: partner.fullName,
      partnerAvatar: partner.avatarUrl,
      isInitiator: true,
    });
  };

  // WebRTC Accept Incoming Call
  const handleAcceptIncomingCall = () => {
    if (!incomingCall) return;

    setActiveCall({
      callType: incomingCall.type,
      partnerId: incomingCall.callerId,
      partnerName: incomingCall.callerName,
      partnerAvatar: incomingCall.callerAvatar,
      isInitiator: false,
      offer: incomingCall.offer,
    });

    setIncomingCall(null);
  };

  // WebRTC Reject Incoming Call
  const handleRejectIncomingCall = () => {
    if (!incomingCall) return;
    getSocket()?.emit('call_reject', { toUserId: incomingCall.callerId });
    setIncomingCall(null);
  };

  // Mute / Archive
  const handleToggleMute = async () => {
    if (!activeConversationId) return;
    await api.toggleMute(activeConversationId);
    loadConversations();
  };

  const handleToggleArchive = async () => {
    if (!activeConversationId) return;
    await api.toggleArchive(activeConversationId);
    loadConversations();
  };

  // Block / Report
  const handleBlockUser = async () => {
    if (!activeConversation?.other_user) return;
    if (confirm(`Are you sure you want to block ${activeConversation.other_user.fullName}?`)) {
      await api.blockUser(activeConversation.other_user.id);
      setActiveConversationId(null);
      loadConversations();
    }
  };

  const handleReportUser = async () => {
    if (!activeConversation?.other_user) return;
    const reason = prompt('Please enter the reason for reporting this account:');
    if (reason && reason.trim()) {
      await api.reportUser({ targetUserId: activeConversation.other_user.id, reason: reason.trim() });
      alert('Report submitted. Thank you for helping keep Bharat Chat safe.');
    }
  };

  if (isLoading) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0b141a',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle tricolor background glow */}
        <div style={{
          position: 'absolute',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 168, 132, 0.18) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <BharatLogo size={96} showText={true} />

          {/* Loading progress bar */}
          <div style={{
            width: '180px',
            height: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '4px',
            overflow: 'hidden',
            marginTop: '28px',
            position: 'relative'
          }}>
            <div style={{
              height: '100%',
              width: '60%',
              background: 'linear-gradient(90deg, #ff671f, #00a884)',
              borderRadius: '4px',
              animation: 'slideUp 1.2s infinite ease-in-out'
            }} />
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '12px', letterSpacing: '0.5px' }}>
            પ્રારંભ થઈ રહ્યું છે... (Initializing securely)
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthModal />;
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={(id) => setActiveConversationId(id)}
        onOpenNewChat={() => setShowNewChat(true)}
        onOpenNewGroup={() => setShowNewGroup(true)}
        onOpenStatusFeed={() => setShowStatusFeed(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Main Chat Area */}
      <main className={`chat-window ${activeConversationId ? 'open' : ''}`}>
        {activeConversation ? (
          <>
            <ChatHeader
              conversation={activeConversation}
              isTyping={isTyping}
              typingUser={typingUser}
              onBack={() => setActiveConversationId(null)}
              onStartCall={handleStartCall}
              onOpenSearch={() => setShowSearchModal(true)}
              onToggleMute={handleToggleMute}
              onToggleArchive={handleToggleArchive}
              onBlockUser={activeConversation.type === 'direct' ? handleBlockUser : undefined}
              onReportUser={activeConversation.type === 'direct' ? handleReportUser : undefined}
            />

            <MessageList
              messages={messages}
              isGroup={activeConversation.type === 'group'}
              isTyping={isTyping}
              typingUser={typingUser}
              onReply={(m) => setReplyingTo(m)}
              onReact={handleReact}
              onEdit={(m) => setEditingMessage(m)}
              onDelete={handleDeleteMessage}
              onImageClick={(url) => setLightboxImage(url)}
            />

            <MessageInput
              onSendMessage={handleSendMessage}
              onFileUpload={api.uploadMedia}
              onTypingStart={() => {
                getSocket()?.emit('typing_start', {
                  conversationId: activeConversationId,
                  userName: user?.fullName || 'User',
                });
              }}
              onTypingStop={() => {
                getSocket()?.emit('typing_stop', { conversationId: activeConversationId });
              }}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              editingMessage={editingMessage}
              onCancelEdit={() => setEditingMessage(null)}
              onSaveEdit={handleSaveEdit}
            />
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(255,103,31,0.1) 0%, rgba(0,168,132,0.1) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <img src="/logo.svg" alt="Bharat Chat" style={{ width: '84px', height: '84px' }} />
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Bharat Chat for Web & Mobile
            </h2>
            <p style={{ maxWidth: '420px', color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '24px' }}>
              Send and receive messages without keeping your phone online. Experience sovereign, private real-time messaging, WebRTC calling, and 24-hour stories.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem', background: 'rgba(255,255,255,0.04)', padding: '6px 14px', borderRadius: '20px' }}>
              <ShieldCheck size={16} color="var(--primary-emerald)" />
              <span>TLS Secured • P2P WebRTC Encryption</span>
            </div>
          </div>
        )}
      </main>

      {/* --- Modals & Overlays --- */}

      {/* New Direct Chat Modal */}
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onSelectUser={async (targetUserId) => {
            setShowNewChat(false);
            const res = await api.getOrCreateDirectChat(targetUserId);
            await loadConversations();
            setActiveConversationId(res.conversationId);
          }}
        />
      )}

      {/* New Group Modal */}
      {showNewGroup && (
        <GroupCreateModal
          onClose={() => setShowNewGroup(false)}
          onGroupCreated={async (conversationId) => {
            setShowNewGroup(false);
            await loadConversations();
            setActiveConversationId(conversationId);
          }}
        />
      )}

      {/* Message Search Modal */}
      {showSearchModal && (
        <MessageSearchModal
          conversationId={activeConversationId || undefined}
          onClose={() => setShowSearchModal(false)}
        />
      )}

      {/* Status Feed Modal */}
      {showStatusFeed && (
        <StatusFeedModal
          onClose={() => setShowStatusFeed(false)}
          onOpenCreateStatus={() => {
            setShowStatusFeed(false);
            setShowCreateStatus(true);
          }}
        />
      )}

      {/* Create Status Modal */}
      {showCreateStatus && (
        <CreateStatusModal
          onClose={() => setShowCreateStatus(false)}
          onStatusCreated={() => setShowStatusFeed(true)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Image Lightbox */}
      {lightboxImage && (
        <div className="modal-overlay" onClick={() => setLightboxImage(null)}>
          <img src={lightboxImage} alt="Fullscreen View" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} />
        </div>
      )}

      {/* Incoming Call Ringing Banner */}
      {incomingCall && (
        <IncomingCallNotification
          incomingCall={incomingCall}
          onAccept={handleAcceptIncomingCall}
          onReject={handleRejectIncomingCall}
        />
      )}

      {/* Active WebRTC Call Screen */}
      {activeCall && (
        <CallModal
          callType={activeCall.callType}
          partnerId={activeCall.partnerId}
          partnerName={activeCall.partnerName}
          partnerAvatar={activeCall.partnerAvatar}
          isInitiator={activeCall.isInitiator}
          incomingOffer={activeCall.offer}
          onEndCall={() => setActiveCall(null)}
        />
      )}
    </div>
  );
};
export default App;
