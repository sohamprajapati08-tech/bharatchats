import React from 'react';

interface BharatLogoProps {
  size?: number;
  showText?: boolean;
}

export const BharatLogo: React.FC<BharatLogoProps> = ({ size = 64, showText = false }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle, #111b21 0%, #0b141a 100%)',
          boxShadow: '0 8px 30px rgba(0, 168, 132, 0.45)',
          padding: '2px',
        }}
      >
        <svg viewBox="0 0 512 512" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="logoSaffron" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF9933" />
              <stop offset="100%" stopColor="#FF671F" />
            </linearGradient>
            <linearGradient id="logoGreen" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#138808" />
              <stop offset="100%" stopColor="#00A86B" />
            </linearGradient>
            <linearGradient id="logoBubble" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00a884" />
              <stop offset="100%" stopColor="#008069" />
            </linearGradient>
            <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Tricolor aura arcs */}
          <circle cx="256" cy="256" r="236" stroke="#202c33" strokeWidth="6" />
          <path d="M 66 256 A 190 190 0 0 1 446 256" fill="none" stroke="url(#logoSaffron)" strokeWidth="10" strokeLinecap="round" />
          <path d="M 66 256 A 190 190 0 0 0 446 256" fill="none" stroke="url(#logoGreen)" strokeWidth="10" strokeLinecap="round" />

          {/* Main Bubble Body */}
          <path
            d="M 256 120 C 167.63 120 96 186.26 96 268 C 96 298.8 107.03 327.34 126.12 350.56 L 108 408 L 171.74 391.26 C 196.44 406.84 225.26 416 256 416 C 344.37 416 416 349.74 416 268 C 416 186.26 344.37 120 256 120 Z"
            fill="url(#logoBubble)"
            filter="url(#logoGlow)"
          />

          {/* Center Ashoka Shield */}
          <circle cx="256" cy="268" r="54" fill="#ffffff" />
          <circle cx="256" cy="268" r="44" fill="none" stroke="#003366" strokeWidth="4" />
          <circle cx="256" cy="268" r="10" fill="#003366" />

          {/* Spokes */}
          <g stroke="#003366" strokeWidth="2.5" strokeLinecap="round">
            <line x1="256" y1="226" x2="256" y2="310" />
            <line x1="214" y1="268" x2="298" y2="268" />
            <line x1="226" y1="238" x2="286" y2="298" />
            <line x1="226" y1="298" x2="286" y2="238" />
            <line x1="241" y1="228" x2="271" y2="308" />
            <line x1="271" y1="228" x2="241" y2="308" />
            <line x1="216" y1="253" x2="296" y2="283" />
            <line x1="216" y1="283" x2="296" y2="253" />
          </g>
        </svg>
      </div>

      {showText && (
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#e9edef', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            Bharat Chat <span style={{ color: '#ff9933', fontSize: '0.95rem' }}>| ભારત ચેટ</span>
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#8696a0', marginTop: '2px' }}>
            Digital Sovereign Messenger for India 🇮🇳
          </p>
        </div>
      )}
    </div>
  );
};
