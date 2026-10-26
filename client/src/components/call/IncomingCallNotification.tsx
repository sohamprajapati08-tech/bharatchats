import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { IncomingCallEvent } from '../../types/index.js';

interface IncomingCallNotificationProps {
  incomingCall: IncomingCallEvent;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallNotification: React.FC<IncomingCallNotificationProps> = ({
  incomingCall,
  onAccept,
  onReject,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'var(--bg-panel)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
        border: '2px solid var(--primary-emerald)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        zIndex: 500,
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        minWidth: '320px',
      }}
    >
      <div className="avatar-placeholder" style={{ width: '48px', height: '48px', fontSize: '1.2rem' }}>
        {incomingCall.callerName.charAt(0)}
      </div>

      <div style={{ flex: 1 }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{incomingCall.callerName}</h4>
        <p style={{ fontSize: '0.8rem', color: 'var(--primary-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {incomingCall.type === 'video' ? <Video size={14} /> : <Phone size={14} />}
          <span>Incoming {incomingCall.type} call...</span>
        </p>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={onReject}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'var(--danger)',
            border: 'none',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Decline"
        >
          <PhoneOff size={20} />
        </button>

        <button
          onClick={onAccept}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-emerald)',
            border: 'none',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Accept"
        >
          <Phone size={20} />
        </button>
      </div>
    </div>
  );
};
