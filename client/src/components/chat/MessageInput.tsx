import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../../types/index.js';
import {
  Send,
  Paperclip,
  Mic,
  Trash2,
  X,
  Image as ImageIcon,
  FileText
} from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (content: string, type?: string, mediaUrl?: string, mediaMeta?: any) => Promise<void>;
  onFileUpload: (file: File) => Promise<{ url: string; originalName: string; size: number; mimetype: string }>;
  onTypingStart: () => void;
  onTypingStop: () => void;
  replyingTo: Message | null;
  onCancelReply: () => void;
  editingMessage: Message | null;
  onCancelEdit: () => void;
  onSaveEdit: (messageId: string, newContent: string) => Promise<void>;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onFileUpload,
  onTypingStart,
  onTypingStop,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  onSaveEdit,
}) => {
  const [text, setText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content || '');
    }
  }, [editingMessage]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    // Typing status throttled
    onTypingStart();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onTypingStop();
    }, 2000);
  };

  const handleSend = async () => {
    if (!text.trim() && !editingMessage) return;

    if (editingMessage) {
      await onSaveEdit(editingMessage.id, text.trim());
      onCancelEdit();
      setText('');
      return;
    }

    const content = text.trim();
    setText('');
    onTypingStop();
    await onSendMessage(content, 'text');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowAttachMenu(false);
    try {
      const uploadRes = await onFileUpload(file);
      let type: 'image' | 'video' | 'document' = 'document';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';

      await onSendMessage('', type, uploadRes.url, {
        originalName: uploadRes.originalName,
        size: uploadRes.size,
        mimetype: uploadRes.mimetype,
      });
    } catch (err: any) {
      alert(`File upload failed: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- Voice Note Recording ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
          try {
            const uploadRes = await onFileUpload(audioFile);
            await onSendMessage('', 'audio', uploadRes.url, {
              originalName: 'Voice Message',
              size: audioBlob.size,
              mimetype: 'audio/webm',
            });
          } catch (e: any) {
            console.error('Failed to upload voice note:', e);
          }
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert('Microphone permission required for voice notes.');
    }
  };

  const stopAndSendRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const formatRecTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Replying-to Preview Bar */}
      {replyingTo && (
        <div
          style={{
            backgroundColor: 'rgba(32, 44, 51, 0.95)',
            borderLeft: '4px solid var(--primary-emerald)',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--border-light)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary-emerald)' }}>
              Replying to {replyingTo.senderName || 'User'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '400px' }}>
              {replyingTo.content || `[${replyingTo.type}]`}
            </div>
          </div>
          <button className="btn-icon" onClick={onCancelReply}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Editing-message Preview Bar */}
      {editingMessage && (
        <div
          style={{
            backgroundColor: 'rgba(32, 44, 51, 0.95)',
            borderLeft: '4px solid var(--primary-saffron)',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--border-light)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary-saffron)' }}>
              Editing Message
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Make your edits below and press send
            </div>
          </div>
          <button className="btn-icon" onClick={onCancelEdit}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className="chat-input-bar">
        {isRecording ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--danger)', animation: 'pulse 1s infinite' }} />
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatRecTime(recordingSeconds)}</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Recording audio...</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={cancelRecording} title="Cancel">
                <Trash2 size={20} />
              </button>
              <button className="btn-icon" style={{ color: 'var(--primary-emerald)' }} onClick={stopAndSendRecording} title="Send voice note">
                <Send size={20} />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Attachment Button & Popup */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn-icon"
                title="Attach"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
              >
                <Paperclip size={20} />
              </button>

              {showAttachMenu && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '120%',
                    left: 0,
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '8px',
                    gap: '6px',
                    width: '180px',
                    zIndex: 40,
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <ImageIcon size={18} color="#2563eb" />
                    <span>Photos & Videos</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={handleFileSelected}
                    />
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <FileText size={18} color="#00a884" />
                    <span>Document / File</span>
                    <input
                      type="file"
                      style={{ display: 'none' }}
                      onChange={handleFileSelected}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Input field */}
            <textarea
              className="chat-input-field"
              rows={1}
              placeholder="Type a message / સંદેશો લખો..."
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
            />

            {/* Mic / Send toggle */}
            {text.trim() || editingMessage ? (
              <button className="btn-icon" title="Send" onClick={handleSend} style={{ color: 'var(--primary-emerald)' }}>
                <Send size={20} />
              </button>
            ) : (
              <button className="btn-icon" title="Record Voice Note / વોઇસ નોટ" onClick={startRecording}>
                <Mic size={20} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
