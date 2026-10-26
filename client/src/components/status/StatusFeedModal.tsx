import React, { useState, useEffect } from 'react';
import { StatusFeedUser } from '../../types/index.js';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { X, Plus, Eye, Trash2 } from 'lucide-react';

interface StatusFeedModalProps {
  onClose: () => void;
  onOpenCreateStatus: () => void;
}

export const StatusFeedModal: React.FC<StatusFeedModalProps> = ({
  onClose,
  onOpenCreateStatus,
}) => {
  const { user } = useAuth();
  const [feed, setFeed] = useState<StatusFeedUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Story Viewer State
  const [activeStoryUser, setActiveStoryUser] = useState<StatusFeedUser | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [viewersList, setViewersList] = useState<any[]>([]);
  const [showViewersModal, setShowViewersModal] = useState(false);

  const fetchFeed = async () => {
    try {
      const data = await api.getStatusFeed();
      setFeed(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  // Story Auto-Advance Timer
  useEffect(() => {
    if (!activeStoryUser) return;

    const currentStatus = activeStoryUser.statuses[activeStoryIndex];
    if (currentStatus) {
      // Mark as viewed if not mine
      if (!activeStoryUser.isMe) {
        api.viewStatus(currentStatus.id).catch(() => {});
      } else {
        // Fetch viewers for my status
        api.getStatusViewers(currentStatus.id).then(setViewersList).catch(() => {});
      }
    }

    const timer = setTimeout(() => {
      if (activeStoryIndex < activeStoryUser.statuses.length - 1) {
        setActiveStoryIndex((prev) => prev + 1);
      } else {
        // Finished this user's stories
        setActiveStoryUser(null);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [activeStoryUser, activeStoryIndex]);

  const openStory = (feedUser: StatusFeedUser) => {
    setActiveStoryUser(feedUser);
    setActiveStoryIndex(0);
  };

  const nextStory = () => {
    if (!activeStoryUser) return;
    if (activeStoryIndex < activeStoryUser.statuses.length - 1) {
      setActiveStoryIndex((prev) => prev + 1);
    } else {
      setActiveStoryUser(null);
    }
  };

  const prevStory = () => {
    if (!activeStoryUser) return;
    if (activeStoryIndex > 0) {
      setActiveStoryIndex((prev) => prev - 1);
    }
  };

  const handleDeleteStatus = async (statusId: string) => {
    try {
      await api.deleteStatus(statusId);
      setActiveStoryUser(null);
      fetchFeed();
    } catch (e) {
      console.error(e);
    }
  };

  const myFeedItem = feed.find((f) => f.isMe);
  const otherFeedItems = feed.filter((f) => !f.isMe);

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: '440px' }}>
          <div className="modal-header">
            <h3>Status Updates / સ્ટેટસ</h3>
            <button className="btn-icon" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="modal-body" style={{ padding: '0' }}>
            {/* My Status Section */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-light)',
                cursor: 'pointer',
              }}
              onClick={() => {
                if (myFeedItem && myFeedItem.statuses.length > 0) {
                  openStory(myFeedItem);
                } else {
                  onOpenCreateStatus();
                }
              }}
            >
              <div style={{ position: 'relative', marginRight: '16px' }}>
                <div
                  className="avatar-placeholder"
                  style={{
                    width: '52px',
                    height: '52px',
                    border: myFeedItem && myFeedItem.statuses.length > 0 ? '2px solid var(--primary-emerald)' : 'none',
                  }}
                >
                  {user?.avatarUrl ? <img src={user.avatarUrl} alt="Me" /> : user?.fullName.charAt(0)}
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary-emerald)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCreateStatus();
                  }}
                >
                  <Plus size={14} />
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>My Status / મારું સ્ટેટસ</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {myFeedItem && myFeedItem.statuses.length > 0
                    ? `${myFeedItem.statuses.length} updates • Tap to view`
                    : 'Tap to add status update'}
                </div>
              </div>
            </div>

            {/* Other Contacts Recent Updates */}
            <div style={{ padding: '12px 20px 6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              RECENT UPDATES
            </div>

            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading updates...</div>
              ) : otherFeedItems.length === 0 ? (
                <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
                  No recent status updates from your network.
                </div>
              ) : (
                otherFeedItems.map((item) => (
                  <div
                    key={item.userId}
                    onClick={() => openStory(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 20px',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(134,150,160,0.06)',
                    }}
                  >
                    <div
                      className="avatar-wrapper"
                      style={{
                        width: '48px',
                        height: '48px',
                        minWidth: '48px',
                        borderRadius: '50%',
                        border: '2px solid var(--primary-emerald)',
                        padding: '2px',
                      }}
                    >
                      <div className="avatar-placeholder" style={{ width: '100%', height: '100%' }}>
                        {item.userAvatar ? <img src={item.userAvatar} alt={item.userName} /> : item.userName.charAt(0)}
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{item.userName}</div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                        {item.statuses.length} status update{item.statuses.length > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Story Viewer */}
      {activeStoryUser && (
        <div className="story-viewer-overlay">
          {/* Top Progress Bars */}
          <div className="story-progress-bar">
            {activeStoryUser.statuses.map((s, idx) => (
              <div key={s.id} className="story-progress-track">
                <div
                  className="story-progress-fill"
                  style={{
                    width: idx < activeStoryIndex ? '100%' : idx === activeStoryIndex ? '100%' : '0%',
                    transition: idx === activeStoryIndex ? 'width 5s linear' : 'none',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Story User Header */}
          <div style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="avatar-placeholder" style={{ width: '38px', height: '38px' }}>
                {activeStoryUser.userName.charAt(0)}
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.92rem' }}>{activeStoryUser.userName}</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem' }}>
                  {new Date(activeStoryUser.statuses[activeStoryIndex]?.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {activeStoryUser.isMe && (
                <button
                  className="btn-icon"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => handleDeleteStatus(activeStoryUser.statuses[activeStoryIndex]?.id)}
                  title="Delete this status"
                >
                  <Trash2 size={20} />
                </button>
              )}
              <button className="btn-icon" onClick={() => setActiveStoryUser(null)}>
                <X size={24} color="#fff" />
              </button>
            </div>
          </div>

          {/* Story Content Area with tap navigation */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              backgroundColor: activeStoryUser.statuses[activeStoryIndex]?.backgroundColor || '#0b141a',
              padding: '24px',
            }}
          >
            {/* Left tap zone */}
            <div
              style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '30%', zIndex: 5, cursor: 'pointer' }}
              onClick={prevStory}
            />

            {/* Right tap zone */}
            <div
              style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '30%', zIndex: 5, cursor: 'pointer' }}
              onClick={nextStory}
            />

            {/* Content: Photo vs Text */}
            {activeStoryUser.statuses[activeStoryIndex]?.type === 'image' ? (
              <img
                src={activeStoryUser.statuses[activeStoryIndex]?.mediaUrl!}
                alt="Story"
                style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '12px' }}
              />
            ) : (
              <div
                style={{
                  fontSize: '1.6rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  textAlign: 'center',
                  maxWidth: '500px',
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                  fontFamily: activeStoryUser.statuses[activeStoryIndex]?.fontFamily || 'sans-serif',
                }}
              >
                {activeStoryUser.statuses[activeStoryIndex]?.content}
              </div>
            )}
          </div>

          {/* Bottom Viewer info for author */}
          {activeStoryUser.isMe && (
            <div
              style={{
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#fff',
                fontSize: '0.85rem',
                cursor: 'pointer',
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}
              onClick={() => setShowViewersModal(true)}
            >
              <Eye size={18} />
              <span>{viewersList.length} views / દ્રશ્યો</span>
            </div>
          )}
        </div>
      )}

      {/* Viewers list popup */}
      {showViewersModal && (
        <div className="modal-overlay" style={{ zIndex: 400 }}>
          <div className="modal-content" style={{ maxWidth: '360px' }}>
            <div className="modal-header">
              <h3>Viewed by / કોણે જોયું</h3>
              <button className="btn-icon" onClick={() => setShowViewersModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '250px', overflowY: 'auto', padding: '12px' }}>
              {viewersList.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '16px' }}>No views yet.</div>
              ) : (
                viewersList.map((v, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0' }}>
                    <div className="avatar-placeholder" style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>
                      {v.fullName.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{v.fullName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        {new Date(v.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
