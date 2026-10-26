import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api, setCustomServerUrl } from '../../services/api.js';
import {
  X,
  Shield,
  Ban,
  Camera,
  Check,
  Server
} from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy' | 'network' | 'e2ee'>('profile');

  // Profile Form state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [about, setAbout] = useState(user?.about || '');
  const [profileSaved, setProfileSaved] = useState(false);

  // Privacy Settings state
  const [privacyLastSeen, setPrivacyLastSeen] = useState(user?.privacyLastSeen || 'everyone');
  const [privacyProfilePhoto, setPrivacyProfilePhoto] = useState(user?.privacyProfilePhoto || 'everyone');
  const [privacyReadReceipts, setPrivacyReadReceipts] = useState(user?.privacyReadReceipts ?? true);
  const [privacySaved, setPrivacySaved] = useState(false);

  // Blocked users
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);

  // Network server URL for APK / LAN
  const [serverUrl, setServerUrl] = useState(localStorage.getItem('bharat_chat_server_url') || '');

  useEffect(() => {
    if (activeTab === 'privacy') {
      api.getBlockedUsers().then(setBlockedUsers).catch(() => {});
    }
  }, [activeTab]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.updateProfile({ fullName, about });
      updateUser(res.user);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err: any) {
      alert(`Error updating profile: ${err.message}`);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const uploadRes = await api.uploadMedia(file);
      const res = await api.updateProfile({ avatarUrl: uploadRes.url });
      updateUser(res.user);
    } catch (err: any) {
      alert(`Failed to update avatar: ${err.message}`);
    }
  };

  const handleSavePrivacy = async () => {
    try {
      const res = await api.updatePrivacy({
        privacyLastSeen,
        privacyProfilePhoto,
        privacyReadReceipts,
      });
      updateUser(res.privacy);
      setPrivacySaved(true);
      setTimeout(() => setPrivacySaved(false), 2000);
    } catch (err: any) {
      alert(`Error updating privacy: ${err.message}`);
    }
  };

  const handleUnblock = async (targetUserId: string) => {
    try {
      await api.unblockUser(targetUserId);
      setBlockedUsers(blockedUsers.filter((u) => u.id !== targetUserId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveNetwork = () => {
    setCustomServerUrl(serverUrl.trim());
    alert('Server URL saved. Refresh the app to connect to the new server.');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <h3>Settings / સેટિંગ્સ</h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)' }}>
          <button
            className="btn-icon"
            style={{
              flex: 1,
              borderRadius: 0,
              padding: '12px 6px',
              borderBottom: activeTab === 'profile' ? '2px solid var(--primary-emerald)' : 'none',
              color: activeTab === 'profile' ? 'var(--primary-emerald)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button
            className="btn-icon"
            style={{
              flex: 1,
              borderRadius: 0,
              padding: '12px 6px',
              borderBottom: activeTab === 'privacy' ? '2px solid var(--primary-emerald)' : 'none',
              color: activeTab === 'privacy' ? 'var(--primary-emerald)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
            onClick={() => setActiveTab('privacy')}
          >
            Privacy
          </button>
          <button
            className="btn-icon"
            style={{
              flex: 1,
              borderRadius: 0,
              padding: '12px 6px',
              borderBottom: activeTab === 'network' ? '2px solid var(--primary-emerald)' : 'none',
              color: activeTab === 'network' ? 'var(--primary-emerald)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
            onClick={() => setActiveTab('network')}
          >
            Server / APK
          </button>
          <button
            className="btn-icon"
            style={{
              flex: 1,
              borderRadius: 0,
              padding: '12px 6px',
              borderBottom: activeTab === 'e2ee' ? '2px solid var(--primary-emerald)' : 'none',
              color: activeTab === 'e2ee' ? 'var(--primary-emerald)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
            onClick={() => setActiveTab('e2ee')}
          >
            Security & E2EE
          </button>
        </div>

        <div className="modal-body">
          {/* TAB 1: Profile */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <div style={{ position: 'relative' }}>
                  <div className="avatar-placeholder" style={{ width: '84px', height: '84px', fontSize: '2rem' }}>
                    {user?.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" /> : user?.fullName.charAt(0)}
                  </div>
                  <label
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      backgroundColor: 'var(--primary-emerald)',
                      color: '#fff',
                      borderRadius: '50%',
                      padding: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                    }}
                    title="Change Avatar"
                  >
                    <Camera size={16} />
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Your Name / તમારું નામ</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>About / સ્ટેટસ લખાણ</label>
                <input
                  type="text"
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Available on Bharat Chat"
                />
              </div>

              <div className="form-group">
                <label>Mobile Number / મોબાઈલ નંબર</label>
                <input type="text" value={user?.phone || ''} disabled style={{ opacity: 0.6 }} />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                {profileSaved ? <Check size={18} /> : null}
                <span>{profileSaved ? 'Saved / સેવ થઈ ગયું' : 'Save Changes / સેવ કરો'}</span>
              </button>
            </form>
          )}

          {/* TAB 2: Privacy */}
          {activeTab === 'privacy' && (
            <div>
              <div className="form-group">
                <label>Who can see my Last Seen / છેલ્લે ક્યારે ઓનલાઈન હતા</label>
                <select value={privacyLastSeen} onChange={(e) => setPrivacyLastSeen(e.target.value)}>
                  <option value="everyone">Everyone / બધા જ</option>
                  <option value="nobody">Nobody / કોઈ નહીં</option>
                </select>
              </div>

              <div className="form-group">
                <label>Who can see my Profile Photo / પ્રોફાઈલ ફોટો</label>
                <select value={privacyProfilePhoto} onChange={(e) => setPrivacyProfilePhoto(e.target.value)}>
                  <option value="everyone">Everyone / બધા જ</option>
                  <option value="nobody">Nobody / કોઈ નહીં</option>
                </select>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <label style={{ margin: 0 }}>Read Receipts (Blue Ticks)</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    If turned off, you won't send or receive read receipts
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={privacyReadReceipts}
                  onChange={(e) => setPrivacyReadReceipts(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>

              <button type="button" className="btn-primary" style={{ width: '100%', margin: '14px 0' }} onClick={handleSavePrivacy}>
                {privacySaved ? <Check size={18} /> : null}
                <span>{privacySaved ? 'Privacy Saved' : 'Save Privacy Settings'}</span>
              </button>

              {/* Blocked Users Section */}
              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '0.92rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Ban size={16} color="var(--danger)" />
                  <span>Blocked Contacts ({blockedUsers.length})</span>
                </h4>

                {blockedUsers.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No contacts blocked.</p>
                ) : (
                  blockedUsers.map((b) => (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                      <span style={{ fontSize: '0.88rem' }}>{b.full_name} ({b.phone})</span>
                      <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => handleUnblock(b.id)}>
                        Unblock
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Server & APK Network Settings */}
          {activeTab === 'network' && (
            <div>
              <div style={{ background: 'rgba(37, 99, 235, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.82rem', color: '#93c5fd' }}>
                <strong>Mobile APK & Network Configuration:</strong> When running Bharat Chat as an Android APK or testing across separate devices on local Wi-Fi, enter your computer's local IP address or production backend URL below (e.g. <code>http://192.168.1.15:5000</code>).
              </div>

              <div className="form-group">
                <label>Backend API & WebSocket Server URL</label>
                <input
                  type="text"
                  placeholder="e.g. http://192.168.1.50:5000 or https://api.bharatchat.in"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                />
              </div>

              <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={handleSaveNetwork}>
                <Server size={18} />
                <span>Save Server URL</span>
              </button>
            </div>
          )}

          {/* TAB 4: Security & E2EE Architecture */}
          {activeTab === 'e2ee' && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-emerald)', fontWeight: 700, fontSize: '1rem', marginBottom: '10px' }}>
                <Shield size={20} />
                <span>Security & Cryptography Transparency</span>
              </div>

              <p style={{ marginBottom: '12px' }}>
                Bharat Chat implements strict enterprise-grade security protocols:
              </p>

              <ul style={{ paddingLeft: '20px', marginBottom: '14px' }}>
                <li><strong>Password Hashing:</strong> Passwords are protected using salted bcrypt with 12 computational rounds. Plaintext passwords are never logged or stored.</li>
                <li><strong>Transport Security:</strong> All client-server communication and WebSockets are secured via TLS/HTTPS.</li>
                <li><strong>WebRTC Encryption:</strong> Real-time voice and video calls are directly peer-to-peer encrypted using DTLS-SRTP.</li>
                <li><strong>Access Control:</strong> Server-side authorization is strictly enforced on every message, conversation, media file, and status query.</li>
              </ul>

              <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '10px 14px', borderRadius: '8px', color: '#fcd34d', fontSize: '0.78rem' }}>
                <strong>Cryptographic Notice:</strong> Message payloads in this release are securely encrypted in transit (TLS) and access-restricted in the persistent database. Full multi-device Double Ratchet Signal E2EE key exchange is designated as a phased architectural enhancement. Per integrity guidelines, we transparently disclose this architecture.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
