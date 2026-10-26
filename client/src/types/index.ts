export interface User {
  id: string;
  phone: string;
  fullName: string;
  avatarUrl?: string | null;
  about?: string;
  isOnline?: boolean;
  lastSeenAt?: string | null;
  privacyLastSeen?: string;
  privacyProfilePhoto?: string;
  privacyReadReceipts?: boolean;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  title?: string | null;
  description?: string | null;
  group_avatar?: string | null;
  is_muted?: boolean;
  is_archived?: boolean;
  my_role?: 'admin' | 'member';
  unread_count?: number;
  last_message?: {
    id: string;
    content: string;
    type: string;
    senderId: string;
    createdAt: string;
  } | null;
  other_user?: User | null;
}

export interface MessageReaction {
  emoji: string;
  userId: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  clientMsgId?: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'system';
  content?: string | null;
  mediaUrl?: string | null;
  mediaMeta?: any;
  replyToId?: string | null;
  reply_preview?: {
    id: string;
    content: string;
    senderName: string;
    type: string;
  } | null;
  forwarded?: boolean;
  isEdited?: boolean;
  deletedForEveryone?: boolean;
  createdAt: string;
  reactions?: MessageReaction[];
  delivery_status?: 'sent' | 'delivered' | 'read';
}

export interface StatusItem {
  id: string;
  userId: string;
  type: 'text' | 'image' | 'video';
  content?: string | null;
  mediaUrl?: string | null;
  backgroundColor?: string;
  fontFamily?: string;
  createdAt: string;
  expiresAt: string;
  viewsCount?: number;
  viewedByMe?: boolean;
}

export interface StatusFeedUser {
  userId: string;
  userName: string;
  userPhone: string;
  userAvatar?: string | null;
  isMe: boolean;
  statuses: StatusItem[];
}

export interface CallRecord {
  id: string;
  callerId: string;
  receiverId: string;
  type: 'voice' | 'video';
  status: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  direction: 'incoming' | 'outgoing';
  otherUserName: string;
  otherUserAvatar?: string | null;
}

export interface IncomingCallEvent {
  callerId: string;
  callerName: string;
  callerAvatar?: string | null;
  type: 'voice' | 'video';
  offer: any;
}
