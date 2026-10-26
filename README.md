# Bharat Chat (ભારત ચેટ) 🇮🇳
### High-Performance, Sovereign, Secure Real-Time Messaging Platform

Bharat Chat is an enterprise-grade messaging ecosystem engineered from scratch, delivering real-time chat, group messaging, DTLS-SRTP encrypted voice and video calling, 24-hour status stories, and Capacitor Android mobile capability.

---

## 🚀 Key Feature Highlights

### 1. Authentication & Security
- **Unique Account Registration:** Mobile number normalization (Indian standard e.g. `+91XXXXXXXXXX`), full name, password verification.
- **Security & Privacy Transparency:** Salted `bcrypt` password hashing (12 rounds). Zero plaintext passwords or secrets in logs.
- **Session Management:** Short-lived JWT Access Tokens (1h) and rotating Refresh Tokens (30d).
- **Rate Limiting & Protection:** `express-rate-limit` protecting against brute-force attacks on auth and API endpoints; `helmet` security headers.

### 2. Private 1-to-1 & Group Messaging
- **Real-Time WebSocket Engine:** Powered by Socket.IO with sub-millisecond message delivery.
- **Message States:** Sent (✓), Delivered (✓✓ grey), Read (✓✓ double blue ticks).
- **Interactive Controls:** Reply (quote previous message), Edit message, Delete for everyone / Delete for me, Emoji reactions pill counters.
- **Typing Indicators & Online Status:** Real-time presence broadcasts with privacy settings.
- **Full Group Chat Management:** Create groups with custom subject, description, member management, admin roles, and system event announcements.

### 3. Media & Voice Messages
- **Photo & Video Sharing:** In-chat preview and fullscreen lightbox view.
- **Document & File Sharing:** Secure upload with file type validation and size limits (up to 50MB).
- **Voice Messages:** HTML5 MediaRecorder voice notes with live recording timer, custom waveform player, and cancel/send controls.
- **Authorized File Serving:** Media is served through authenticated endpoints to protect privacy.

### 4. Real-Time WebRTC Voice & Video Calling
- **Authenticated Signaling:** Socket.IO relay for WebRTC offers, answers, and ICE candidates.
- **STUN Configuration:** Configured with Google public STUN servers (`stun:stun.l.google.com:19302`).
- **In-Call Screen:** Dual video feed (remote + local picture-in-picture preview), microphone mute toggle, camera toggle, and call duration timer.
- **Call Records:** Call history logging with direction (incoming/outgoing), status (completed/missed), and duration.

### 5. 24-Hour Status & Stories
- **Vibrant Status Updates:** Text status with customizable Indian saffron/emerald/sapphire backgrounds and fonts; Photo/Video status.
- **Story Progress Bar:** Segmented story viewer with 5-second automatic progression and tap navigation.
- **Viewer Tracking:** Author can inspect who viewed their status and view counts.
- **Automatic Expiration:** Expired stories automatically filter out and background cleaner purges records older than 24 hours.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Web** | React 18, TypeScript, Vite, Vanilla CSS Design System, Lucide Icons |
| **Backend API** | Node.js, Express, TypeScript, Zod, Helmet, CORS, Multer |
| **Real-Time & Calls** | Socket.IO, WebRTC, Google STUN |
| **Database** | PostgreSQL (Dual-mode: Live PostgreSQL via `pg` & Zero-Dependency Embedded PostgreSQL via `@electric-sql/pglite`) |
| **Mobile App** | Capacitor 7 (`@capacitor/android`) |
| **Automated Testing** | Vitest, Supertest (16/16 backend tests passed) |

---

## 💻 Local Quick Start (PowerShell)

### 1. Setup & Installation
```powershell
./scripts/setup.ps1
```

### 2. Run Local Development (Frontend + Backend)
```powershell
./scripts/dev.ps1
```
- Frontend Web App: [http://localhost:3000](http://localhost:3000)
- Backend API & WebSockets: [http://localhost:5000](http://localhost:5000)
- Health Check: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### 3. Run Automated Tests
```powershell
./scripts/test.ps1
```

### 4. Build Production Artifacts
```powershell
./scripts/build.ps1
```

---

## 📱 Android APK Build

The native Android project is prepared in `client/android/`.

### Building with GitHub Actions (Zero Local Setup)
A pre-configured CI workflow is included at `.github/workflows/android-build.yml`. Simply push your code to GitHub to trigger an automated build on an Ubuntu runner with JDK 17 and Android SDK. The compiled APK will be uploaded as a downloadable artifact.

### Building Locally
1. Install JDK 17 or JDK 21 (LTS).
2. Install Android Studio and command-line tools.
3. Set `ANDROID_HOME` in your environment variables.
4. Run:
   ```powershell
   cd client/android
   ./gradlew.bat assembleDebug
   ```
   The APK will be generated at `client/android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 🌐 Production Deployment

Refer to [DEPLOYMENT.md](file:///d:/bharatChat/DEPLOYMENT.md) for full instructions on free-tier deployment using **Render**, **Neon**, **Vercel**, and **GitHub Actions**.
