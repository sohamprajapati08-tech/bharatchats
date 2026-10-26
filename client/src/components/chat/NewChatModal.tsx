import React, { useState } from 'react';
import { User } from '../../types/index.js';
import { api } from '../../services/api.js';
import { Search, X } from 'lucide-react';

interface NewChatModalProps {
  onClose: () => void;
  onSelectUser: (userId: string) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ onClose, onSelectUser }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const users = await api.searchUsers(val);
      setResults(users);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h3>New Chat / નવી વાતચીત</h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
          <div className="search-box">
            <Search size={18} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Search by name or mobile number..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="modal-body" style={{ minHeight: '200px', maxHeight: '350px', padding: '0' }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Searching / શોધી રહ્યા છીએ...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              {query ? 'No registered users found.' : 'Type a name or phone number to find friends.'}
            </div>
          ) : (
            results.map((u) => (
              <div
                key={u.id}
                onClick={() => onSelectUser(u.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(134,150,160,0.08)',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div className="avatar-wrapper" style={{ width: '42px', height: '42px', minWidth: '42px' }}>
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt={u.fullName} />
                  ) : (
                    <div className="avatar-placeholder">{u.fullName.charAt(0)}</div>
                  )}
                  {u.isOnline && <span className="online-indicator" />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {u.fullName}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {u.phone}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
