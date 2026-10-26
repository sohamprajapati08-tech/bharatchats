import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { X, Image as ImageIcon, Send, Type } from 'lucide-react';

interface CreateStatusModalProps {
  onClose: () => void;
  onStatusCreated: () => void;
}

const BG_COLORS = ['#065f46', '#b45309', '#1e3a8a', '#831843', '#1e293b', '#7c2d12'];
const FONTS = ['sans-serif', 'serif', 'monospace', 'cursive'];

export const CreateStatusModal: React.FC<CreateStatusModalProps> = ({
  onClose,
  onStatusCreated,
}) => {
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(BG_COLORS[0]);
  const [selectedFont, setSelectedFont] = useState(FONTS[0]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMediaSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const handlePublish = async () => {
    if (!content.trim() && !mediaFile) return;

    setLoading(true);
    try {
      let mediaUrl: string | undefined = undefined;
      let type: 'text' | 'image' | 'video' = 'text';

      if (mediaFile) {
        const uploadRes = await api.uploadMedia(mediaFile);
        mediaUrl = uploadRes.url;
        type = mediaFile.type.startsWith('image/') ? 'image' : 'video';
      }

      await api.createStatus({
        type,
        content: content.trim(),
        mediaUrl,
        backgroundColor: selectedColor,
        fontFamily: selectedFont,
      });

      onStatusCreated();
      onClose();
    } catch (err: any) {
      alert(`Failed to create status: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h3>Create Status / નવું સ્ટેટસ</h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '0' }}>
          {/* Live Preview canvas */}
          <div
            style={{
              height: '240px',
              backgroundColor: mediaPreview ? '#000' : selectedColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              position: 'relative',
            }}
          >
            {mediaPreview ? (
              <img
                src={mediaPreview}
                alt="Preview"
                style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
              />
            ) : (
              <textarea
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: '1.4rem',
                  fontWeight: 600,
                  textAlign: 'center',
                  width: '100%',
                  fontFamily: selectedFont,
                  resize: 'none',
                }}
                rows={3}
                placeholder="Type a status update / સ્ટેટસ લખો..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            )}
          </div>

          {/* Controls Bar */}
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Color swatches */}
              {!mediaPreview &&
                BG_COLORS.map((c) => (
                  <span
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: c,
                      cursor: 'pointer',
                      border: selectedColor === c ? '2px solid #fff' : 'none',
                    }}
                  />
                ))}

              {/* Font cycler */}
              {!mediaPreview && (
                <button
                  type="button"
                  className="btn-icon"
                  title="Change Font"
                  onClick={() => {
                    const nextIdx = (FONTS.indexOf(selectedFont) + 1) % FONTS.length;
                    setSelectedFont(FONTS[nextIdx]);
                  }}
                >
                  <Type size={18} />
                </button>
              )}

              {/* Photo upload toggle */}
              <label className="btn-icon" style={{ cursor: 'pointer', marginLeft: '6px' }} title="Add Photo">
                <ImageIcon size={20} />
                <input
                  type="file"
                  accept="image/*,video/*"
                  style={{ display: 'none' }}
                  onChange={handleMediaSelected}
                />
              </label>
            </div>

            <button
              className="btn-primary"
              onClick={handlePublish}
              disabled={loading || (!content.trim() && !mediaFile)}
              style={{ padding: '8px 18px', fontSize: '0.88rem' }}
            >
              <Send size={16} />
              <span>{loading ? 'Posting...' : 'Share'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
