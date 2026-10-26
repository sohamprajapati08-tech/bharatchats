import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Shield, Sparkles, AlertCircle, Phone, Lock, User as UserIcon } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { login, register } = useAuth();
  const [isLoginView, setIsLoginView] = useState(true);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLoginView) {
        await login(phone, password);
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match / પાસવર્ડ સરખા નથી');
          setLoading(false);
          return;
        }
        await register({ fullName, phone, password, confirmPassword });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '420px', padding: '0' }}>
        {/* Header with Bharat Branding */}
        <div style={{
          background: 'linear-gradient(135deg, #111b21 0%, #17242c 100%)',
          padding: '28px 24px 20px',
          textAlign: 'center',
          borderBottom: '1px solid var(--border-light)',
          position: 'relative'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 12px',
            background: 'linear-gradient(135deg, #ff671f 0%, #00a884 100%)',
            padding: '2px',
            borderRadius: '50%',
            boxShadow: '0 8px 24px rgba(0, 168, 132, 0.35)'
          }}>
            <img src="/logo.svg" alt="Bharat Chat" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#e9edef', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            Bharat Chat <span style={{ fontSize: '1rem', color: '#ff9933' }}>| ભારત ચેટ</span>
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#8696a0', marginTop: '4px' }}>
            Digital Sovereign Messenger for India 🇮🇳
          </p>
        </div>

        {/* Notice Banner */}
        <div className="notice-banner" style={{ fontSize: '0.74rem' }}>
          <AlertCircle size={15} style={{ flexShrink: 0, color: '#ff9933' }} />
          <div>
            <strong>Notice / સૂચના:</strong> Mobile ownership is not verified via SMS OTP in this deployment.
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)' }}>
          <button
            type="button"
            onClick={() => { setIsLoginView(true); setError(null); }}
            style={{
              flex: 1,
              padding: '12px',
              background: isLoginView ? 'var(--bg-panel)' : 'rgba(0,0,0,0.15)',
              border: 'none',
              borderBottom: isLoginView ? '2px solid var(--primary-emerald)' : 'none',
              color: isLoginView ? 'var(--primary-emerald)' : 'var(--text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Login / પ્રવેશ
          </button>
          <button
            type="button"
            onClick={() => { setIsLoginView(false); setError(null); }}
            style={{
              flex: 1,
              padding: '12px',
              background: !isLoginView ? 'var(--bg-panel)' : 'rgba(0,0,0,0.15)',
              border: 'none',
              borderBottom: !isLoginView ? '2px solid var(--primary-emerald)' : 'none',
              color: !isLoginView ? 'var(--primary-emerald)' : 'var(--text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Register / ખાતું બનાવો
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              marginBottom: '16px',
              color: '#fca5a5',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {!isLoginView && (
            <div className="form-group">
              <label>Full Name / પૂરું નામ</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Patel"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <UserIcon size={18} style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-secondary)' }} />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Mobile Number / મોબાઈલ નંબર</label>
            <div style={{ position: 'relative' }}>
              <input
                type="tel"
                placeholder="10-digit number (e.g. 9876543210)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <Phone size={18} style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-secondary)' }} />
            </div>
          </div>

          <div className="form-group">
            <label>Password / પાસવર્ડ</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock size={18} style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-secondary)' }} />
            </div>
          </div>

          {!isLoginView && (
            <div className="form-group">
              <label>Confirm Password / પાસવર્ડ ફરીથી લખો</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <Lock size={18} style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-secondary)' }} />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: '12px', padding: '12px' }}
            disabled={loading}
          >
            {loading ? (
              <span>Processing... / પ્રક્રિયા ચાલુ છે...</span>
            ) : isLoginView ? (
              <>
                <Shield size={18} />
                <span>Login Securely / સુરક્ષિત પ્રવેશ</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Create Bharat Chat Account / એકાઉન્ટ બનાવો</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
