import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { X, Search } from 'lucide-react';

interface MessageSearchModalProps {
  conversationId?: string;
  onClose: () => void;
  onSelectMessage?: (messageId: string) => void;
}

export const MessageSearchModal: React.FC<MessageSearchModalProps> = ({
  conversationId,
  onClose,
  onSelectMessage,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await api.searchMessages(val, conversationId);
      setResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '460px' }}>
        <div className="modal-header">
          <h3>Search Messages / મેસેજ શોધો</h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
          <div className="search-box">
            <Search size={18} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Search chat history..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="modal-body" style={{ maxHeight: '350px', overflowY: 'auto', padding: '0' }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Searching...</div>
          ) : results.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              {query ? 'No messages matched your query.' : 'Type words to find past messages.'}
            </div>
          ) : (
            results.map((msg) => (
              <div
                key={msg.id}
                onClick={() => {
                  onSelectMessage?.(msg.id);
                  onClose();
                }}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(134,150,160,0.08)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary-emerald)' }}>
                    {msg.senderName}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {new Date(msg.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{msg.content}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
