import React, { useState } from 'react';
import { User } from '../../types/index.js';
import { api } from '../../services/api.js';
import { X, Search, Check, Users } from 'lucide-react';

interface GroupCreateModalProps {
  onClose: () => void;
  onGroupCreated: (conversationId: string) => void;
}

export const GroupCreateModal: React.FC<GroupCreateModalProps> = ({ onClose, onGroupCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const users = await api.searchUsers(val);
      setSearchResults(users);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSelectUser = (u: User) => {
    if (selectedUsers.some((item) => item.id === u.id)) {
      setSelectedUsers(selectedUsers.filter((item) => item.id !== u.id));
    } else {
      setSelectedUsers([...selectedUsers, u]);
    }
  };

  const handleCreateGroup = async () => {
    if (!title.trim()) {
      setError('Group name is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.createGroup({
        title: title.trim(),
        description: description.trim(),
        memberIds: selectedUsers.map((u) => u.id),
      });
      onGroupCreated(res.conversationId);
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '460px' }}>
        <div className="modal-header">
          <h3>New Group / નવું ગ્રુપ</h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '12px' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label>Group Subject / ગ્રુપનું નામ</label>
            <input
              type="text"
              placeholder="e.g. Family Circle, Project Team"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Description / વર્ણન (ઓપ્શનલ)</label>
            <input
              type="text"
              placeholder="Group description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Selected participants tags */}
          {selectedUsers.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {selectedUsers.map((u) => (
                <span
                  key={u.id}
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderRadius: 'var(--radius-full)',
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{u.fullName}</span>
                  <X size={14} style={{ cursor: 'pointer' }} onClick={() => toggleSelectUser(u)} />
                </span>
              ))}
            </div>
          )}

          <div className="form-group">
            <label>Add Members / સભ્યો ઉમેરો</label>
            <div className="search-box">
              <Search size={18} color="var(--text-secondary)" />
              <input
                type="text"
                placeholder="Search users by name or phone..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>

          <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
            {searchResults.map((u) => {
              const isSelected = selectedUsers.some((item) => item.id === u.id);
              return (
                <div
                  key={u.id}
                  onClick={() => toggleSelectUser(u)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    backgroundColor: isSelected ? 'var(--bg-card)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="avatar-placeholder" style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>
                      {u.fullName.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{u.fullName}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{u.phone}</div>
                    </div>
                  </div>
                  {isSelected && <Check size={18} color="var(--primary-emerald)" />}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%', marginTop: '16px' }}
            onClick={handleCreateGroup}
            disabled={loading}
          >
            <Users size={18} />
            <span>Create Group / ગ્રુપ બનાવો</span>
          </button>
        </div>
      </div>
    </div>
  );
};
